/**
 * aing Progress Tracker v0.4.0
 * Human-readable progress file + git-based checkpoints.
 * Harness Engineering: Inform axis — multi-session continuity.
 *
 * Generates `aing-progress.md` at project root for humans & agents to read.
 * @module scripts/guardrail/progress-tracker
 */
interface ProgressParams {
    feature: string;
    stage: string;
    stepCurrent: number;
    stepTotal: number;
    completed?: string[];
    remaining?: string[];
    lastAction?: string;
}
/**
 * Update the human-readable progress file.
 */
export declare function updateProgress(params: ProgressParams, projectDir?: string): void;
/**
 * Get progress summary for session-start context injection.
 */
export declare function getProgressSummary(projectDir?: string): string | null;
export {};
//# sourceMappingURL=progress-tracker.d.ts.map