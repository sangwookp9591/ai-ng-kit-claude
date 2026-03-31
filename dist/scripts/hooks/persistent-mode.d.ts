/**
 * aing Persistent Mode State Utility
 * Shared module for hooks to check/set persistent (ralph-like) execution state.
 * @module scripts/hooks/persistent-mode
 */
export interface PersistentModeState {
    active: boolean;
    mode: string;
    startedAt: string;
    reason: string;
}
/**
 * Activate persistent mode. Subsequent stop hooks will inject advisory context.
 */
export declare function activatePersistentMode(projectDir: string, mode: string, reason: string): Promise<void>;
/**
 * Deactivate persistent mode. Preserves the last mode for audit.
 */
export declare function deactivatePersistentMode(projectDir: string): Promise<void>;
/**
 * Read current persistent mode state. Returns null if not set.
 */
export declare function getPersistentModeState(projectDir: string): Promise<PersistentModeState | null>;
//# sourceMappingURL=persistent-mode.d.ts.map