/**
 * aing Ship Preflight Check — Validates readiness to ship
 * Note: Uses execSync for git commands with fixed strings (no user input), safe from injection.
 * @module scripts/ship/preflight-check
 */
import { execSync } from 'node:child_process';
import { buildDashboard } from '../review/review-dashboard.js';

export interface PreflightCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface PreflightResult {
  ready: boolean;
  checks: PreflightCheck[];
}

/**
 * Run all preflight checks.
 */
export function runPreflightChecks(projectDir?: string): PreflightResult {
  const dir = projectDir || process.cwd();
  const checks: PreflightCheck[] = [];

  // 1. Feature branch check
  const branch = getBranch(dir);
  const baseBranch = getBaseBranch(dir);
  checks.push({
    name: 'Feature branch',
    passed: branch !== baseBranch && branch !== 'unknown',
    detail: branch === baseBranch ? `On ${baseBranch}, need feature branch` : `Branch: ${branch}`,
  });

  // 2. Clean working tree
  const status = getStatus(dir);
  checks.push({
    name: 'Clean working tree',
    passed: status === '',
    detail: status ? `${status.split('\n').length} uncommitted files` : 'Clean',
  });

  // 3. Review dashboard
  try {
    const dashboard = buildDashboard(dir);
    checks.push({
      name: 'Review dashboard',
      passed: dashboard.verdict === 'CLEARED',
      detail: `${dashboard.verdict} — ${dashboard.verdictReason}`,
    });
  } catch {
    checks.push({ name: 'Review dashboard', passed: false, detail: 'Could not read dashboard' });
  }

  // 4. Up to date with base
  try {
    execSync(`git fetch origin ${baseBranch} --dry-run`, { cwd: dir, encoding: 'utf-8', timeout: 10000 });
    const behind = execSync(`git rev-list HEAD..origin/${baseBranch} --count`, { cwd: dir, encoding: 'utf-8' }).trim();
    checks.push({
      name: 'Up to date',
      passed: behind === '0',
      detail: behind === '0' ? 'Up to date' : `${behind} commits behind origin/${baseBranch}`,
    });
  } catch {
    checks.push({ name: 'Up to date', passed: true, detail: 'Could not check (offline?)' });
  }

  const ready = checks.every(c => c.passed);

  return { ready, checks };
}

/**
 * Format preflight results for display.
 */
export function formatPreflight(result: PreflightResult): string {
  const lines: string[] = [`Ship Preflight: ${result.ready ? 'READY' : 'NOT READY'}`, ''];
  for (const check of result.checks) {
    const icon = check.passed ? '✓' : '✗';
    lines.push(`  ${icon} ${check.name}: ${check.detail || ''}`);
  }
  return lines.join('\n');
}

function getBranch(dir: string): string {
  try { return execSync('git branch --show-current', { cwd: dir, encoding: 'utf-8' }).trim(); }
  catch { return 'unknown'; }
}

function getBaseBranch(dir: string): string {
  try { execSync('git rev-parse --verify origin/main', { cwd: dir, encoding: 'utf-8' }); return 'main'; }
  catch {}
  try { execSync('git rev-parse --verify origin/master', { cwd: dir, encoding: 'utf-8' }); return 'master'; }
  catch {}
  return 'main';
}

function getStatus(dir: string): string {
  try { return execSync('git status --porcelain', { cwd: dir, encoding: 'utf-8' }).trim(); }
  catch { return ''; }
}
