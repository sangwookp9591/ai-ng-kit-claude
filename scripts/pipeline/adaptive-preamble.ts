/**
 * aing Adaptive Preamble Selector (Phase 4 — 200% Differentiator)
 *
 * Automatically selects preamble tier based on complexity score.
 * This is the synergy between gstack's tier system and aing's
 * complexity scoring — adaptive context sizing per agent.
 *
 * @module scripts/pipeline/adaptive-preamble
 */

type TaskType = 'explore' | 'implement' | 'plan' | 'review' | 'verify';

interface TokenSavings {
  actual: number;
  max: number;
  saved: number;
  savingsPercent: number;
}

interface AgentTierEntry {
  tier: number;
}

/**
 * Base tier mapping per task type.
 */
const BASE_TIERS: Record<string, number> = {
  explore: 1,
  implement: 2,
  plan: 3,
  review: 4,
  verify: 4,
};

/**
 * Estimated token cost per tier (preamble tokens only).
 */
const TIER_TOKENS: Record<number, number> = { 1: 200, 2: 400, 3: 600, 4: 800 };

/**
 * Select preamble tier based on task complexity.
 */
export function selectPreambleTier(complexityScore: number, taskType: TaskType): number {
  let tier = BASE_TIERS[taskType] || 2;

  // Complexity-based adjustment
  if (complexityScore >= 7) {
    tier = Math.min(tier + 1, 4); // bump up for complex tasks
  } else if (complexityScore <= 2) {
    tier = Math.max(tier - 1, 1); // drop down for simple tasks
  }

  return tier;
}

/**
 * Get estimated token savings from adaptive tiering vs always-T4.
 */
export function estimateTokenSavings(agents: AgentTierEntry[]): TokenSavings {
  if (agents.length === 0) {
    return { actual: 0, max: 0, saved: 0, savingsPercent: 0 };
  }

  const T4_TOKENS = TIER_TOKENS[4];
  const actualTokens = agents.reduce((sum, a) => sum + (TIER_TOKENS[a.tier] || 400), 0);
  const maxTokens = agents.length * T4_TOKENS;

  return {
    actual: actualTokens,
    max: maxTokens,
    saved: maxTokens - actualTokens,
    savingsPercent: Math.round((1 - actualTokens / maxTokens) * 100),
  };
}

/**
 * Format token savings report for display.
 */
export function formatSavingsReport(savings: TokenSavings): string {
  return [
    '[aing Adaptive Preamble]',
    `  Actual tokens:  ${savings.actual.toLocaleString()}`,
    `  Max (all T4):   ${savings.max.toLocaleString()}`,
    `  Saved:          ${savings.saved.toLocaleString()} tokens (${savings.savingsPercent}%)`,
  ].join('\n');
}
