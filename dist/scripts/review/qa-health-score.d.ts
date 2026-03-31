/**
 * aing QA Health Score Calculator
 * Absorbed from gstack's 8-category weighted health score.
 *
 * @module scripts/review/qa-health-score
 */
export interface HealthCategoryConfig {
    weight: number;
    label: string;
}
export interface HealthIssue {
    severity: string;
    [key: string]: unknown;
}
export interface CategoryData {
    errors?: number;
    broken?: number;
    issues?: HealthIssue[];
    [key: string]: unknown;
}
export interface CategoryScore {
    score: number;
    weight: number;
    label: string;
}
export interface HealthScoreResult {
    overall: number;
    categories: Record<string, CategoryScore>;
    grade: string;
}
/**
 * Health score categories with weights.
 */
export declare const HEALTH_CATEGORIES: Record<string, HealthCategoryConfig>;
/**
 * Calculate score for a single category.
 */
export declare function calculateCategoryScore(category: string, data: CategoryData): number;
/**
 * Calculate overall health score.
 */
export declare function calculateHealthScore(categoryData: Record<string, CategoryData>): HealthScoreResult;
/**
 * Format health score for display.
 */
export declare function formatHealthScore(result: HealthScoreResult): string;
//# sourceMappingURL=qa-health-score.d.ts.map