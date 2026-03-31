/**
 * aing Design Evolve
 * Evolutionary design system optimization.
 * Generate mutations, score, select the fittest.
 * @module scripts/design/design-evolve
 */
import type { DesignSystem, DesignBrief } from './design-engine.js';
export interface EvolutionConfig {
    populationSize: number;
    generations: number;
    mutationRate: number;
    eliteCount: number;
}
export interface EvolutionResult {
    best: DesignSystem;
    generations: GenerationResult[];
    totalVariants: number;
    improvement: number;
}
export interface GenerationResult {
    generation: number;
    bestScore: number;
    avgScore: number;
    worstScore: number;
    bestName: string;
}
/**
 * Run evolutionary design optimization.
 */
export declare function evolveDesign(brief: DesignBrief, config?: Partial<EvolutionConfig>): EvolutionResult;
/**
 * Format evolution result as readable report.
 */
export declare function formatEvolution(result: EvolutionResult): string;
//# sourceMappingURL=design-evolve.d.ts.map