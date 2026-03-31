/**
 * aing Agent Tier Matrix (Phase 4 — 200% Differentiator)
 *
 * Maps agent names to their optimal preamble tier.
 * Light agents get T1 (less context = faster), heavy agents get T4 (full context).
 * Integrates tier system with aing's multi-agent routing.
 *
 * @module scripts/pipeline/agent-tiers
 */
interface AgentTierEntry {
    agent: string;
    tier: number;
    model: string;
    description: string;
}
interface PipelineAgent extends AgentTierEntry {
    name: string;
}
/**
 * Agent → Preamble Tier mapping.
 * Each entry defines the base tier, preferred model, and purpose.
 */
export declare const AGENT_TIERS: Record<string, AgentTierEntry>;
/**
 * Get the optimal tier for an agent given a task context.
 * Adapts tier based on complexity score.
 */
export declare function getAgentTier(agentName: string, complexityScore?: number): AgentTierEntry | null;
/**
 * Get all agents for a pipeline preset with their tiers.
 * Returns array sorted by tier (ascending).
 */
export declare function getPipelineAgents(preset: string, complexityScore?: number): PipelineAgent[];
/**
 * Format agent tier matrix for display.
 */
export declare function formatAgentTiers(agents: PipelineAgent[]): string;
export {};
//# sourceMappingURL=agent-tiers.d.ts.map