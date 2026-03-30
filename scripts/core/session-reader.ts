/**
 * Shared session reader — reads active session state from pipeline/PDCA files.
 * Extracted from stop.mjs and user-prompt-submit.mjs to eliminate DRY violation.
 * @module scripts/core/session-reader
 */

import { readState } from './state.js';
import { join } from 'node:path';

/**
 * Maximum length for session field values injected into LLM context.
 * Prevents prompt injection via oversized or crafted state values.
 */
const MAX_FIELD_LENGTH = 200;

interface PipelineState {
  status: string;
  currentStageIndex?: number;
  stages?: Array<{ id: string }>;
  feature?: string;
  id?: string;
}

interface PdcaFeatureData {
  currentStage?: string;
}

interface PdcaState {
  activeFeature?: string;
  features?: Record<string, PdcaFeatureData>;
}

interface PreReadState {
  pdcaState?: PdcaState | null;
  pipelineState?: PipelineState | null;
}

interface ActiveSessionResult {
  active: boolean;
  mode?: string;
  feature?: string;
  currentStage?: string;
}

/**
 * Sanitize a session field value for safe LLM context injection.
 * Truncates to MAX_FIELD_LENGTH and strips control characters.
 */
export function sanitizeSessionField(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '');
  // Strip control characters (except newline/tab which are harmless in markdown)
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.slice(0, MAX_FIELD_LENGTH);
}

/**
 * Determine the active session from state files.
 * Optionally accepts pre-read state to avoid redundant file I/O.
 */
export function getActiveSession(projectDir: string, preRead: PreReadState = {}): ActiveSessionResult {
  const stateDir = join(projectDir, '.aing', 'state');

  // Pipeline session
  const pipeline: PipelineState | null = preRead.pipelineState ?? (() => {
    const result = readState(join(stateDir, 'pipeline-state.json'));
    return result.ok ? result.data as PipelineState : null;
  })();

  if (pipeline && pipeline.status === 'running') {
    const stageIdx = pipeline.currentStageIndex ?? 0;
    const stage = pipeline.stages?.[stageIdx]?.id || 'unknown';
    return {
      active: true,
      mode: 'pipeline',
      feature: pipeline.feature || pipeline.id,
      currentStage: stage,
    };
  }

  // PDCA active feature
  const pdca: PdcaState | null = preRead.pdcaState ?? (() => {
    const result = readState(join(stateDir, 'pdca-status.json'));
    return result.ok ? result.data as PdcaState : null;
  })();

  if (pdca && pdca.activeFeature) {
    const feature = pdca.activeFeature;
    const featureData = pdca.features?.[feature];
    if (featureData) {
      return {
        active: true,
        mode: 'team',
        feature,
        currentStage: featureData.currentStage || 'plan',
      };
    }
  }

  return { active: false };
}
