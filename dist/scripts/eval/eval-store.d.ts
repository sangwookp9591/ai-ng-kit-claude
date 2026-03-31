/**
 * aing Eval Store — Persistent eval result storage
 *
 * Stores eval runs as JSON files under .aing/evals/ using the
 * atomic write pattern from scripts/core/state.ts.
 *
 * @module scripts/eval/eval-store
 */
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
/**
 * Persist an eval run summary to disk using atomic writes.
 * @returns The absolute path of the saved file.
 */
export declare function saveEvalRun(summary: EvalRunSummary, projectDir?: string): string;
/**
 * Load the most recent eval run from disk.
 * Returns null if no evals exist.
 */
export declare function loadLatestEval(projectDir?: string): EvalRunSummary | null;
/**
 * Load the last N eval runs, newest first.
 */
export declare function loadEvalHistory(limit?: number, projectDir?: string): EvalRunSummary[];
/**
 * Compare two eval runs and produce a regression report.
 * Identifies score regressions, improvements, and new/removed skills.
 */
export declare function compareRuns(current: EvalRunSummary, baseline: EvalRunSummary): RegressionReport;
/**
 * Format a regression report as a human-readable string.
 */
export declare function formatRegressionReport(report: RegressionReport): string;
//# sourceMappingURL=eval-store.d.ts.map