/**
 * Classification of how a consensus decision should be handled.
 *
 * MECHANICAL      — unanimous agreement, safe to auto-apply
 * TASTE           — subjective split, needs human judgment
 * USER_CHALLENGE  — all reviewers reject, user must explicitly override
 * SECURITY_WARNING — security concern detected, always escalate
 */
export declare const DECISION_TYPES: {
    readonly MECHANICAL: "mechanical";
    readonly TASTE: "taste";
    readonly USER_CHALLENGE: "user_challenge";
    readonly SECURITY_WARNING: "security_warning";
};
type DecisionType = typeof DECISION_TYPES[keyof typeof DECISION_TYPES];
interface Vote {
    source: string;
    verdict: 'approve' | 'reject';
    confidence?: number;
    reasoning?: string;
}
interface ConsensusResult {
    decision: 'approve' | 'reject' | 'split' | 'no_votes';
    majority?: 'approve' | 'reject';
    unanimous: boolean;
    autoDecide: boolean;
    challengeType?: string | null;
    avgConfidence?: number;
    votes?: Array<{
        source: string;
        verdict: string;
        confidence?: number;
        reasoning: string;
    }>;
    summary?: string;
}
interface ClassifyContext {
    hasSecurity: boolean;
    isUnanimous: boolean;
}
/**
 * Build a consensus from an array of voter results.
 */
export declare function buildConsensus(votes: Vote[]): ConsensusResult;
/**
 * Classify the type of decision for downstream handling.
 */
export declare function classifyDecision({ hasSecurity, isUnanimous }: ClassifyContext): DecisionType;
export {};
//# sourceMappingURL=consensus-engine.d.ts.map