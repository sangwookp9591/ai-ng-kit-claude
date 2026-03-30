/**
 * aing Cost Ceiling v0.5.0
 * Token usage limits, session time limits, API call limits.
 * Harness Engineering: Constrain axis — budget enforcement.
 * @module scripts/guardrail/cost-ceiling
 */

import { readStateOrDefault, writeState } from '../core/state.js';
import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';

const log = createLogger('cost-ceiling');

interface CostLimits {
  maxTokensPerSession: number;
  maxTokensPerTask: number;
  maxApiCallsPerSession: number;
  maxSessionMinutes: number;
  warningThreshold: number;
}

interface CostTracker {
  sessionStart: string;
  tokensUsed: number;
  taskTokens: Record<string, number>;
  apiCalls: number;
  warnings: string[];
}

interface UsageResult {
  ok: boolean;
  usage: {
    tokens: string;
    apiCalls: number;
    sessionMinutes: number;
    taskTokens?: string;
  };
  warnings: string[];
}

function getCostPath(projectDir?: string): string {
  return join(projectDir || process.cwd(), '.aing', 'state', 'cost-tracker.json');
}

/**
 * Default cost limits
 */
const DEFAULT_LIMITS: CostLimits = {
  maxTokensPerSession: 500000,
  maxTokensPerTask: 100000,
  maxApiCallsPerSession: 200,
  maxSessionMinutes: 120,
  warningThreshold: 0.8
};

/**
 * Load cost limits from config.
 */
export function loadLimits(_projectDir?: string): CostLimits {
  const userLimits = getConfig('guardrail.costCeiling', {}) as Partial<CostLimits>;
  return { ...DEFAULT_LIMITS, ...userLimits };
}

/**
 * Initialize cost tracking for a session.
 */
export function initCostTracker(projectDir?: string): void {
  const costPath = getCostPath(projectDir);
  writeState(costPath, {
    sessionStart: new Date().toISOString(),
    tokensUsed: 0,
    taskTokens: {},
    apiCalls: 0,
    warnings: []
  });
}

/**
 * Record token usage and check against ceiling.
 */
export function recordUsage(tokens: number, taskName?: string, projectDir?: string): UsageResult {
  const limits = loadLimits(projectDir);
  const costPath = getCostPath(projectDir);
  const tracker = readStateOrDefault(costPath, {
    sessionStart: new Date().toISOString(),
    tokensUsed: 0,
    taskTokens: {},
    apiCalls: 0,
    warnings: []
  }) as CostTracker;

  tracker.tokensUsed += tokens;
  tracker.apiCalls++;

  if (taskName) {
    tracker.taskTokens[taskName] = (tracker.taskTokens[taskName] || 0) + tokens;
  }

  const warnings: string[] = [];
  let ok = true;

  // Session token limit
  const sessionPct = tracker.tokensUsed / limits.maxTokensPerSession;
  if (sessionPct >= 1) {
    ok = false;
    warnings.push(`🚫 세션 토큰 한도 초과: ~${tracker.tokensUsed.toLocaleString()} / ${limits.maxTokensPerSession.toLocaleString()}`);
  } else if (sessionPct >= limits.warningThreshold) {
    warnings.push(`⚠️ 세션 토큰 ${Math.round(sessionPct * 100)}% 사용: ~${tracker.tokensUsed.toLocaleString()} / ${limits.maxTokensPerSession.toLocaleString()}`);
  }

  // Task token limit
  if (taskName && tracker.taskTokens[taskName] > limits.maxTokensPerTask) {
    warnings.push(`⚠️ 작업 "${taskName}" 토큰 한도 초과: ~${tracker.taskTokens[taskName].toLocaleString()} / ${limits.maxTokensPerTask.toLocaleString()}`);
  }

  // API call limit
  const apiPct = tracker.apiCalls / limits.maxApiCallsPerSession;
  if (apiPct >= 1) {
    warnings.push(`⚠️ API 호출 한도 도달: ${tracker.apiCalls} / ${limits.maxApiCallsPerSession}`);
  } else if (apiPct >= limits.warningThreshold) {
    warnings.push(`⚠️ API 호출 ${Math.round(apiPct * 100)}%: ${tracker.apiCalls} / ${limits.maxApiCallsPerSession}`);
  }

  // Session time limit
  const elapsed = (Date.now() - new Date(tracker.sessionStart).getTime()) / 60000;
  if (elapsed > limits.maxSessionMinutes) {
    warnings.push(`⚠️ 세션 시간 한도 초과: ${Math.round(elapsed)}분 / ${limits.maxSessionMinutes}분`);
  }

  tracker.warnings = warnings;
  writeState(costPath, tracker);

  if (warnings.length > 0) {
    log.warn('Cost ceiling warning', { warnings });
  }

  return {
    ok,
    usage: {
      tokens: `~${tracker.tokensUsed.toLocaleString()}`,
      apiCalls: tracker.apiCalls,
      sessionMinutes: Math.round(elapsed),
      taskTokens: taskName ? `~${(tracker.taskTokens[taskName] || 0).toLocaleString()}` : undefined
    },
    warnings
  };
}

/**
 * Get current cost status for display.
 */
export function formatCostStatus(projectDir?: string): string {
  const limits = loadLimits(projectDir);
  const tracker = readStateOrDefault(getCostPath(projectDir), { tokensUsed: 0, apiCalls: 0, sessionStart: new Date().toISOString() } as CostTracker) as CostTracker;

  const elapsed = Math.round((Date.now() - new Date(tracker.sessionStart).getTime()) / 60000);
  const tokenPct = Math.round((tracker.tokensUsed / limits.maxTokensPerSession) * 100);
  const apiPct = Math.round((tracker.apiCalls / limits.maxApiCallsPerSession) * 100);

  return [
    `[aing Cost]`,
    `  Tokens: ~${tracker.tokensUsed.toLocaleString()} / ${limits.maxTokensPerSession.toLocaleString()} (${tokenPct}%)`,
    `  API Calls: ${tracker.apiCalls} / ${limits.maxApiCallsPerSession} (${apiPct}%)`,
    `  Session: ${elapsed}min / ${limits.maxSessionMinutes}min`
  ].join('\n');
}
