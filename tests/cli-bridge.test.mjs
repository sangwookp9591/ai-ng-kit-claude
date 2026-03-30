/**
 * CLI Bridge — Comprehensive GAP tests
 *
 * Tests scripts/multi-ai/cli-bridge.mjs:
 * - createBridge returns object with name, command, isAvailable, ask
 * - buildReviewPrompt includes diff content
 * - buildReviewPrompt truncates at 50K chars
 *
 * Run: node --test tests/cli-bridge.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { createBridge, buildReviewPrompt } =
  await import('../scripts/multi-ai/cli-bridge.mjs');

describe('CLI Bridge — GAP coverage', () => {

  // ── createBridge ──────────────────────────────────────────────

  it('createBridge returns object with name, command, isAvailable, ask', () => {
    const bridge = createBridge('test-tool', 'nonexistent-cli-xyz');
    assert.equal(bridge.name, 'test-tool');
    assert.equal(bridge.command, 'nonexistent-cli-xyz');
    assert.equal(typeof bridge.isAvailable, 'function');
    assert.equal(typeof bridge.ask, 'function');
  });

  it('isAvailable returns false for nonexistent command', () => {
    const bridge = createBridge('fake', 'surely-nonexistent-command-12345');
    assert.equal(bridge.isAvailable(), false);
  });

  it('isAvailable returns true for a known command (node)', () => {
    const bridge = createBridge('node', 'node');
    assert.equal(bridge.isAvailable(), true);
  });

  it('ask returns error object for nonexistent command', () => {
    const bridge = createBridge('fake', 'surely-nonexistent-command-12345');
    const result = bridge.ask('hello');
    assert.equal(result.ok, false);
    assert.equal(result.source, 'fake');
    assert.ok(result.error);
  });

  // ── buildReviewPrompt ─────────────────────────────────────────

  it('buildReviewPrompt includes diff content', () => {
    const diff = 'diff --git a/foo.js b/foo.js\n+console.log("hi")';
    const prompt = buildReviewPrompt(diff);
    assert.ok(prompt.includes('console.log("hi")'));
    assert.ok(prompt.includes('Review this code diff'));
  });

  it('buildReviewPrompt includes instructions when provided', () => {
    const prompt = buildReviewPrompt('some diff', 'Focus on security');
    assert.ok(prompt.includes('Focus on security'));
  });

  it('buildReviewPrompt truncates diff at 50K chars', () => {
    const longDiff = 'x'.repeat(100_000);
    const prompt = buildReviewPrompt(longDiff);
    // The prompt should contain at most 50K chars of the diff
    // Total prompt is longer due to header text, but diff portion is capped
    const diffStart = prompt.indexOf('DIFF:\n') + 'DIFF:\n'.length;
    const diffPortion = prompt.slice(diffStart);
    assert.ok(diffPortion.length <= 50_001, `Diff portion should be <= 50K, got ${diffPortion.length}`);
  });

  it('buildReviewPrompt does not truncate short diff', () => {
    const shortDiff = 'short diff content';
    const prompt = buildReviewPrompt(shortDiff);
    assert.ok(prompt.includes(shortDiff));
  });
});
