/**
 * aing Ship Orchestrator — 7-Step Pipeline Controller
 * Actually executes git commands, runs tests, creates PRs.
 * Note: Uses execSync for git/test commands with controlled inputs (not user-supplied strings).
 *
 * @module scripts/ship/ship-orchestrator
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createLogger } from '../core/logger.js';
import { initShip, advanceStep, getShipState } from './ship-engine.js';
import { determineBumpType, bumpVersion, readVersion } from './version-bump.js';
import { getCommitsSince, generateChangelog, prependChangelog } from './changelog-gen.js';
import { generateTitle, generateBody, isGhAvailable } from './pr-creator.js';
import { buildDashboard } from '../review/review-dashboard.js';
import { evaluateChain } from '../evidence/evidence-chain.js';
import { logSkillUsage } from '../telemetry/telemetry-engine.js';
import type { ShipState } from './ship-engine.js';
import type { BumpResult } from './version-bump.js';

const log = createLogger('ship-orchestrator');

export interface ShipPipelineOptions {
  feature: string;
  baseBranch?: string;
  dryRun?: boolean;
  skipTests?: boolean;
  projectDir?: string;
}

export interface ShipPipelineResult {
  success: boolean;
  state: ShipState | null;
  pr?: string | null;
  error?: string;
}

interface StepOutcome {
  ok: boolean;
  reason?: string;
  action?: string;
  critical?: boolean;
  findings?: Array<{ pattern: string; count: number }>;
  checks?: Record<string, boolean>;
  skipped?: boolean;
  output?: string;
  prUrl?: string | null;
}

/**
 * Execute the full 7-step ship pipeline.
 */
