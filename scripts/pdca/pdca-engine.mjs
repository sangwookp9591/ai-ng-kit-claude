/**
 * aing PDCA-Lite 5-Stage Engine
 * Stages: plan → do → check → act → review
 * @module scripts/pdca/pdca-engine
 */

import { readState, writeState, readStateOrDefault } from '../core/state.mjs';
import { getConfig } from '../core/config.mjs';
import { createLogger } from '../core/logger.mjs';
import { norchPdcaChange } from '../core/norch-bridge.mjs';
import { join } from 'node:path';

const log = createLogger('pdca-engine');

const STAGES = ['plan', 'do', 'check', 'act', 'review'];

const STAGE_DESCRIPTIONS = {
  plan: { ko: '계획 수립', en: 'Planning', next: 'do' },
  do: { ko: '구현 실행', en: 'Execution', next: 'check' },
  check: { ko: '검증 확인', en: 'Verification', next: 'act' },
  act: { ko: '결과 반영', en: 'Apply Results', next: 'review' },
  review: { ko: '최종 리뷰', en: 'Final Review', next: null }
};

function getStatePath(projectDir) {
  return join(projectDir || process.cwd(), '.aing', 'state', 'pdca-status.json');
}

/**
 * Start a new PDCA cycle for a feature.
 */
export function startPdca(featureName, projectDir) {
  const statePath = getStatePath(projectDir);
  const state = readStateOrDefault(statePath, { version: 1, features: {} });

  if (state.features[featureName]) {
    return { ok: false, error: `Feature "${featureName}" already exists. Use resetPdca() first.` };
  }

  state.features[featureName] = {
    currentStage: 'plan',
    iteration: 0,
    startedAt: new Date().toISOString(),
    history: [{ stage: 'plan', action: 'started', ts: new Date().toISOString() }],
    evidence: []
  };
  state.activeFeature = featureName;

  const result = writeState(statePath, state);
  if (result.ok) {
    norchPdcaChange('session', 'plan', featureName);
    log.info(`PDCA started: ${featureName}`);
  }
  return result;
}

/**
 * Advance to the next PDCA stage.
 */
export function advancePdca(featureName, evidence, projectDir) {
  const statePath = getStatePath(projectDir);
  const stateResult = readState(statePath);
  if (!stateResult.ok) return stateResult;

  const state = stateResult.data;
  const feature = state.features[featureName];
  if (!feature) return { ok: false, error: `Feature "${featureName}" not found.` };

  const currentStage = feature.currentStage;
  const stageInfo = STAGE_DESCRIPTIONS[currentStage];
  if (!stageInfo || !stageInfo.next) {
    return { ok: false, error: `Feature "${featureName}" is already at final stage (review).` };
  }

  // Record evidence if provided
  if (evidence) {
    feature.evidence.push({
      stage: currentStage,
      ...evidence,
      ts: new Date().toISOString()
    });
  }

  // Check-Act iteration logic
  if (currentStage === 'check') {
    const threshold = getConfig('pdca.matchRateThreshold', 90);
    const maxIter = getConfig('pdca.maxIterations', 5);
    const matchRate = evidence?.matchRate;

    // matchRate missing → treat as pass (proceed to act → review)
    if (matchRate !== undefined && matchRate < threshold && feature.iteration < maxIter) {
      feature.iteration++;
      feature.currentStage = 'act';
      norchPdcaChange('session', 'act', `iterate #${feature.iteration}`);
      feature.history.push({
        stage: 'act', action: 'iterate',
        reason: `matchRate ${matchRate}% < ${threshold}%`,
        iteration: feature.iteration,
        ts: new Date().toISOString()
      });
      return writeState(statePath, state);
    }

    // matchRate >= threshold or missing or max iterations reached → go to review
    if (matchRate === undefined || matchRate >= threshold || feature.iteration >= maxIter) {
      feature.currentStage = 'review';
      norchPdcaChange('session', 'review', 'from check');
      feature.history.push({
        stage: 'review', action: 'advanced',
        from: 'check',
        reason: matchRate === undefined ? 'no matchRate (pass assumed)' : `matchRate ${matchRate}% >= ${threshold}%`,
        ts: new Date().toISOString()
      });
      return writeState(statePath, state);
    }
  }

  // Act loops back to do (for iteration)
  const nextStage = currentStage === 'act' ? 'do' : stageInfo.next;
  feature.currentStage = nextStage;
  norchPdcaChange('session', nextStage, `from ${currentStage}`);
  feature.history.push({
    stage: nextStage, action: 'advanced',
    from: currentStage,
    ts: new Date().toISOString()
  });

  return writeState(statePath, state);
}

/**
 * Get current PDCA status for a feature.
 */
export function getPdcaStatus(featureName, projectDir) {
  const statePath = getStatePath(projectDir);
  const stateResult = readState(statePath);
  if (!stateResult.ok) return null;

  if (featureName) return stateResult.data.features?.[featureName] || null;
  return stateResult.data;
}

/**
 * Complete a PDCA cycle.
 */
export function completePdca(featureName, projectDir) {
  const statePath = getStatePath(projectDir);
  const stateResult = readState(statePath);
  if (!stateResult.ok) return stateResult;

  const state = stateResult.data;
  const feature = state.features[featureName];
  if (!feature) return { ok: false, error: `Feature "${featureName}" not found.` };

  feature.completedAt = new Date().toISOString();
  feature.currentStage = 'completed';
  feature.history.push({ stage: 'completed', action: 'finished', ts: new Date().toISOString() });

  if (state.activeFeature === featureName) {
    state.activeFeature = null;
  }

  return writeState(statePath, state);
}

/**
 * Reset a PDCA cycle.
 */
export function resetPdca(featureName, projectDir) {
  const statePath = getStatePath(projectDir);
  const stateResult = readState(statePath);
  if (!stateResult.ok) return stateResult;

  const state = stateResult.data;
  delete state.features[featureName];
  if (state.activeFeature === featureName) state.activeFeature = null;

  return writeState(statePath, state);
}

export { STAGES, STAGE_DESCRIPTIONS };
