/**
 * aing Eval Engine — 3-Tier Skill Quality Assessment
 *
 * Tier 1: Static validation (free, <5s)
 * Tier 2: E2E via `claude -p` subprocess (~$3.85)
 * Tier 3: LLM-as-judge quality scoring (~$0.15)
 *
 * Eval system with aing-native patterns.
 *
 * @module scripts/eval/eval-engine
 */

import { createLogger } from '../core/logger.js';
import { readState, writeState } from '../core/state.js';
import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runStaticValidation } from './static-validator.js';
import { runLlmJudge } from './llm-judge.js';

const log = createLogger('eval-engine');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum EvalTier {
  STATIC = 'STATIC',
  E2E = 'E2E',
  LLM_JUDGE = 'LLM_JUDGE',
}

export type Severity = 'error' | 'warning' | 'info';

export interface EvalFinding {
  rule: string;
  message: string;
  severity: Severity;
  line?: number;
}

export interface EvalResult {
  tier: EvalTier;
  skill: string;
  score: number;
  maxScore: number;
  passed: boolean;
  findings: EvalFinding[];
  duration_ms: number;
  cost_estimate: number;
}

export interface EvalRunSummary {
  timestamp: string;
  results: EvalResult[];
  totalPassed: number;
  totalFailed: number;
  totalSkills: number;
  coveragePercent: number;
}

interface EvalSuccess<T> {
  ok: true;
  data: T;
}

interface EvalFailure {
  ok: false;
  error: string;
}

type EvalOutcome<T> = EvalSuccess<T> | EvalFailure;

// ---------------------------------------------------------------------------
// Cost estimates per tier
// ---------------------------------------------------------------------------

const TIER_COSTS: Record<EvalTier, number> = {
  [EvalTier.STATIC]: 0,
  [EvalTier.E2E]: 3.85,
  [EvalTier.LLM_JUDGE]: 0.15,
};

// ---------------------------------------------------------------------------
// Skill discovery
// ---------------------------------------------------------------------------

export function discoverSkills(projectDir: string): string[] {
  const skillsDir = join(projectDir, 'skills');
  if (!existsSync(skillsDir)) return [];

  return readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => existsSync(join(skillsDir, d.name, 'SKILL.md')))
    .map(d => d.name);
}

// ---------------------------------------------------------------------------
// Tier 1: Static validation (inline)
// ---------------------------------------------------------------------------

function runStaticTier(skill: string, projectDir: string): EvalResult {
  const start = Date.now();
  const findings = runStaticValidation(skill, projectDir);
  const duration_ms = Date.now() - start;

  const errors = findings.filter(f => f.severity === 'error');
  const maxScore = 100;
  const deductions = errors.length * 20 + findings.filter(f => f.severity === 'warning').length * 5;
  const score = Math.max(0, maxScore - deductions);

  return {
    tier: EvalTier.STATIC,
    skill,
    score,
    maxScore,
    passed: errors.length === 0,
    findings,
    duration_ms,
    cost_estimate: TIER_COSTS[EvalTier.STATIC],
  };
}

// ---------------------------------------------------------------------------
// Tier 2: E2E via subprocess (uses execFileSync to avoid shell injection)
// ---------------------------------------------------------------------------

