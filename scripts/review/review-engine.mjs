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
import { createLogger } from '../core/logger.mjs';
import { appendReviewLog } from './review-log.mjs';

const log = createLogger('review-engine');

/**
 * Agent assignments per review tier.
 */
export const REVIEW_AGENTS = {
  'eng-review': {
    agents: ['klay', 'jay', 'milla'],
    focus: ['architecture', 'code-quality', 'tests', 'performance', 'security'],
    description: 'Architecture, code quality, tests, performance, security',
  },
  'ceo-review': {
    agents: ['able', 'sam'],
    focus: ['scope', 'product-fit', 'strategy', 'user-impact'],
    description: 'Product scope, strategy, user impact',
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
 * @param {'low'|'mid'|'high'} complexityLevel
 * @param {object} [options]
 * @param {boolean} [options.hasUI] - Whether changes include UI
 * @param {boolean} [options.hasProductChange] - Whether this is a product change
 * @returns {string[]} Array of tier keys to run
 */
export function selectTiers(complexityLevel, options = {}) {
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
 * @param {string} tier - Review tier key
 * @param {object} context - { feature, branch, diffSummary, planPath? }
 * @returns {string} Agent prompt
 */
export function getReviewPrompt(tier, context) {
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
 * @param {string} tier
 * @param {object} result - { status, issues_found, critical_gaps, mode? }
 * @param {string} [projectDir]
 */
export function recordReview(tier, result, projectDir) {
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
