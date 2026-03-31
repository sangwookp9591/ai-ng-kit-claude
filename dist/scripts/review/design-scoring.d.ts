/**
 * aing Design Scoring — AI Slop Detection + Quality Assessment
 *
 * @module scripts/review/design-scoring
 */
export interface AISlopPattern {
    id: number;
    name: string;
    description: string;
    patterns: string[];
}
export interface LitmusCheck {
    id: number;
    question: string;
}
export interface DesignCategoryConfig {
    weight: number;
    items: number;
}
export interface DetectedSlop {
    id: number;
    name: string;
    description: string;
    matched: string;
}
export interface CategoryEvaluation {
    score: number;
    issues?: unknown[];
}
export interface DesignScoreResult {
    overall: number;
    grade: string;
    aiSlopScore: number;
    categories: Record<string, {
        score: number;
        weight: number;
    }>;
}
export interface DesignAuditContext {
    files?: string[];
}
/**
 * AI Slop Blacklist — 10 anti-patterns.
 */
export declare const AI_SLOP_BLACKLIST: AISlopPattern[];
/**
 * OpenAI Hard Rejection Criteria (7).
 */
export declare const HARD_REJECTIONS: string[];
/**
 * Litmus Checks (7 YES/NO tests).
 */
export declare const LITMUS_CHECKS: LitmusCheck[];
/**
 * Design audit categories with weights.
 */
export declare const DESIGN_CATEGORIES: Record<string, DesignCategoryConfig>;
/**
 * Detect AI slop patterns in code/content.
 */
export declare function detectAISlop(content: string): DetectedSlop[];
/**
 * Calculate design score from category evaluations.
 */
export declare function calculateDesignScore(evaluations: Record<string, CategoryEvaluation>): DesignScoreResult;
/**
 * Format design score for display.
 */
export declare function formatDesignScore(result: DesignScoreResult): string;
/**
 * Build design audit prompt for Willji agent.
 */
export declare function buildDesignAuditPrompt(context: DesignAuditContext): string;
//# sourceMappingURL=design-scoring.d.ts.map