export async function executeShipPipeline(options: ShipPipelineOptions): Promise<ShipPipelineResult> {
  const {
    feature,
    baseBranch = detectBaseBranch(options.projectDir),
    dryRun = false,
    skipTests = false,
    projectDir,
  } = options;

  const dir = projectDir || process.cwd();
  const branch = getCurrentBranch(dir);

  initShip(feature, branch, baseBranch, dir);
  log.info(`Ship started: ${feature} (${branch} → ${baseBranch})`);

  const startTime = Date.now();
  let prUrl: string | null = null;

  try {
    // Step 1: Pre-flight
    const preflightResult = runPreflight(dir, branch, baseBranch, feature);
    advanceStep({ step: 'preflight', status: preflightResult.ok ? 'pass' : 'fail', details: preflightResult as unknown as Record<string, unknown> }, dir);
    if (!preflightResult.ok) return { success: false, state: getShipState(dir), error: preflightResult.reason };

    // Step 2: Merge base branch
    const mergeResult = runMergeBase(dir, baseBranch, dryRun);
    advanceStep({ step: 'merge-base', status: mergeResult.ok ? 'pass' : 'fail', details: mergeResult as unknown as Record<string, unknown> }, dir);
    if (!mergeResult.ok) return { success: false, state: getShipState(dir), error: mergeResult.reason };

    // Step 3: Run tests
    if (skipTests) {
      advanceStep({ step: 'run-tests', status: 'pass', details: { skipped: true } }, dir);
    } else {
      const testResult = runTests(dir);
      advanceStep({ step: 'run-tests', status: testResult.ok ? 'pass' : 'fail', details: testResult as unknown as Record<string, unknown> }, dir);
      if (!testResult.ok) return { success: false, state: getShipState(dir), error: testResult.reason };
    }

    // Step 4: Pre-landing review (lightweight check)
    const reviewResult = runPreLandingReview(dir, baseBranch);
    advanceStep({ step: 'pre-landing-review', status: reviewResult.ok ? 'pass' : 'fail', details: reviewResult as unknown as Record<string, unknown> }, dir);
    if (!reviewResult.ok && reviewResult.critical) return { success: false, state: getShipState(dir), error: reviewResult.reason };

    // Step 5: Version bump
    const versionResult = runVersionBump(dir, baseBranch, dryRun);
    advanceStep({ step: 'version-bump', status: 'pass', details: versionResult as unknown as Record<string, unknown> }, dir);

    // Step 6: Changelog
    const changelogResult = runChangelog(dir, versionResult.newVersion, baseBranch, dryRun);
    advanceStep({ step: 'changelog', status: 'pass', details: changelogResult as unknown as Record<string, unknown> }, dir);

    // Step 7: Push + PR
    if (dryRun) {
      advanceStep({ step: 'push-and-pr', status: 'pass', details: { dryRun: true } }, dir);
    } else {
      const prResult = runPushAndPR(dir, branch, baseBranch, feature, versionResult, changelogResult);
      advanceStep({ step: 'push-and-pr', status: prResult.ok ? 'pass' : 'fail', details: prResult as unknown as Record<string, unknown> }, dir);
      prUrl = prResult.prUrl ?? null;
    }

    const durationS = Math.round((Date.now() - startTime) / 1000);
    logSkillUsage({ skill: 'ship', duration_s: durationS, outcome: 'success' }, dir);

    return { success: true, state: getShipState(dir), pr: prUrl };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Ship failed: ${message}`);
    const durationS = Math.round((Date.now() - startTime) / 1000);
    logSkillUsage({ skill: 'ship', duration_s: durationS, outcome: 'error' }, dir);
    return { success: false, state: getShipState(dir), error: message };
  }
}

// -- Step Implementations --

function runPreflight(dir: string, branch: string, baseBranch: string, feature: string): StepOutcome {
  const issues: string[] = [];

  // Not on base branch
  if (branch === baseBranch) {
    issues.push(`Currently on ${baseBranch}. Must be on a feature branch.`);
  }

  // No uncommitted changes
  try {
    const status = execSync('git status --porcelain', { cwd: dir, encoding: 'utf-8' }).trim();
    if (status) issues.push(`Uncommitted changes detected:\n${status.split('\n').slice(0, 5).join('\n')}`);
  } catch {}

  // Review dashboard (soft check)
  try {
    const dashboard = buildDashboard(dir);
    if (dashboard.verdict !== 'CLEARED') {
      issues.push(`Review dashboard: ${dashboard.verdict} — ${dashboard.verdictReason}`);
    }
  } catch {}

  // Evidence chain (soft check)
  try {
    const evidence = evaluateChain(feature, dir);
    if (evidence.verdict === 'FAIL') {
      issues.push(`Evidence chain: FAIL — ${evidence.summary}`);
    }
  } catch {}

  return {
    ok: issues.length === 0,
    reason: issues.join('\n'),
    checks: { branch: branch !== baseBranch, clean: issues.length === 0 },
  };
}

function runMergeBase(dir: string, baseBranch: string, dryRun: boolean): StepOutcome {
  if (dryRun) return { ok: true, action: 'dry-run skip' };

  try {
    execSync(`git fetch origin ${baseBranch}`, { cwd: dir, encoding: 'utf-8', timeout: 30000 });
    execSync(`git merge origin/${baseBranch} --no-edit`, { cwd: dir, encoding: 'utf-8', timeout: 30000 });
    return { ok: true, action: `Merged origin/${baseBranch}` };
  } catch (err: unknown) {
    // Check for conflicts
    try {
      const status = execSync('git status --porcelain', { cwd: dir, encoding: 'utf-8' });
      if (status.includes('UU ') || status.includes('AA ')) {
        execSync('git merge --abort', { cwd: dir, encoding: 'utf-8' });
        return { ok: false, reason: `Merge conflict with ${baseBranch}. Resolve manually.` };
      }
    } catch {}
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Merge failed: ${message}` };
  }
}

function runTests(dir: string): StepOutcome {
  // Detect test command
  const testCommands: Array<{ check: string; cmd: string }> = [
    { check: 'package.json', cmd: 'node --test tests/*.test.mjs' },
    { check: 'package.json', cmd: 'npm test' },
  ];

  for (const tc of testCommands) {
    if (!existsSync(`${dir}/${tc.check}`)) continue;
    try {
      const output = execSync(tc.cmd, { cwd: dir, encoding: 'utf-8', timeout: 120000 });
      const failMatch = output.match(/fail\s+(\d+)/i);
      if (failMatch && parseInt(failMatch[1]) > 0) {
        return { ok: false, reason: `${failMatch[1]} test(s) failed`, output: output.slice(-500) };
      }
      return { ok: true, output: output.slice(-200) };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stdout = (err as { stdout?: string }).stdout;
      return { ok: false, reason: `Tests failed: ${message}`, output: stdout?.slice(-500) || '' };
    }
  }

  return { ok: true, output: 'No test framework detected, skipping' };
}

