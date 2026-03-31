/**
 * aing Recovery Engine (Innovation #5 — Self-Healing Engine)
 * Restores corrupted state files from snapshots or backups.
 * @module scripts/recovery/recovery-engine
 */
interface RecoveryResult {
    recovered: boolean;
    source: string;
    data?: unknown;
}
/**
 * Attempt to recover a corrupted state file.
 * Recovery priority: emergency backup → latest snapshot → fresh state.
 */
export declare function recoverState(stateFile: string, projectDir?: string): RecoveryResult;
export {};
//# sourceMappingURL=recovery-engine.d.ts.map