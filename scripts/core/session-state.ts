/**
 * aing Session State Manager
 * Provides session-scoped and stage-scoped state persistence.
 * Survives context compaction by writing to .aing/state/ files.
 * Uses atomic temp+rename writes (same pattern as state.mjs).
 * @module scripts/core/session-state
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readState, writeState } from './state.js';
import { createLogger } from './logger.js';

const log = createLogger('session-state');

/**
 * Pipeline stages in execution order.
 */
const STAGES: readonly string[] = ['team-plan', 'team-exec', 'team-verify', 'team-fix'];

interface StageResult {
  status: 'success' | 'failed' | 'skipped';
  summary: string;
  completedAt?: string;
}

interface SessionData {
  feature: string;
  mode: string;
  currentStage: string | null;
  planPath: string | null;
  agents: Record<string, string[]>;
  stageResults: Record<string, StageResult>;
  fixLoopCount: number;
  active: boolean;
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  endReason?: string;
}

interface WriteSessionParams {
  feature: string;
  mode: string;
  currentStage?: string | null;
  planPath?: string | null;
  agents?: Record<string, string[]>;
  stageResults?: Record<string, StageResult>;
  fixLoopCount?: number;
  active?: boolean;
  startedAt?: string;
  updatedAt?: string;
  endedAt?: string;
  endReason?: string;
}

interface WriteSessionResult {
  ok: boolean;
  sessionPath: string;
}

interface ResumeInfo {
  canResume: boolean;
  feature: string | null;
  currentStage: string | null;
  completedStages: string[];
  fixLoopCount: number;
}

/**
 * Get state directory, creating it if absent.
 */
function getStateDir(projectDir?: string): string {
  const dir = join(projectDir || process.cwd(), '.aing', 'state');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Resolve the path for a mode's session file.
 */
function sessionPath(mode: string, projectDir?: string): string {
  return join(getStateDir(projectDir), `${mode}-session.json`);
}

/**
 * Create or update a pipeline session.
 */
export function writeSession(params: WriteSessionParams, projectDir?: string): WriteSessionResult {
  const path = sessionPath(params.mode, projectDir);

  // Preserve startedAt from existing session if present
  const existing = readState(path);
  const startedAt = existing.ok ? (existing.data as SessionData).startedAt : new Date().toISOString();

  const session: SessionData = {
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

  log.error('Failed to write session', { error: result.ok ? undefined : result.error });
  return { ok: false, sessionPath: '' };
}

/**
 * Read a pipeline session.
 */
export function readSession(mode: string, projectDir?: string): SessionData | null {
  const result = readState(sessionPath(mode, projectDir));
  return result.ok ? result.data as SessionData : null;
}

/**
 * Update specific fields in an existing session.
 */
export function updateSession(mode: string, updates: Partial<WriteSessionParams>, projectDir?: string): { ok: boolean } {
  const session = readSession(mode, projectDir);
  if (!session) return { ok: false };
  const result = writeSession({ ...session, ...updates }, projectDir);
  return { ok: result.ok };
}

/**
 * Mark a stage as complete with results and advance currentStage.
 */
export function completeStage(
  mode: string,
  stage: string,
  result: { status: 'success' | 'failed' | 'skipped'; summary: string },
  projectDir?: string
): { ok: boolean } {
  const session = readSession(mode, projectDir);
  if (!session) return { ok: false };

  const stageResults: Record<string, StageResult> = {
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
 */
export function getResumeInfo(mode: string, projectDir?: string): ResumeInfo {
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
 */
export function endSession(mode: string, reason: 'complete' | 'failed' | 'cancelled', projectDir?: string): { ok: boolean } {
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
