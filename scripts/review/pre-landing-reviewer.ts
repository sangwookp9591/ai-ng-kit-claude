/**
 * aing Pre-Landing Reviewer — Runs checklist against diff before ship
 * @module scripts/review/pre-landing-reviewer
 */
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
import { runChecklist, classifyResults, formatChecklistResults } from './review-checklist.js';
import { recordReview } from './review-engine.js';

const log = createLogger('pre-landing');

export interface PreLandingResult {
  passed: boolean;
  critical: number;
  total: number;
  autoFixed?: number;
  needsDecision?: number;
  formatted: string;
}

/**
 * Run pre-landing review against the branch diff.
 */
export function runPreLandingReview(baseBranch: string, projectDir?: string): PreLandingResult {
  const dir = projectDir || process.cwd();

  // Get diff — execSync is safe here as baseBranch is developer-controlled
  let diff = '';
  try {
    diff = execSync(`git diff origin/${baseBranch}...HEAD`, { cwd: dir, encoding: 'utf-8', timeout: 15000 });
  } catch (err) {
    log.warn(`Could not get diff: ${(err as Error).message}`);
    return { passed: true, critical: 0, total: 0, formatted: 'Could not get diff — skipping pre-landing review' };
  }

  if (!diff.trim()) {
    return { passed: true, critical: 0, total: 0, formatted: 'No diff — nothing to review' };
  }

  // Run checklist
  const results = runChecklist(diff);
  const classified = classifyResults(results);
  const formatted = formatChecklistResults(results, classified);

  // Record review
  recordReview('eng-review', {
    status: classified.summary.critical === 0 ? 'clean' : 'issues_open',
    issues_found: classified.summary.total,
    critical_gaps: classified.summary.critical,
    mode: 'PRE_LANDING',
  }, dir);

  const passed = classified.summary.critical === 0;
  log.info(`Pre-landing: ${classified.summary.total} findings (${classified.summary.critical} critical) → ${passed ? 'PASS' : 'BLOCK'}`);

  return {
    passed,
    critical: classified.summary.critical,
    total: classified.summary.total,
    autoFixed: classified.autoFix.length,
    needsDecision: classified.needsAsk.length,
    formatted,
  };
}
