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
/**
 * Save current test results as baseline.
 */
export declare function saveBaseline(feature: string, results: TestResults, projectDir?: string): void;
/**
 * Compare current results against baseline.
 */
export declare function detectRegression(feature: string, current: TestResults, projectDir?: string): RegressionResult;
/**
 * Format regression result.
 */
export declare function formatRegression(result: RegressionResult): string;
//# sourceMappingURL=regression-detector.d.ts.map