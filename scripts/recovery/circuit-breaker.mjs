/**
 * aing Circuit Breaker (Innovation #5 — Self-Healing Engine)
 * Detects repeated failures and auto-disables problematic features.
 * Pattern: CLOSED → OPEN (after N failures) → HALF-OPEN (after timeout) → CLOSED
 * @module scripts/recovery/circuit-breaker
 */

import { readStateOrDefault, writeState, updateState } from '../core/state.mjs';
import { getConfig } from '../core/config.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('circuit-breaker');

function getCircuitPath(projectDir) {
  return join(projectDir || process.cwd(), '.aing', 'state', 'circuit-breaker.json');
}

/**
 * Record a failure for a feature and check if circuit should open.
 * @param {string} feature - Feature/module identifier (e.g. 'pdca-engine', 'learning')
 * @param {string} error - Error message
 * @param {string} [projectDir]
 * @returns {{ tripped: boolean, state: 'closed'|'open'|'half-open', failures: number }}
 */
export function recordFailure(feature, error, projectDir) {
  const circuitPath = getCircuitPath(projectDir);
  const threshold = getConfig('recovery.circuitBreakerThreshold', 3);
  let result;

  updateState(circuitPath, {}, (circuits) => {
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
 * @param {string} feature
 * @param {string} [projectDir]
 * @returns {boolean} true if circuit is open (feature should be skipped)
 */
export function isCircuitOpen(feature, projectDir) {
  const circuits = readStateOrDefault(getCircuitPath(projectDir), {});
  const circuit = circuits[feature];
  if (!circuit || circuit.state === 'closed') return false;

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
 * @param {string} feature
 * @param {string} [projectDir]
 */
export function recordSuccess(feature, projectDir) {
  const circuitPath = getCircuitPath(projectDir);

  updateState(circuitPath, {}, (circuits) => {
    if (circuits[feature]) {
      circuits[feature] = { state: 'closed', failures: 0, lastFailure: null, openedAt: null };
      log.info(`Circuit CLOSED for ${feature} (success recorded)`);
    }
    return circuits;
  });
}
