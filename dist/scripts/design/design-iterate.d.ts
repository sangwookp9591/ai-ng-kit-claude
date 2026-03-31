/**
 * aing Design Iterate
 * Iterative design refinement based on feedback.
 * @module scripts/design/design-iterate
 */
import type { DesignSystem } from './design-engine.js';
export interface DesignFeedback {
    type: 'color' | 'spacing' | 'typography' | 'component' | 'general';
    action: 'adjust' | 'replace' | 'add' | 'remove';
    target?: string;
    value?: string;
    reason: string;
}
export interface IterationResult {
    system: DesignSystem;
    changes: ChangeRecord[];
    iteration: number;
    previousScore: number;
    newScore: number;
    improved: boolean;
}
export interface ChangeRecord {
    what: string;
    from: string;
    to: string;
    reason: string;
}
/**
 * Apply feedback to a design system and produce an improved version.
 */
export declare function iterateDesign(system: DesignSystem, feedback: DesignFeedback[], iteration?: number): IterationResult;
/**
 * Auto-fix common design issues detected by scoring.
 */
export declare function autoFixDesign(system: DesignSystem): IterationResult;
/**
 * Format iteration result as readable report.
 */
export declare function formatIteration(result: IterationResult): string;
//# sourceMappingURL=design-iterate.d.ts.map