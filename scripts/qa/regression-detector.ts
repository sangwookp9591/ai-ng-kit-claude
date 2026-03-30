/**
 * aing Regression Detector — Compare test results against baseline
 * @module scripts/qa/regression-detector
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';

const log = createLogger('regression');

export interface TestResults {
  passCount: number;
  totalCount: number;
  errors: string[];
}

export interface RegressionResult {
  hasRegression: boolean;
  newFailures: string[];
  fixedTests: number;
  details: {
    noBaseline?: boolean;
    baselinePass?: number;
    currentPass?: number;
    delta?: number;
    baselineDate?: string;
  };
}

interface BaselineData extends TestResults {
  feature: string;
  savedAt: string;
}

/**
 * Save current test results as baseline.
 */
export function saveBaseline(feature: string, results: TestResults, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const path = join(dir, '.aing', 'qa', `baseline-${feature}.json`);
  writeState(path, {
    feature,
    ...results,
    savedAt: new Date().toISOString(),
  });
  log.info(`Baseline saved for ${feature}: ${results.passCount}/${results.totalCount}`);
}

/**
 * Compare current results against baseline.
 */
export function detectRegression(feature: string, current: TestResults, projectDir?: string): RegressionResult {
  const dir = projectDir || process.cwd();
  const path = join(dir, '.aing', 'qa', `baseline-${feature}.json`);
  const baseline = readStateOrDefault(path, null) as BaselineData | null;

  if (!baseline) {
    return { hasRegression: false, newFailures: [], fixedTests: 0, details: { noBaseline: true } };
  }

  const baselineErrors = new Set(baseline.errors || []);
  const currentErrors = new Set(current.errors || []);

  const newFailures = [...currentErrors].filter(e => !baselineErrors.has(e));
  const fixedTests = [...baselineErrors].filter(e => !currentErrors.has(e));

  const passCountDelta = current.passCount - (baseline.passCount || 0);

  return {
    hasRegression: newFailures.length > 0,
    newFailures,
    fixedTests: fixedTests.length,
    details: {
      baselinePass: baseline.passCount,
      currentPass: current.passCount,
      delta: passCountDelta,
      baselineDate: baseline.savedAt,
    },
  };
}

/**
 * Format regression result.
 */
export function formatRegression(result: RegressionResult): string {
  if (result.details?.noBaseline) return 'No baseline found. Run /aing qa-loop first to establish baseline.';

  const lines: string[] = [`Regression Check: ${result.hasRegression ? 'REGRESSION DETECTED' : 'CLEAN'}`];
  lines.push(`  Pass count: ${result.details.baselinePass} \u2192 ${result.details.currentPass} (${(result.details.delta ?? 0) >= 0 ? '+' : ''}${result.details.delta})`);

  if (result.newFailures.length > 0) {
    lines.push(`\n  New Failures (${result.newFailures.length}):`);
    for (const f of result.newFailures) lines.push(`    \u2717 ${f}`);
  }

  if (result.fixedTests > 0) {
    lines.push(`\n  Fixed: ${result.fixedTests} tests now pass`);
  }

  return lines.join('\n');
}
