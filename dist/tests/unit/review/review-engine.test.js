/**
 * Unit tests for scripts/review/review-engine.ts
 * Covers: classifyFinding, formatReviewResults, selectTiers, getReviewPrompt, recordReview
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    })),
}));
vi.mock('../../../scripts/review/review-log.js', () => ({
    appendReviewLog: vi.fn(),
}));
import { classifyFinding, formatReviewResults, selectTiers, getReviewPrompt, recordReview, REVIEW_PASSES, REVIEW_AGENTS, } from '../../../scripts/review/review-engine.js';
import { appendReviewLog } from '../../../scripts/review/review-log.js';
const mockAppendReviewLog = vi.mocked(appendReviewLog);
beforeEach(() => {
    vi.clearAllMocks();
});
// ── classifyFinding ──────────────────────────────────────────────────────
describe('classifyFinding', () => {
    it('returns ask for CRITICAL severity regardless of type', () => {
        const finding = {
            type: 'dead-code', severity: 'CRITICAL', description: 'unused fn',
            file: 'a.ts', line: 1,
        };
        expect(classifyFinding(finding)).toBe('ask');
    });
    it('returns auto-fix for dead-code with non-critical severity', () => {
        const finding = {
            type: 'dead-code', severity: 'LOW', description: 'unused fn',
            file: 'a.ts', line: 10,
        };
        expect(classifyFinding(finding)).toBe('auto-fix');
    });
    it('returns auto-fix for stale-comments', () => {
        const finding = {
            type: 'stale-comments', severity: 'LOW', description: 'outdated',
            file: 'b.ts', line: 5,
        };
        expect(classifyFinding(finding)).toBe('auto-fix');
    });
    it('returns auto-fix for magic-numbers', () => {
        const finding = {
            type: 'magic-numbers', severity: 'MEDIUM', description: '42 in code',
            file: 'c.ts', line: 20,
        };
        expect(classifyFinding(finding)).toBe('auto-fix');
    });
    it('returns auto-fix for n-plus-one', () => {
        const finding = {
            type: 'n-plus-one', severity: 'HIGH', description: 'query in loop',
            file: 'd.ts', line: 30,
        };
        expect(classifyFinding(finding)).toBe('auto-fix');
    });
    it('returns auto-fix for missing-error-handling', () => {
        const finding = {
            type: 'missing-error-handling', severity: 'MEDIUM', description: 'no try/catch',
            file: 'e.ts', line: 40,
        };
        expect(classifyFinding(finding)).toBe('auto-fix');
    });
    it('returns ask for sql-injection type', () => {
        const finding = {
            type: 'sql-injection', severity: 'HIGH', description: 'unsafe query',
            file: 'f.ts', line: 50,
        };
        expect(classifyFinding(finding)).toBe('ask');
    });
    it('returns ask for auth-bypass type', () => {
        const finding = {
            type: 'auth-bypass', severity: 'HIGH', description: 'missing auth check',
            file: 'g.ts', line: 60,
        };
        expect(classifyFinding(finding)).toBe('ask');
    });
    it('returns ask for unknown types', () => {
        const finding = {
            type: 'custom-rule', severity: 'MEDIUM', description: 'custom',
            file: 'h.ts', line: 70,
        };
        expect(classifyFinding(finding)).toBe('ask');
    });
});
// ── formatReviewResults ──────────────────────────────────────────────────
describe('formatReviewResults', () => {
    it('shows "All checks passed" for empty findings', () => {
        const output = formatReviewResults([]);
        expect(output).toContain('All checks passed');
        expect(output).toContain('0 issues');
    });
    it('separates critical and informational counts', () => {
        const findings = [
            { type: 'sql-injection', severity: 'CRITICAL', description: 'unsafe', file: 'a.ts', line: 1 },
            { type: 'dead-code', severity: 'LOW', description: 'unused', file: 'b.ts', line: 2 },
            { type: 'stale-comments', severity: 'LOW', description: 'stale', file: 'c.ts', line: 3 },
        ];
        const output = formatReviewResults(findings);
        expect(output).toContain('3 issues');
        expect(output).toContain('1 critical');
        expect(output).toContain('2 informational');
    });
    it('groups auto-fixed findings', () => {
        const findings = [
            { type: 'dead-code', severity: 'LOW', description: 'unused fn', file: 'a.ts', line: 10, classification: 'auto-fix' },
        ];
        const output = formatReviewResults(findings);
        expect(output).toContain('Auto-Fixed');
        expect(output).toContain('[AUTO-FIXED]');
        expect(output).toContain('a.ts:10');
    });
    it('groups needs-decision findings', () => {
        const findings = [
            { type: 'sql-injection', severity: 'CRITICAL', description: 'unsafe query', file: 'x.ts', line: 5, classification: 'ask' },
        ];
        const output = formatReviewResults(findings);
        expect(output).toContain('Needs Decision');
        expect(output).toContain('x.ts:5');
    });
    it('uses different icons for critical vs non-critical', () => {
        const findings = [
            { type: 'a', severity: 'CRITICAL', description: 'crit', file: 'a.ts', line: 1, classification: 'ask' },
            { type: 'b', severity: 'HIGH', description: 'high', file: 'b.ts', line: 2, classification: 'ask' },
        ];
        const output = formatReviewResults(findings);
        // Critical uses cross, non-critical uses triangle
        const lines = output.split('\n');
        const critLine = lines.find(l => l.includes('CRITICAL'));
        const highLine = lines.find(l => l.includes('[HIGH]'));
        expect(critLine).toBeDefined();
        expect(highLine).toBeDefined();
    });
});
// ── selectTiers ──────────────────────────────────────────────────────────
describe('selectTiers', () => {
    it('returns only eng-review for low complexity', () => {
        expect(selectTiers('low')).toEqual(['eng-review']);
    });
    it('returns eng-review for mid complexity without UI', () => {
        expect(selectTiers('mid')).toEqual(['eng-review']);
    });
    it('adds design-review for mid complexity with UI', () => {
        const tiers = selectTiers('mid', { hasUI: true });
        expect(tiers).toContain('eng-review');
        expect(tiers).toContain('design-review');
    });
    it('adds outside-voice for high complexity', () => {
        const tiers = selectTiers('high');
        expect(tiers).toContain('eng-review');
        expect(tiers).toContain('outside-voice');
    });
    it('adds ceo-review for high complexity with product change', () => {
        const tiers = selectTiers('high', { hasProductChange: true });
        expect(tiers).toContain('ceo-review');
        expect(tiers).toContain('outside-voice');
    });
    it('adds design-review for high complexity with UI', () => {
        const tiers = selectTiers('high', { hasUI: true });
        expect(tiers).toContain('design-review');
    });
    it('high + all options returns all 4 tiers', () => {
        const tiers = selectTiers('high', { hasUI: true, hasProductChange: true });
        expect(tiers).toHaveLength(4);
        expect(tiers).toEqual(['eng-review', 'design-review', 'ceo-review', 'outside-voice']);
    });
});
// ── getReviewPrompt ──────────────────────────────────────────────────────
describe('getReviewPrompt', () => {
    it('generates eng-review prompt with focus areas', () => {
        const prompt = getReviewPrompt('eng-review', { feature: 'login', branch: 'feat/login' });
        expect(prompt).toContain('ENG REVIEW');
        expect(prompt).toContain('login');
        expect(prompt).toContain('feat/login');
        expect(prompt).toContain('architecture');
        expect(prompt).toContain('security');
    });
    it('includes diff summary when provided', () => {
        const prompt = getReviewPrompt('eng-review', { diffSummary: '+ 50 lines in auth.ts' });
        expect(prompt).toContain('+ 50 lines in auth.ts');
    });
    it('shows "No diff available" when no summary', () => {
        const prompt = getReviewPrompt('eng-review', {});
        expect(prompt).toContain('No diff available');
    });
    it('throws on unknown tier', () => {
        expect(() => getReviewPrompt('unknown-tier', {})).toThrow('Unknown review tier');
    });
    it('generates ceo-review prompt', () => {
        const prompt = getReviewPrompt('ceo-review', { feature: 'pricing' });
        expect(prompt).toContain('CEO REVIEW');
        expect(prompt).toContain('scope');
        expect(prompt).toContain('strategy');
    });
    it('generates design-review prompt', () => {
        const prompt = getReviewPrompt('design-review', { feature: 'dashboard' });
        expect(prompt).toContain('DESIGN REVIEW');
        expect(prompt).toContain('accessibility');
    });
});
// ── recordReview ─────────────────────────────────────────────────────────
describe('recordReview', () => {
    it('appends review log with correct fields', () => {
        recordReview('eng-review', {
            status: 'completed',
            issues_found: 3,
            critical_gaps: 1,
            unresolved: 0,
        }, '/tmp/project');
        expect(mockAppendReviewLog).toHaveBeenCalledWith(expect.objectContaining({
            skill: 'eng-review',
            status: 'completed',
            issues_found: 3,
            critical_gaps: 1,
            unresolved: 0,
            mode: 'FULL_REVIEW',
        }), '/tmp/project');
    });
    it('uses defaults for missing result fields', () => {
        recordReview('design-review', {}, '/tmp/project');
        expect(mockAppendReviewLog).toHaveBeenCalledWith(expect.objectContaining({
            status: 'unknown',
            issues_found: 0,
            critical_gaps: 0,
            unresolved: 0,
        }), '/tmp/project');
    });
    it('includes timestamp', () => {
        recordReview('ceo-review', { status: 'done' });
        const call = mockAppendReviewLog.mock.calls[0][0];
        expect(call.timestamp).toBeDefined();
        expect(new Date(call.timestamp).getTime()).not.toBeNaN();
    });
});
// ── Constants ────────────────────────────────────────────────────────────
describe('REVIEW_PASSES', () => {
    it('has CRITICAL and INFORMATIONAL categories', () => {
        expect(REVIEW_PASSES.CRITICAL).toBeDefined();
        expect(REVIEW_PASSES.INFORMATIONAL).toBeDefined();
        expect(REVIEW_PASSES.CRITICAL.length).toBeGreaterThan(0);
        expect(REVIEW_PASSES.INFORMATIONAL.length).toBeGreaterThan(0);
    });
    it('CRITICAL includes sql-injection and auth-bypass', () => {
        expect(REVIEW_PASSES.CRITICAL).toContain('sql-injection');
        expect(REVIEW_PASSES.CRITICAL).toContain('auth-bypass');
    });
});
describe('REVIEW_AGENTS', () => {
    it('has 4 tier configurations', () => {
        expect(Object.keys(REVIEW_AGENTS)).toHaveLength(4);
    });
    it('eng-review has klay, jay, milla', () => {
        expect(REVIEW_AGENTS['eng-review'].agents).toEqual(['klay', 'jay', 'milla']);
    });
    it('outside-voice has empty agents (external)', () => {
        expect(REVIEW_AGENTS['outside-voice'].agents).toEqual([]);
    });
});
//# sourceMappingURL=review-engine.test.js.map