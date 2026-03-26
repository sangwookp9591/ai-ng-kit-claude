/**
 * aing Session State Manager
 * Provides session-scoped and stage-scoped state persistence.
 * Survives context compaction by writing to .aing/state/ files.
 * Uses atomic temp+rename writes (same pattern as state.mjs).
 * @module scripts/core/session-state
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readState, writeState } from './state.mjs';
import { createLogger } from './logger.mjs';

const log = createLogger('session-state');

/**
 * Pipeline stages in execution order.
 */
const STAGES = ['team-plan', 'team-exec', 'team-verify', 'team-fix'];

/**
 * Get state directory, creating it if absent.
 * @param {string} [projectDir]
 * @returns {string}
 */
function getStateDir(projectDir) {
  const dir = join(projectDir || process.cwd(), '.aing', 'state');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Resolve the path for a mode's session file.
 * @param {string} mode
 * @param {string} [projectDir]
 * @returns {string}
 */
function sessionPath(mode, projectDir) {
  return join(getStateDir(projectDir), `${mode}-session.json`);
}

/**
 * Create or update a pipeline session.
 * @param {object} params
 * @param {string} params.feature — feature being worked on
 * @param {string} params.mode — pipeline mode (team, auto, debug, qa)
 * @param {string} [params.currentStage] — current pipeline stage
 * @param {string} [params.planPath] — path to plan file
 * @param {object} [params.agents] — agent assignments { stage: [agentNames] }
 * @param {object} [params.stageResults] — results per stage { stage: { status, summary } }
 * @param {number} [params.fixLoopCount] — current fix loop iteration
 * @param {boolean} [params.active] — whether session is active
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, sessionPath: string }}
 */
export function writeSession(params, projectDir) {
  const path = sessionPath(params.mode, projectDir);

  // Preserve startedAt from existing session if present
  const existing = readState(path);
  const startedAt = existing.ok ? existing.data.startedAt : new Date().toISOString();

  const session = {
    feature: params.feature,
    mode: params.mode,
    currentStage: params.currentStage ?? null,
    planPath: params.planPath ?? null,
    agents: params.agents ?? {},
    stageResults: params.stageResults ?? {},
    fixLoopCount: params.fixLoopCount ?? 0,
    active: params.active !== false,
    startedAt,
    updatedAt: new Date().toISOString(),
    // Optional terminal-state fields — only written when present
    ...(params.endedAt !== undefined ? { endedAt: params.endedAt } : {}),
    ...(params.endReason !== undefined ? { endReason: params.endReason } : {}),
  };

  const result = writeState(path, session);
  if (result.ok) {
    log.info(`Session updated: ${params.mode}`, { feature: params.feature, stage: params.currentStage });
    return { ok: true, sessionPath: path };
  }

  log.error('Failed to write session', { error: result.error });
  return { ok: false, sessionPath: '' };
}

/**
 * Read a pipeline session.
 * @param {string} mode — pipeline mode
 * @param {string} [projectDir]
 * @returns {object|null} Session data or null
 */
export function readSession(mode, projectDir) {
  const result = readState(sessionPath(mode, projectDir));
  return result.ok ? result.data : null;
}

/**
 * Update specific fields in an existing session.
 * @param {string} mode
 * @param {object} updates — fields to merge into the session
 * @param {string} [projectDir]
 * @returns {{ ok: boolean }}
 */
export function updateSession(mode, updates, projectDir) {
  const session = readSession(mode, projectDir);
  if (!session) return { ok: false };
  const result = writeSession({ ...session, ...updates }, projectDir);
  return { ok: result.ok };
}

/**
 * Mark a stage as complete with results and advance currentStage.
 * @param {string} mode
 * @param {string} stage
 * @param {{ status: 'success'|'failed'|'skipped', summary: string }} result
 * @param {string} [projectDir]
 * @returns {{ ok: boolean }}
 */
export function completeStage(mode, stage, result, projectDir) {
  const session = readSession(mode, projectDir);
  if (!session) return { ok: false };

  const stageResults = {
    ...session.stageResults,
    [stage]: {
      ...result,
      completedAt: new Date().toISOString(),
    },
  };

  // Advance to next stage
  const currentIdx = STAGES.indexOf(stage);
  const nextStage = currentIdx >= 0 && currentIdx < STAGES.length - 1
    ? STAGES[currentIdx + 1]
    : null;

  return writeSession({ ...session, stageResults, currentStage: nextStage }, projectDir);
}

/**
 * Get resume info for a session.
 * @param {string} mode
 * @param {string} [projectDir]
 * @returns {{ canResume: boolean, feature: string|null, currentStage: string|null, completedStages: string[], fixLoopCount: number }}
 */
export function getResumeInfo(mode, projectDir) {
  const session = readSession(mode, projectDir);
  if (!session || !session.active) {
    return {
      canResume: false,
      feature: null,
      currentStage: null,
      completedStages: [],
      fixLoopCount: 0,
    };
  }

  const completedStages = Object.entries(session.stageResults)
    .filter(([, r]) => r.status === 'success')
    .map(([stage]) => stage);

  return {
    canResume: true,
    feature: session.feature,
    currentStage: session.currentStage,
    completedStages,
    fixLoopCount: session.fixLoopCount,
  };
}

/**
 * End a session (mark inactive).
 * @param {string} mode
 * @param {'complete'|'failed'|'cancelled'} reason
 * @param {string} [projectDir]
 * @returns {{ ok: boolean }}
 */
export function endSession(mode, reason, projectDir) {
  const session = readSession(mode, projectDir);
  if (!session) return { ok: false };
  return writeSession({
    ...session,
    active: false,
    currentStage: null,
    endedAt: new Date().toISOString(),
    endReason: reason,
  }, projectDir);
}
