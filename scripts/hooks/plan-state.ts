/**
 * aing Plan State Manager — Tracks AING-DR consensus planning lifecycle.
 * Provides phase transition tracking, iteration management, and session resume.
 * @module scripts/hooks/plan-state
 */

import { readState, writeState, deleteState } from '../core/state.js';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';

const log = createLogger('plan-state');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanPhase =
  | 'gate'
  | 'foundation'
  | 'option-design'
  | 'steelman'
  | 'synthesis'
  | 'synthesis-check'
  | 'critique'
  | 'adr'
  | 'completed'
  | 'terminated';

export interface PlanState {
  active: boolean;
  phase: PlanPhase;
  feature: string;
  startedAt: string;
  updatedAt: string;
  iteration: number;
  maxIterations: number;
  complexity?: string;         // 'low' | 'mid' | 'high'
  deliberate?: boolean;
  confidence?: string;         // 'HIGH' | 'MED' | 'LOW'
  verdict?: string;            // 'APPROVE' | 'ITERATE' | 'REJECT'
  phaseHistory: string[];      // e.g. ['gate', 'foundation', 'option-design', ...]
  terminated?: boolean;
  terminateReason?: string;    // 'user_reject' | 'max_iterations' | 'stagnation'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PHASE_ORDER: PlanPhase[] = [
  'gate', 'foundation', 'option-design', 'steelman',
  'synthesis', 'synthesis-check', 'critique', 'adr',
];

const DEFAULT_MAX_ITERATIONS: Record<string, number> = {
  low: 3,
  mid: 5,
  high: 5,
};

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

function statePath(projectDir: string): string {
  return join(projectDir, '.aing', 'state', 'plan-state.json');
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Initialize a new plan state.
 */
export function initPlanState(
  projectDir: string,
  feature: string,
  opts?: { complexity?: string; deliberate?: boolean }
): PlanState {
  const complexity = opts?.complexity ?? 'mid';
  const state: PlanState = {
    active: true,
    phase: 'gate',
    feature,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    iteration: 0,
    maxIterations: DEFAULT_MAX_ITERATIONS[complexity] ?? 5,
    complexity,
    deliberate: opts?.deliberate ?? false,
    phaseHistory: ['gate'],
  };

  const result = writeState(statePath(projectDir), state);
  if (!result.ok) throw new Error(result.error);

  log.info('Plan state initialized', { feature, complexity });
  return state;
}

/**
 * Read current plan state. Returns null if no active plan.
 */
export function readPlanState(projectDir: string): PlanState | null {
  const result = readState(statePath(projectDir));
  if (!result.ok) return null;
  return result.data as PlanState;
}

/**
 * Advance to the next phase. Validates phase ordering.
 * Returns the updated state, or null if transition is invalid.
 */
export function advancePhase(projectDir: string, nextPhase: PlanPhase): PlanState | null {
  const state = readPlanState(projectDir);
  if (!state?.active) {
    log.error('Cannot advance — no active plan state');
    return null;
  }

  // Validate transition
  const nextIdx = PHASE_ORDER.indexOf(nextPhase);

  // Allow forward transitions AND loops (synthesis-check → synthesis for REVISE)
  if (nextIdx < 0) {
    log.error('Invalid phase', { nextPhase });
    return null;
  }

  state.phase = nextPhase;
  state.updatedAt = new Date().toISOString();
  state.phaseHistory.push(nextPhase);

  const result = writeState(statePath(projectDir), state);
  if (!result.ok) {
    log.error('Failed to write state', { error: result.error });
    return null;
  }

  log.info('Phase advanced', { from: state.phaseHistory[state.phaseHistory.length - 2], to: nextPhase });
  return state;
}

/**
 * Increment iteration (on Critic ITERATE).
 * Returns false if max iterations reached.
 */
export function incrementIteration(projectDir: string): boolean {
  const state = readPlanState(projectDir);
  if (!state?.active) return false;

  state.iteration += 1;
  state.updatedAt = new Date().toISOString();

  if (state.iteration >= state.maxIterations) {
    log.info('Max iterations reached', { iteration: state.iteration, max: state.maxIterations });
    return false; // caller should handle termination
  }

  const result = writeState(statePath(projectDir), state);
  return result.ok;
}

/**
 * Complete the plan (Phase 7 done).
 */
export function completePlan(
  projectDir: string,
  confidence: string,
  verdict: string
): void {
  const state = readPlanState(projectDir);
  if (!state) return;

  state.active = false;
  state.phase = 'completed';
  state.confidence = confidence;
  state.verdict = verdict;
  state.updatedAt = new Date().toISOString();
  state.phaseHistory.push('completed');

  writeState(statePath(projectDir), state);
  log.info('Plan completed', { feature: state.feature, confidence, verdict });
}

/**
 * Terminate the plan (REJECT, max iterations, stagnation).
 */
export function terminatePlan(projectDir: string, reason: string): void {
  const state = readPlanState(projectDir);
  if (!state) return;

  state.active = false;
  state.phase = 'terminated';
  state.terminated = true;
  state.terminateReason = reason;
  state.updatedAt = new Date().toISOString();
  state.phaseHistory.push('terminated');

  writeState(statePath(projectDir), state);
  log.info('Plan terminated', { feature: state.feature, reason });
}

/**
 * Delete plan state entirely.
 */
export function clearPlanState(projectDir: string): void {
  deleteState(statePath(projectDir));
  log.info('Plan state cleared');
}

/**
 * Check if a phase transition is valid (for integrity checks).
 */
export function validatePhaseSequence(history: string[]): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    const prevIdx = PHASE_ORDER.indexOf(prev as PlanPhase);
    const currIdx = PHASE_ORDER.indexOf(curr as PlanPhase);

    // Terminal states are always valid
    if (curr === 'completed' || curr === 'terminated') continue;

    // Loops are valid (ITERATE/REVISE)
    if (currIdx < prevIdx && currIdx >= 0) continue;

    // Forward skip of more than 1 phase is suspicious
    if (currIdx > prevIdx + 1 && prevIdx >= 0) {
      issues.push(`Phase skip: ${prev} → ${curr} (skipped ${currIdx - prevIdx - 1} phase(s))`);
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Get resume info for session restart.
 */
export function getResumeInfo(projectDir: string): {
  canResume: boolean;
  feature: string | null;
  phase: PlanPhase | null;
  iteration: number;
} {
  const state = readPlanState(projectDir);
  if (!state?.active) {
    return { canResume: false, feature: null, phase: null, iteration: 0 };
  }

  return {
    canResume: true,
    feature: state.feature,
    phase: state.phase,
    iteration: state.iteration,
  };
}
