/**
 * aing State Introspection
 * Provides state listing, clearing, and status summaries.
 * Used by /aing cancel and agent self-management.
 * @module scripts/core/state-introspection
 */
export interface ActiveState {
    file: string;
    mode: string;
    active: boolean;
    updatedAt: string | null;
    ageMinutes: number;
}
export interface ClearResult {
    cleared: string[];
    denied: string[];
}
export interface ClearOptions {
    force?: boolean;
}
export interface StateStatus {
    totalFiles: number;
    activeCount: number;
    staleCount: number;
    diskUsageBytes: number;
}
/**
 * List all active state files in .aing/state/.
 * "Active" = has `active: true` or `updatedAt` within 1 hour.
 */
export declare function listActiveStates(projectDir: string): ActiveState[];
/**
 * Delete state files matching a glob-like pattern.
 * Protected files are denied unless force: true.
 * @param pattern - Simple prefix match (e.g., 'team-*' matches 'team-session.json')
 */
export declare function clearState(projectDir: string, pattern: string, options?: ClearOptions): ClearResult;
/**
 * Get aggregate state directory status.
 */
export declare function getStateStatus(projectDir: string): StateStatus;
//# sourceMappingURL=state-introspection.d.ts.map