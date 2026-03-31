interface DecisionPrinciple {
    id: number;
    name: string;
    rule: string;
    description: string;
}
interface DecisionInput {
    topic: string;
    options?: string[];
    hasUserPreference?: boolean;
    crossModelDisagree?: boolean;
    optionScoreDelta?: number;
}
interface DecisionClassification {
    type: string;
    autoDecide: boolean;
    principle: string | null;
    reason?: string;
}
interface AutoplanPhase {
    name: string;
    tiers: string[];
    agents: string[];
    focus: string;
}
interface AutoplanDecision {
    topic: string;
    type: string;
    principle?: string;
    reason?: string;
}
interface AutoplanPipeline {
    phases: AutoplanPhase[];
    decisions: AutoplanDecision[];
}
interface AutoplanContext {
    feature: string;
    complexityLevel: 'low' | 'mid' | 'high';
    hasUI: boolean;
    hasProductChange: boolean;
}
/**
 * 6 auto-decision principles (from gstack).
 */
export declare const DECISION_PRINCIPLES: DecisionPrinciple[];
/**
 * Decision classification types.
 */
export declare const DECISION_TYPES: {
    readonly MECHANICAL: "mechanical";
    readonly TASTE: "taste";
    readonly USER_CHALLENGE: "user_challenge";
};
/**
 * Classify a decision based on context.
 */
export declare function classifyDecision(decision: DecisionInput): DecisionClassification;
/**
 * Build autoplan pipeline for a feature.
 */
export declare function buildAutoplanPipeline(context: AutoplanContext): AutoplanPipeline;
/**
 * Format autoplan progress.
 */
export declare function formatAutoplanProgress(phases: AutoplanPhase[], currentPhase: number): string;
/**
 * Format decisions summary for final gate.
 */
export declare function formatDecisionsSummary(decisions: AutoplanDecision[]): string;
export {};
//# sourceMappingURL=autoplan-engine.d.ts.map