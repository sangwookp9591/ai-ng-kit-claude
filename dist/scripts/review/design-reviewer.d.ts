/**
 * aing Design Reviewer — UI/UX, AI Slop, Accessibility
 * Willji(Design) + Iron(Frontend) perspective.
 * @module scripts/review/design-reviewer
 */
import { type DetectedSlop, type LitmusCheck } from './design-scoring.js';
export interface DesignDimension {
    id: string;
    name: string;
    weight: number;
}
export interface DesignReviewResult {
    slopCount: number;
    detected: DetectedSlop[];
    dimensions: DesignDimension[];
    litmusChecks: LitmusCheck[];
}
export interface DesignReviewContext {
    feature?: string;
}
export interface DesignRecordResult {
    slopCount?: number;
}
/**
 * Design review dimensions.
 */
export declare const DESIGN_DIMENSIONS: DesignDimension[];
/**
 * Run AI slop detection on changed frontend files.
 */
export declare function runDesignReview(diff: string): DesignReviewResult;
/**
 * Build design review prompt for Willji agent.
 */
export declare function buildDesignReviewPrompt(context: DesignReviewContext): string;
/**
 * Record design review result.
 */
export declare function recordDesignReview(result: DesignRecordResult, projectDir?: string): void;
//# sourceMappingURL=design-reviewer.d.ts.map