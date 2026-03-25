/**
 * Shared session reader — reads active session state from pipeline/PDCA files.
 * Extracted from stop.mjs and user-prompt-submit.mjs to eliminate DRY violation.
 * @module scripts/core/session-reader
 */

import { readState } from './state.mjs';
import { join } from 'node:path';

/**
 * Maximum length for session field values injected into LLM context.
 * Prevents prompt injection via oversized or crafted state values.
 */
const MAX_FIELD_LENGTH = 200;

/**
 * Sanitize a session field value for safe LLM context injection.
 * Truncates to MAX_FIELD_LENGTH and strips control characters.
 * @param {string} value
 * @returns {string}
 */
export function sanitizeSessionField(value) {
  if (typeof value !== 'string') return String(value ?? '');
  // Strip control characters (except newline/tab which are harmless in markdown)
  const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.slice(0, MAX_FIELD_LENGTH);
}

/**
 * Determine the active session from state files.
 * Optionally accepts pre-read state to avoid redundant file I/O.
 *
 * @param {string} projectDir
 * @param {{ pdcaState?: object, pipelineState?: object }} [preRead] — already-read state objects
 * @returns {{ active: boolean, mode?: string, feature?: string, currentStage?: string }}
 */
export function getActiveSession(projectDir, preRead = {}) {
  const stateDir = join(projectDir, '.sw-kit', 'state');

  // Pipeline session
  const pipeline = preRead.pipelineState ?? (() => {
    const result = readState(join(stateDir, 'pipeline-state.json'));
    return result.ok ? result.data : null;
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
  const pdca = preRead.pdcaState ?? (() => {
    const result = readState(join(stateDir, 'pdca-status.json'));
    return result.ok ? result.data : null;
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
