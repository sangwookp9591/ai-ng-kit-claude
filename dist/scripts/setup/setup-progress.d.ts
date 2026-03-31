interface ResumeInfo {
    lastCompletedStep: number;
    configTarget: string;
    timestamp: string;
}
interface MarkCompleteOpts {
    version: string;
    configTarget: string;
    hudEnabled: boolean;
    defaultMode: string;
}
interface SetupStatus {
    completed: boolean;
    version?: string;
    configTarget?: string;
    hudEnabled?: boolean;
    defaultMode?: string;
    completedAt?: string;
}
/**
 * Save setup progress after a phase completes.
 */
export declare function saveProgress(step: number, configTarget: string, projectDir?: string): void;
/**
 * Clear setup state (for fresh start).
 */
export declare function clearProgress(projectDir?: string): void;
/**
 * Check if there's a resumable setup session.
 * Returns null if fresh, or { lastCompletedStep, configTarget } if resumable.
 * State older than 24h is auto-cleared.
 */
export declare function checkResume(projectDir?: string): ResumeInfo | null;
/**
 * Mark setup as completed. Clears temp state, writes persistent config.
 */
export declare function markComplete(opts: MarkCompleteOpts, projectDir?: string): void;
/**
 * Check if setup has been completed before.
 */
export declare function isSetupComplete(): SetupStatus;
export {};
//# sourceMappingURL=setup-progress.d.ts.map