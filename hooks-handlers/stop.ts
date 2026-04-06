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
import { getPersistentModeState, recordReinforcement } from '../scripts/hooks/persistent-mode.js';
import { readPlanState } from '../scripts/hooks/plan-state.js';
import { getPRDStatus } from '../scripts/pipeline/story-tracker.js';
import { getVerifyState, generateArchitectPrompt } from '../scripts/hooks/architect-verify.js';
import { getDenialSummary } from '../scripts/guardrail/denial-tracker.js';
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
    const safeFeature: string = sanitizeSessionField(session.feature ?? 'unknown');
    const result: HandoffResult = writeStageHandoff({
      feature: safeFeature,
      stage: 'session-stop',
      summary: `Session stopped at stage: ${sanitizeSessionField(session.currentStage ?? 'unknown')}`,
      decisions: [`Mode: ${session.mode}`, `Resume with /aing team or /aing auto`],
      nextStage: session.currentStage,
    }, projectDir);
    if (result.ok) {
      log.info('Session handoff written', { path: result.handoffPath, feature: session.feature, stage: session.currentStage });
    } else {
      log.error('Failed to write session handoff', { feature: session.feature });
    }
  }

  // Check for active AING-DR planning session (blocks stop during consensus)
  const planState = readPlanState(projectDir);

  const ctx: string[] = [];

  if (planState?.active && planState.phase !== 'completed' && planState.phase !== 'terminated') {
    const phaseNames: Record<string, string> = {
      'gate': 'Pre-execution Gate',
      'foundation': 'Ryan — Constraints/Preferences',
      'option-design': 'Able — Option Design',
      'steelman': 'Klay — Steelman Deliberation',
      'synthesis': 'Able — Synthesis',
      'synthesis-check': 'Noa — Verification',
      'critique': 'Critic — Assessment',
      'adr': 'Able — Living ADR',
    };
    const phaseName = phaseNames[planState.phase] || planState.phase;
    ctx.push(`[aing:plan-gate] AING-DR 합의 진행 중 — 중단할 수 없습니다.`);
    ctx.push(`Feature: "${planState.feature}" | Phase: ${phaseName} | Iteration: ${planState.iteration}/${planState.maxIterations}`);
    ctx.push(`합의 완료 후 자동 종료됩니다. 강제 종료: /aing cancel`);
    log.info('Plan active — blocking stop', { feature: planState.feature, phase: planState.phase, iteration: planState.iteration });
  }

  // Check for active persistent mode (enables "don't stop" / ralph-like behavior)
  const persistentMode = await getPersistentModeState(projectDir);

  if (persistentMode?.active) {
    const modeLabel = persistentMode.mode || 'persistent';
    const iteration = persistentMode.iteration ?? 0;
    const maxIter = persistentMode.maxIterations ?? 10;

    // Circuit breaker: too many reinforcements → allow stop (fail-safe)
    const canBlock = await recordReinforcement(projectDir);
    if (!canBlock) {
      log.info('Circuit breaker tripped — allowing stop', { mode: modeLabel, reinforcements: persistentMode.reinforcementCount });
      ctx.push(`[aing:persistent-mode] Circuit breaker — 세션 종료를 허용합니다.`);
    } else {
      // --- Priority 1: Architect verification pending ---
      const archVerify = getVerifyState(projectDir);
      if (archVerify?.pending) {
        const archPrompt = generateArchitectPrompt(archVerify);
        ctx.push(archPrompt);
        log.info('Architect verification blocking stop', { feature: archVerify.feature, attempt: archVerify.verificationAttempts });
      }
      // --- Priority 2: PRD stories incomplete ---
      else {
        const prdStatus = getPRDStatus(projectDir);
        if (prdStatus.total > 0 && !prdStatus.allComplete) {
          ctx.push(`[aing:persistent-mode] Mode: ${modeLabel} | Iteration ${iteration}/${maxIter}`);
          ctx.push(`[aing:prd] 스토리 진행: ${prdStatus.completed}/${prdStatus.total} 완료`);
          if (prdStatus.nextStory) {
            ctx.push(`다음 스토리: ${prdStatus.nextStory.id} "${prdStatus.nextStory.title}"`);
          }
          ctx.push(`작업이 완료되지 않았습니다. 계속하세요.`);
          ctx.push(`완료 후 /aing team --complete 또는 cancel로 종료하세요.`);
          log.info('PRD incomplete — blocking stop', {
            mode: modeLabel,
            completed: prdStatus.completed,
            total: prdStatus.total,
            next: prdStatus.nextStory?.id,
          });
        }
        // --- Priority 3: General persistent mode ---
        else {
          ctx.push(`[aing:persistent-mode] Mode: ${modeLabel} | Iteration ${iteration}/${maxIter}`);
          ctx.push(`작업 진행 중. 계속하세요.`);
          if (persistentMode.fixLoopCount && persistentMode.fixLoopCount > 0) {
            ctx.push(`Fix loop: ${persistentMode.fixLoopCount}회 (unbounded — cancel만 종료)`);
          }
          log.info('Persistent mode active on stop', { mode: modeLabel, iteration, fixLoop: persistentMode.fixLoopCount });
        }
      }
    }
  }

  // Append denial audit summary
  const denialLine: string | null = getDenialSummary(projectDir);
  if (denialLine) ctx.push(denialLine);

  // Append compact cost summary
  const costLine: string | null = formatCompactSummary(projectDir);
  if (costLine) ctx.push(costLine);

  if (ctx.length > 0) {
    process.stdout.write(JSON.stringify({
      stopReason: ctx.join('\n')
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }

} catch (err: unknown) {
  log.error('Stop handler failed', { error: (err as Error).message });
  process.stdout.write(JSON.stringify({}));
}
