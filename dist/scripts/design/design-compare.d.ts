/**
 * aing Design Compare
 * Compare and rank design system variants.
 * @module scripts/design/design-compare
 */
import type { DesignSystem } from './design-engine.js';
export interface ComparisonResult {
    variants: VariantRank[];
    winner: string;
    reasoning: string[];
    dimensions: DimensionComparison[];
}
export interface VariantRank {
    name: string;
    score: number;
    rank: number;
    strengths: string[];
    weaknesses: string[];
}
export interface DimensionComparison {
    dimension: string;
    scores: Record<string, number>;
    winner: string;
}
/**
 * Compare multiple design system variants and rank them.
 */
export declare function compareDesigns(variants: Array<{
    name: string;
    system: DesignSystem;
}>): ComparisonResult;
/**
 * Format comparison as a readable table.
 */
export declare function formatComparison(result: ComparisonResult): string;
//# sourceMappingURL=design-compare.d.ts.map