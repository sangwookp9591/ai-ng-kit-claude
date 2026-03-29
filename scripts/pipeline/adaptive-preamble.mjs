/**
 * aing Adaptive Preamble Selector (Phase 4 — 200% Differentiator)
 *
 * Automatically selects preamble tier based on complexity score.
 * This is the synergy between gstack's tier system and aing's
 * complexity scoring — adaptive context sizing per agent.
 *
 * @module scripts/pipeline/adaptive-preamble
 */

/**
 * Base tier mapping per task type.
 * @type {Record<string, number>}
 */
const BASE_TIERS = {
  explore: 1,
  implement: 2,
  plan: 3,
  review: 4,
  verify: 4,
};

/**
 * Estimated token cost per tier (preamble tokens only).
 * @type {Record<number, number>}
 */
const TIER_TOKENS = { 1: 200, 2: 400, 3: 600, 4: 800 };

/**
 * Select preamble tier based on task complexity.
 *
 * @param {number} complexityScore - 0-10 complexity from complexity-scorer
 * @param {'explore' | 'implement' | 'plan' | 'review' | 'verify'} taskType
 * @returns {number} Tier 1-4
 */
export function selectPreambleTier(complexityScore, taskType) {
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
 *
 * @param {Array<{ tier: number }>} agents - Array of agent entries with tier
 * @returns {{ actual: number, max: number, saved: number, savingsPercent: number }}
 */
export function estimateTokenSavings(agents) {
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
 * @param {{ actual: number, max: number, saved: number, savingsPercent: number }} savings
 * @returns {string}
 */
export function formatSavingsReport(savings) {
  return [
    '[aing Adaptive Preamble]',
    `  Actual tokens:  ${savings.actual.toLocaleString()}`,
    `  Max (all T4):   ${savings.max.toLocaleString()}`,
    `  Saved:          ${savings.saved.toLocaleString()} tokens (${savings.savingsPercent}%)`,
  ].join('\n');
}
