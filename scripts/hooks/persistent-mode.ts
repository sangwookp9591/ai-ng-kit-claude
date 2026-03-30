/**
 * aing Persistent Mode State Utility
 * Shared module for hooks to check/set persistent (ralph-like) execution state.
 * @module scripts/hooks/persistent-mode
 */

import { readState, writeState } from '../core/state.js';
import { join } from 'node:path';

export interface PersistentModeState {
  active: boolean;
  mode: string; // 'auto' | 'team' | 'pdca'
  startedAt: string;
  reason: string;
}

function statePath(projectDir: string): string {
  return join(projectDir, '.aing', 'state', 'persistent-mode.json');
}

/**
 * Activate persistent mode. Subsequent stop hooks will inject advisory context.
 */
export async function activatePersistentMode(
  projectDir: string,
  mode: string,
  reason: string
): Promise<void> {
  const state: PersistentModeState = {
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
export async function deactivatePersistentMode(projectDir: string): Promise<void> {
  const existing = await getPersistentModeState(projectDir);
  const state: PersistentModeState = {
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
export async function getPersistentModeState(
  projectDir: string
): Promise<PersistentModeState | null> {
  const result = readState(statePath(projectDir));
  if (!result.ok) return null;
  return result.data as PersistentModeState;
}
