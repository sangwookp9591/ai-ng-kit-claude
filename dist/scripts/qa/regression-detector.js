/**
 * aing Regression Detector — Compare test results against baseline
 * @module scripts/qa/regression-detector
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
const log = createLogger('regression');
/**
 * Save current test results as baseline.
 */
export function saveBaseline(feature, results, projectDir) {
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
export function detectRegression(feature, current, projectDir) {
    const dir = projectDir || process.cwd();
    const path = join(dir, '.aing', 'qa', `baseline-${feature}.json`);
    const baseline = readStateOrDefault(path, null);
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
export function formatRegression(result) {
    if (result.details?.noBaseline)
        return 'No baseline found. Run /aing qa-loop first to establish baseline.';
    const lines = [`Regression Check: ${result.hasRegression ? 'REGRESSION DETECTED' : 'CLEAN'}`];
    lines.push(`  Pass count: ${result.details.baselinePass} \u2192 ${result.details.currentPass} (${(result.details.delta ?? 0) >= 0 ? '+' : ''}${result.details.delta})`);
    if (result.newFailures.length > 0) {
        lines.push(`\n  New Failures (${result.newFailures.length}):`);
        for (const f of result.newFailures)
            lines.push(`    \u2717 ${f}`);
    }
    if (result.fixedTests > 0) {
        lines.push(`\n  Fixed: ${result.fixedTests} tests now pass`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=regression-detector.js.map