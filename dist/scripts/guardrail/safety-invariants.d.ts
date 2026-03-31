/**
 * aing Safety Invariants v0.3.0
 * Hard limits that can never be overridden by the agent.
 * Harness Engineering: Constrain axis — absolute boundaries.
 * @module scripts/guardrail/safety-invariants
 */
interface Invariants {
    maxSteps: number;
    maxFileChanges: number;
    maxSessionMinutes: number;
    forbiddenPaths: string[];
    requireTestBeforeCommit: boolean;
    maxConsecutiveErrors: number;
}
interface LimitCheckResult {
    ok: boolean;
    current: number;
    max: number;
    message?: string;
}
interface PathCheckResult {
    ok: boolean;
    message?: string;
}
interface TrackerStatus {
    steps: string;
    fileChanges: string;
    errors: string;
    startedAt: string | null;
    changedFiles: string[];
}
/**
 * Load invariant limits (config overrides defaults, but cannot exceed hard max).
 */
export declare function loadInvariants(_projectDir?: string): Invariants;
/**
 * Track and check step count invariant.
 */
export declare function checkStepLimit(projectDir?: string): LimitCheckResult;
/**
 * Track and check file change count.
 */
export declare function checkFileChangeLimit(filePath: string, projectDir?: string): LimitCheckResult;
/**
 * Check if a path is in the forbidden list.
 */
export declare function checkForbiddenPath(filePath: string, projectDir?: string): PathCheckResult;
/**
 * Track consecutive errors and check limit.
 */
export declare function checkErrorLimit(projectDir?: string): LimitCheckResult;
/**
 * Reset error counter (called on successful operation).
 */
export declare function resetErrorCount(projectDir?: string): void;
/**
 * Reset all invariant trackers (called at session start).
 */
export declare function resetTrackers(projectDir?: string): void;
/**
 * Get current tracker status for display.
 */
export declare function getTrackerStatus(projectDir?: string): TrackerStatus;
export {};
//# sourceMappingURL=safety-invariants.d.ts.map