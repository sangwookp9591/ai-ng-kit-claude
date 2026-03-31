/**
 * aing Autoplan Engine — 6-Principle Auto-Decision System
 *
 * Chains: CEO → Design → Eng reviews with auto-decisions.
 * Integrates with aing's complexity scorer for review depth.
 *
 * @module scripts/pipeline/autoplan-engine
 */
import { createLogger } from '../core/logger.js';
import { selectTiers } from '../review/review-engine.js';
const log = createLogger('autoplan');
/**
 * 6 auto-decision principles.
 */
export const DECISION_PRINCIPLES = [
    {
        id: 1,
        name: 'completeness',
        rule: 'Choose completeness when marginal cost is near-zero',
        description: 'Ship the whole thing when AI makes completion cheap',
    },
    {
        id: 2,
        name: 'boil-lakes',
        rule: 'Fix everything in blast radius if <1 day CC effort (<5 files)',
        description: 'Small blast radius + low cost = do it all',
    },
    {
        id: 3,
        name: 'pragmatic',
        rule: 'Pick cleaner solution if two options fix same thing',
        description: 'When equally valid, choose simpler',
    },
    {
        id: 4,
        name: 'dry',
        rule: 'Reject duplicates, reuse existing functionality',
        description: 'Never build what already exists',
    },
    {
        id: 5,
        name: 'explicit',
        rule: 'Explicit over clever — 10-line obvious > 200-line abstraction',
        description: 'Readability beats elegance',
    },
    {
        id: 6,
        name: 'action-bias',
        rule: 'Merge > review cycles > stale deliberation',
        description: 'Forward progress beats perfection',
    },
];
/**
 * Decision classification types.
 */
export const DECISION_TYPES = {
    MECHANICAL: 'mechanical',
    TASTE: 'taste',
    USER_CHALLENGE: 'user_challenge',
};
/**
 * Classify a decision based on context.
 */
export function classifyDecision(decision) {
    // User challenge: both models disagree with user's direction
    if (decision.hasUserPreference && decision.crossModelDisagree) {
        return {
            type: DECISION_TYPES.USER_CHALLENGE,
            autoDecide: false,
            principle: null,
            reason: 'Both AI models recommend against user preference. User must decide.',
        };
    }
    // Mechanical: large score delta = clear winner
    if ((decision.optionScoreDelta ?? 0) >= 3) {
        const principle = findApplicablePrinciple(decision);
        return {
            type: DECISION_TYPES.MECHANICAL,
            autoDecide: true,
            principle: principle?.name || 'clear-winner',
            reason: `Score delta ${decision.optionScoreDelta}: clear best option`,
        };
    }
    // Taste: close options, reasonable debate
    const principle = findApplicablePrinciple(decision);
    return {
        type: DECISION_TYPES.TASTE,
        autoDecide: true,
        principle: principle?.name || 'pragmatic',
        reason: `Close options (delta ${decision.optionScoreDelta}). Auto-decided, surfaced at gate.`,
    };
}
/**
 * Find which principle best applies to a decision.
 */
function findApplicablePrinciple(decision) {
    const topic = (decision.topic || '').toLowerCase();
    if (topic.includes('scope') || topic.includes('complete'))
        return DECISION_PRINCIPLES[0];
    if (topic.includes('blast') || topic.includes('fix all'))
        return DECISION_PRINCIPLES[1];
    if (topic.includes('duplicate') || topic.includes('reuse'))
        return DECISION_PRINCIPLES[3];
    if (topic.includes('abstract') || topic.includes('clever'))
        return DECISION_PRINCIPLES[4];
    if (topic.includes('merge') || topic.includes('ship'))
        return DECISION_PRINCIPLES[5];
    return DECISION_PRINCIPLES[2]; // Default: pragmatic
}
/**
 * Build autoplan pipeline for a feature.
 */
export function buildAutoplanPipeline(context) {
    const tiers = selectTiers(context.complexityLevel, {
        hasUI: context.hasUI,
        hasProductChange: context.hasProductChange,
    });
    const phases = [];
    const decisions = [];
    // Phase 1: CEO Review (if high complexity + product change)
    if (tiers.includes('ceo-review')) {
        phases.push({
            name: 'CEO Review',
            tiers: ['ceo-review'],
            agents: ['able', 'sam'],
            focus: 'Scope, product-fit, strategy',
        });
    }
    // Phase 2: Design Review (if has UI)
    if (tiers.includes('design-review')) {
        phases.push({
            name: 'Design Review',
            tiers: ['design-review'],
            agents: ['willji', 'iron'],
            focus: 'UI/UX, accessibility, AI slop detection',
        });
    }
    // Phase 3: Eng Review (always)
    phases.push({
        name: 'Eng Review',
        tiers: ['eng-review'],
        agents: ['klay', 'jay', 'milla'],
        focus: 'Architecture, code quality, tests, security',
    });
    // Phase 4: Outside Voice (if high complexity)
    if (tiers.includes('outside-voice')) {
        phases.push({
            name: 'Outside Voice',
            tiers: ['outside-voice'],
            agents: [],
            focus: 'Independent adversarial review',
        });
    }
    log.info(`Autoplan: ${phases.length} phases for ${context.feature} (${context.complexityLevel})`);
    return { phases, decisions };
}
/**
 * Format autoplan progress.
 */
export function formatAutoplanProgress(phases, currentPhase) {
    const lines = ['Autoplan Pipeline:'];
    for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        let icon = '○'; // pending
        if (i < currentPhase)
            icon = '✓';
        else if (i === currentPhase)
            icon = '▶';
        lines.push(`  ${icon} ${i + 1}. ${phase.name} (${phase.agents.join(', ') || 'subagent'})`);
    }
    return lines.join('\n');
}
/**
 * Format decisions summary for final gate.
 */
export function formatDecisionsSummary(decisions) {
    if (decisions.length === 0)
        return 'No decisions required.';
    const lines = ['Autoplan Decisions:'];
    const mechanical = decisions.filter(d => d.type === DECISION_TYPES.MECHANICAL);
    const taste = decisions.filter(d => d.type === DECISION_TYPES.TASTE);
    const userChallenge = decisions.filter(d => d.type === DECISION_TYPES.USER_CHALLENGE);
    if (mechanical.length > 0) {
        lines.push(`\n  Mechanical (auto-decided silently): ${mechanical.length}`);
    }
    if (taste.length > 0) {
        lines.push(`\n  Taste (auto-decided, review below): ${taste.length}`);
        for (const d of taste) {
            lines.push(`    - ${d.topic}: chose by "${d.principle}" principle`);
        }
    }
    if (userChallenge.length > 0) {
        lines.push(`\n  User Challenge (REQUIRES YOUR DECISION): ${userChallenge.length}`);
        for (const d of userChallenge) {
            lines.push(`    ⚠ ${d.topic}: ${d.reason}`);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=autoplan-engine.js.map