function runE2ETier(skill: string, projectDir: string): EvalResult {
  const start = Date.now();
  const findings: EvalFinding[] = [];
  let score = 0;
  const maxScore = 100;

  try {
    const testPrompt = `Run /aing ${skill} --dry-run and report if it initializes without errors. Reply ONLY with JSON: {"success": true/false, "error": "..."}`;
    const result = execFileSync(
      'claude',
      ['-p', testPrompt, '--max-turns', '1'],
      {
        cwd: projectDir,
        timeout: 120_000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    const jsonMatch = result.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as { success?: boolean; error?: string };
        if (parsed.success) {
          score = 100;
        } else {
          score = 30;
          findings.push({
            rule: 'e2e-init-failure',
            message: parsed.error || 'Skill failed to initialize',
            severity: 'error',
          });
        }
      } catch {
        score = 50;
        findings.push({
          rule: 'e2e-parse-failure',
          message: 'Could not parse subprocess JSON output',
          severity: 'warning',
        });
      }
    } else {
      score = 50;
      findings.push({
        rule: 'e2e-no-json',
        message: 'Subprocess did not return JSON',
        severity: 'warning',
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    score = 0;
    findings.push({
      rule: 'e2e-subprocess-error',
      message: `Subprocess failed: ${message.slice(0, 200)}`,
      severity: 'error',
    });
  }

  const duration_ms = Date.now() - start;
  return {
    tier: EvalTier.E2E,
    skill,
    score,
    maxScore,
    passed: score >= 70,
    findings,
    duration_ms,
    cost_estimate: TIER_COSTS[EvalTier.E2E],
  };
}

// ---------------------------------------------------------------------------
// Tier 3: LLM-as-judge
// ---------------------------------------------------------------------------

function runLlmJudgeTier(skill: string, projectDir: string): EvalResult {
  const start = Date.now();
  const judgeResult = runLlmJudge(skill, projectDir);
  const duration_ms = Date.now() - start;

  return {
    tier: EvalTier.LLM_JUDGE,
    skill,
    score: judgeResult.score,
    maxScore: judgeResult.maxScore,
    passed: judgeResult.passed,
    findings: judgeResult.findings,
    duration_ms,
    cost_estimate: TIER_COSTS[EvalTier.LLM_JUDGE],
  };
}

// ---------------------------------------------------------------------------
// Tier routing
// ---------------------------------------------------------------------------

const TIER_RUNNERS: Record<EvalTier, (skill: string, projectDir: string) => EvalResult> = {
  [EvalTier.STATIC]: runStaticTier,
  [EvalTier.E2E]: runE2ETier,
  [EvalTier.LLM_JUDGE]: runLlmJudgeTier,
};

/**
 * Run an evaluation for a single skill at the specified tier.
 */
export function runEval(skill: string, tier: EvalTier, projectDir?: string): EvalOutcome<EvalResult> {
  const dir = projectDir || process.cwd();
  const skillPath = join(dir, 'skills', skill, 'SKILL.md');

  if (!existsSync(skillPath)) {
    return { ok: false, error: `Skill not found: ${skill} (expected ${skillPath})` };
  }

  try {
    const runner = TIER_RUNNERS[tier];
    const result = runner(skill, dir);
    log.info(`Eval [${tier}] ${skill}: ${result.score}/${result.maxScore} ${result.passed ? 'PASS' : 'FAIL'}`);
    return { ok: true, data: result };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Eval [${tier}] ${skill} failed: ${message}`);
    return { ok: false, error: message };
  }
}

/**
 * Run evaluations for all discovered skills at one or more tiers.
 */
export function runEvalSuite(
  tiers: EvalTier[],
  projectDir?: string,
  skillFilter?: string[],
): EvalOutcome<EvalRunSummary> {
  const dir = projectDir || process.cwd();
  const allSkills = discoverSkills(dir);
  const skills = skillFilter
    ? allSkills.filter(s => skillFilter.includes(s))
    : allSkills;

  if (skills.length === 0) {
    return { ok: false, error: 'No skills found to evaluate' };
  }

  const results: EvalResult[] = [];

  for (const skill of skills) {
    for (const tier of tiers) {
      const outcome = runEval(skill, tier, dir);
      if (outcome.ok) {
        results.push(outcome.data);
      } else {
        results.push({
          tier,
          skill,
          score: 0,
          maxScore: 100,
          passed: false,
          findings: [{ rule: 'eval-error', message: outcome.error, severity: 'error' }],
          duration_ms: 0,
          cost_estimate: TIER_COSTS[tier],
        });
      }
    }
  }

  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;

  const summary: EvalRunSummary = {
    timestamp: new Date().toISOString(),
    results,
    totalPassed,
    totalFailed,
    totalSkills: skills.length,
    coveragePercent: skills.length > 0
      ? Math.round((skills.length / allSkills.length) * 100)
      : 0,
  };

  // Persist the run summary
  const stateDir = join(dir, '.aing', 'evals');
  const ts = summary.timestamp.replace(/[:.]/g, '-');
  const statePath = join(stateDir, `eval-${ts}.json`);
  writeState(statePath, summary);

  log.info(`Eval suite complete: ${totalPassed} passed, ${totalFailed} failed out of ${results.length} evals`);

  return { ok: true, data: summary };
}

/**
 * Load the most recent eval run from disk.
 */
export function loadLatestEval(projectDir?: string): EvalOutcome<EvalRunSummary> {
  const dir = projectDir || process.cwd();
  const evalsDir = join(dir, '.aing', 'evals');

  if (!existsSync(evalsDir)) {
    return { ok: false, error: 'No eval history found' };
  }

  const files = readdirSync(evalsDir)
    .filter(f => f.startsWith('eval-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return { ok: false, error: 'No eval runs found' };
  }

  const latest = readState(join(evalsDir, files[0]));
  if (!latest.ok) {
    return { ok: false, error: `Failed to read latest eval: ${latest.error}` };
  }

  return { ok: true, data: latest.data as EvalRunSummary };
}
