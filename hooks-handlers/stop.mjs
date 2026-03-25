/**
 * sw-kit Stop Hook Handler v1.1.0
 * Persists PDCA state and learning records on session end.
 * Writes a handoff document when an active session is in progress.
 */

import { readState, writeState } from '../scripts/core/state.mjs';
import { createLogger } from '../scripts/core/logger.mjs';
import { getBudgetStatus } from '../scripts/core/context-budget.mjs';
import { join } from 'node:path';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const log = createLogger('stop');

/**
 * Determine the active session from state files.
 * Returns { active, mode, feature, currentStage } or { active: false }.
 */
function getActiveSession(projectDir) {
  const stateDir = join(projectDir, '.sw-kit', 'state');

  // Pipeline session
  const pipelineFile = join(stateDir, 'pipeline-state.json');
  const pipeline = readState(pipelineFile);
  if (pipeline.ok && pipeline.data.status === 'running') {
    const stageIdx = pipeline.data.currentStageIndex ?? 0;
    const stage = pipeline.data.stages?.[stageIdx]?.id || 'unknown';
    return { active: true, mode: 'pipeline', feature: pipeline.data.feature || pipeline.data.id, currentStage: stage };
  }

  // PDCA active feature
  const pdcaFile = join(stateDir, 'pdca-status.json');
  const pdca = readState(pdcaFile);
  if (pdca.ok && pdca.data.activeFeature) {
    const feature = pdca.data.activeFeature;
    const featureData = pdca.data.features?.[feature];
    if (featureData) {
      return { active: true, mode: 'team', feature, currentStage: featureData.currentStage || 'plan' };
    }
  }

  return { active: false };
}

/**
 * Write a session handoff document under .sw-kit/state/handoff-{timestamp}.md
 * so the user can resume work in the next session.
 */
function writeHandoff(projectDir, session) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const handoffDir = join(projectDir, '.sw-kit', 'state');
  const handoffPath = join(handoffDir, `handoff-${ts}.md`);

  const lines = [
    `# sw-kit Session Handoff`,
    ``,
    `**Stopped at**: ${new Date().toISOString()}`,
    `**Mode**: ${session.mode}`,
    `**Feature**: ${session.feature}`,
    `**Last stage**: ${session.currentStage}`,
    ``,
    `## Resume Instructions`,
    ``,
    `The session stopped while work was in progress. To resume:`,
    ``,
    `- **팀 모드**: \`/swkit team ${session.feature}\``,
    `- **자동 모드**: \`/swkit auto ${session.feature}\``,
    `- **현재 단계 확인**: \`/swkit status\``,
    ``,
    `## State Files`,
    ``,
    `- \`.sw-kit/state/pdca-status.json\` — PDCA 진행 상태`,
    `- \`.sw-kit/state/pipeline-state.json\` — 파이프라인 단계`,
    `- \`.sw-kit/plans/\` — 계획 문서`,
    ``,
    `> 세션이 종료되었지만 작업은 중단되지 않았습니다. 다음 세션에서 위 명령어로 재개하세요.`,
  ];

  try {
    mkdirSync(handoffDir, { recursive: true });
    writeFileSync(handoffPath, lines.join('\n'), 'utf-8');
    return handoffPath;
  } catch (err) {
    return null;
  }
}

try {
  const projectDir = process.env.PROJECT_DIR || process.cwd();

  // Log context budget usage for this session
  const budget = getBudgetStatus();
  if (budget.total > 0) {
    log.info('Session context budget summary', {
      totalTokens: `~${budget.total}`,
      injections: budget.injections.length,
      warnings: budget.warnings.length
    });
  }

  // Persist any in-flight PDCA state
  const stateFile = join(projectDir, '.sw-kit', 'state', 'pdca-status.json');
  const stateResult = readState(stateFile);
  if (stateResult.ok && stateResult.data.activeFeature) {
    // Add session end timestamp
    stateResult.data.lastSessionEnd = new Date().toISOString();
    writeState(stateFile, stateResult.data);
    log.info('PDCA state persisted on stop', { feature: stateResult.data.activeFeature });
  }

  // Write handoff document if an active session was in progress
  const session = getActiveSession(projectDir);
  if (session.active) {
    const handoffPath = writeHandoff(projectDir, session);
    if (handoffPath) {
      log.info('Session handoff written', { path: handoffPath, feature: session.feature, stage: session.currentStage });
    }
    // Note: session is NOT terminated — user can resume with /swkit team or /swkit auto
  }

  process.stdout.write(JSON.stringify({}));

} catch (err) {
  log.error('Stop handler failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
