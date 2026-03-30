/**
 * aing Review Engine — 4-Tier Review Pipeline
 * Absorbed from gstack's multi-tier review system.
 * Maps review tiers to aing's named agents.
 *
 * Tier mapping:
 *   eng-review    → Klay (Architect) + Jay (Backend) + Milla (Security)
 *   ceo-review    → Able (PM) + Sam (CTO)
 *   design-review → Willji (Design) + Iron (Frontend)
 *   outside-voice → External subagent (adversarial)
 *
 * Complexity integration:
 *   low:  eng-review only (Milla solo)
 *   mid:  eng + design (Milla + Klay + Willji)
 *   high: all 4 tiers (full team)
 *
 * @module scripts/review/review-engine
 */
import { createLogger } from '../core/logger.js';
import { appendReviewLog } from './review-log.js';

const log = createLogger('review-engine');

export interface ReviewFinding {
  type: string;
  severity: string;
  description: string;
  file: string;
  line: number;
  classification?: 'auto-fix' | 'ask';
}

export interface ReviewAgentConfig {
  agents: string[];
  focus: string[];
  description: string;
}

export interface ReviewResult {
  status?: string;
  issues_found?: number;
  critical_gaps?: number;
  unresolved?: number;
  mode?: string;
}

export interface ReviewPromptContext {
  feature?: string;
  branch?: string;
  diffSummary?: string;
  planPath?: string;
}

export interface TierOptions {
  hasUI?: boolean;
  hasProductChange?: boolean;
}

/**
 * Review passes (absorbed from gstack's two-pass review system).
 * Pass 1: CRITICAL (blocks ship)
 * Pass 2: INFORMATIONAL (quality improvement)
 */
export const REVIEW_PASSES: Record<string, string[]> = {
  CRITICAL: [
    'sql-injection',        // Parameterized queries required
    'race-conditions',      // Concurrent access patterns
    'llm-trust-boundary',   // System prompt leakage, prompt injection
    'enum-completeness',    // Switch/case exhaustiveness
    'auth-bypass',          // Authentication/authorization gaps
    'data-exposure',        // PII, secrets in logs/responses
  ],
  INFORMATIONAL: [
    'conditional-side-effects', // Operations inside conditionals
    'magic-numbers',        // Unexplained constants
    'dead-code',           // Unreachable/unused code
    'n-plus-one',          // Database query patterns
    'stale-comments',      // Comments that no longer match code
    'missing-error-handling', // Unhandled error paths
  ],
};

/**
 * Fix-First Heuristic: classify findings as AUTO-FIX or ASK.
 * AUTO-FIX: safe to apply directly (dead code, stale comments, formatting)
 * ASK: needs user judgment (architecture, behavior changes, trade-offs)
 */
export function classifyFinding(finding: ReviewFinding): 'auto-fix' | 'ask' {
  const autoFixable = [
    'dead-code', 'stale-comments', 'magic-numbers',
    'missing-error-handling', 'n-plus-one',
  ];

  if (finding.severity === 'CRITICAL') return 'ask';
  if (autoFixable.includes(finding.type)) return 'auto-fix';
  return 'ask';
}

/**
 * Format review results in gstack's output format.
 */
export function formatReviewResults(findings: ReviewFinding[]): string {
  const critical = findings.filter(f => f.severity === 'CRITICAL');
  const informational = findings.filter(f => f.severity !== 'CRITICAL');
  const autoFixed = findings.filter(f => f.classification === 'auto-fix');
  const needsAsk = findings.filter(f => f.classification === 'ask');

  const lines = [
    `Pre-Landing Review: ${findings.length} issues (${critical.length} critical, ${informational.length} informational)`,
    '',
  ];

  if (autoFixed.length > 0) {
    lines.push('Auto-Fixed:');
    for (const f of autoFixed) {
      lines.push(`  [AUTO-FIXED] [${f.file}:${f.line}] ${f.description}`);
    }
    lines.push('');
  }

  if (needsAsk.length > 0) {
    lines.push('Needs Decision:');
    for (const f of needsAsk) {
      const icon = f.severity === 'CRITICAL' ? '✗' : '△';
      lines.push(`  ${icon} [${f.severity}] [${f.file}:${f.line}] ${f.description}`);
    }
    lines.push('');
  }

  if (findings.length === 0) {
    lines.push('All checks passed. No issues found.');
  }

  return lines.join('\n');
}

/**
 * Agent assignments per review tier.
 */
export const REVIEW_AGENTS: Record<string, ReviewAgentConfig> = {
  'eng-review': {
    agents: ['klay', 'jay', 'milla'],
    focus: ['architecture', 'code-quality', 'tests', 'performance', 'security'],
    description: 'Architecture, code quality, tests, performance, security',
  },
  'ceo-review': {
    agents: ['simon', 'able'],
    focus: ['scope', 'product-fit', 'strategy', 'user-impact', 'competitive-analysis'],
    description: 'Product scope, strategy, user impact (Simon CEO + Able PM)',
  },
  'design-review': {
    agents: ['willji', 'iron'],
    focus: ['ui-ux', 'accessibility', 'responsive', 'design-system'],
    description: 'UI/UX, accessibility, design system alignment',
  },
  'outside-voice': {
    agents: [],  // External subagent, not named agents
    focus: ['blind-spots', 'feasibility', 'overcomplexity'],
    description: 'Independent adversarial review from external AI',
  },
};

/**
 * Determine which review tiers to run based on complexity.
 */
export function selectTiers(complexityLevel: 'low' | 'mid' | 'high', options: TierOptions = {}): string[] {
  const tiers = ['eng-review'];  // Always run

  if (complexityLevel === 'mid' || complexityLevel === 'high') {
    if (options.hasUI) tiers.push('design-review');
  }

  if (complexityLevel === 'high') {
    if (options.hasProductChange) tiers.push('ceo-review');
    tiers.push('outside-voice');
  }

  return tiers;
}

/**
 * Get the agent prompt context for a specific review tier.
 */
export function getReviewPrompt(tier: string, context: ReviewPromptContext): string {
  const config = REVIEW_AGENTS[tier];
  if (!config) throw new Error(`Unknown review tier: ${tier}`);

  const header = `## ${tier.replace('-', ' ').toUpperCase()} — ${config.description}`;
  const focusItems = config.focus.map(f => `- ${f}`).join('\n');

  return `${header}

Feature: ${context.feature || 'unknown'}
Branch: ${context.branch || 'unknown'}

### Focus Areas
${focusItems}

### Review Requirements
1. For each issue: describe concretely with file/line references
2. Rate severity: CRITICAL / HIGH / MEDIUM / LOW
3. Suggest fix with effort estimate
4. Evidence required: specific code references, not vague claims

### Diff Summary
${context.diffSummary || 'No diff available'}

### Scope Drift Check
Compare the actual diff against the original plan/goal.
Flag any work outside the stated scope.
Flag any stated goals NOT addressed in the diff.
`;
}

/**
 * Record a completed review.
 */
export function recordReview(tier: string, result: ReviewResult, projectDir?: string): void {
  appendReviewLog({
    skill: tier,
    timestamp: new Date().toISOString(),
    status: result.status || 'unknown',
    issues_found: result.issues_found || 0,
    critical_gaps: result.critical_gaps || 0,
    unresolved: result.unresolved || 0,
    mode: result.mode || 'FULL_REVIEW',
  }, projectDir);

  log.info(`Review recorded: ${tier} → ${result.status} (${result.issues_found} issues)`);
}
