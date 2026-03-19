/**
 * sw-kit State Manager — Atomic file I/O
 * All writes use temp+rename pattern to prevent corruption.
 * @module scripts/core/state
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * Read JSON state file safely.
 * @param {string} filePath - Absolute path to JSON file
 * @returns {{ ok: true, data: any } | { ok: false, error: string }}
 */
export function readState(filePath) {
  try {
    if (!existsSync(filePath)) {
      return { ok: false, error: `File not found: ${filePath}` };
    }
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: `Failed to read ${filePath}: ${err.message}` };
  }
}

/**
 * Write JSON state file atomically (temp file + rename).
 * @param {string} filePath - Absolute path to target file
 * @param {any} data - Data to serialize as JSON
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function writeState(filePath, data) {
  const tmpSuffix = randomBytes(6).toString('hex');
  const tmpPath = `${filePath}.${tmpSuffix}.tmp`;

  try {
    mkdirSync(dirname(filePath), { recursive: true });
    const json = JSON.stringify(data, null, 2);
    writeFileSync(tmpPath, json, 'utf-8');
    renameSync(tmpPath, filePath);
    return { ok: true };
  } catch (err) {
    // Clean up temp file on failure
    try { unlinkSync(tmpPath); } catch (_) { /* best effort */ }
    return { ok: false, error: `Failed to write ${filePath}: ${err.message}` };
  }
}

/**
 * Delete a state file if it exists.
 * @param {string} filePath
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function deleteState(filePath) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to delete ${filePath}: ${err.message}` };
  }
}

/**
 * Read state with fallback to default value.
 * @param {string} filePath
 * @param {any} defaultValue
 * @returns {any}
 */
export function readStateOrDefault(filePath, defaultValue) {
  const result = readState(filePath);
  return result.ok ? result.data : defaultValue;
}
