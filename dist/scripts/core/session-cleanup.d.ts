/**
 * aing Session Cleanup Engine
 * Centralized transient cleanup for session start/stop.
 * Owns: locks, temps, handoffs, stale mode states.
 * Does NOT touch: PDCA features (owned by state-gc.ts).
 * @module scripts/core/session-cleanup
 */
export interface CleanupOptions {
    dryRun?: boolean;
    maxHandoffAgeDays?: number;
    maxLockAgeSec?: number;
}
export interface CleanupResult {
    cleaned: string[];
    errors: string[];
    skipped: string[];
}
/**
 * Run centralized session cleanup.
 * All operations are best-effort — never throws.
 */
export declare function runSessionCleanup(projectDir: string, options?: CleanupOptions): CleanupResult;
//# sourceMappingURL=session-cleanup.d.ts.map