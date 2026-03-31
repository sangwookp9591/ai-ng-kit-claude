/**
 * aing Learning Capture (Innovation #2 — Cross-Session Learning)
 * Automatically captures success patterns from completed PDCA cycles.
 * @module scripts/memory/learning-capture
 */
interface LearningParams {
    feature: string;
    evidence: Record<string, unknown>;
    iterations: number;
    patterns?: string[];
    mistakes?: string[];
}
/**
 * Capture learning from a completed PDCA Review stage.
 */
export declare function captureLearning({ feature, iterations, patterns, mistakes }: LearningParams, projectDir?: string): void;
export {};
//# sourceMappingURL=learning-capture.d.ts.map