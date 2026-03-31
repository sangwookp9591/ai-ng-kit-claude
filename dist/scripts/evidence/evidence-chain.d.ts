/**
 * aing Evidence Chain (Innovation #4)
 * Builds structured proof chains for PDCA completion verification.
 * @module scripts/evidence/evidence-chain
 */
export interface EvidenceEntry {
    type: string;
    result: string;
    source: string;
    details?: Record<string, unknown>;
    seq?: number;
    ts?: string;
}
export interface EvidenceChain {
    feature: string;
    entries: EvidenceEntry[];
    verdict: string | null;
    evaluatedAt?: string;
}
export type EvidenceVerdict = 'PASS' | 'FAIL' | 'INCOMPLETE';
export interface EvaluationResult {
    verdict: EvidenceVerdict;
    summary: string;
    entries: EvidenceEntry[];
}
/**
 * Add evidence to a feature's chain.
 */
export declare function addEvidence(feature: string, evidence: Omit<EvidenceEntry, 'seq' | 'ts'>, projectDir?: string): void;
/**
 * Evaluate the evidence chain and produce a verdict.
 */
export declare function evaluateChain(feature: string, projectDir?: string): EvaluationResult;
/**
 * Format evidence chain for display.
 */
export declare function formatChain(feature: string, projectDir?: string): string;
//# sourceMappingURL=evidence-chain.d.ts.map