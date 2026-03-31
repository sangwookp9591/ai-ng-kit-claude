/**
 * Unit tests for scripts/recovery/circuit-breaker.ts
 * Covers: recordFailure, isCircuitOpen, recordSuccess, state transitions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// In-memory store simulating file state
let circuitStore = {};
vi.mock('../../../scripts/core/state.js', () => ({
    readState: vi.fn(),
    readStateOrDefault: vi.fn((path, defaultVal) => {
        return circuitStore[path] ?? defaultVal;
    }),
    writeState: vi.fn((path, data) => {
        circuitStore[path] = data;
        return { ok: true };
    }),
    updateState: vi.fn((path, defaultVal, mutator) => {
        const current = circuitStore[path] ?? (typeof defaultVal === 'function' ? defaultVal() : defaultVal);
        const updated = mutator(JSON.parse(JSON.stringify(current)));
        circuitStore[path] = updated;
        return { ok: true, data: updated };
    }),
}));
vi.mock('../../../scripts/core/config.js', () => ({
    loadConfig: vi.fn(() => ({})),
    getConfig: vi.fn((path, fallback) => {
        if (path === 'recovery.circuitBreakerThreshold')
            return 3;
        if (path === 'recovery.circuitBreakerResetMs')
            return 300000;
        return fallback;
    }),
    resetConfigCache: vi.fn(),
}));
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })),
}));
import { recordFailure, isCircuitOpen, recordSuccess, } from '../../../scripts/recovery/circuit-breaker.js';
const PROJECT_DIR = '/tmp/project';
const CIRCUIT_PATH = '/tmp/project/.aing/state/circuit-breaker.json';
beforeEach(() => {
    vi.clearAllMocks();
    circuitStore = {};
});
// ---------------------------------------------------------------------------
// recordFailure
// ---------------------------------------------------------------------------
describe('recordFailure', () => {
    it('records first failure without tripping', () => {
        const result = recordFailure('api-fetch', 'timeout', PROJECT_DIR);
        expect(result.tripped).toBe(false);
        expect(result.state).toBe('closed');
        expect(result.failures).toBe(1);
    });
    it('increments failure count on subsequent failures', () => {
        recordFailure('api-fetch', 'timeout', PROJECT_DIR);
        const result = recordFailure('api-fetch', 'timeout', PROJECT_DIR);
        expect(result.failures).toBe(2);
        expect(result.state).toBe('closed');
    });
    it('trips circuit open after reaching threshold (3 failures)', () => {
        recordFailure('api-fetch', 'err1', PROJECT_DIR);
        recordFailure('api-fetch', 'err2', PROJECT_DIR);
        const result = recordFailure('api-fetch', 'err3', PROJECT_DIR);
        expect(result.tripped).toBe(true);
        expect(result.state).toBe('open');
        expect(result.failures).toBe(3);
    });
    it('keeps circuit open on further failures', () => {
        recordFailure('db-query', 'err1', PROJECT_DIR);
        recordFailure('db-query', 'err2', PROJECT_DIR);
        recordFailure('db-query', 'err3', PROJECT_DIR);
        const result = recordFailure('db-query', 'err4', PROJECT_DIR);
        // After opening, state stays open, failures continue incrementing
        expect(result.state).toBe('open');
        expect(result.failures).toBe(4);
    });
    it('tracks separate circuits per feature', () => {
        recordFailure('feature-a', 'err', PROJECT_DIR);
        recordFailure('feature-a', 'err', PROJECT_DIR);
        recordFailure('feature-a', 'err', PROJECT_DIR);
        const resultA = recordFailure('feature-a', 'err', PROJECT_DIR);
        const resultB = recordFailure('feature-b', 'err', PROJECT_DIR);
        expect(resultA.state).toBe('open');
        expect(resultB.state).toBe('closed');
        expect(resultB.failures).toBe(1);
    });
    it('truncates error message to 200 chars', () => {
        const longError = 'x'.repeat(500);
        recordFailure('feature-x', longError, PROJECT_DIR);
        const stored = circuitStore[CIRCUIT_PATH];
        expect(stored['feature-x'].lastError.length).toBeLessThanOrEqual(200);
    });
});
// ---------------------------------------------------------------------------
// isCircuitOpen
// ---------------------------------------------------------------------------
describe('isCircuitOpen', () => {
    it('returns false for unknown feature', () => {
        expect(isCircuitOpen('nonexistent', PROJECT_DIR)).toBe(false);
    });
    it('returns false for closed circuit', () => {
        circuitStore[CIRCUIT_PATH] = {
            myFeature: { state: 'closed', failures: 1, lastFailure: null, openedAt: null },
        };
        expect(isCircuitOpen('myFeature', PROJECT_DIR)).toBe(false);
    });
    it('returns true for open circuit within reset timeout', () => {
        circuitStore[CIRCUIT_PATH] = {
            myFeature: {
                state: 'open',
                failures: 3,
                lastFailure: new Date().toISOString(),
                openedAt: new Date().toISOString(), // just opened
            },
        };
        expect(isCircuitOpen('myFeature', PROJECT_DIR)).toBe(true);
    });
    it('transitions open to half-open after reset timeout', () => {
        const pastTime = new Date(Date.now() - 400000).toISOString(); // 400s ago, > 300s timeout
        circuitStore[CIRCUIT_PATH] = {
            myFeature: {
                state: 'open',
                failures: 3,
                lastFailure: pastTime,
                openedAt: pastTime,
            },
        };
        // After timeout, should return false (allow attempt) and transition to half-open
        expect(isCircuitOpen('myFeature', PROJECT_DIR)).toBe(false);
        const stored = circuitStore[CIRCUIT_PATH];
        expect(stored.myFeature.state).toBe('half-open');
    });
    it('returns false for half-open circuit (allows probe attempt)', () => {
        circuitStore[CIRCUIT_PATH] = {
            myFeature: {
                state: 'half-open',
                failures: 3,
                lastFailure: new Date().toISOString(),
                openedAt: new Date().toISOString(),
            },
        };
        expect(isCircuitOpen('myFeature', PROJECT_DIR)).toBe(false);
    });
});
// ---------------------------------------------------------------------------
// recordSuccess
// ---------------------------------------------------------------------------
describe('recordSuccess', () => {
    it('resets circuit to closed with zero failures', () => {
        // First open the circuit
        circuitStore[CIRCUIT_PATH] = {
            myFeature: {
                state: 'half-open',
                failures: 3,
                lastFailure: new Date().toISOString(),
                openedAt: new Date().toISOString(),
            },
        };
        recordSuccess('myFeature', PROJECT_DIR);
        const stored = circuitStore[CIRCUIT_PATH];
        expect(stored.myFeature.state).toBe('closed');
        expect(stored.myFeature.failures).toBe(0);
    });
    it('is a no-op for unknown features', () => {
        circuitStore[CIRCUIT_PATH] = {};
        recordSuccess('unknown-feature', PROJECT_DIR);
        // Should not throw and store should remain unchanged
        const stored = circuitStore[CIRCUIT_PATH];
        expect(stored['unknown-feature']).toBeUndefined();
    });
});
// ---------------------------------------------------------------------------
// Full lifecycle: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
// ---------------------------------------------------------------------------
describe('circuit breaker lifecycle', () => {
    it('completes full state transition cycle', () => {
        // 1. CLOSED: accumulate failures
        recordFailure('lifecycle', 'err1', PROJECT_DIR);
        recordFailure('lifecycle', 'err2', PROJECT_DIR);
        expect(isCircuitOpen('lifecycle', PROJECT_DIR)).toBe(false);
        // 2. CLOSED -> OPEN: threshold reached
        const trip = recordFailure('lifecycle', 'err3', PROJECT_DIR);
        expect(trip.state).toBe('open');
        expect(isCircuitOpen('lifecycle', PROJECT_DIR)).toBe(true);
        // 3. OPEN -> HALF_OPEN: simulate timeout elapsed
        const stored = circuitStore[CIRCUIT_PATH];
        stored.lifecycle.openedAt = new Date(Date.now() - 400000).toISOString();
        expect(isCircuitOpen('lifecycle', PROJECT_DIR)).toBe(false); // transitions to half-open
        // 4. HALF_OPEN -> CLOSED: success recorded
        recordSuccess('lifecycle', PROJECT_DIR);
        const final = circuitStore[CIRCUIT_PATH];
        expect(final.lifecycle.state).toBe('closed');
        expect(final.lifecycle.failures).toBe(0);
    });
});
//# sourceMappingURL=circuit-breaker.test.js.map