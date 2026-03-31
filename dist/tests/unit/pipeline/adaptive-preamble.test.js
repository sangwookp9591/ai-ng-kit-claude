/**
 * Unit tests for scripts/pipeline/adaptive-preamble.ts
 * Covers: selectPreambleTier, estimateTokenSavings, formatSavingsReport
 */
import { describe, it, expect } from 'vitest';
import { selectPreambleTier, estimateTokenSavings, formatSavingsReport, } from '../../../scripts/pipeline/adaptive-preamble.js';
// ── selectPreambleTier — base tiers ──────────────────────────────────────
describe('selectPreambleTier — base tiers', () => {
    it('explore defaults to tier 1', () => {
        expect(selectPreambleTier(5, 'explore')).toBe(1);
    });
    it('implement defaults to tier 2', () => {
        expect(selectPreambleTier(5, 'implement')).toBe(2);
    });
    it('plan defaults to tier 3', () => {
        expect(selectPreambleTier(5, 'plan')).toBe(3);
    });
    it('review defaults to tier 4', () => {
        expect(selectPreambleTier(5, 'review')).toBe(4);
    });
    it('verify defaults to tier 4', () => {
        expect(selectPreambleTier(5, 'verify')).toBe(4);
    });
});
// ── selectPreambleTier — complexity adjustment ───────────────────────────
describe('selectPreambleTier — complexity adjustment', () => {
    it('bumps up for high complexity (>= 7)', () => {
        // explore: base 1 → bumped to 2
        expect(selectPreambleTier(7, 'explore')).toBe(2);
        // implement: base 2 → bumped to 3
        expect(selectPreambleTier(8, 'implement')).toBe(3);
    });
    it('drops down for low complexity (<= 2)', () => {
        // implement: base 2 → dropped to 1
        expect(selectPreambleTier(2, 'implement')).toBe(1);
        // plan: base 3 → dropped to 2
        expect(selectPreambleTier(1, 'plan')).toBe(2);
    });
    it('caps at tier 4 for high complexity', () => {
        // review: base 4 → capped at 4
        expect(selectPreambleTier(10, 'review')).toBe(4);
        // verify: base 4 → capped at 4
        expect(selectPreambleTier(9, 'verify')).toBe(4);
    });
    it('floors at tier 1 for low complexity', () => {
        // explore: base 1 → floored at 1
        expect(selectPreambleTier(0, 'explore')).toBe(1);
    });
    it('mid-range complexity (3-6) keeps base tier', () => {
        expect(selectPreambleTier(3, 'implement')).toBe(2);
        expect(selectPreambleTier(6, 'plan')).toBe(3);
    });
});
// ── estimateTokenSavings ─────────────────────────────────────────────────
describe('estimateTokenSavings', () => {
    it('returns zeros for empty agents', () => {
        const savings = estimateTokenSavings([]);
        expect(savings).toEqual({ actual: 0, max: 0, saved: 0, savingsPercent: 0 });
    });
    it('calculates savings for mixed tiers', () => {
        const agents = [{ tier: 1 }, { tier: 2 }, { tier: 4 }];
        const savings = estimateTokenSavings(agents);
        // T1=200, T2=400, T4=800 → actual=1400
        // All T4=3*800=2400
        expect(savings.actual).toBe(1400);
        expect(savings.max).toBe(2400);
        expect(savings.saved).toBe(1000);
        expect(savings.savingsPercent).toBe(42); // (1 - 1400/2400) * 100 ≈ 42
    });
    it('shows 0% savings when all at tier 4', () => {
        const agents = [{ tier: 4 }, { tier: 4 }];
        const savings = estimateTokenSavings(agents);
        expect(savings.actual).toBe(1600);
        expect(savings.max).toBe(1600);
        expect(savings.saved).toBe(0);
        expect(savings.savingsPercent).toBe(0);
    });
    it('shows maximum savings when all at tier 1', () => {
        const agents = [{ tier: 1 }, { tier: 1 }, { tier: 1 }, { tier: 1 }];
        const savings = estimateTokenSavings(agents);
        // T1=200*4=800, T4=800*4=3200
        expect(savings.actual).toBe(800);
        expect(savings.max).toBe(3200);
        expect(savings.saved).toBe(2400);
        expect(savings.savingsPercent).toBe(75);
    });
    it('handles single agent', () => {
        const savings = estimateTokenSavings([{ tier: 2 }]);
        expect(savings.actual).toBe(400);
        expect(savings.max).toBe(800);
        expect(savings.saved).toBe(400);
        expect(savings.savingsPercent).toBe(50);
    });
    it('defaults to 400 tokens for unknown tier', () => {
        const savings = estimateTokenSavings([{ tier: 99 }]);
        expect(savings.actual).toBe(400); // default
        expect(savings.max).toBe(800);
    });
});
// ── formatSavingsReport ──────────────────────────────────────────────────
describe('formatSavingsReport', () => {
    it('includes header', () => {
        const report = formatSavingsReport({ actual: 1000, max: 2000, saved: 1000, savingsPercent: 50 });
        expect(report).toContain('[aing Adaptive Preamble]');
    });
    it('shows actual, max, saved, and percent', () => {
        const report = formatSavingsReport({ actual: 1400, max: 2400, saved: 1000, savingsPercent: 42 });
        expect(report).toContain('1,400');
        expect(report).toContain('2,400');
        expect(report).toContain('1,000');
        expect(report).toContain('42%');
    });
    it('handles zero savings', () => {
        const report = formatSavingsReport({ actual: 800, max: 800, saved: 0, savingsPercent: 0 });
        expect(report).toContain('0 tokens');
        expect(report).toContain('0%');
    });
});
//# sourceMappingURL=adaptive-preamble.test.js.map