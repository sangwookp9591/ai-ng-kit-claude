/**
 * Unit tests for scripts/guardrail/cost-ceiling.ts
 * Covers: loadLimits, initCostTracker, recordUsage, formatCostStatus
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
let costStore = {};
vi.mock('../../../scripts/core/state.js', () => ({
    readStateOrDefault: vi.fn((path, defaultVal) => {
        return costStore[path] ?? JSON.parse(JSON.stringify(defaultVal));
    }),
    writeState: vi.fn((path, data) => {
        costStore[path] = JSON.parse(JSON.stringify(data));
        return { ok: true };
    }),
}));
vi.mock('../../../scripts/core/config.js', () => ({
    loadConfig: vi.fn(() => ({})),
    getConfig: vi.fn((_path, fallback) => fallback),
    resetConfigCache: vi.fn(),
}));
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    })),
}));
import { loadLimits, initCostTracker, recordUsage, formatCostStatus, } from '../../../scripts/guardrail/cost-ceiling.js';
import { getConfig } from '../../../scripts/core/config.js';
const COST_PATH = '/tmp/cost-test/.aing/state/cost-tracker.json';
beforeEach(() => {
    vi.clearAllMocks();
    costStore = {};
    vi.mocked(getConfig).mockImplementation((_path, fallback) => fallback);
});
// ── loadLimits ───────────────────────────────────────────────────────────
describe('loadLimits', () => {
    it('returns default limits when no config', () => {
        const limits = loadLimits();
        expect(limits.maxTokensPerSession).toBe(500000);
        expect(limits.maxTokensPerTask).toBe(100000);
        expect(limits.maxApiCallsPerSession).toBe(200);
        expect(limits.maxSessionMinutes).toBe(120);
        expect(limits.warningThreshold).toBe(0.8);
    });
    it('merges user config with defaults', () => {
        vi.mocked(getConfig).mockImplementation((path, fallback) => {
            if (path === 'guardrail.costCeiling')
                return { maxTokensPerSession: 1000000 };
            return fallback;
        });
        const limits = loadLimits();
        expect(limits.maxTokensPerSession).toBe(1000000);
        expect(limits.maxApiCallsPerSession).toBe(200); // default preserved
    });
});
// ── initCostTracker ──────────────────────────────────────────────────────
describe('initCostTracker', () => {
    it('creates initial tracker state', () => {
        initCostTracker('/tmp/cost-test');
        expect(costStore[COST_PATH]).toBeDefined();
        const tracker = costStore[COST_PATH];
        expect(tracker.tokensUsed).toBe(0);
        expect(tracker.apiCalls).toBe(0);
        expect(tracker.sessionStart).toBeDefined();
    });
});
// ── recordUsage ──────────────────────────────────────────────────────────
describe('recordUsage', () => {
    it('records token usage', () => {
        initCostTracker('/tmp/cost-test');
        const result = recordUsage(1000, undefined, '/tmp/cost-test');
        expect(result.ok).toBe(true);
        expect(result.usage.apiCalls).toBe(1);
        expect(result.warnings).toHaveLength(0);
    });
    it('accumulates usage across calls', () => {
        initCostTracker('/tmp/cost-test');
        recordUsage(1000, undefined, '/tmp/cost-test');
        recordUsage(2000, undefined, '/tmp/cost-test');
        const result = recordUsage(3000, undefined, '/tmp/cost-test');
        expect(result.usage.apiCalls).toBe(3);
    });
    it('tracks per-task tokens', () => {
        initCostTracker('/tmp/cost-test');
        const result = recordUsage(5000, 'build-login', '/tmp/cost-test');
        expect(result.usage.taskTokens).toBeDefined();
    });
    it('warns at warning threshold (80%)', () => {
        initCostTracker('/tmp/cost-test');
        // Use 80% of 500k = 400k
        const result = recordUsage(400000, undefined, '/tmp/cost-test');
        expect(result.ok).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
    });
    it('returns ok=false when session limit exceeded', () => {
        initCostTracker('/tmp/cost-test');
        // Exceed 500k limit
        const result = recordUsage(600000, undefined, '/tmp/cost-test');
        expect(result.ok).toBe(false);
        expect(result.warnings.length).toBeGreaterThan(0);
    });
    it('warns when task token limit exceeded', () => {
        initCostTracker('/tmp/cost-test');
        // Exceed 100k per-task limit
        const result = recordUsage(150000, 'big-task', '/tmp/cost-test');
        expect(result.warnings.some(w => w.includes('big-task'))).toBe(true);
    });
    it('warns when API call limit approached', () => {
        initCostTracker('/tmp/cost-test');
        // Make 160+ calls (80% of 200)
        for (let i = 0; i < 160; i++) {
            recordUsage(10, undefined, '/tmp/cost-test');
        }
        const result = recordUsage(10, undefined, '/tmp/cost-test');
        expect(result.warnings.some(w => w.includes('API'))).toBe(true);
    });
    it('no warnings when usage is low', () => {
        initCostTracker('/tmp/cost-test');
        const result = recordUsage(100, undefined, '/tmp/cost-test');
        expect(result.ok).toBe(true);
        expect(result.warnings).toHaveLength(0);
    });
});
// ── formatCostStatus ─────────────────────────────────────────────────────
describe('formatCostStatus', () => {
    it('shows formatted cost status', () => {
        initCostTracker('/tmp/cost-test');
        recordUsage(10000, undefined, '/tmp/cost-test');
        const status = formatCostStatus('/tmp/cost-test');
        expect(status).toContain('[aing Cost]');
        expect(status).toContain('Tokens');
        expect(status).toContain('API Calls');
        expect(status).toContain('Session');
    });
    it('shows zero usage when no activity', () => {
        const status = formatCostStatus('/tmp/cost-test');
        expect(status).toContain('0');
    });
    it('shows percentages', () => {
        initCostTracker('/tmp/cost-test');
        recordUsage(250000, undefined, '/tmp/cost-test'); // 50%
        const status = formatCostStatus('/tmp/cost-test');
        expect(status).toContain('50%');
    });
});
//# sourceMappingURL=cost-ceiling.test.js.map