/**
 * aing Agent Tier Matrix (Phase 4 — 200% Differentiator)
 *
 * Maps agent names to their optimal preamble tier.
 * Light agents get T1 (less context = faster), heavy agents get T4 (full context).
 * Combines gstack's tier system with aing's multi-agent routing.
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
export const AGENT_TIERS: Record<string, AgentTierEntry> = {
  // T1 — Lightweight (exploration, quick tasks)
  explore: { agent: 'klay', tier: 1, model: 'haiku', description: 'Quick codebase scan' },
  task: { agent: 'able', tier: 1, model: 'haiku', description: 'Task management' },

  // T2 — Standard (implementation, single-domain)
  'backend-impl': { agent: 'jay', tier: 2, model: 'sonnet', description: 'API implementation' },
  'frontend-impl': { agent: 'iron', tier: 2, model: 'sonnet', description: 'UI implementation' },
  'mobile-impl': { agent: 'derek', tier: 2, model: 'sonnet', description: 'Mobile implementation' },
  'db-impl': { agent: 'jerry', tier: 2, model: 'sonnet', description: 'DB schema/migration' },
  'motion-impl': { agent: 'rowan', tier: 2, model: 'sonnet', description: 'Animation/interaction' },
  'design-impl': { agent: 'willji', tier: 2, model: 'sonnet', description: 'UI/UX design' },

  // T3 — Planning (multi-domain coordination)
  plan: { agent: 'able', tier: 3, model: 'sonnet', description: 'Full planning with Search Before Building' },
  architect: { agent: 'klay', tier: 3, model: 'opus', description: 'Architecture design' },
  'perf-audit': { agent: 'jun', tier: 3, model: 'sonnet', description: 'Performance analysis' },
  'dead-code': { agent: 'simon', tier: 3, model: 'sonnet', description: 'Dead code detection' },

  // T4 — Full context (review, verification, orchestration)
  'security-review': { agent: 'milla', tier: 4, model: 'sonnet', description: 'Security audit' },
  'final-verify': { agent: 'sam', tier: 4, model: 'opus', description: 'Evidence chain + goal verification' },
  'auto-pipeline': { agent: 'sam', tier: 4, model: 'opus', description: 'Full pipeline orchestration' },
};

/**
 * Get the optimal tier for an agent given a task context.
 * Adapts tier based on complexity score.
 */
export function getAgentTier(agentName: string, complexityScore: number = 5): AgentTierEntry | null {
  const base = AGENT_TIERS[agentName];
  if (!base) return null;

  let tier = base.tier;

  // High complexity (>7): bump T2 agents to T3 (they need more context)
  if (complexityScore > 7 && tier === 2) {
    tier = 3;
  }

  // Low complexity (<=2): drop T3 agents to T2 (save tokens)
  if (complexityScore <= 2 && tier === 3) {
    tier = 2;
  }

  return { ...base, tier };
}

/**
 * Get all agents for a pipeline preset with their tiers.
 * Returns array sorted by tier (ascending).
 */
export function getPipelineAgents(preset: string, complexityScore: number = 5): PipelineAgent[] {
  const PRESET_AGENTS: Record<string, string[]> = {
    solo: ['backend-impl'],
    duo: ['backend-impl', 'security-review'],
    squad: ['plan', 'backend-impl', 'frontend-impl', 'final-verify'],
    full: [
      'explore', 'plan', 'architect',
      'backend-impl', 'frontend-impl', 'db-impl',
      'security-review', 'final-verify',
    ],
  };

  const agentNames = PRESET_AGENTS[preset];
  if (!agentNames) return [];

  return agentNames
    .map(name => {
      const entry = getAgentTier(name, complexityScore);
      return entry ? { name, ...entry } : null;
    })
    .filter((item): item is PipelineAgent => item !== null)
    .sort((a, b) => a.tier - b.tier);
}

/**
 * Format agent tier matrix for display.
 */
export function formatAgentTiers(agents: PipelineAgent[]): string {
  if (agents.length === 0) return '[aing Agent Tiers] No agents configured';

  const lines: string[] = [
    '[aing Agent Tier Matrix]',
    '  ┌────────────────────┬────────┬──────┬─────────┬──────────────────────────────────┐',
    '  │ Role               │ Agent  │ Tier │ Model   │ Description                      │',
    '  ├────────────────────┼────────┼──────┼─────────┼──────────────────────────────────┤',
  ];

  for (const a of agents) {
    const role = a.name.padEnd(18);
    const agent = a.agent.padEnd(6);
    const tier = `T${a.tier}`.padEnd(4);
    const model = a.model.padEnd(7);
    const desc = a.description.slice(0, 32).padEnd(32);
    lines.push(`  │ ${role} │ ${agent} │ ${tier} │ ${model} │ ${desc} │`);
  }

  lines.push('  └────────────────────┴────────┴──────┴─────────┴──────────────────────────────────┘');
  return lines.join('\n');
}
