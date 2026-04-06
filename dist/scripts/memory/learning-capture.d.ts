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
interface PassiveParams {
    trigger: 'guardrail-denial' | 'error-recovery' | 'session-end';
    content: string;
    context?: string;
}
/**
 * Lightweight passive learning capture — fires outside PDCA cycles.
 * Uses source='passive' and initial confidence=0.7 (deduplication by content).
 */
export declare function capturePassive({ trigger, content, context }: PassiveParams, projectDir?: string): void;
export {};
//# sourceMappingURL=learning-capture.d.ts.map