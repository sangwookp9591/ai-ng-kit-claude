/**
 * aing Design Reviewer — UI/UX, AI Slop, Accessibility
 * Willji(Design) + Iron(Frontend) perspective.
 * @module scripts/review/design-reviewer
 */
import { AI_SLOP_BLACKLIST, LITMUS_CHECKS, detectAISlop } from './design-scoring.js';
import { recordReview } from './review-engine.js';
/**
 * Design review dimensions.
 */
export const DESIGN_DIMENSIONS = [
    { id: 'visual-hierarchy', name: 'Visual Hierarchy & Composition', weight: 0.15 },
    { id: 'typography', name: 'Typography', weight: 0.15 },
    { id: 'spacing', name: 'Spacing & Layout', weight: 0.15 },
    { id: 'color', name: 'Color & Contrast', weight: 0.10 },
    { id: 'interaction', name: 'Interaction States', weight: 0.10 },
    { id: 'responsive', name: 'Responsive Design', weight: 0.10 },
    { id: 'content', name: 'Content & Microcopy', weight: 0.10 },
    { id: 'ai-slop', name: 'AI Slop Detection', weight: 0.05 },
    { id: 'motion', name: 'Motion & Animation', weight: 0.05 },
    { id: 'performance', name: 'Performance as Design', weight: 0.05 },
];
/**
 * Run AI slop detection on changed frontend files.
 */
export function runDesignReview(diff) {
    // Extract added CSS/JSX/TSX content
    const addedContent = diff.split('\n')
        .filter(l => l.startsWith('+') && !l.startsWith('+++'))
        .map(l => l.slice(1))
        .join('\n');
    const detected = detectAISlop(addedContent);
    return {
        slopCount: detected.length,
        detected,
        dimensions: DESIGN_DIMENSIONS,
        litmusChecks: LITMUS_CHECKS,
    };
}
/**
 * Build design review prompt for Willji agent.
 */
export function buildDesignReviewPrompt(context) {
    const slopList = AI_SLOP_BLACKLIST.map((s, i) => `${i + 1}. ${s.description}`).join('\n');
    const litmus = LITMUS_CHECKS.map(c => `- ${c.question}`).join('\n');
    const dims = DESIGN_DIMENSIONS.map(d => `- ${d.name} (${Math.round(d.weight * 100)}%)`).join('\n');
    return `# Design Review — ${context.feature || 'unknown'}

## AI Slop Blacklist (flag ALL detected)
${slopList}

## Litmus Checks (YES/NO each)
${litmus}

## Dimensions to Score (0-100 each)
${dims}

## Output
- AI Slop Score: X/100
- Design Score: X/100 (weighted average)
- Issues with file:line references
- Fix suggestions`;
}
/**
 * Record design review result.
 */
export function recordDesignReview(result, projectDir) {
    recordReview('design-review', {
        status: (result.slopCount || 0) <= 2 ? 'clean' : 'issues_open',
        issues_found: result.slopCount || 0,
        critical_gaps: 0,
        mode: 'DESIGN_REVIEW',
    }, projectDir);
}
//# sourceMappingURL=design-reviewer.js.map