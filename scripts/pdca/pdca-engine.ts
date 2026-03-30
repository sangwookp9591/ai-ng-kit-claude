/**
 * aing PDCA-Lite 5-Stage Engine
 * Stages: plan → do → check → act → review
 * @module scripts/pdca/pdca-engine
 */

import { readState, writeState, readStateOrDefault } from '../core/state.js';
import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { norchPdcaChange } from '../core/norch-bridge.js';
import { join } from 'node:path';

const log = createLogger('pdca-engine');

type PdcaStage = 'plan' | 'do' | 'check' | 'act' | 'review' | 'completed';

interface StageDescription {
  ko: string;
  en: string;
  next: PdcaStage | null;
}

interface HistoryEntry {
  stage: string;
  action: string;
  ts: string;
  reason?: string;
  iteration?: number;
  from?: string;
}

interface EvidenceEntry {
  stage: string;
  matchRate?: number;
  ts: string;
  [key: string]: unknown;
}

interface ScalingProfile {
  level: string;
  maxIterations: number;
  reviewTier: string;
  reviewers: string[];
  evidenceRequired: string[];
}

interface PdcaFeature {
  currentStage: PdcaStage;
  iteration: number;
  startedAt: string;
  completedAt?: string;
  history: HistoryEntry[];
  evidence: EvidenceEntry[];
  scalingProfile?: ScalingProfile;
  maxIterations?: number;
}

interface PdcaState {
  version: number;
  features: Record<string, PdcaFeature>;
  activeFeature?: string | null;
}

interface WriteResult {
  ok: boolean;
  error?: string;
}

interface ReadResult {
  ok: boolean;
  data: PdcaState;
  error?: string;
}

const STAGES: PdcaStage[] = ['plan', 'do', 'check', 'act', 'review'];

const STAGE_DESCRIPTIONS: Record<string, StageDescription> = {
  plan: { ko: '계획 수립', en: 'Planning', next: 'do' },
  do: { ko: '구현 실행', en: 'Execution', next: 'check' },
  check: { ko: '검증 확인', en: 'Verification', next: 'act' },
  act: { ko: '결과 반영', en: 'Apply Results', next: 'review' },
  review: { ko: '최종 리뷰', en: 'Final Review', next: null }
};

function getStatePath(projectDir?: string): string {
  return join(projectDir || process.cwd(), '.aing', 'state', 'pdca-status.json');
}

/**
 * Start a new PDCA cycle for a feature.
 */
export function startPdca(featureName: string, complexityScore?: number | string, projectDir?: string): WriteResult {
  // Backward compat: if complexityScore is string, it's actually projectDir
  if (typeof complexityScore === 'string') {
    projectDir = complexityScore;
    complexityScore = undefined;
  }

  const statePath = getStatePath(projectDir);
  const state: PdcaState = readStateOrDefault(statePath, { version: 1, features: {} }) as PdcaState;

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

  if (typeof complexityScore === 'number') {
    const profile = getScalingProfile(complexityScore);
    state.features[featureName].scalingProfile = profile;
    state.features[featureName].maxIterations = profile.maxIterations;
  }

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
export function advancePdca(featureName: string, evidence?: Partial<EvidenceEntry>, projectDir?: string): WriteResult {
  const statePath = getStatePath(projectDir);
  const stateResult = readState(statePath) as ReadResult;
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
    } as EvidenceEntry);
  }

  // Check-Act iteration logic
  if (currentStage === 'check') {
    const threshold = getConfig('pdca.matchRateThreshold', 90) as number;
    const maxIter = feature.maxIterations || (getConfig('pdca.maxIterations', 5) as number);
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
  const nextStage: PdcaStage = currentStage === 'act' ? 'do' : stageInfo.next;
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
export function getPdcaStatus(featureName?: string, projectDir?: string): PdcaFeature | PdcaState | null {
  const statePath = getStatePath(projectDir);
  const stateResult = readState(statePath) as ReadResult;
  if (!stateResult.ok) return null;

  if (featureName) return stateResult.data.features?.[featureName] || null;
  return stateResult.data;
}

/**
 * Complete a PDCA cycle.
 */
export function completePdca(featureName: string, projectDir?: string): WriteResult {
  const statePath = getStatePath(projectDir);
  const stateResult = readState(statePath) as ReadResult;
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
export function resetPdca(featureName: string, projectDir?: string): WriteResult {
  const statePath = getStatePath(projectDir);
  const stateResult = readState(statePath) as ReadResult;
  if (!stateResult.ok) return stateResult;

  const state = stateResult.data;
  delete state.features[featureName];
  if (state.activeFeature === featureName) state.activeFeature = null;

  return writeState(statePath, state);
}

/**
 * Scaling profiles based on complexity score.
 */
export function getScalingProfile(complexityScore: number): ScalingProfile {
  if (complexityScore <= 3) {
    return {
      level: 'low',
      maxIterations: 1,
      reviewTier: 'milla-only',
      reviewers: ['milla'],
      evidenceRequired: ['test'],
    };
  }
  if (complexityScore <= 7) {
    return {
      level: 'mid',
      maxIterations: 2,
      reviewTier: 'eng-design',
      reviewers: ['milla', 'willji'],
      evidenceRequired: ['test', 'build'],
    };
  }
  // high: 8+
  return {
    level: 'high',
    maxIterations: 3,
    reviewTier: 'full-pipeline',
    reviewers: ['simon', 'milla', 'willji', 'klay'],
    evidenceRequired: ['test', 'build', 'lint', 'security'],
  };
}

export { STAGES, STAGE_DESCRIPTIONS };
