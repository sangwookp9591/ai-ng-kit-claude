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
  low: 2,
  mid: 3,
  high: 3,
};

/**
 * Phase → allowed agent mapping.
 * Hook enforcement: pre-tool-use blocks agent spawns that don't match current phase.
 */
const PHASE_AGENT_MAP: Record<string, string[]> = {
  'foundation':      ['ryan'],
  'option-design':   ['able'],
  'steelman':        ['klay'],
  'synthesis':       ['able'],
  'synthesis-check': ['peter'],
  'critique':        ['critic'],
  'adr':             ['able'],
};

/**
 * Phase → next phase mapping (normal forward flow).
 * Loops (REVISE/ITERATE) are handled separately.
 */
const PHASE_NEXT: Record<string, PlanPhase> = {
  'gate':            'foundation',
  'foundation':      'option-design',
  'option-design':   'steelman',
  'steelman':        'synthesis',
  'synthesis':       'synthesis-check',
  'synthesis-check': 'critique',   // PASS → critique; REVISE → synthesis (handled by caller)
  'critique':        'adr',        // APPROVE → adr; ITERATE → synthesis-check (Targeted Patch: orchestrator edits plan, then Peter re-verifies)
  'adr':             'completed',
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

/** Max planning duration in milliseconds (15 min hard cap). */
const MAX_PLAN_DURATION_MS = 15 * 60 * 1000;

/** Max iteration duration in milliseconds (3 min per iteration). */
const MAX_ITERATION_DURATION_MS = 3 * 60 * 1000;

/**
 * Increment iteration (on Critic ITERATE).
 * Returns false if max iterations reached or time budget exceeded.
 */
export function incrementIteration(projectDir: string): boolean {
  const state = readPlanState(projectDir);
  if (!state?.active) return false;

  // Time-based guard: total planning duration
  const elapsed = Date.now() - new Date(state.startedAt).getTime();
  if (elapsed > MAX_PLAN_DURATION_MS) {
    log.info('Planning time budget exceeded', { elapsedMs: elapsed, maxMs: MAX_PLAN_DURATION_MS });
    return false;
  }

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
 * Check if the current iteration has exceeded its time budget.
 * Called by hooks to force early termination of stuck iterations.
 */
export function isIterationTimedOut(projectDir: string): boolean {
  const state = readPlanState(projectDir);
  if (!state?.active) return false;

  const sinceUpdate = Date.now() - new Date(state.updatedAt).getTime();
  return sinceUpdate > MAX_ITERATION_DURATION_MS;
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

// ---------------------------------------------------------------------------
// Hook Enforcement API
// ---------------------------------------------------------------------------

/**
 * Check if an agent spawn is allowed in the current phase.
 * Called by pre-tool-use hook to block out-of-order agent spawns.
 *
 * Returns { allowed: true } if no active plan or agent is permitted.
 * Returns { allowed: false, reason } if agent spawn violates phase ordering.
 */
export function checkAgentAllowed(
  projectDir: string,
  agentName: string
): { allowed: boolean; reason?: string; phase?: PlanPhase } {
  const state = readPlanState(projectDir);

  // No active plan → don't interfere
  if (!state?.active) return { allowed: true };

  const phase = state.phase;
  const allowedAgents = PHASE_AGENT_MAP[phase];

  // gate phase → no agents allowed (orchestrator sets up state)
  if (phase === 'gate') {
    return { allowed: false, reason: `Plan is in gate phase — run Phase 0 checks before spawning agents`, phase };
  }

  // completed/terminated → don't interfere
  if (phase === 'completed' || phase === 'terminated') return { allowed: true };

  // No mapping for this phase → allow (safety fallback)
  if (!allowedAgents) return { allowed: true };

  // Normalize agent name: "aing:ryan" → "ryan", "Ryan" → "ryan"
  const normalized = agentName.replace(/^aing:/, '').toLowerCase();

  if (allowedAgents.includes(normalized)) {
    return { allowed: true, phase };
  }

  return {
    allowed: false,
    phase,
    reason: `Phase "${phase}" expects agent [${allowedAgents.join('/')}], got "${normalized}". ` +
            `Complete the current phase before spawning "${normalized}".`,
  };
}

/**
 * Auto-advance phase after an agent completes.
 * Called by post-tool-use hook when an aing: agent finishes.
 *
 * Returns the new phase, or null if no advancement needed.
 */
export function autoAdvancePhase(
  projectDir: string,
  completedAgent: string
): PlanPhase | null {
  const state = readPlanState(projectDir);
  if (!state?.active) return null;

  const phase = state.phase;
  const allowedAgents = PHASE_AGENT_MAP[phase];
  const normalized = completedAgent.replace(/^aing:/, '').toLowerCase();

  // Only advance if the completed agent matches the current phase
  if (!allowedAgents || !allowedAgents.includes(normalized)) return null;

  const nextPhase = PHASE_NEXT[phase];
  if (!nextPhase) return null;

  // Don't auto-advance from synthesis-check or critique — verdict determines next phase
  if (phase === 'synthesis-check' || phase === 'critique') {
    // These need verdict-based routing, not auto-advance
    // The orchestrator (SKILL.md / LLM) reads the agent output and calls advancePhase explicitly
    log.info('Phase requires verdict-based routing — skipping auto-advance', { phase, agent: normalized });
    return null;
  }

  const result = advancePhase(projectDir, nextPhase);
  if (result) {
    log.info('Auto-advanced phase', { from: phase, to: nextPhase, agent: normalized });
    return nextPhase;
  }

  return null;
}

/**
 * Get the expected agent(s) for the current phase.
 * Used by hooks to inject guidance when phase doesn't match.
 */
export function getExpectedAgent(projectDir: string): { phase: PlanPhase; agents: string[] } | null {
  const state = readPlanState(projectDir);
  if (!state?.active) return null;

  const agents = PHASE_AGENT_MAP[state.phase];
  if (!agents) return null;

  return { phase: state.phase, agents };
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
