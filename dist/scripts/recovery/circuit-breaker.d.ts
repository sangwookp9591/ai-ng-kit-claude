/**
 * aing Circuit Breaker (Innovation #5 — Self-Healing Engine)
 * Detects repeated failures and auto-disables problematic features.
 * Pattern: CLOSED → OPEN (after N failures) → HALF-OPEN (after timeout) → CLOSED
 * @module scripts/recovery/circuit-breaker
 */
type CircuitState = 'closed' | 'open' | 'half-open';
interface RecordFailureResult {
    tripped: boolean;
    state: CircuitState;
    failures: number;
}
/**
 * Record a failure for a feature and check if circuit should open.
 */
export declare function recordFailure(feature: string, error: string, projectDir?: string): RecordFailureResult;
/**
 * Check if a feature's circuit is open (should be skipped).
 * Automatically transitions OPEN → HALF-OPEN after reset timeout.
 */
export declare function isCircuitOpen(feature: string, projectDir?: string): boolean;
/**
 * Record a success and close the circuit.
 */
export declare function recordSuccess(feature: string, projectDir?: string): void;
export {};
//# sourceMappingURL=circuit-breaker.d.ts.map