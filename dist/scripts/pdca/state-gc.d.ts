/**
 * aing State GC — Zombie Feature Garbage Collector
 * Identifies and archives stale/zombie PDCA features.
 *
 * Zombie criteria (ALL must be true):
 *   - iteration === 0 (never iterated)
 *   - evidence array is empty
 *   - startedAt is older than maxAgeDays (or missing)
 *   - currentStage is 'plan' or 'do'
 *
 * @module scripts/pdca/state-gc
 */
interface GCOptions {
    maxAgeDays?: number;
    dryRun?: boolean;
}
interface GCResult {
    removed: number;
    archived: string[];
}
/**
 * Run garbage collection on pdca-status.json.
 */
export declare function runGC(projectDir: string, options?: GCOptions): GCResult;
export {};
//# sourceMappingURL=state-gc.d.ts.map