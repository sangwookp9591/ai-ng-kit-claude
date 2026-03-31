/**
 * aing Adaptive Architect — Auto-design harnesses based on task analysis
 * Recommends architecture pattern, agents, model routing, and team size.
 * @module scripts/harness/adaptive-architect
 */
import { type ComplexitySignals } from '../routing/complexity-scorer.js';
import type { ArchitectureRecommendation, HarnessBlueprint } from './harness-types.js';
export declare function analyzeTask(taskDescription: string, signals?: ComplexitySignals): ArchitectureRecommendation;
export declare function generateBlueprint(rec: ArchitectureRecommendation, projectDir: string): HarnessBlueprint;
export declare function formatRecommendation(rec: ArchitectureRecommendation): string;
//# sourceMappingURL=adaptive-architect.d.ts.map