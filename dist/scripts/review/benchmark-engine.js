/**
 * aing Benchmark Engine — Performance Regression Detection
 * Uses MCP Playwright for browser-based performance measurement.
 *
 * @module scripts/review/benchmark-engine
 */
import { readStateOrDefault, writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
const log = createLogger('benchmark');
/**
 * Performance regression thresholds.
 */
export const THRESHOLDS = {
    timing: {
        regression: { percentIncrease: 50, absoluteMs: 500 },
        warning: { percentIncrease: 20 },
    },
    bundle: {
        regression: { percentIncrease: 25 },
        warning: { percentIncrease: 10 },
    },
    requests: {
        warning: { percentIncrease: 30 },
    },
};
/**
 * Performance budget targets.
 */
export const BUDGETS = {
    fcp: { label: 'First Contentful Paint', budget: 1800, unit: 'ms' },
    lcp: { label: 'Largest Contentful Paint', budget: 2500, unit: 'ms' },
    cls: { label: 'Cumulative Layout Shift', budget: 0.1, unit: '' },
    totalJs: { label: 'Total JavaScript', budget: 500000, unit: 'bytes' },
    totalCss: { label: 'Total CSS', budget: 100000, unit: 'bytes' },
};
/**
 * Compare current metrics against baseline.
 */
export function compareMetrics(current, baseline) {
    const results = [];
    const timingMetrics = ['ttfb', 'fcp', 'lcp', 'domInteractive', 'domComplete', 'fullLoad'];
    const bundleMetrics = ['jsBundle', 'cssBundle'];
    for (const key of timingMetrics) {
        if (current[key] == null || baseline[key] == null)
            continue;
        const currentVal = current[key];
        const baselineVal = baseline[key];
        const pctChange = baselineVal > 0 ? ((currentVal - baselineVal) / baselineVal) * 100 : 0;
        const absChange = currentVal - baselineVal;
        let status = 'PASS';
        if (pctChange > THRESHOLDS.timing.regression.percentIncrease ||
            absChange > THRESHOLDS.timing.regression.absoluteMs) {
            status = 'REGRESSION';
        }
        else if (pctChange > THRESHOLDS.timing.warning.percentIncrease) {
            status = 'WARNING';
        }
        results.push({
            metric: key,
            baseline: baselineVal,
            current: currentVal,
            delta: `${pctChange >= 0 ? '+' : ''}${Math.round(pctChange)}%`,
            status,
        });
    }
    for (const key of bundleMetrics) {
        if (current[key] == null || baseline[key] == null)
            continue;
        const currentVal = current[key];
        const baselineVal = baseline[key];
        const pctChange = baselineVal > 0 ? ((currentVal - baselineVal) / baselineVal) * 100 : 0;
        let status = 'PASS';
        if (pctChange > THRESHOLDS.bundle.regression.percentIncrease)
            status = 'REGRESSION';
        else if (pctChange > THRESHOLDS.bundle.warning.percentIncrease)
            status = 'WARNING';
        results.push({
            metric: key,
            baseline: baselineVal,
            current: currentVal,
            delta: `${pctChange >= 0 ? '+' : ''}${Math.round(pctChange)}%`,
            status,
        });
    }
    // Request count
    if (current.totalRequests != null && baseline.totalRequests != null) {
        const pctChange = baseline.totalRequests > 0
            ? ((current.totalRequests - baseline.totalRequests) / baseline.totalRequests) * 100 : 0;
        results.push({
            metric: 'totalRequests',
            baseline: baseline.totalRequests,
            current: current.totalRequests,
            delta: `${pctChange >= 0 ? '+' : ''}${Math.round(pctChange)}%`,
            status: pctChange > THRESHOLDS.requests.warning.percentIncrease ? 'WARNING' : 'PASS',
        });
    }
    return results;
}
/**
 * Check metrics against performance budgets.
 */
export function checkBudgets(metrics) {
    const results = [];
    for (const [key, config] of Object.entries(BUDGETS)) {
        if (metrics[key] == null)
            continue;
        const actual = metrics[key];
        results.push({
            metric: config.label,
            budget: config.budget,
            actual,
            unit: config.unit,
            status: actual <= config.budget ? 'PASS' : 'FAIL',
        });
    }
    return results;
}
/**
 * Calculate performance grade.
 */
export function calculateGrade(budgetResults) {
    const passCount = budgetResults.filter(r => r.status === 'PASS').length;
    const total = budgetResults.length;
    if (total === 0)
        return 'N/A';
    const ratio = passCount / total;
    if (ratio >= 0.9)
        return 'A';
    if (ratio >= 0.75)
        return 'B';
    if (ratio >= 0.6)
        return 'C';
    if (ratio >= 0.4)
        return 'D';
    return 'F';
}
/**
 * Save baseline metrics.
 */
export function saveBaseline(url, metrics, projectDir) {
    const dir = projectDir || process.cwd();
    const path = join(dir, '.aing', 'benchmarks', 'baseline.json');
    const data = readStateOrDefault(path, { pages: {} });
    data.pages[url] = { ...metrics, savedAt: new Date().toISOString() };
    data.lastUpdated = new Date().toISOString();
    writeState(path, data);
    log.info(`Baseline saved for ${url}`);
}
/**
 * Load baseline metrics.
 */
export function loadBaseline(url, projectDir) {
    const dir = projectDir || process.cwd();
    const path = join(dir, '.aing', 'benchmarks', 'baseline.json');
    const data = readStateOrDefault(path, { pages: {} });
    return data.pages?.[url] || null;
}
/**
 * Format benchmark report.
 */
export function formatBenchmarkReport(comparison, budgets, grade) {
    const lines = [
        `Performance Benchmark: Grade ${grade}`,
        '',
        'Metric              Baseline    Current     Delta       Status',
        '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500           \u2500\u2500\u2500\u2500\u2500\u2500      \u2500\u2500\u2500\u2500\u2500\u2500      \u2500\u2500\u2500\u2500\u2500\u2500      \u2500\u2500\u2500\u2500\u2500\u2500',
    ];
    for (const r of comparison) {
        const icon = r.status === 'PASS' ? '\u2713' : r.status === 'WARNING' ? '\u25b3' : '\u2717';
        lines.push(`${icon} ${r.metric.padEnd(18)} ${String(r.baseline).padStart(8)}  ${String(r.current).padStart(8)}  ${r.delta.padStart(8)}  ${r.status}`);
    }
    const regressions = comparison.filter(r => r.status === 'REGRESSION');
    if (regressions.length > 0) {
        lines.push('', `\u26a0 ${regressions.length} regression(s) detected`);
    }
    lines.push('', 'Budget Check:');
    for (const b of budgets) {
        const icon = b.status === 'PASS' ? '\u2713' : '\u2717';
        lines.push(`  ${icon} ${b.metric}: ${b.actual}${b.unit} / ${b.budget}${b.unit}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=benchmark-engine.js.map