/**
 * Unit tests for scripts/evidence/evidence-chain.ts
 * Covers: addEvidence, evaluateChain, formatChain
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Track what writeState receives
const writtenStates = new Map();
let chainStore = {};
vi.mock('../../../scripts/core/state.js', () => ({
    readState: vi.fn(),
    readStateOrDefault: vi.fn((path, defaultVal) => {
        return chainStore[path] ?? defaultVal;
    }),
    writeState: vi.fn((path, data) => {
        chainStore[path] = data;
        writtenStates.set(path, data);
        return { ok: true };
    }),
    updateState: vi.fn(),
}));
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    })),
}));
import { addEvidence, evaluateChain, formatChain, } from '../../../scripts/evidence/evidence-chain.js';
beforeEach(() => {
    vi.clearAllMocks();
    chainStore = {};
    writtenStates.clear();
});
// ---------------------------------------------------------------------------
// addEvidence
// ---------------------------------------------------------------------------
describe('addEvidence', () => {
    it('creates a new chain when none exists', () => {
        addEvidence('login', { type: 'test', result: 'pass', source: 'vitest' }, '/tmp/project');
        const path = '/tmp/project/.aing/state/evidence-login.json';
        const stored = chainStore[path];
        expect(stored.feature).toBe('login');
        expect(stored.entries).toHaveLength(1);
        expect(stored.entries[0].type).toBe('test');
        expect(stored.entries[0].result).toBe('pass');
        expect(stored.entries[0].seq).toBe(1);
        expect(stored.entries[0].ts).toBeDefined();
    });
    it('appends to existing chain with incremented seq', () => {
        const path = '/tmp/project/.aing/state/evidence-auth.json';
        chainStore[path] = {
            feature: 'auth',
            entries: [{ type: 'test', result: 'pass', source: 'vitest', seq: 1, ts: '2025-01-01T00:00:00Z' }],
            verdict: null,
        };
        addEvidence('auth', { type: 'lint', result: 'pass', source: 'eslint' }, '/tmp/project');
        const stored = chainStore[path];
        expect(stored.entries).toHaveLength(2);
        expect(stored.entries[1].seq).toBe(2);
        expect(stored.entries[1].type).toBe('lint');
    });
    it('includes optional details', () => {
        addEvidence('api', {
            type: 'e2e',
            result: 'fail',
            source: 'playwright',
            details: { statusCode: 500, url: '/api/users' },
        }, '/tmp/project');
        const path = '/tmp/project/.aing/state/evidence-api.json';
        const stored = chainStore[path];
        expect(stored.entries[0].details).toEqual({ statusCode: 500, url: '/api/users' });
    });
});
// ---------------------------------------------------------------------------
// evaluateChain
// ---------------------------------------------------------------------------
describe('evaluateChain', () => {
    it('returns INCOMPLETE when no evidence exists', () => {
        const result = evaluateChain('missing-feature', '/tmp/project');
        expect(result.verdict).toBe('INCOMPLETE');
        expect(result.summary).toBe('No evidence collected');
        expect(result.entries).toEqual([]);
    });
    it('returns PASS when all entries are pass', () => {
        const path = '/tmp/project/.aing/state/evidence-feature-a.json';
        chainStore[path] = {
            feature: 'feature-a',
            entries: [
                { type: 'test', result: 'pass', source: 'vitest', seq: 1 },
                { type: 'lint', result: 'pass', source: 'eslint', seq: 2 },
            ],
            verdict: null,
        };
        const result = evaluateChain('feature-a', '/tmp/project');
        expect(result.verdict).toBe('PASS');
        expect(result.entries).toHaveLength(2);
    });
    it('returns PASS when entries are pass or not_available', () => {
        const path = '/tmp/project/.aing/state/evidence-feature-b.json';
        chainStore[path] = {
            feature: 'feature-b',
            entries: [
                { type: 'test', result: 'pass', source: 'vitest', seq: 1 },
                { type: 'e2e', result: 'not_available', source: 'playwright', seq: 2 },
            ],
            verdict: null,
        };
        const result = evaluateChain('feature-b', '/tmp/project');
        expect(result.verdict).toBe('PASS');
    });
    it('returns FAIL when any entry is fail', () => {
        const path = '/tmp/project/.aing/state/evidence-feature-c.json';
        chainStore[path] = {
            feature: 'feature-c',
            entries: [
                { type: 'test', result: 'pass', source: 'vitest', seq: 1 },
                { type: 'lint', result: 'fail', source: 'eslint', seq: 2 },
                { type: 'e2e', result: 'pass', source: 'playwright', seq: 3 },
            ],
            verdict: null,
        };
        const result = evaluateChain('feature-c', '/tmp/project');
        expect(result.verdict).toBe('FAIL');
    });
    it('returns INCOMPLETE when results are mixed (no fail but not all pass)', () => {
        const path = '/tmp/project/.aing/state/evidence-feature-d.json';
        chainStore[path] = {
            feature: 'feature-d',
            entries: [
                { type: 'test', result: 'pass', source: 'vitest', seq: 1 },
                { type: 'review', result: 'pending', source: 'human', seq: 2 },
            ],
            verdict: null,
        };
        const result = evaluateChain('feature-d', '/tmp/project');
        expect(result.verdict).toBe('INCOMPLETE');
    });
    it('persists verdict back to state', () => {
        const path = '/tmp/project/.aing/state/evidence-feature-e.json';
        chainStore[path] = {
            feature: 'feature-e',
            entries: [{ type: 'test', result: 'pass', source: 'vitest', seq: 1 }],
            verdict: null,
        };
        evaluateChain('feature-e', '/tmp/project');
        const stored = chainStore[path];
        expect(stored.verdict).toBe('PASS');
        expect(stored.evaluatedAt).toBeDefined();
    });
    it('generates formatted summary lines', () => {
        const path = '/tmp/project/.aing/state/evidence-feature-f.json';
        chainStore[path] = {
            feature: 'feature-f',
            entries: [
                { type: 'test', result: 'pass', source: 'vitest', seq: 1 },
                { type: 'lint', result: 'fail', source: 'eslint', seq: 2 },
            ],
            verdict: null,
        };
        const result = evaluateChain('feature-f', '/tmp/project');
        expect(result.summary).toContain('[test] PASS (vitest)');
        expect(result.summary).toContain('[lint] FAIL (eslint)');
    });
});
// ---------------------------------------------------------------------------
// formatChain
// ---------------------------------------------------------------------------
describe('formatChain', () => {
    it('formats chain with verdict for display', () => {
        const path = '/tmp/project/.aing/state/evidence-display.json';
        chainStore[path] = {
            feature: 'display',
            entries: [
                { type: 'test', result: 'pass', source: 'vitest', seq: 1 },
            ],
            verdict: null,
        };
        const output = formatChain('display', '/tmp/project');
        expect(output).toContain('Evidence Chain: display');
        expect(output).toContain('PASS');
        expect(output).toContain('Verdict: PASS');
    });
    it('shows FAIL verdict when entries have failures', () => {
        const path = '/tmp/project/.aing/state/evidence-broken.json';
        chainStore[path] = {
            feature: 'broken',
            entries: [
                { type: 'test', result: 'fail', source: 'vitest', seq: 1 },
            ],
            verdict: null,
        };
        const output = formatChain('broken', '/tmp/project');
        expect(output).toContain('Verdict: FAIL');
    });
});
//# sourceMappingURL=evidence-chain.test.js.map