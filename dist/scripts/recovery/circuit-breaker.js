/**
 * aing Circuit Breaker (Innovation #5 — Self-Healing Engine)
 * Detects repeated failures and auto-disables problematic features.
 * Pattern: CLOSED → OPEN (after N failures) → HALF-OPEN (after timeout) → CLOSED
 * @module scripts/recovery/circuit-breaker
 */
import { readStateOrDefault, writeState, updateState } from '../core/state.js';
import { getConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
const log = createLogger('circuit-breaker');
function getCircuitPath(projectDir) {
    const dir = join(projectDir || process.cwd(), '.aing', 'state');
    mkdirSync(dir, { recursive: true });
    return join(dir, 'circuit-breaker.json');
}
/**
 * Record a failure for a feature and check if circuit should open.
 */
export function recordFailure(feature, error, projectDir) {
    const circuitPath = getCircuitPath(projectDir);
    const threshold = getConfig('recovery.circuitBreakerThreshold', 3);
    let result = { tripped: false, state: 'closed', failures: 0 };
    updateState(circuitPath, {}, (data) => {
        const circuits = data;
        if (!circuits[feature]) {
            circuits[feature] = { state: 'closed', failures: 0, lastFailure: null, openedAt: null };
        }
        const circuit = circuits[feature];
        circuit.failures++;
        circuit.lastFailure = new Date().toISOString();
        circuit.lastError = error.slice(0, 200);
        if (circuit.failures >= threshold && circuit.state === 'closed') {
            circuit.state = 'open';
            circuit.openedAt = new Date().toISOString();
            log.warn(`Circuit OPENED for ${feature} after ${circuit.failures} failures`);
        }
        result = {
            tripped: circuit.state === 'open',
            state: circuit.state,
            failures: circuit.failures
        };
        return circuits;
    });
    return result;
}
/**
 * Check if a feature's circuit is open (should be skipped).
 * Automatically transitions OPEN → HALF-OPEN after reset timeout.
 */
export function isCircuitOpen(feature, projectDir) {
    const circuits = readStateOrDefault(getCircuitPath(projectDir), {});
    const circuit = circuits[feature];
    if (!circuit || circuit.state === 'closed')
        return false;
    if (circuit.state === 'open') {
        const resetMs = getConfig('recovery.circuitBreakerResetMs', 300000); // 5 min
        const elapsed = Date.now() - new Date(circuit.openedAt).getTime();
        if (elapsed > resetMs) {
            circuit.state = 'half-open';
            writeState(getCircuitPath(projectDir), circuits);
            log.info(`Circuit HALF-OPEN for ${feature} (reset timeout elapsed)`);
            return false; // Allow one attempt
        }
        return true; // Still open
    }
    return false; // half-open allows attempts
}
/**
 * Record a success and close the circuit.
 */
export function recordSuccess(feature, projectDir) {
    const circuitPath = getCircuitPath(projectDir);
    updateState(circuitPath, {}, (data) => {
        const circuits = data;
        if (circuits[feature]) {
            circuits[feature] = { state: 'closed', failures: 0, lastFailure: null, openedAt: null };
            log.info(`Circuit CLOSED for ${feature} (success recorded)`);
        }
        return circuits;
    });
}
//# sourceMappingURL=circuit-breaker.js.map