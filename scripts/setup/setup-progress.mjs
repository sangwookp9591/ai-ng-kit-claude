/**
 * aing Setup Progress Manager
 * Tracks setup wizard state: save, resume, clear, complete.
 * Modeled after omc's setup-progress.sh but in ESM.
 * @module scripts/setup/setup-progress
 */
import { readState, writeState, deleteState, readStateOrDefault } from '../core/state.mjs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';

const STATE_FILE = '.aing/state/setup-state.json';
const CONFIG_FILE = join(homedir(), '.claude', '.aing-config.json');

/**
 * Resolve state file path relative to project dir.
 */
function statePath(projectDir) {
  return join(projectDir || process.cwd(), STATE_FILE);
}

/**
 * Save setup progress after a phase completes.
 * @param {number} step - Phase number completed (1-4)
 * @param {string} configTarget - 'local' or 'global'
 * @param {string} [projectDir]
 */
export function saveProgress(step, configTarget, projectDir) {
  const fp = statePath(projectDir);
  writeState(fp, {
    lastCompletedStep: step,
    timestamp: new Date().toISOString(),
    configTarget: configTarget || 'unknown'
  });
}

/**
 * Clear setup state (for fresh start).
 * @param {string} [projectDir]
 */
export function clearProgress(projectDir) {
  deleteState(statePath(projectDir));
}

/**
 * Check if there's a resumable setup session.
 * Returns null if fresh, or { lastCompletedStep, configTarget } if resumable.
 * State older than 24h is auto-cleared.
 * @param {string} [projectDir]
 */
export function checkResume(projectDir) {
  const fp = statePath(projectDir);
  const state = readStateOrDefault(fp, null);
  if (!state) return null;

  // Check staleness (24h)
  if (state.timestamp) {
    const age = Date.now() - new Date(state.timestamp).getTime();
    if (age > 86400000) {
      deleteState(fp);
      return null;
    }
  }

  return {
    lastCompletedStep: state.lastCompletedStep || 0,
    configTarget: state.configTarget || 'unknown',
    timestamp: state.timestamp
  };
}

/**
 * Mark setup as completed. Clears temp state, writes persistent config.
 * @param {object} opts
 * @param {string} opts.version - aing version
 * @param {string} opts.configTarget - 'local' or 'global'
 * @param {boolean} opts.hudEnabled
 * @param {string} opts.defaultMode - 'auto' | 'pdca' | 'wizard'
 * @param {string} [projectDir]
 */
export function markComplete(opts, projectDir) {
  // Clear temp state
  deleteState(statePath(projectDir));

  // Write persistent config
  const existing = readStateOrDefault(CONFIG_FILE, {});
  const config = {
    ...existing,
    setupCompleted: new Date().toISOString(),
    setupVersion: opts.version || 'unknown',
    configTarget: opts.configTarget || 'local',
    hudEnabled: opts.hudEnabled ?? false,
    defaultMode: opts.defaultMode || 'auto'
  };

  const dir = join(homedir(), '.claude');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeState(CONFIG_FILE, config);
}

/**
 * Check if setup has been completed before.
 * @returns {{ completed: boolean, version?: string, configTarget?: string, hudEnabled?: boolean, defaultMode?: string }}
 */
export function isSetupComplete() {
  const config = readStateOrDefault(CONFIG_FILE, null);
  if (!config || !config.setupCompleted) {
    return { completed: false };
  }
  return {
    completed: true,
    version: config.setupVersion,
    configTarget: config.configTarget,
    hudEnabled: config.hudEnabled,
    defaultMode: config.defaultMode,
    completedAt: config.setupCompleted
  };
}

// CLI mode: node setup-progress.mjs <command> [args...]
const args = process.argv.slice(2);
if (args.length > 0) {
  const cmd = args[0];
  const projectDir = process.env.PROJECT_DIR || process.cwd();

  switch (cmd) {
    case 'save':
      saveProgress(parseInt(args[1] || '0'), args[2], projectDir);
      console.log(`Progress saved: step ${args[1]} (${args[2] || 'unknown'})`);
      break;
    case 'clear':
      clearProgress(projectDir);
      console.log('Setup state cleared.');
      break;
    case 'resume': {
      const state = checkResume(projectDir);
      if (state) {
        console.log(`Found previous setup session (Step ${state.lastCompletedStep} at ${state.timestamp}, target=${state.configTarget})`);
        console.log(JSON.stringify(state));
      } else {
        console.log('fresh');
      }
      break;
    }
    case 'complete':
      markComplete({
        version: args[1] || 'unknown',
        configTarget: args[2] || 'local',
        hudEnabled: args[3] === 'true',
        defaultMode: args[4] || 'auto'
      }, projectDir);
      console.log('Setup completed successfully!');
      break;
    case 'check':
      console.log(JSON.stringify(isSetupComplete()));
      break;
    default:
      console.error('Usage: setup-progress.mjs {save|clear|resume|complete|check}');
      process.exit(1);
  }
}
