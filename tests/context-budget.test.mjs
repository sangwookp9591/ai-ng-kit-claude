/**
 * Context Budget — Comprehensive GAP tests
 *
 * Tests scripts/core/context-budget.mjs:
 * - estimateTokens edge cases (empty, null, Korean, code, single char)
 * - trackInjection recording and overBudget flag
 * - resetBudget clears state
 * - trimToTokenBudget pass-through and trim with marker
 * - getBudgetStatus structure
 *
 * Run: node --test tests/context-budget.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const {
  estimateTokens,
  trackInjection,
  getBudgetStatus,
  resetBudget,
  trimToTokenBudget,
} = await import('../dist/scripts/core/context-budget.js');

describe('Context Budget — GAP coverage', () => {
  beforeEach(() => resetBudget());

  // ── estimateTokens ─────────────────────────────────────────────

  it('estimateTokens("") → 0', () => {
    assert.equal(estimateTokens(''), 0);
  });

  it('estimateTokens(null) → 0', () => {
    assert.equal(estimateTokens(null), 0);
  });

  it('estimateTokens(undefined) → 0', () => {
    assert.equal(estimateTokens(undefined), 0);
  });

  it('estimateTokens("Hello world") → reasonable number (5-20)', () => {
    const tokens = estimateTokens('Hello world');
    assert.ok(tokens >= 1 && tokens <= 20, `Expected 1-20, got ${tokens}`);
  });

  it('estimateTokens("안녕하세요") → higher than English (Korean ~2 tokens/char)', () => {
    const korean = estimateTokens('안녕하세요');
    const english = estimateTokens('Hello');
    assert.ok(korean > english, `Korean (${korean}) should be > English (${english})`);
  });

  it('estimateTokens("function foo(){}") → code estimation', () => {
    const tokens = estimateTokens('function foo(){}');
    assert.ok(tokens >= 1, `Expected >= 1, got ${tokens}`);
    assert.ok(tokens <= 30, `Expected <= 30, got ${tokens}`);
  });

  it('estimateTokens("x") → at least 1', () => {
    assert.ok(estimateTokens('x') >= 1);
  });

  // ── trackInjection ────────────────────────────────────────────

  it('trackInjection records and sums correctly', () => {
    const r1 = trackInjection('hook-a', 'some content here');
    assert.equal(typeof r1.tokens, 'number');
    assert.ok(r1.tokens > 0);
    assert.equal(r1.totalUsed, r1.tokens);

    const r2 = trackInjection('hook-b', 'more content');
    assert.equal(r2.totalUsed, r1.tokens + r2.tokens);

    const status = getBudgetStatus();
    assert.equal(status.injections.length, 2);
    assert.equal(status.total, r2.totalUsed);
  });

  it('trackInjection sets overBudget flag when exceeding max', () => {
    // Default maxSessionStartTokens is 2000; generate content far exceeding that
    const bigContent = 'word '.repeat(5000); // ~5000 words ≫ 2000 tokens
    const result = trackInjection('big-hook', bigContent);
    assert.equal(result.overBudget, true);
  });

  it('trackInjection overBudget is false for small content', () => {
    const result = trackInjection('small-hook', 'tiny');
    assert.equal(result.overBudget, false);
  });

  // ── resetBudget ───────────────────────────────────────────────

  it('resetBudget clears all state', () => {
    trackInjection('hook', 'some content');
    resetBudget();
    const status = getBudgetStatus();
    assert.equal(status.total, 0);
    assert.equal(status.injections.length, 0);
    assert.equal(status.warnings.length, 0);
  });

  // ── trimToTokenBudget ─────────────────────────────────────────

  it('trimToTokenBudget passes through short content', () => {
    const short = 'Hello world';
    const result = trimToTokenBudget(short, 1000);
    assert.equal(result, short);
  });

  it('trimToTokenBudget trims long content with marker', () => {
    const long = 'word '.repeat(2000); // very long
    const result = trimToTokenBudget(long, 10);
    assert.ok(result.length < long.length, 'Trimmed should be shorter');
    assert.ok(result.includes('trimmed to fit'), 'Should contain trim marker');
  });

  // ── getBudgetStatus ───────────────────────────────────────────

  it('getBudgetStatus returns correct structure', () => {
    const status = getBudgetStatus();
    assert.equal(typeof status.total, 'number');
    assert.ok(Array.isArray(status.injections));
    assert.ok(Array.isArray(status.warnings));
  });
});
