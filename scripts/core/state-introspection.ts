/**
 * aing State Introspection
 * Provides state listing, clearing, and status summaries.
 * Used by /aing cancel and agent self-management.
 * @module scripts/core/state-introspection
 */

import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from './logger.js';
import { PROTECTED_FILES } from './protected-files.js';

const log = createLogger('state-introspection');

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
export function listActiveStates(projectDir: string): ActiveState[] {
  const stateDir = join(projectDir, '.aing', 'state');
  if (!existsSync(stateDir)) return [];

  const results: ActiveState[] = [];
  const files = readdirSync(stateDir);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = join(stateDir, file);

    try {
      const raw = readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, unknown>;

      const isActive = data.active === true;
      const updatedAt = (data.updatedAt as string) || (data.startedAt as string) || null;
      const recentlyUpdated = updatedAt ? new Date(updatedAt).getTime() > oneHourAgo : false;

      if (isActive || recentlyUpdated) {
        const ageMs = updatedAt ? Date.now() - new Date(updatedAt).getTime() : 0;
        const mode = file.replace(/-(state|session|mode)\.json$/, '').replace('.json', '');
        results.push({
          file,
          mode,
          active: isActive,
          updatedAt,
          ageMinutes: Math.round(ageMs / 60000),
        });
      }
    } catch {
      // Malformed JSON — skip silently
    }
  }

  return results;
}

/**
 * Delete state files matching a glob-like pattern.
 * Protected files are denied unless force: true.
 * @param pattern - Simple prefix match (e.g., 'team-*' matches 'team-session.json')
 */
export function clearState(projectDir: string, pattern: string, options?: ClearOptions): ClearResult {
  const stateDir = join(projectDir, '.aing', 'state');
  const result: ClearResult = { cleared: [], denied: [] };

  if (!existsSync(stateDir)) return result;

  const force = options?.force ?? false;
  const prefix = pattern.replace(/\*$/, '');
  const files = readdirSync(stateDir);

  for (const file of files) {
    if (!file.startsWith(prefix)) continue;

    if (PROTECTED_FILES.has(file) && !force) {
      result.denied.push(file);
      continue;
    }

    try {
      unlinkSync(join(stateDir, file));
      result.cleared.push(file);
    } catch (err) {
      log.error(`Failed to clear ${file}`, { error: (err as Error).message });
    }
  }

  return result;
}

/**
 * Get aggregate state directory status.
 */
export function getStateStatus(projectDir: string): StateStatus {
  const stateDir = join(projectDir, '.aing', 'state');
  const status: StateStatus = { totalFiles: 0, activeCount: 0, staleCount: 0, diskUsageBytes: 0 };

  if (!existsSync(stateDir)) return status;

  const files = readdirSync(stateDir);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const file of files) {
    const filePath = join(stateDir, file);
    try {
      const stat = statSync(filePath);
      status.totalFiles++;
      status.diskUsageBytes += stat.size;

      if (file.endsWith('.json')) {
        const raw = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw) as Record<string, unknown>;
        if (data.active === true) {
          status.activeCount++;
          const startedAt = data.startedAt as string | undefined;
          if (startedAt && new Date(startedAt).getTime() < oneHourAgo) {
            status.staleCount++;
          }
        }
      }
    } catch {
      // Skip unreadable files
      status.totalFiles++;
    }
  }

  return status;
}
