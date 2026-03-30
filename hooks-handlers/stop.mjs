/**
 * aing Stop Hook Handler v1.1.0
 * Persists PDCA state and learning records on session end.
 * Writes a handoff document when an active session is in progress.
 */

import { readState, writeState } from '../scripts/core/state.mjs';
import { formatCompactSummary } from '../scripts/evidence/cost-reporter.mjs';
import { createLogger } from '../scripts/core/logger.mjs';
import { norchSessionEnd } from '../scripts/core/norch-bridge.mjs';
import { getBudgetStatus } from '../scripts/core/context-budget.mjs';
import { getActiveSession, sanitizeSessionField } from '../scripts/core/session-reader.mjs';
import { writeHandoff as writeStageHandoff } from '../scripts/pipeline/handoff-manager.mjs';
import { join } from 'node:path';

const log = createLogger('stop');

try {
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const sessionId = process.env.SESSION_ID || 'default';
  norchSessionEnd(sessionId);

  // Telemetry: log session end (best-effort)
  try {
    const { logSession } = await import('../scripts/telemetry/telemetry-engine.mjs');
    logSession({ type: 'end', sessionId }, projectDir);
  } catch { /* telemetry is best-effort */ }

  // Log context budget usage for this session
  const budget = getBudgetStatus();
  if (budget.total > 0) {
    log.info('Session context budget summary', {
      totalTokens: `~${budget.total}`,
      injections: budget.injections.length,
      warnings: budget.warnings.length
    });
  }

  // Persist any in-flight PDCA state (read once, reuse for getActiveSession)
  const stateFile = join(projectDir, '.aing', 'state', 'pdca-status.json');
  const stateResult = readState(stateFile);
  if (stateResult.ok && stateResult.data.activeFeature) {
    stateResult.data.lastSessionEnd = new Date().toISOString();
    writeState(stateFile, stateResult.data);
    log.info('PDCA state persisted on stop', { feature: stateResult.data.activeFeature });
  }

  // Write handoff document if an active session was in progress
  // Pass pre-read pdcaState to avoid redundant file I/O
  const session = getActiveSession(projectDir, {
    pdcaState: stateResult.ok ? stateResult.data : null,
  });
  if (session.active) {
    const safeFeature = sanitizeSessionField(session.feature);
    const result = writeStageHandoff({
      feature: safeFeature,
      stage: 'session-stop',
      summary: `Session stopped at stage: ${sanitizeSessionField(session.currentStage)}`,
      decisions: [`Mode: ${session.mode}`, `Resume with /aing team or /aing auto`],
      nextStage: session.currentStage,
    }, projectDir);
    if (result.ok) {
      log.info('Session handoff written', { path: result.handoffPath, feature: session.feature, stage: session.currentStage });
    } else {
      log.error('Failed to write session handoff', { feature: session.feature });
    }
  }

  // Append compact cost summary
  const ctx = [];
  const costLine = formatCompactSummary(projectDir);
  if (costLine) ctx.push(costLine);

  process.stdout.write(JSON.stringify(ctx.length > 0 ? { context: ctx.join('\n') } : {}));

} catch (err) {
  log.error('Stop handler failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
