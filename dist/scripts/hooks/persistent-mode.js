/**
 * aing Persistent Mode State Utility
 * Shared module for hooks to check/set persistent (ralph-like) execution state.
 * @module scripts/hooks/persistent-mode
 */
import { readState, writeState } from '../core/state.js';
import { join } from 'node:path';
function statePath(projectDir) {
    return join(projectDir, '.aing', 'state', 'persistent-mode.json');
}
/**
 * Activate persistent mode. Subsequent stop hooks will inject advisory context.
 */
export async function activatePersistentMode(projectDir, mode, reason) {
    const state = {
        active: true,
        mode,
        startedAt: new Date().toISOString(),
        reason,
    };
    const result = writeState(statePath(projectDir), state);
    if (!result.ok) {
        throw new Error(result.error);
    }
}
/**
 * Deactivate persistent mode. Preserves the last mode for audit.
 */
export async function deactivatePersistentMode(projectDir) {
    const existing = await getPersistentModeState(projectDir);
    const state = {
        active: false,
        mode: existing?.mode ?? 'auto',
        startedAt: existing?.startedAt ?? new Date().toISOString(),
        reason: existing?.reason ?? '',
    };
    const result = writeState(statePath(projectDir), state);
    if (!result.ok) {
        throw new Error(result.error);
    }
}
/**
 * Read current persistent mode state. Returns null if not set.
 */
export async function getPersistentModeState(projectDir) {
    const result = readState(statePath(projectDir));
    if (!result.ok)
        return null;
    return result.data;
}
//# sourceMappingURL=persistent-mode.js.map