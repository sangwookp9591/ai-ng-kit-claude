export interface EvalResult {
    testName: string;
    timestamp: string;
    duration: number;
    passed: boolean;
    score?: number;
    details: Record<string, unknown>;
}
export interface EvalComparison {
    improved: string[];
    regressed: string[];
    unchanged: string[];
    newTests: string[];
}
/**
 * Persist an {@link EvalResult} to disk.
 * @returns The absolute path of the saved file.
 */
export declare function saveEval(result: EvalResult): string;
/**
 * Load the most recent eval result for a given test name.
 * Returns `null` when no prior result exists.
 */
export declare function loadLatestEval(testName: string): EvalResult | null;
/**
 * List stored eval results, newest first.
 * @param limit Maximum number of results to return (default 50).
 */
export declare function listEvals(limit?: number): EvalResult[];
/**
 * Compare two sets of eval results (baseline vs current).
 *
 * Classification logic:
 *   - **improved**: failed -> passed, or score increased by >= 0.5
 *   - **regressed**: passed -> failed, or score decreased by >= 0.5
 *   - **unchanged**: no meaningful change
 *   - **newTests**: present in current but not in baseline
 */
export declare function compareEvals(baseline: EvalResult[], current: EvalResult[]): EvalComparison;
/**
 * Generate a human-readable summary string from an {@link EvalComparison}.
 */
export declare function formatComparison(cmp: EvalComparison): string;
//# sourceMappingURL=eval-store.d.ts.map