/**
 * aing Preamble Tier System
 *
 * Defines 4 tiers of preamble content for SKILL.md templates.
 * Each tier includes progressively more context, controlling
 * token budget per skill.
 *
 * T1: Core only (~200 tokens) — lightweight skills (explore, task)
 * T2: T1 + Voice + AskUserQuestion (~400 tokens) — mid-weight skills (debug, design)
 * T3: T2 + Search Before Building + Team routing (~600 tokens) — planning skills (plan-task)
 * T4: T3 + Full rules + AI Slop detection (~800 tokens) — heavy skills (auto, team, review-code)
 *
 * @module scripts/build/preamble-tiers
 */
type TierLevel = 1 | 2 | 3 | 4;
/**
 * Get preamble content for a given tier.
 */
export declare function getPreamble(tier: TierLevel): string;
/**
 * Get the agent team one-liner (for {{AGENT_TEAM}} placeholder).
 */
export declare function getAgentTeam(): string;
export {};
//# sourceMappingURL=preamble-tiers.d.ts.map