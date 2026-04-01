/**
 * aing Plan Pre-execution Gate — Blocks vague requests before planning.
 * Reuses intent-router anchor patterns to determine request specificity.
 * Returns PASS for concrete requests, BLOCK for vague ones.
 * @module scripts/hooks/plan-gate
 */
export interface GateResult {
    verdict: 'PASS' | 'BLOCK';
    anchorsFound: string[];
    reason: string;
}
/**
 * Check if a plan request has enough specificity to proceed.
 * Returns PASS if any concrete anchor is detected, BLOCK otherwise.
 */
export declare function checkPlanGate(input: string): GateResult;
//# sourceMappingURL=plan-gate.d.ts.map