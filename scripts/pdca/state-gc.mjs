/**
 * aing State GC — Zombie Feature Garbage Collector
 * Identifies and archives stale/zombie PDCA features.
 *
 * Zombie criteria (ALL must be true):
 *   - iteration === 0 (never iterated)
 *   - evidence array is empty
 *   - startedAt is older than maxAgeDays (or missing)
 *   - currentStage is 'plan' or 'do'
 *
 * @module scripts/pdca/state-gc
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';
import { mkdirSync, readdirSync } from 'node:fs';

const log = createLogger('state-gc');

function getStatePath(projectDir) {
  return join(projectDir, '.aing', 'state', 'pdca-status.json');
}

function getArchiveDir(projectDir) {
  return join(projectDir, '.aing', 'archive');
}

/**
 * Determine if a feature is a zombie.
 * @param {object} feature
 * @param {number} maxAgeDays
 * @returns {boolean}
 */
function isZombie(feature, maxAgeDays) {
  if (feature.iteration !== 0) return false;
  if (feature.evidence && feature.evidence.length > 0) return false;
  if (!['plan', 'do'].includes(feature.currentStage)) return false;

  const startedAt = feature.lastActivityAt || feature.startedAt;
  if (!startedAt) return true; // no date → treat as zombie

  const ageMs = Date.now() - new Date(startedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays >= maxAgeDays;
}

/**
 * Run garbage collection on pdca-status.json.
 *
 * @param {string} projectDir - Absolute path to project root
 * @param {object} [options]
 * @param {number} [options.maxAgeDays=7] - Age threshold in days
 * @param {boolean} [options.dryRun=false] - Report only, no writes
 * @returns {{ removed: number, archived: string[] }}
 */
export function runGC(projectDir, options = {}) {
  const maxAgeDays = options.maxAgeDays ?? 7;
  const dryRun = options.dryRun ?? false;

  const statePath = getStatePath(projectDir);
  const state = readStateOrDefault(statePath, { version: 1, features: {} });

  const features = state.features || {};
  const zombieNames = [];

  for (const [name, feature] of Object.entries(features)) {
    if (isZombie(feature, maxAgeDays)) {
      zombieNames.push(name);
    }
  }

  if (zombieNames.length === 0) {
    log.info('GC: no zombies found');
    return { removed: 0, archived: [] };
  }

  if (dryRun) {
    log.info(`GC dry-run: would remove ${zombieNames.length} zombie(s)`, { zombies: zombieNames });
    return { removed: zombieNames.length, archived: zombieNames };
  }

  // Build archive payload
  const archiveFeatures = {};
  for (const name of zombieNames) {
    archiveFeatures[name] = features[name];
  }

  // Write archive file: .aing/archive/gc-{date}-{ms}.json
  const archiveDir = getArchiveDir(projectDir);
  mkdirSync(archiveDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10);
  // Avoid collisions on rapid successive runs by appending ms
  const archiveFileName = `gc-${dateStr}-${Date.now()}.json`;
  const archivePath = join(archiveDir, archiveFileName);

  const archiveResult = writeState(archivePath, {
    gcAt: new Date().toISOString(),
    maxAgeDays,
    features: archiveFeatures
  });

  if (!archiveResult.ok) {
    log.warn(`GC: archive write failed — ${archiveResult.error}`);
    // Continue anyway; we still remove from state
  }

  // Remove zombies from state
  for (const name of zombieNames) {
    delete features[name];
  }

  // Clear activeFeature if it was a zombie
  if (state.activeFeature && zombieNames.includes(state.activeFeature)) {
    state.activeFeature = null;
  }

  const writeResult = writeState(statePath, state);
  if (!writeResult.ok) {
    log.error(`GC: failed to write updated state — ${writeResult.error}`);
    return { removed: 0, archived: [] };
  }

  log.info(`GC: removed ${zombieNames.length} zombie(s)`, { zombies: zombieNames });
  return { removed: zombieNames.length, archived: zombieNames };
}

// ─── CLI support ─────────────────────────────────────────────────────────────

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const maxAgeDaysIdx = args.indexOf('--max-age-days');
  const maxAgeDays = maxAgeDaysIdx !== -1 ? Number(args[maxAgeDaysIdx + 1]) : 7;

  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const result = runGC(projectDir, { maxAgeDays, dryRun });

  if (dryRun) {
    process.stdout.write(`[GC dry-run] Would remove ${result.removed} zombie feature(s):\n`);
  } else {
    process.stdout.write(`[GC] Removed ${result.removed} zombie feature(s):\n`);
  }

  for (const name of result.archived) {
    process.stdout.write(`  - ${name}\n`);
  }
  if (result.archived.length === 0) {
    process.stdout.write('  (none)\n');
  }
}
