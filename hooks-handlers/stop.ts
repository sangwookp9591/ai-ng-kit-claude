/**
 * aing Stop Hook Handler v1.1.0
 * Persists PDCA state and learning records on session end.
 * Writes a handoff document when an active session is in progress.
 */

import { readState, writeState } from '../scripts/core/state.js';
import { formatCompactSummary } from '../scripts/evidence/cost-reporter.js';
import { createLogger } from '../scripts/core/logger.js';
import { norchSessionEnd } from '../scripts/core/norch-bridge.js';
import { getBudgetStatus } from '../scripts/core/context-budget.js';
import { getActiveSession, sanitizeSessionField } from '../scripts/core/session-reader.js';
import { writeHandoff as writeStageHandoff } from '../scripts/pipeline/handoff-manager.js';
import { getPersistentModeState } from '../scripts/hooks/persistent-mode.js';
import { join } from 'node:path';

const log = createLogger('stop');

interface PdcaState {
  activeFeature?: string;
  lastSessionEnd?: string;
  [key: string]: unknown;
}

interface BudgetStatus {
  total: number;
  injections: unknown[];
  warnings: unknown[];
}

interface ActiveSession {
  active: boolean;
  mode?: string;
  feature?: string;
  currentStage?: string;
}

interface HandoffResult {
  ok: boolean;
  handoffPath?: string;
}


try {
  const projectDir: string = process.env.PROJECT_DIR || process.cwd();
  const sessionId: string = process.env.SESSION_ID || 'default';
  norchSessionEnd(sessionId);

  // Telemetry: log session end (best-effort)
  try {
    const { logSession } = await import('../scripts/telemetry/telemetry-engine.js');
    logSession({ type: 'end', sessionId }, projectDir);
  } catch { /* telemetry is best-effort */ }

  // Log context budget usage for this session
  const budget: BudgetStatus = getBudgetStatus();
  if (budget.total > 0) {
    log.info('Session context budget summary', {
      totalTokens: `~${budget.total}`,
      injections: budget.injections.length,
      warnings: budget.warnings.length
    });
  }

  // Persist any in-flight PDCA state (read once, reuse for getActiveSession)
  const stateFile: string = join(projectDir, '.aing', 'state', 'pdca-status.json');
  const stateResult = readState(stateFile);
  if (stateResult.ok && (stateResult.data as PdcaState).activeFeature) {
    (stateResult.data as PdcaState).lastSessionEnd = new Date().toISOString();
    writeState(stateFile, stateResult.data);
    log.info('PDCA state persisted on stop', { feature: (stateResult.data as PdcaState).activeFeature });
  }

  // Write handoff document if an active session was in progress
  const session: ActiveSession = getActiveSession(projectDir, {
    pdcaState: stateResult.ok ? (stateResult.data as PdcaState) : null,
  });
  if (session.active) {
    const safeFeature: string = sanitizeSessionField(session.feature!);
    const result: HandoffResult = writeStageHandoff({
      feature: safeFeature,
      stage: 'session-stop',
      summary: `Session stopped at stage: ${sanitizeSessionField(session.currentStage!)}`,
      decisions: [`Mode: ${session.mode}`, `Resume with /aing team or /aing auto`],
      nextStage: session.currentStage,
    }, projectDir);
    if (result.ok) {
      log.info('Session handoff written', { path: result.handoffPath, feature: session.feature, stage: session.currentStage });
    } else {
      log.error('Failed to write session handoff', { feature: session.feature });
    }
  }

  // Check for active persistent mode (enables "don't stop" / ralph-like behavior)
  const persistentMode = await getPersistentModeState(projectDir);

  const ctx: string[] = [];

  if (persistentMode?.active) {
    const modeLabel = persistentMode.mode || 'persistent';
    ctx.push(`[aing:persistent-mode] Mode: ${modeLabel}`);
    ctx.push(`\uD83D\uDD04 [${modeLabel}] \uBAA8\uB4DC \uD65C\uC131 \u2014 \uC791\uC5C5 \uC9C4\uD589 \uC911. \uACC4\uC18D\uD558\uC138\uC694.`);
    log.info('Persistent mode active on stop', { mode: modeLabel });
  }

  // Append compact cost summary
  const costLine: string | null = formatCompactSummary(projectDir);
  if (costLine) ctx.push(costLine);

  if (ctx.length > 0) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { additionalContext: ctx.join('\n') }
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }

} catch (err: unknown) {
  log.error('Stop handler failed', { error: (err as Error).message });
  process.stdout.write(JSON.stringify({}));
}
