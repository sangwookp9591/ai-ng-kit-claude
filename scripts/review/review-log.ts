/**
 * aing Review Log — JSONL persistence for review results.
 * @module scripts/review/review-log
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createLogger } from '../core/logger.js';

const log = createLogger('review-log');

export interface ReviewLogEntry {
  skill: string;
  timestamp?: string;
  ts?: string;
  status: string;
  commit?: string;
  issues_found?: number;
  critical_gaps?: number;
  unresolved?: number;
  mode?: string;
  source?: string;
  findings_count?: number;
  [key: string]: unknown;
}

export interface StalenessResult {
  stale: boolean;
  reason?: string;
}

/**
 * Append a review entry to the JSONL log.
 */
export function appendReviewLog(entry: ReviewLogEntry, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const logDir = join(dir, '.aing', 'reviews');
  mkdirSync(logDir, { recursive: true });
  const logPath = join(logDir, 'review-log.jsonl');

  const line = JSON.stringify({
    ...entry,
    ts: entry.timestamp || new Date().toISOString(),
    commit: entry.commit || getHeadCommit()
  });

  try {
    // Atomic append: read existing + append + write via temp+rename
    const existing = existsSync(logPath) ? readFileSync(logPath, 'utf-8') : '';
    const tmpPath = `${logPath}.${randomBytes(6).toString('hex')}.tmp`;
    writeFileSync(tmpPath, existing + line + '\n');
    renameSync(tmpPath, logPath);
    log.info(`Review logged: ${entry.skill} → ${entry.status}`);
  } catch (err) {
    log.error(`Failed to write review log: ${(err as Error).message}`);
  }
}

/**
 * Read all review entries.
 */
export function readReviewLog(projectDir?: string): ReviewLogEntry[] {
  const dir = projectDir || process.cwd();
  const logPath = join(dir, '.aing', 'reviews', 'review-log.jsonl');

  if (!existsSync(logPath)) return [];

  try {
    const raw = readFileSync(logPath, 'utf-8').trim();
    if (!raw) return [];
    return raw.split('\n').map((line: string) => {
      try { return JSON.parse(line) as ReviewLogEntry; }
      catch { return null; }
    }).filter((entry): entry is ReviewLogEntry => entry !== null);
  } catch (err) {
    log.error(`Failed to read review log: ${(err as Error).message}`);
    return [];
  }
}

/**
 * Get the most recent entry for a given skill.
 */
export function getLatestReview(skill: string, projectDir?: string): ReviewLogEntry | null {
  const entries = readReviewLog(projectDir);
  const matching = entries.filter(e => e.skill === skill);
  return matching.length > 0 ? matching[matching.length - 1] : null;
}

/**
 * Check if a review is stale (>7 days old or different commit).
 */
export function checkStaleness(entry: ReviewLogEntry | null, currentCommit?: string): StalenessResult {
  if (!entry) return { stale: true, reason: 'no review exists' };

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const age = Date.now() - new Date(entry.ts!).getTime();

  if (age > sevenDays) {
    return { stale: true, reason: `review is ${Math.floor(age / 86400000)} days old` };
  }

  if (currentCommit && entry.commit && entry.commit !== currentCommit) {
    return { stale: true, reason: `${entry.commit} → ${currentCommit} (commits diverged)` };
  }

  return { stale: false };
}

function getHeadCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch { return 'unknown'; }
}
