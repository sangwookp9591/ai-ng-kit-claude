/**
 * aing Eval Store — Persistent eval result storage
 *
 * Stores eval runs as JSON files under .aing/evals/ using the
 * atomic write pattern from scripts/core/state.ts.
 *
 * @module scripts/eval/eval-store
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';
import { writeState, readState } from '../core/state.js';

const log = createLogger('eval-store');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalSkillResult {
  skill: string;
  tier: string;
  score: number;
  maxScore: number;
  passed: boolean;
  findingCount: number;
  errorCount: number;
  warningCount: number;
  duration_ms: number;
  cost_estimate: number;
}

export interface EvalRunSummary {
  /** Unique identifier for this run. */
  runId: string;
  /** ISO timestamp of the run. */
  timestamp: string;
  /** Git commit hash at time of eval, if available. */
  commitHash?: string;
  /** Branch name at time of eval, if available. */
  branch?: string;
  /** Per-skill results. */
  results: EvalSkillResult[];
  /** Aggregate counts. */
  totalPassed: number;
  totalFailed: number;
  totalSkills: number;
  /** Percentage of known skills that were evaluated. */
  coveragePercent: number;
  /** Total cost estimate across all evals. */
  totalCost: number;
  /** Total duration in milliseconds. */
  totalDuration_ms: number;
}

export interface RegressionReport {
  /** Skills that degraded vs baseline. */
  regressions: RegressionEntry[];
  /** Skills that improved vs baseline. */
  improvements: RegressionEntry[];
  /** Skills present in current but not baseline. */
  newSkills: string[];
  /** Skills present in baseline but not current. */
  removedSkills: string[];
}

