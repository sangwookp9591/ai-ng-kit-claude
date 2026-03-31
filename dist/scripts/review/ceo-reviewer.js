/**
 * aing CEO Reviewer — Product Strategy & Scope Review
 * Simon(CEO) + Able(PM) perspective.
 * @module scripts/review/ceo-reviewer
 */
import { recordReview } from './review-engine.js';
/**
 * CEO review focus areas.
 */
export const CEO_CHECKS = [
    { id: 'scope-fit', name: 'Scope Fit', question: 'Is this the right thing to build now?' },
    { id: 'user-impact', name: 'User Impact', question: 'How many users are affected and how much?' },
    { id: 'competitive', name: 'Competitive Risk', question: 'Is someone else solving this better?' },
    { id: 'cost-value', name: 'Cost vs Value', question: 'Is the effort proportional to the impact?' },
    { id: 'strategy', name: 'Strategic Direction', question: 'Does this align with 6-month vision?' },
    { id: 'dream-delta', name: 'Dream State Delta', question: 'How far does this get us toward ideal state?' },
];
/**
 * Build CEO review prompt for Simon agent.
 */
export function buildCEOReviewPrompt(context) {
    const checks = CEO_CHECKS.map(c => `- **${c.name}**: ${c.question}`).join('\n');
    return `# CEO Review — ${context.feature}

Branch: ${context.branch || 'unknown'}

## Review Focus
${checks}

## Office Hours 6-Question Framework
1. Demand Reality: 사라지면 화낼 사용자가 있나?
2. Status Quo: 지금은 어떻게 해결하나?
3. Desperate Specificity: 가장 필요한 실제 사람은?
4. Narrowest Wedge: 이번 주에 돈 낼 최소 버전은?
5. Observation: 도움 없이 사용하는 걸 봤나?
6. Future-Fit: 3년 뒤 더 필수적이 되나?

## Plan Summary
${context.planSummary || 'No plan available'}

## Diff Summary
${context.diffSummary || 'No diff available'}

## Output
For each focus area, rate 1-5 and provide one-sentence assessment.
End with: APPROVE / DEFER / KILL recommendation.`;
}
/**
 * Record CEO review result.
 */
export function recordCEOReview(result, projectDir) {
    recordReview('ceo-review', {
        status: result.recommendation === 'APPROVE' ? 'clean' : 'issues_open',
        issues_found: (result.concerns || []).length,
        critical_gaps: result.recommendation === 'KILL' ? 1 : 0,
        mode: 'CEO_REVIEW',
    }, projectDir);
}
//# sourceMappingURL=ceo-reviewer.js.map