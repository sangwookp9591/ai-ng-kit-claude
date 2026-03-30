/**
 * aing Setup Progress Manager
 * Tracks setup wizard state: save, resume, clear, complete.
 * Modeled after omc's setup-progress.sh but in ESM.
 * @module scripts/setup/setup-progress
 */
import { writeState, deleteState, readStateOrDefault } from '../core/state.js';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';

const STATE_FILE = '.aing/state/setup-state.json';
const CONFIG_FILE: string = join(homedir(), '.claude', '.aing-config.json');

interface SetupState {
  lastCompletedStep: number;
  timestamp: string;
  configTarget: string;
}

interface ResumeInfo {
  lastCompletedStep: number;
  configTarget: string;
  timestamp: string;
}

interface MarkCompleteOpts {
  version: string;
  configTarget: string;
  hudEnabled: boolean;
  defaultMode: string;
}

interface SetupConfig {
  setupCompleted?: string;
  setupVersion?: string;
  configTarget?: string;
  hudEnabled?: boolean;
  defaultMode?: string;
  [key: string]: unknown;
}

interface SetupStatus {
  completed: boolean;
  version?: string;
  configTarget?: string;
  hudEnabled?: boolean;
  defaultMode?: string;
  completedAt?: string;
}

/**
 * Resolve state file path relative to project dir.
 */
function statePath(projectDir?: string): string {
  return join(projectDir || process.cwd(), STATE_FILE);
}

/**
 * Save setup progress after a phase completes.
 */
export function saveProgress(step: number, configTarget: string, projectDir?: string): void {
  const fp = statePath(projectDir);
  writeState(fp, {
    lastCompletedStep: step,
    timestamp: new Date().toISOString(),
    configTarget: configTarget || 'unknown'
  });
}

/**
 * Clear setup state (for fresh start).
 */
export function clearProgress(projectDir?: string): void {
  deleteState(statePath(projectDir));
}

/**
 * Check if there's a resumable setup session.
 * Returns null if fresh, or { lastCompletedStep, configTarget } if resumable.
 * State older than 24h is auto-cleared.
 */
export function checkResume(projectDir?: string): ResumeInfo | null {
  const fp = statePath(projectDir);
  const state = readStateOrDefault(fp, null) as SetupState | null;
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
 */
export function markComplete(opts: MarkCompleteOpts, projectDir?: string): void {
  // Clear temp state
  deleteState(statePath(projectDir));

  // Write persistent config
  const existing = readStateOrDefault(CONFIG_FILE, {}) as SetupConfig;
  const config: SetupConfig = {
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
 */
export function isSetupComplete(): SetupStatus {
  const config = readStateOrDefault(CONFIG_FILE, null) as SetupConfig | null;
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
const args: string[] = process.argv.slice(2);
if (args.length > 0) {
  const cmd: string = args[0];
  const projectDir: string = process.env.PROJECT_DIR || process.cwd();

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
