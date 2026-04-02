/**
 * aing Agent Budget Guard v1.0.0
 * Session-level agent spawn tracking + budget enforcement.
 * Independent of plan-state — works for auto, team, plan-task, and all other skills.
 * @module scripts/guardrail/agent-budget
 */

import { readStateOrDefault, writeState } from '../core/state.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';

const log = createLogger('agent-budget');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Max agent spawns per session (across all skills). */
const MAX_SESSION_AGENTS = 20;

/** Max total duration (ms) of all agent calls combined. */
const MAX_TOTAL_AGENT_DURATION_MS = 30 * 60 * 1000; // 30 min

/** Warning threshold — warn when agent takes longer than this (ms). */
const SLOW_AGENT_WARN_MS = 5 * 60 * 1000; // 5 min

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentBudgetState {
  sessionId: string;
  agentCount: number;
  totalDurationMs: number;
  lastSpawnAt: string | null;
  slowAgents: string[];    // names of agents that exceeded SLOW_AGENT_WARN_MS
}

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

function budgetPath(projectDir: string): string {
  return join(projectDir, '.aing', 'state', 'agent-budget.json');
}

function getOrInit(projectDir: string): AgentBudgetState {
  const state = readStateOrDefault(budgetPath(projectDir), null) as AgentBudgetState | null;
  if (!state || !state.sessionId) {
    return {
      sessionId: `ses-${Date.now()}`,
      agentCount: 0,
      totalDurationMs: 0,
      lastSpawnAt: null,
      slowAgents: [],
    };
  }
  return state;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BudgetCheck {
  allowed: boolean;
  warn: string | null;
  agentCount: number;
  totalDurationMs: number;
}

/**
 * Track an agent spawn. Called by pre-tool-use hook on every aing: agent spawn.
 * Returns { allowed, warn } — warn is a message for stderr, allowed=false means cap exceeded.
 */
export function trackAgentSpawn(projectDir: string, agentName: string): BudgetCheck {
  const state = getOrInit(projectDir);
  state.agentCount += 1;
  state.lastSpawnAt = new Date().toISOString();

  const result: BudgetCheck = {
    allowed: true,
    warn: null,
    agentCount: state.agentCount,
    totalDurationMs: state.totalDurationMs,
  };

  if (state.agentCount > MAX_SESSION_AGENTS) {
    result.warn = `[aing:agent-budget] Session agent limit (${MAX_SESSION_AGENTS}) exceeded (current: ${state.agentCount}). Consider finalizing current work.`;
    log.info('Agent budget exceeded', { count: state.agentCount, max: MAX_SESSION_AGENTS, agent: agentName });
  } else if (state.agentCount === MAX_SESSION_AGENTS) {
    result.warn = `[aing:agent-budget] Approaching agent limit — this is agent ${state.agentCount}/${MAX_SESSION_AGENTS}.`;
  }

  if (state.totalDurationMs > MAX_TOTAL_AGENT_DURATION_MS) {
    result.warn = `[aing:agent-budget] Total agent time (${Math.round(state.totalDurationMs / 60000)}min) exceeds budget (${MAX_TOTAL_AGENT_DURATION_MS / 60000}min). Consider finalizing.`;
  }

  writeState(budgetPath(projectDir), state);
  return result;
}

/**
 * Record agent completion with duration. Called by post-tool-use hook.
 * Returns slow-agent warning if applicable.
 */
export function recordAgentCompletion(projectDir: string, agentName: string, durationMs: number): string | null {
  const state = getOrInit(projectDir);
  state.totalDurationMs += durationMs;

  let warn: string | null = null;

  if (durationMs > SLOW_AGENT_WARN_MS) {
    state.slowAgents.push(agentName);
    warn = `[aing:slow-agent] ${agentName} took ${Math.round(durationMs / 1000)}s (>${SLOW_AGENT_WARN_MS / 1000}s). Consider using sonnet model or reducing prompt complexity.`;
    log.info('Slow agent detected', { agent: agentName, durationMs, threshold: SLOW_AGENT_WARN_MS });
  }

  writeState(budgetPath(projectDir), state);
  return warn;
}

/**
 * Reset budget state (e.g., on session start).
 */
export function resetAgentBudget(projectDir: string): void {
  writeState(budgetPath(projectDir), {
    sessionId: `ses-${Date.now()}`,
    agentCount: 0,
    totalDurationMs: 0,
    lastSpawnAt: null,
    slowAgents: [],
  });
}

/**
 * Get current budget status (for HUD/diagnostics).
 */
export function getAgentBudgetStatus(projectDir: string): AgentBudgetState {
  return getOrInit(projectDir);
}
