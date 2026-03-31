/**
 * aing Harness Composer — Multi-harness pipeline composition
 * Chains multiple harnesses into sequential/parallel pipelines.
 * @module scripts/harness/harness-composer
 */
import type { ComposedPipeline } from './harness-types.js';
/**
 * Parse "research → design → build → qa" into stage names.
 */
export declare function parseCompositionString(input: string): string[];
export declare function composeHarnesses(stageNames: string[]): ComposedPipeline;
export declare function validateComposition(pipeline: ComposedPipeline): string[];
export interface ExecutionPlan {
    waves: string[][];
    totalStages: number;
    estimatedAgents: number;
}
export declare function buildExecutionPlan(pipeline: ComposedPipeline): ExecutionPlan;
export declare function formatComposition(pipeline: ComposedPipeline): string;
//# sourceMappingURL=harness-composer.d.ts.map