export interface ThresholdConfig {
    percentIncrease: number;
    absoluteMs?: number;
}
export interface ThresholdSet {
    timing: {
        regression: {
            percentIncrease: number;
            absoluteMs: number;
        };
        warning: {
            percentIncrease: number;
        };
    };
    bundle: {
        regression: {
            percentIncrease: number;
        };
        warning: {
            percentIncrease: number;
        };
    };
    requests: {
        warning: {
            percentIncrease: number;
        };
    };
}
export interface BudgetConfig {
    label: string;
    budget: number;
    unit: string;
}
export interface PerfMetrics {
    ttfb?: number;
    fcp?: number;
    lcp?: number;
    domInteractive?: number;
    domComplete?: number;
    fullLoad?: number;
    totalRequests?: number;
    totalTransfer?: number;
    jsBundle?: number;
    cssBundle?: number;
    cls?: number;
    totalJs?: number;
    totalCss?: number;
    savedAt?: string;
    [key: string]: number | string | undefined;
}
export interface ComparisonResult {
    metric: string;
    baseline: number;
    current: number;
    delta: string;
    status: 'PASS' | 'WARNING' | 'REGRESSION';
}
export interface BudgetResult {
    metric: string;
    budget: number;
    actual: number;
    unit: string;
    status: 'PASS' | 'FAIL';
}
/**
 * Performance regression thresholds.
 */
export declare const THRESHOLDS: ThresholdSet;
/**
 * Performance budget targets.
 */
export declare const BUDGETS: Record<string, BudgetConfig>;
/**
 * Compare current metrics against baseline.
 */
export declare function compareMetrics(current: PerfMetrics, baseline: PerfMetrics): ComparisonResult[];
/**
 * Check metrics against performance budgets.
 */
export declare function checkBudgets(metrics: PerfMetrics): BudgetResult[];
/**
 * Calculate performance grade.
 */
export declare function calculateGrade(budgetResults: BudgetResult[]): string;
/**
 * Save baseline metrics.
 */
export declare function saveBaseline(url: string, metrics: PerfMetrics, projectDir?: string): void;
/**
 * Load baseline metrics.
 */
export declare function loadBaseline(url: string, projectDir?: string): PerfMetrics | null;
/**
 * Format benchmark report.
 */
export declare function formatBenchmarkReport(comparison: ComparisonResult[], budgets: BudgetResult[], grade: string): string;
//# sourceMappingURL=benchmark-engine.d.ts.map