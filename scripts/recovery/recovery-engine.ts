/**
 * aing Recovery Engine (Innovation #5 — Self-Healing Engine)
 * Restores corrupted state files from snapshots or backups.
 * @module scripts/recovery/recovery-engine
 */

import { readState, writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';

const log = createLogger('recovery-engine');

interface RecoveryResult {
  recovered: boolean;
  source: string;
  data?: unknown;
}

interface StateReadResult {
  ok: boolean;
  data?: { state?: unknown };
  error?: string;
}

interface StateWriteResult {
  ok: boolean;
}

/**
 * Attempt to recover a corrupted state file.
 * Recovery priority: emergency backup → latest snapshot → fresh state.
 */
export function recoverState(stateFile: string, projectDir?: string): RecoveryResult {
  const dir = projectDir || process.cwd();

  // Priority 1: Emergency backup
  const emergencyPath = join(dir, '.aing', 'state', `${stateFile.replace('.json', '')}-emergency-backup.json`);
  if (existsSync(emergencyPath)) {
    const result = readState(emergencyPath) as StateReadResult;
    if (result.ok && result.data?.state) {
      const restored = writeState(join(dir, '.aing', 'state', stateFile), result.data.state) as StateWriteResult;
      if (restored.ok) {
        log.info(`Recovered ${stateFile} from emergency backup`);
        return { recovered: true, source: 'emergency-backup', data: result.data.state };
      }
    }
  }

  // Priority 2: Latest snapshot
  const snapshotDir = join(dir, '.aing', 'snapshots');
  if (existsSync(snapshotDir)) {
    const snapshots = readdirSync(snapshotDir)
      .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
      .sort()
      .reverse();

    for (const snapshot of snapshots) {
      const result = readState(join(snapshotDir, snapshot)) as StateReadResult;
      if (result.ok && result.data?.state) {
        const restored = writeState(join(dir, '.aing', 'state', stateFile), result.data.state) as StateWriteResult;
        if (restored.ok) {
          log.info(`Recovered ${stateFile} from snapshot ${snapshot}`);
          return { recovered: true, source: `snapshot:${snapshot}`, data: result.data.state };
        }
      }
    }
  }

  // Priority 3: Fresh state
  const freshState = { version: 1, features: {}, createdAt: new Date().toISOString() };
  const restored = writeState(join(dir, '.aing', 'state', stateFile), freshState) as StateWriteResult;
  if (restored.ok) {
    log.warn(`Reset ${stateFile} to fresh state (no backup found)`);
    return { recovered: true, source: 'fresh', data: freshState };
  }

  log.error(`Failed to recover ${stateFile}`);
  return { recovered: false, source: 'none' };
}