export interface RegressionEntry {
  skill: string;
  tier: string;
  baselineScore: number;
  currentScore: number;
  delta: number;
  /** Did it cross the pass/fail boundary? */
  statusChange: 'pass_to_fail' | 'fail_to_pass' | 'none';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function evalsDir(projectDir: string): string {
  return join(projectDir, '.aing', 'evals');
}

function generateRunId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const rand = Math.random().toString(36).slice(2, 8);
  return `eval-${ts}_${rand}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Persist an eval run summary to disk using atomic writes.
 * @returns The absolute path of the saved file.
 */
export function saveEvalRun(summary: EvalRunSummary, projectDir?: string): string {
  const dir = projectDir ?? process.cwd();
  const runId = summary.runId || generateRunId();
  const filePath = join(evalsDir(dir), `${runId}.json`);

  const result = writeState(filePath, { ...summary, runId });
  if (!result.ok) {
    log.error(`Failed to save eval run: ${result.error}`);
    throw new Error(`Failed to save eval run: ${result.error}`);
  }

  log.info(`Eval run saved: ${filePath}`);
  return filePath;
}

/**
 * Load the most recent eval run from disk.
 * Returns null if no evals exist.
 */
export function loadLatestEval(projectDir?: string): EvalRunSummary | null {
  const dir = projectDir ?? process.cwd();
  const evalsDirPath = evalsDir(dir);

  if (!existsSync(evalsDirPath)) return null;

  const files = readdirSync(evalsDirPath)
    .filter(f => f.startsWith('eval-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  const result = readState(join(evalsDirPath, files[0]));
  if (!result.ok) {
    log.warn(`Failed to read latest eval: ${result.error}`);
    return null;
  }

  return result.data as EvalRunSummary;
}

/**
 * Load the last N eval runs, newest first.
 */
export function loadEvalHistory(limit: number = 10, projectDir?: string): EvalRunSummary[] {
  const dir = projectDir ?? process.cwd();
  const evalsDirPath = evalsDir(dir);

  if (!existsSync(evalsDirPath)) return [];

  const files = readdirSync(evalsDirPath)
    .filter(f => f.startsWith('eval-') && f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit);

  const runs: EvalRunSummary[] = [];
  for (const file of files) {
    try {
      const raw = readFileSync(join(evalsDirPath, file), 'utf-8');
      const data = JSON.parse(raw) as EvalRunSummary;
      runs.push(data);
    } catch {
      log.warn(`Skipping unreadable eval file: ${file}`);
    }
  }

  return runs;
}

/**
 * Compare two eval runs and produce a regression report.
 * Identifies score regressions, improvements, and new/removed skills.
 */
export function compareRuns(
  current: EvalRunSummary,
  baseline: EvalRunSummary,
): RegressionReport {
  const baselineMap = new Map<string, EvalSkillResult>();
  for (const r of baseline.results) {
    const key = `${r.skill}:${r.tier}`;
    baselineMap.set(key, r);
  }

  const currentMap = new Map<string, EvalSkillResult>();
  for (const r of current.results) {
    const key = `${r.skill}:${r.tier}`;
    currentMap.set(key, r);
  }

  const regressions: RegressionEntry[] = [];
  const improvements: RegressionEntry[] = [];
  const newSkills: string[] = [];
  const removedSkills: string[] = [];

  // Check current against baseline
  for (const [key, cur] of currentMap) {
    const base = baselineMap.get(key);

    if (!base) {
      if (!newSkills.includes(cur.skill)) {
        newSkills.push(cur.skill);
      }
      continue;
    }

    const delta = cur.score - base.score;
    let statusChange: RegressionEntry['statusChange'] = 'none';
    if (base.passed && !cur.passed) statusChange = 'pass_to_fail';
    if (!base.passed && cur.passed) statusChange = 'fail_to_pass';

    const entry: RegressionEntry = {
      skill: cur.skill,
      tier: cur.tier,
      baselineScore: base.score,
      currentScore: cur.score,
      delta,
      statusChange,
    };

    // Regression: score dropped by 10+ points, or status went pass->fail
    if (delta <= -10 || statusChange === 'pass_to_fail') {
      regressions.push(entry);
    }
    // Improvement: score increased by 10+ points, or status went fail->pass
    else if (delta >= 10 || statusChange === 'fail_to_pass') {
      improvements.push(entry);
    }
  }

  // Check for removed skills
  const currentSkills = new Set([...currentMap.values()].map(r => r.skill));
  for (const base of baseline.results) {
    if (!currentSkills.has(base.skill) && !removedSkills.includes(base.skill)) {
      removedSkills.push(base.skill);
    }
  }

  if (regressions.length > 0) {
    log.warn(`Found ${regressions.length} regressions vs baseline`);
  }

  return { regressions, improvements, newSkills, removedSkills };
}

/**
 * Format a regression report as a human-readable string.
 */
export function formatRegressionReport(report: RegressionReport): string {
  const lines: string[] = ['=== Eval Regression Report ==='];

  if (report.regressions.length > 0) {
    lines.push(`\n[REGRESSIONS] (${report.regressions.length})`);
    for (const r of report.regressions) {
      const status = r.statusChange !== 'none' ? ` [${r.statusChange}]` : '';
      lines.push(`  - ${r.skill} (${r.tier}): ${r.baselineScore} -> ${r.currentScore} (${r.delta > 0 ? '+' : ''}${r.delta})${status}`);
    }
  }

  if (report.improvements.length > 0) {
    lines.push(`\n[IMPROVEMENTS] (${report.improvements.length})`);
    for (const r of report.improvements) {
      const status = r.statusChange !== 'none' ? ` [${r.statusChange}]` : '';
      lines.push(`  + ${r.skill} (${r.tier}): ${r.baselineScore} -> ${r.currentScore} (+${r.delta})${status}`);
    }
  }

  if (report.newSkills.length > 0) {
    lines.push(`\n[NEW SKILLS] (${report.newSkills.length})`);
    for (const s of report.newSkills) lines.push(`  * ${s}`);
  }

  if (report.removedSkills.length > 0) {
    lines.push(`\n[REMOVED SKILLS] (${report.removedSkills.length})`);
    for (const s of report.removedSkills) lines.push(`  x ${s}`);
  }

  if (
    report.regressions.length === 0 &&
    report.improvements.length === 0 &&
    report.newSkills.length === 0 &&
    report.removedSkills.length === 0
  ) {
    lines.push('\nNo significant changes detected.');
  }

  return lines.join('\n');
}
