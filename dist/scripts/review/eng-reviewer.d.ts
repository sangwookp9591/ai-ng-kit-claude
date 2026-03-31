/**
 * aing Eng Reviewer — Architecture, Code Quality, Tests, Performance
 * Klay(Architect) + Jay(Backend) + Milla(Security) perspective.
 * @module scripts/review/eng-reviewer
 */
import { runChecklist, classifyResults } from './review-checklist.js';
export interface EngSection {
    id: string;
    name: string;
    agents: string[];
    focus: string;
}
export interface EngReviewResult {
    results: ReturnType<typeof runChecklist>;
    classified: ReturnType<typeof classifyResults>;
    formatted: string;
}
export interface EngReviewContext {
    feature?: string;
}
/**
 * Eng review sections (maps to review-checklist.mjs categories).
 */
export declare const ENG_SECTIONS: EngSection[];
/**
 * Run eng review against diff.
 */
export declare function runEngReview(diff: string, projectDir?: string): EngReviewResult;
/**
 * Build eng review prompt for agents.
 */
export declare function buildEngReviewPrompt(context: EngReviewContext): string;
//# sourceMappingURL=eng-reviewer.d.ts.map