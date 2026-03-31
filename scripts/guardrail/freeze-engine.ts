/**
 * aing Freeze Engine — Directory-Scoped Edit Restriction
 *
 * Restricts Edit/Write tools to a specific directory.
 * Uses trailing slash semantics: /src/ won't match /src-old/
 *
 * @module scripts/guardrail/freeze-engine
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createLogger } from '../core/logger.js';

const log = createLogger('freeze');

const STATE_FILE = 'freeze-dir.txt';

interface FreezeResult {
  ok: boolean;
  freezeDir?: string;
}

interface FreezeCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Set freeze boundary.
 */
export function setFreeze(directory: string, projectDir?: string): FreezeResult {
  const dir = projectDir || process.cwd();
  const stateDir = join(dir, '.aing', 'state');
  mkdirSync(stateDir, { recursive: true });

  // Resolve to absolute path with trailing slash
  let freezeDir = resolve(directory);
  if (!freezeDir.endsWith('/')) freezeDir += '/';

  writeFileSync(join(stateDir, STATE_FILE), freezeDir);
  log.info(`Freeze set: ${freezeDir}`);

  return { ok: true, freezeDir };
}

/**
 * Clear freeze boundary.
 */
export function clearFreeze(projectDir?: string): { ok: boolean } {
  const dir = projectDir || process.cwd();
  const statePath = join(dir, '.aing', 'state', STATE_FILE);

  if (existsSync(statePath)) {
    unlinkSync(statePath);
    log.info('Freeze cleared');
  }

  return { ok: true };
}

/**
 * Get current freeze directory.
 */
export function getFreezeDir(projectDir?: string): string | null {
  const dir = projectDir || process.cwd();
  const statePath = join(dir, '.aing', 'state', STATE_FILE);

  if (!existsSync(statePath)) return null;

  try {
    return readFileSync(statePath, 'utf-8').trim();
  } catch {
    return null;
  }
}

/**
 * Check if a file path is allowed under current freeze.
 */
export function checkFreeze(filePath: string, projectDir?: string): FreezeCheckResult {
  const freezeDir = getFreezeDir(projectDir);

  // No freeze active = everything allowed
  if (!freezeDir) return { allowed: true };

  const absolutePath = resolve(filePath);

  // Trailing slash prevents /src matching /src-old
  if (absolutePath.startsWith(freezeDir) || absolutePath + '/' === freezeDir) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `File ${absolutePath} is outside freeze boundary ${freezeDir}. Run /aing unfreeze to remove restriction.`,
  };
}

/**
 * Format freeze status for display.
 */
export function formatFreezeStatus(projectDir?: string): string {
  const freezeDir = getFreezeDir(projectDir);

  if (!freezeDir) {
    return 'Freeze: OFF (all directories writable)';
  }

  return `Freeze: ON — edits restricted to ${freezeDir}\n  Edit/Write outside this directory will be blocked.\n  Run /aing unfreeze to remove.`;
}
