/**
 * Unit tests for scripts/routing/model-router.ts
 * Covers: routeModel, getCostMode
 */
import { describe, it, expect, afterEach } from 'vitest';
import { routeModel, getCostMode } from '../../../scripts/routing/model-router.js';
// ---------------------------------------------------------------------------
// routeModel — agent defaults
// ---------------------------------------------------------------------------
describe('routeModel — agent defaults', () => {
    it('returns sonnet for jay (no signals)', () => {
        const result = routeModel('jay');
        expect(result.model).toBe('sonnet');
        expect(result.reason).toBe('agent-default');
        expect(result.escalated).toBe(false);
    });
    it('returns opus for klay (no signals)', () => {
        const result = routeModel('klay');
        expect(result.model).toBe('opus');
    });
    it('returns opus for sam (no signals)', () => {
        const result = routeModel('sam');
        expect(result.model).toBe('opus');
    });
    it('returns sonnet for unknown agent', () => {
        const result = routeModel('unknown-agent');
        expect(result.model).toBe('sonnet');
    });
});
// ---------------------------------------------------------------------------
// routeModel — forceModel override
// ---------------------------------------------------------------------------
describe('routeModel — forceModel', () => {
    it('bypasses all routing when forceModel is set', () => {
        const result = routeModel('jay', { hasSecurity: true }, { forceModel: 'haiku' });
        expect(result.model).toBe('haiku');
        expect(result.reason).toBe('user-override');
        expect(result.escalated).toBe(false);
    });
    it('ignores invalid forceModel values', () => {
        const result = routeModel('jay', {}, { forceModel: 'gpt-4' });
        // Not a valid tier, so falls through to normal routing
        expect(result.model).toBe('sonnet');
    });
});
// ---------------------------------------------------------------------------
// routeModel — complexity escalation
// ---------------------------------------------------------------------------
describe('routeModel — complexity escalation', () => {
    it('escalates to opus for high complexity', () => {
        const result = routeModel('jay', {
            fileCount: 20,
            lineCount: 600,
            domainCount: 3,
            hasArchChange: true,
        });
        expect(result.model).toBe('opus');
        expect(result.escalated).toBe(true);
    });
    it('stays at sonnet for low complexity', () => {
        const result = routeModel('jay', { fileCount: 1, lineCount: 10 });
        expect(result.model).toBe('sonnet');
    });
});
// ---------------------------------------------------------------------------
// routeModel — risk signal escalation
// ---------------------------------------------------------------------------
describe('routeModel — risk signals', () => {
    it('escalates to opus for security-sensitive changes', () => {
        const result = routeModel('jay', { hasSecurity: true });
        expect(result.model).toBe('opus');
        expect(result.reason).toContain('security');
        expect(result.escalated).toBe(true);
    });
    it('escalates to opus for architecture changes', () => {
        const result = routeModel('jay', { hasArchChange: true });
        expect(result.model).toBe('opus');
        expect(result.reason).toContain('architecture');
        expect(result.escalated).toBe(true);
    });
    it('escalates to opus for >20 files', () => {
        const result = routeModel('jay', { fileCount: 25 });
        expect(result.model).toBe('opus');
        expect(result.reason).toContain('>20 files');
    });
    it('escalates to sonnet for 3+ domains', () => {
        const result = routeModel('derek', { domainCount: 3 });
        // derek defaults to sonnet, domainCount=3 requires at least sonnet
        expect(result.model).toBe('sonnet');
    });
});
// ---------------------------------------------------------------------------
// routeModel — context-specific overrides
// ---------------------------------------------------------------------------
describe('routeModel — context overrides', () => {
    it('downgrades klay to sonnet in plan-review context (no escalation)', () => {
        const result = routeModel('klay', {}, { context: 'plan-review' });
        expect(result.model).toBe('sonnet');
        expect(result.reason).toBe('plan-review-optimization');
    });
    it('downgrades klay to sonnet in plan-review even with security signal (klay already at opus so no escalation flag)', () => {
        // klay defaults to opus, hasSecurity minTier=opus, so tierIndex(opus) < tierIndex(opus) is false
        // => escalated stays false => plan-review optimization applies
        // But hasRiskSignal is true, so cost downgrade is skipped
        const result = routeModel('klay', { hasSecurity: true }, { context: 'plan-review' });
        expect(result.model).toBe('sonnet');
        expect(result.reason).toBe('plan-review-optimization');
        expect(result.escalated).toBe(false);
    });
    it('downgrades sam to haiku in verify context for low complexity', () => {
        const result = routeModel('sam', { fileCount: 1, lineCount: 10 }, { context: 'verify' });
        expect(result.model).toBe('haiku');
        expect(result.reason).toBe('verify-cost-optimization');
    });
    it('keeps sam at opus in verify context for high complexity', () => {
        const result = routeModel('sam', {
            fileCount: 20, lineCount: 600, domainCount: 4, hasArchChange: true,
        }, { context: 'verify' });
        expect(result.model).toBe('opus');
    });
});
// ---------------------------------------------------------------------------
// routeModel — cost mode downgrades
// ---------------------------------------------------------------------------
describe('routeModel — cost modes', () => {
    it('quality mode: no downgrades', () => {
        const result = routeModel('klay', { fileCount: 1 }, { costMode: 'quality' });
        expect(result.model).toBe('opus');
    });
    it('budget mode: downgrades sonnet to haiku for low complexity', () => {
        const result = routeModel('jay', { fileCount: 1, lineCount: 10 }, { costMode: 'budget' });
        expect(result.model).toBe('haiku');
        expect(result.reason).toContain('budget');
    });
});
// ---------------------------------------------------------------------------
// getCostMode
// ---------------------------------------------------------------------------
describe('getCostMode', () => {
    const originalEnv = process.env.SWKIT_COST_MODE;
    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env.SWKIT_COST_MODE;
        }
        else {
            process.env.SWKIT_COST_MODE = originalEnv;
        }
    });
    it('returns balanced by default', () => {
        delete process.env.SWKIT_COST_MODE;
        expect(getCostMode()).toBe('balanced');
    });
    it('returns quality when env is set', () => {
        process.env.SWKIT_COST_MODE = 'quality';
        expect(getCostMode()).toBe('quality');
    });
    it('returns budget when env is set', () => {
        process.env.SWKIT_COST_MODE = 'budget';
        expect(getCostMode()).toBe('budget');
    });
    it('returns balanced for invalid env value', () => {
        process.env.SWKIT_COST_MODE = 'invalid';
        expect(getCostMode()).toBe('balanced');
    });
});
//# sourceMappingURL=model-router.test.js.map