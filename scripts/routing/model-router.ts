/**
 * aing Model Router — Adaptive model selection based on task complexity and risk.
 * Routes agents to optimal model tier (haiku/sonnet/opus) based on signals.
 * @module scripts/routing/model-router
 */

import { scoreComplexity, ComplexitySignals, ComplexityLevel } from './complexity-scorer.js';

export type CostMode = 'quality' | 'balanced' | 'budget';
export type ModelTier = 'haiku' | 'sonnet' | 'opus';

interface RoutingResult {
  model: string;
  reason: string;
  escalated: boolean;
}

interface RiskEscalationRule {
  signal: string | ((s: ComplexitySignals) => boolean);
  minTier: ModelTier;
  reason: string;
}

interface RouteOptions {
  costMode?: CostMode;
  forceModel?: string;
  context?: string;
}

type DowngradeFunction = (level: ComplexityLevel) => ModelTier;
type DowngradeMap = Partial<Record<ModelTier, DowngradeFunction>>;

/**
 * Model tiers ordered by capability.
 */
const TIERS: ModelTier[] = ['haiku', 'sonnet', 'opus'];

/**
 * Default model assignments per agent role.
 * These can be overridden by routing decisions.
 */
const AGENT_DEFAULTS: Record<string, ModelTier> = {
  able: 'sonnet',
  jay: 'sonnet',
  derek: 'sonnet',
  jerry: 'sonnet',
  klay: 'opus',
  sam: 'opus',
  milla: 'sonnet',
  willji: 'sonnet',
  rowan: 'sonnet',
  wizard: 'sonnet',
};

/**
 * Risk signals that force model escalation.
 */
const RISK_ESCALATION_RULES: RiskEscalationRule[] = [
  { signal: 'hasSecurity', minTier: 'opus', reason: 'security-sensitive change' },
  { signal: 'hasArchChange', minTier: 'opus', reason: 'architecture-level change' },
  { signal: (s: ComplexitySignals) => (s.fileCount ?? 0) > 20, minTier: 'opus', reason: '>20 files changed' },
  { signal: (s: ComplexitySignals) => (s.domainCount ?? 0) >= 3, minTier: 'sonnet', reason: '3+ domains touched' },
];

/**
 * Cost mode downgrade rules.
 * quality: no downgrades
 * balanced: opus→sonnet for low/mid complexity
 * budget: opus→sonnet always, sonnet→haiku for low complexity
 */
const COST_DOWNGRADES: Record<CostMode, DowngradeMap> = {
  quality: {},
  balanced: {
    opus: (level: ComplexityLevel): ModelTier => level !== 'high' ? 'sonnet' : 'opus',
    sonnet: (): ModelTier => 'sonnet',
    haiku: (): ModelTier => 'haiku',
  },
  budget: {
    opus: (): ModelTier => 'sonnet',
    sonnet: (level: ComplexityLevel): ModelTier => level === 'low' ? 'haiku' : 'sonnet',
    haiku: (): ModelTier => 'haiku',
  },
};

/**
 * Route an agent to the optimal model tier.
 */
export function routeModel(agentName: string, signals: ComplexitySignals = {}, options: RouteOptions = {}): RoutingResult {
  const safeSignals: ComplexitySignals = signals ?? {};
  const { costMode = 'balanced', forceModel, context } = options;

  // User override bypasses all routing
  if (forceModel && TIERS.includes(forceModel as ModelTier)) {
    return { model: forceModel, reason: 'user-override', escalated: false };
  }

  // Start with agent default
  let model: ModelTier = AGENT_DEFAULTS[agentName] || 'sonnet';
  let reason = 'agent-default';
  let escalated = false;

  // Score complexity if signals provided
  const { score, level } = scoreComplexity(safeSignals);

  // Determine whether any risk signal is active (computed once, used in multiple guards below).
  // This is independent of whether the signal actually changed the model tier.
  const hasRiskSignal = RISK_ESCALATION_RULES.some((rule) =>
    typeof rule.signal === 'function' ? rule.signal(safeSignals) : safeSignals[rule.signal as keyof ComplexitySignals]
  );

  // Complexity-based escalation
  if (level === 'high' && tierIndex(model) < tierIndex('opus')) {
    model = 'opus';
    reason = `complexity-high (score=${score})`;
    escalated = true;
  }

  // Risk signal escalation (overrides complexity)
  for (const rule of RISK_ESCALATION_RULES) {
    const triggered = typeof rule.signal === 'function'
      ? rule.signal(safeSignals)
      : safeSignals[rule.signal as keyof ComplexitySignals];

    if (triggered && tierIndex(model) < tierIndex(rule.minTier)) {
      model = rule.minTier;
      reason = `risk-escalation: ${rule.reason}`;
      escalated = true;
    }
  }

  // Context-specific overrides
  if (context === 'plan-review' && agentName === 'klay') {
    // Klay in plan review mode: sonnet is sufficient (cost optimization)
    if (!escalated) {
      model = 'sonnet';
      reason = 'plan-review-optimization';
    }
  }
  if (context === 'verify' && agentName === 'sam') {
    // Sam in team-verify: downgrade to haiku for cost unless complexity is high
    // or any risk signal is present (regardless of whether it changed the model tier).
    if (level !== 'high' && !hasRiskSignal) {
      model = 'haiku';
      reason = 'verify-cost-optimization';
    }
  }

  // Apply cost mode downgrade (last step, after all escalations).
  // Only applies when signals were explicitly provided — no-signal calls preserve agent defaults.
  // Also skipped when a risk signal is present to avoid clobbering preserved model decisions.
  const hasSignals = Object.keys(safeSignals).length > 0;
  const downgrades: DowngradeMap = COST_DOWNGRADES[costMode] ?? COST_DOWNGRADES['balanced'];
  if (hasSignals && !hasRiskSignal && downgrades && downgrades[model]) {
    const downgraded = downgrades[model]!(level);
    if (downgraded !== model && !escalated) {
      reason = `cost-${costMode}: ${model}→${downgraded}`;
      model = downgraded;
    }
  }

  return { model, reason, escalated };
}

/**
 * Get tier index for comparison.
 */
function tierIndex(tier: ModelTier): number {
  return TIERS.indexOf(tier);
}

/**
 * Get cost mode from environment or default.
 */
export function getCostMode(): CostMode {
  const env = process.env.SWKIT_COST_MODE;
  if (env && ['quality', 'balanced', 'budget'].includes(env)) return env as CostMode;
  return 'balanced';
}
