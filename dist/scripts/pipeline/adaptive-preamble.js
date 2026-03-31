/**
 * aing Adaptive Preamble Selector (Phase 4 — 200% Differentiator)
 *
 * Automatically selects preamble tier based on complexity score.
 * Adaptive context sizing per agent based on complexity scoring.
 *
 * @module scripts/pipeline/adaptive-preamble
 */
/**
 * Base tier mapping per task type.
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
 */
const TIER_TOKENS = { 1: 200, 2: 400, 3: 600, 4: 800 };
/**
 * Select preamble tier based on task complexity.
 */
export function selectPreambleTier(complexityScore, taskType) {
    let tier = BASE_TIERS[taskType] || 2;
    // Complexity-based adjustment
    if (complexityScore >= 7) {
        tier = Math.min(tier + 1, 4); // bump up for complex tasks
    }
    else if (complexityScore <= 2) {
        tier = Math.max(tier - 1, 1); // drop down for simple tasks
    }
    return tier;
}
/**
 * Get estimated token savings from adaptive tiering vs always-T4.
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
 */
export function formatSavingsReport(savings) {
    return [
        '[aing Adaptive Preamble]',
        `  Actual tokens:  ${savings.actual.toLocaleString()}`,
        `  Max (all T4):   ${savings.max.toLocaleString()}`,
        `  Saved:          ${savings.saved.toLocaleString()} tokens (${savings.savingsPercent}%)`,
    ].join('\n');
}
//# sourceMappingURL=adaptive-preamble.js.map