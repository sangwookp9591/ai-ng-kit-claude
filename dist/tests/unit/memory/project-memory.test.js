/**
 * Unit tests for scripts/memory/project-memory.ts
 * Covers: loadMemory, saveMemory, addMemoryEntry, applyConfidenceDecay, getMemorySummary
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
let memoryStore = {};
vi.mock('../../../scripts/core/state.js', () => ({
    readStateOrDefault: vi.fn((path, defaultVal) => {
        return memoryStore[path] ?? JSON.parse(JSON.stringify(defaultVal));
    }),
    writeState: vi.fn((path, data) => {
        memoryStore[path] = JSON.parse(JSON.stringify(data));
        return { ok: true };
    }),
}));
import { loadMemory, saveMemory, addMemoryEntry, applyConfidenceDecay, getMemorySummary, } from '../../../scripts/memory/project-memory.js';
const MEMORY_PATH = '/tmp/mem-test/.aing/project-memory.json';
beforeEach(() => {
    vi.clearAllMocks();
    memoryStore = {};
});
// ── loadMemory ───────────────────────────────────────────────────────────
describe('loadMemory', () => {
    it('returns default empty structure when no file exists', () => {
        const memory = loadMemory('/tmp/mem-test');
        expect(memory.techStack).toEqual({});
        expect(memory.conventions).toEqual({});
        expect(memory.patterns).toEqual([]);
        expect(memory.pitfalls).toEqual([]);
        expect(memory.decisions).toEqual([]);
    });
    it('returns stored memory when file exists', () => {
        memoryStore[MEMORY_PATH] = {
            techStack: { framework: 'next.js' },
            conventions: {},
            patterns: [{ content: 'use barrel exports', addedAt: '2025-01-01', confidence: 8, source: 'user' }],
            pitfalls: [],
            decisions: [],
        };
        const memory = loadMemory('/tmp/mem-test');
        expect(memory.techStack).toEqual({ framework: 'next.js' });
        expect(memory.patterns).toHaveLength(1);
        expect(memory.patterns[0].content).toBe('use barrel exports');
    });
});
// ── saveMemory ───────────────────────────────────────────────────────────
describe('saveMemory', () => {
    it('writes memory to state file', () => {
        const memory = {
            techStack: { db: 'postgres' },
            conventions: {},
            patterns: [],
            pitfalls: [],
            decisions: [],
        };
        saveMemory(memory, '/tmp/mem-test');
        expect(memoryStore[MEMORY_PATH]).toBeDefined();
        expect(memoryStore[MEMORY_PATH].techStack).toEqual({ db: 'postgres' });
    });
});
// ── addMemoryEntry ───────────────────────────────────────────────────────
describe('addMemoryEntry', () => {
    it('adds entry to array section (patterns)', () => {
        addMemoryEntry('patterns', 'Always use index exports', '/tmp/mem-test');
        const stored = memoryStore[MEMORY_PATH];
        const patterns = stored.patterns;
        expect(patterns).toHaveLength(1);
        expect(patterns[0].content).toBe('Always use index exports');
        expect(patterns[0].confidence).toBe(5);
        expect(patterns[0].source).toBe('observed');
    });
    it('adds entry with custom confidence and source', () => {
        addMemoryEntry('pitfalls', 'Avoid circular imports', '/tmp/mem-test', {
            confidence: 9,
            source: 'user',
        });
        const stored = memoryStore[MEMORY_PATH];
        const pitfalls = stored.pitfalls;
        expect(pitfalls[0].confidence).toBe(9);
        expect(pitfalls[0].source).toBe('user');
    });
    it('appends to existing entries', () => {
        addMemoryEntry('patterns', 'First', '/tmp/mem-test');
        addMemoryEntry('patterns', 'Second', '/tmp/mem-test');
        const stored = memoryStore[MEMORY_PATH];
        const patterns = stored.patterns;
        expect(patterns).toHaveLength(2);
        expect(patterns[1].content).toBe('Second');
    });
    it('adds entry to object section (techStack)', () => {
        addMemoryEntry('techStack', { runtime: 'node', version: '20' }, '/tmp/mem-test');
        const stored = memoryStore[MEMORY_PATH];
        const ts = stored.techStack;
        expect(ts.runtime).toBe('node');
        expect(ts.version).toBe('20');
    });
    it('merges object entries into existing', () => {
        addMemoryEntry('techStack', { runtime: 'node' }, '/tmp/mem-test');
        addMemoryEntry('techStack', { db: 'postgres' }, '/tmp/mem-test');
        const stored = memoryStore[MEMORY_PATH];
        const ts = stored.techStack;
        expect(ts.runtime).toBe('node');
        expect(ts.db).toBe('postgres');
    });
    it('adds string to object section as note', () => {
        addMemoryEntry('conventions', 'Use camelCase', '/tmp/mem-test');
        const stored = memoryStore[MEMORY_PATH];
        const conv = stored.conventions;
        expect(conv.note).toBe('Use camelCase');
    });
    it('includes addedAt timestamp', () => {
        addMemoryEntry('decisions', 'Use React over Vue', '/tmp/mem-test');
        const stored = memoryStore[MEMORY_PATH];
        const decisions = stored.decisions;
        expect(decisions[0].addedAt).toBeDefined();
        expect(new Date(decisions[0].addedAt).getTime()).not.toBeNaN();
    });
});
// ── applyConfidenceDecay ─────────────────────────────────────────────────
describe('applyConfidenceDecay', () => {
    it('does not decay user-stated entries', () => {
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [{
                    content: 'User pattern',
                    addedAt: '2024-01-01T00:00:00Z',
                    confidence: 8,
                    source: 'user',
                }],
            pitfalls: [],
            decisions: [],
        };
        const result = applyConfidenceDecay('/tmp/mem-test');
        expect(result.decayed).toBe(0);
        expect(result.removed).toBe(0);
        const stored = memoryStore[MEMORY_PATH];
        const patterns = stored.patterns;
        expect(patterns[0].confidence).toBe(8);
    });
    it('decays observed entries older than 30 days', () => {
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [{
                    content: 'Old pattern',
                    addedAt: sixtyDaysAgo,
                    confidence: 5,
                    source: 'observed',
                }],
            pitfalls: [],
            decisions: [],
        };
        const result = applyConfidenceDecay('/tmp/mem-test');
        expect(result.decayed).toBeGreaterThanOrEqual(1);
        const stored = memoryStore[MEMORY_PATH];
        const patterns = stored.patterns;
        expect(patterns[0].confidence).toBeLessThan(5);
    });
    it('removes entries with 0 confidence', () => {
        const longAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [{
                    content: 'Ancient pattern',
                    addedAt: longAgo,
                    confidence: 1,
                    source: 'inferred',
                }],
            pitfalls: [],
            decisions: [],
        };
        const result = applyConfidenceDecay('/tmp/mem-test');
        expect(result.removed).toBeGreaterThanOrEqual(1);
        const stored = memoryStore[MEMORY_PATH];
        const patterns = stored.patterns;
        expect(patterns).toHaveLength(0);
    });
    it('does not decay recent entries', () => {
        const recent = new Date().toISOString();
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [{
                    content: 'Fresh pattern',
                    addedAt: recent,
                    confidence: 7,
                    source: 'observed',
                }],
            pitfalls: [],
            decisions: [],
        };
        const result = applyConfidenceDecay('/tmp/mem-test');
        expect(result.decayed).toBe(0);
    });
    it('returns zero counts when memory is empty', () => {
        const result = applyConfidenceDecay('/tmp/mem-test');
        expect(result.decayed).toBe(0);
        expect(result.removed).toBe(0);
    });
    it('decays pitfalls section too', () => {
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [],
            pitfalls: [{
                    content: 'Old pitfall',
                    addedAt: sixtyDaysAgo,
                    confidence: 3,
                    source: 'observed',
                }],
            decisions: [],
        };
        const result = applyConfidenceDecay('/tmp/mem-test');
        expect(result.decayed).toBeGreaterThanOrEqual(1);
    });
});
// ── getMemorySummary ─────────────────────────────────────────────────────
describe('getMemorySummary', () => {
    it('returns empty string for empty memory', () => {
        expect(getMemorySummary('/tmp/mem-test')).toBe('');
    });
    it('includes tech stack', () => {
        memoryStore[MEMORY_PATH] = {
            techStack: { framework: 'next.js', db: 'postgres' },
            conventions: {},
            patterns: [],
            pitfalls: [],
            decisions: [],
        };
        const summary = getMemorySummary('/tmp/mem-test');
        expect(summary).toContain('Tech:');
        expect(summary).toContain('next.js');
        expect(summary).toContain('postgres');
    });
    it('includes high-confidence patterns', () => {
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [
                { content: 'High conf', confidence: 8, source: 'user', addedAt: '' },
                { content: 'Low conf', confidence: 2, source: 'inferred', addedAt: '' },
            ],
            pitfalls: [],
            decisions: [],
        };
        const summary = getMemorySummary('/tmp/mem-test');
        expect(summary).toContain('High conf');
        expect(summary).not.toContain('Low conf');
    });
    it('respects minConfidence parameter', () => {
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [
                { content: 'Medium conf', confidence: 4, source: 'observed', addedAt: '' },
            ],
            pitfalls: [],
            decisions: [],
        };
        expect(getMemorySummary('/tmp/mem-test', 5)).not.toContain('Medium conf');
        expect(getMemorySummary('/tmp/mem-test', 3)).toContain('Medium conf');
    });
    it('includes pitfalls', () => {
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [],
            pitfalls: [
                { content: 'Watch for N+1', confidence: 7, source: 'user', addedAt: '' },
            ],
            decisions: [],
        };
        const summary = getMemorySummary('/tmp/mem-test');
        expect(summary).toContain('Pitfalls');
        expect(summary).toContain('Watch for N+1');
    });
    it('limits to last 3 entries per section', () => {
        memoryStore[MEMORY_PATH] = {
            techStack: {},
            conventions: {},
            patterns: [
                { content: 'P1', confidence: 8, source: 'user', addedAt: '' },
                { content: 'P2', confidence: 8, source: 'user', addedAt: '' },
                { content: 'P3', confidence: 8, source: 'user', addedAt: '' },
                { content: 'P4', confidence: 8, source: 'user', addedAt: '' },
                { content: 'P5', confidence: 8, source: 'user', addedAt: '' },
            ],
            pitfalls: [],
            decisions: [],
        };
        const summary = getMemorySummary('/tmp/mem-test');
        // Should contain last 3 (P3, P4, P5) not first 2 (P1, P2)
        expect(summary).toContain('P5');
        expect(summary).toContain('P4');
        expect(summary).toContain('P3');
    });
});
//# sourceMappingURL=project-memory.test.js.map