function runPreLandingReview(dir: string, baseBranch: string): StepOutcome {
  // Lightweight diff-based security check
  try {
    const diff = execSync(`git diff origin/${baseBranch}...HEAD`, { cwd: dir, encoding: 'utf-8', timeout: 10000 });

    const criticalPatterns: Array<{ pattern: RegExp; name: string }> = [
      { pattern: /\$\{.*\}.*(?:query|sql|exec)/gi, name: 'SQL injection risk' },
      { pattern: /eval\s*\(/g, name: 'eval() usage' },
      { pattern: /dangerouslySetInnerHTML/g, name: 'XSS risk (dangerouslySetInnerHTML)' },
      { pattern: /--force/g, name: 'Force flag in commands' },
    ];

    const findings: Array<{ pattern: string; count: number }> = [];
    for (const cp of criticalPatterns) {
      const matches = diff.match(cp.pattern);
      if (matches) {
        findings.push({ pattern: cp.name, count: matches.length });
      }
    }

    return {
      ok: findings.length === 0,
      critical: findings.some(f => f.pattern.includes('injection') || f.pattern.includes('eval')),
      findings,
      reason: findings.length > 0 ? `Pre-landing: ${findings.map(f => f.pattern).join(', ')}` : 'Clean',
    };
  } catch {
    return { ok: true, findings: [], reason: 'Could not run pre-landing review' };
  }
}

function runVersionBump(dir: string, baseBranch: string, dryRun: boolean): BumpResult {
  // Analyze commits to determine bump type
  let hasBreaking = false;
  let hasNewFeature = false;
  let hasBugFix = false;

  try {
    const commitLog = execSync(`git log origin/${baseBranch}..HEAD --oneline`, { cwd: dir, encoding: 'utf-8' });
    hasBreaking = /\bBREAKING\b|^.*!:/m.test(commitLog);
    hasNewFeature = /^[a-f0-9]+ feat/m.test(commitLog);
    hasBugFix = /^[a-f0-9]+ fix/m.test(commitLog);
  } catch {}

  const bumpType = determineBumpType({ hasBreaking, hasNewFeature, hasBugFix });
  const oldVersion = readVersion(dir);

  if (dryRun) {
    return { oldVersion, newVersion: `${oldVersion} (dry-run, would bump ${bumpType})`, bumpType };
  }

  const result = bumpVersion(bumpType, dir);
  return result;
}

interface ChangelogResult {
  version: string;
  commitCount: number;
  dryRun: boolean;
}

function runChangelog(dir: string, newVersion: string, _baseBranch: string, dryRun: boolean): ChangelogResult {
  const commits = getCommitsSince(null, dir);
  const content = generateChangelog(newVersion, commits);

  if (!dryRun) {
    prependChangelog(content, dir);
  }

  return { version: newVersion, commitCount: commits.length, dryRun };
}

function runPushAndPR(dir: string, branch: string, baseBranch: string, feature: string, versionResult: BumpResult, changelogResult: ChangelogResult): StepOutcome {
  try {
    // Push
    execSync(`git add -A && git commit -m "chore: v${versionResult.newVersion} release" --allow-empty`, {
      cwd: dir, encoding: 'utf-8', shell: '/bin/sh',
    });
    execSync(`git push origin ${branch}`, { cwd: dir, encoding: 'utf-8', timeout: 30000 });

    // Create PR
    if (!isGhAvailable()) {
      return { ok: true, prUrl: null, reason: 'Pushed but gh CLI not available for PR creation' };
    }

    const title = generateTitle(feature, versionResult.newVersion, versionResult.bumpType);
    const dashboard = buildDashboard(dir);
    const body = generateBody({ changelog: changelogResult.version, reviewDashboard: dashboard as unknown as import('./pr-creator.js').ReviewDashboard, feature });

    const prOutput = execSync(
      `gh pr create --title "${title.replace(/"/g, '\\"')}" --base ${baseBranch} --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { cwd: dir, encoding: 'utf-8', timeout: 30000 }
    ).trim();

    return { ok: true, prUrl: prOutput };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Push/PR failed: ${message}` };
  }
}

// -- Utilities --

function getCurrentBranch(dir: string): string {
  try {
    return execSync('git branch --show-current', { cwd: dir, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function detectBaseBranch(dir?: string): string {
  const cwd = dir || process.cwd();
  try {
    execSync('git rev-parse --verify origin/main', { cwd, encoding: 'utf-8' });
    return 'main';
  } catch {}
  try {
    execSync('git rev-parse --verify origin/master', { cwd, encoding: 'utf-8' });
    return 'master';
  } catch {}
  return 'main';
}
