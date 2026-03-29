/**
 * aing Review Log — JSONL persistence for review results.
 * Absorbed from gstack's review-log pattern.
 * @module scripts/review/review-log
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.mjs';

const log = createLogger('review-log');

/**
 * Append a review entry to the JSONL log.
 * @param {object} entry - { skill, timestamp, status, ... }
 * @param {string} [projectDir]
 */
export function appendReviewLog(entry, projectDir) {
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
    appendFileSync(logPath, line + '\n');
    log.info(`Review logged: ${entry.skill} → ${entry.status}`);
  } catch (err) {
    log.error(`Failed to write review log: ${err.message}`);
  }
}

/**
 * Read all review entries.
 * @param {string} [projectDir]
 * @returns {Array<object>}
 */
export function readReviewLog(projectDir) {
  const dir = projectDir || process.cwd();
  const logPath = join(dir, '.aing', 'reviews', 'review-log.jsonl');

  if (!existsSync(logPath)) return [];

  try {
    const raw = readFileSync(logPath, 'utf-8').trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      try { return JSON.parse(line); }
      catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    log.error(`Failed to read review log: ${err.message}`);
    return [];
  }
}

/**
 * Get the most recent entry for a given skill.
 * @param {string} skill - e.g. 'eng-review', 'ceo-review'
 * @param {string} [projectDir]
 * @returns {object|null}
 */
export function getLatestReview(skill, projectDir) {
  const entries = readReviewLog(projectDir);
  const matching = entries.filter(e => e.skill === skill);
  return matching.length > 0 ? matching[matching.length - 1] : null;
}

/**
 * Check if a review is stale (>7 days old or different commit).
 * @param {object} entry - Review log entry
 * @param {string} [currentCommit]
 * @returns {{ stale: boolean, reason?: string }}
 */
export function checkStaleness(entry, currentCommit) {
  if (!entry) return { stale: true, reason: 'no review exists' };

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const age = Date.now() - new Date(entry.ts).getTime();

  if (age > sevenDays) {
    return { stale: true, reason: `review is ${Math.floor(age / 86400000)} days old` };
  }

  if (currentCommit && entry.commit && entry.commit !== currentCommit) {
    return { stale: true, reason: `${entry.commit} → ${currentCommit} (commits diverged)` };
  }

  return { stale: false };
}

function getHeadCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch { return 'unknown'; }
}
