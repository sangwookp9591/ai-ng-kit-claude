/**
 * aing State Manager — Atomic file I/O
 * All writes use temp+rename pattern to prevent corruption.
 * @module scripts/core/state
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

interface ReadStateSuccess {
  ok: true;
  data: unknown;
}

interface ReadStateFailure {
  ok: false;
  error: string;
}

type ReadStateResult = ReadStateSuccess | ReadStateFailure;

interface WriteStateSuccess {
  ok: true;
}

interface WriteStateFailure {
  ok: false;
  error: string;
}

type WriteStateResult = WriteStateSuccess | WriteStateFailure;

interface UpdateStateSuccess {
  ok: true;
  data: unknown;
}

type UpdateStateResult = UpdateStateSuccess | WriteStateFailure;

// ---------------------------------------------------------------------------
// TTL Read Cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5_000;
const CACHE_MAX = 200;

interface CacheEntry {
  data: unknown;
  ts: number;
}

const _cache = new Map<string, CacheEntry>();

function cacheGet(filePath: string): unknown | undefined {
  const entry = _cache.get(filePath);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    _cache.delete(filePath);
    return undefined;
  }
  return entry.data;
}

function cacheSet(filePath: string, data: unknown): void {
  if (_cache.size >= CACHE_MAX) {
    // LRU eviction: remove the oldest entry
    const oldest = _cache.keys().next().value;
    if (oldest !== undefined) _cache.delete(oldest);
  }
  _cache.set(filePath, { data, ts: Date.now() });
}

function cacheInvalidate(filePath: string): void {
  _cache.delete(filePath);
}

// ---------------------------------------------------------------------------
// Advisory File Lock
// ---------------------------------------------------------------------------

const LOCK_TIMEOUT_MS = 500;
const LOCK_STALE_MS = 10_000;

function lockPath(filePath: string): string {
  return `${filePath}.lock`;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock(filePath: string): boolean {
  const lp = lockPath(filePath);
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    // Check for stale lock
    if (existsSync(lp)) {
      try {
        const stat = statSync(lp);
        const age = Date.now() - stat.mtimeMs;
        if (age > LOCK_STALE_MS) {
          try {
            const content = readFileSync(lp, 'utf-8').trim();
            const pid = parseInt(content, 10);
            if (!isNaN(pid) && isProcessAlive(pid)) {
              // PID still alive, lock is valid — wait
            } else {
              unlinkSync(lp);
            }
          } catch {
            try { unlinkSync(lp); } catch { /* best effort */ }
          }
        }
      } catch { /* stat failed, try to acquire */ }
    }

    if (!existsSync(lp)) {
      try {
        writeFileSync(lp, String(process.pid), { flag: 'wx' });
        return true;
      } catch {
        // Another process beat us — spin
      }
    }

    // Busy-wait with a short sleep approximation via synchronous spin
    const wait = Date.now() + 20;
    while (Date.now() < wait) { /* spin */ }
  }

  return false;
}

function releaseLock(filePath: string): void {
  try { unlinkSync(lockPath(filePath)); } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read JSON state file safely. Results are cached with a 5s TTL.
 * @param filePath - Absolute path to JSON file
 */
export function readState(filePath: string): ReadStateResult {
  const cached = cacheGet(filePath);
  if (cached !== undefined) {
    return { ok: true, data: cached };
  }

  try {
    if (!existsSync(filePath)) {
      return { ok: false, error: `File not found: ${filePath}` };
    }
    const raw = readFileSync(filePath, 'utf-8');
    const data: unknown = JSON.parse(raw);
    cacheSet(filePath, data);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: `Failed to read ${filePath}: ${(err as Error).message}` };
  }
}

/**
 * Write JSON state file atomically (temp file + rename).
 * Acquires an advisory lock, invalidates the read cache.
 * @param filePath - Absolute path to target file
 * @param data - Data to serialize as JSON
 */
export function writeState(filePath: string, data: unknown): WriteStateResult {
  const tmpSuffix = randomBytes(6).toString('hex');
  const tmpPath = `${filePath}.${tmpSuffix}.tmp`;

  const locked = acquireLock(filePath);
  if (!locked) {
    return { ok: false, error: `Failed to acquire lock for ${filePath} within ${LOCK_TIMEOUT_MS}ms` };
  }

  try {
    mkdirSync(dirname(filePath), { recursive: true });
    const json = JSON.stringify(data, null, 2);
    writeFileSync(tmpPath, json, 'utf-8');
    renameSync(tmpPath, filePath);
    cacheInvalidate(filePath);
    return { ok: true };
  } catch (err) {
    try { unlinkSync(tmpPath); } catch (_) { /* best effort */ }
    return { ok: false, error: `Failed to write ${filePath}: ${(err as Error).message}` };
  } finally {
    releaseLock(filePath);
  }
}

/**
 * Delete a state file if it exists.
 */
export function deleteState(filePath: string): WriteStateResult {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
    cacheInvalidate(filePath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Failed to delete ${filePath}: ${(err as Error).message}` };
  }
}

/**
 * Read state with fallback to default value.
 */
export function readStateOrDefault(filePath: string, defaultValue: unknown): unknown {
  const result = readState(filePath);
  return result.ok ? result.data : defaultValue;
}

/**
 * Atomic read-modify-write with retry on conflict.
 * Solves race conditions in multi-agent environments by retrying
 * when the file changes between read and write.
 * @param filePath - Absolute path to JSON file
 * @param defaultValue - Default if file doesn't exist
 * @param mutator - Function that modifies and returns data
 * @param maxRetries - Max retry attempts
 */
export function updateState(
  filePath: string,
  defaultValue: unknown | (() => unknown),
  mutator: (data: unknown) => unknown,
  maxRetries: number = 3
): UpdateStateResult {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const before = readState(filePath);
    const data = before.ok ? before.data : (typeof defaultValue === 'function' ? (defaultValue as () => unknown)() : structuredClone(defaultValue));

    const updated = mutator(data);

    // Re-read bypassing cache for conflict detection
    cacheInvalidate(filePath);
    const check = readState(filePath);
    const beforeJson = before.ok ? JSON.stringify(before.data) : '';
    const checkJson = check.ok ? JSON.stringify(check.data) : '';

    if (beforeJson !== checkJson && attempt < maxRetries) {
      continue;
    }

    const result = writeState(filePath, updated);
    if (result.ok) {
      return { ok: true, data: updated };
    }
    if (attempt < maxRetries) continue;
    return { ok: false, error: result.error };
  }
  return { ok: false, error: `updateState failed after ${maxRetries} retries` };
}
