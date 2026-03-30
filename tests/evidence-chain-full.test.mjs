/**
 * Evidence Chain Full — Comprehensive GAP tests
 *
 * Tests scripts/evidence/evidence-chain.mjs:
 * - addEvidence appends entry
 * - evaluateChain (getVerdict) with all pass → PASS
 * - evaluateChain with one fail → FAIL
 * - evaluateChain with no evidence → INCOMPLETE
 * - clearEvidence (reset by recreating chain)
 *
 * Run: node --test tests/evidence-chain-full.test.mjs
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

function makeTempDir() {
  const dir = join(tmpdir(), `aing-test-${randomBytes(6).toString('hex')}`);
  mkdirSync(join(dir, '.aing', 'state'), { recursive: true });
  return dir;
}

function cleanDir(dir) {
  try { rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

const { addEvidence, evaluateChain } =
  await import('../scripts/evidence/evidence-chain.mjs');

describe('Evidence Chain — GAP coverage', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it('addEvidence appends entry', () => {
    addEvidence('feat-a', { type: 'test', result: 'pass', source: 'unit' }, tempDir);
    addEvidence('feat-a', { type: 'lint', result: 'pass', source: 'eslint' }, tempDir);

    const { entries } = evaluateChain('feat-a', tempDir);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].type, 'test');
    assert.equal(entries[1].type, 'lint');
  });

  it('addEvidence includes seq and ts', () => {
    addEvidence('feat-b', { type: 'build', result: 'pass', source: 'tsc' }, tempDir);
    const { entries } = evaluateChain('feat-b', tempDir);
    assert.equal(entries[0].seq, 1);
    assert.ok(entries[0].ts, 'Should have timestamp');
  });

  it('evaluateChain with all pass → PASS', () => {
    addEvidence('feat-pass', { type: 'test', result: 'pass', source: 'jest' }, tempDir);
    addEvidence('feat-pass', { type: 'lint', result: 'pass', source: 'eslint' }, tempDir);
    addEvidence('feat-pass', { type: 'build', result: 'pass', source: 'tsc' }, tempDir);

    const { verdict } = evaluateChain('feat-pass', tempDir);
    assert.equal(verdict, 'PASS');
  });

  it('evaluateChain with one fail → FAIL', () => {
    addEvidence('feat-fail', { type: 'test', result: 'pass', source: 'jest' }, tempDir);
    addEvidence('feat-fail', { type: 'security', result: 'fail', source: 'audit' }, tempDir);

    const { verdict } = evaluateChain('feat-fail', tempDir);
    assert.equal(verdict, 'FAIL');
  });

  it('evaluateChain with no evidence → INCOMPLETE', () => {
    const { verdict, summary } = evaluateChain('feat-empty', tempDir);
    assert.equal(verdict, 'INCOMPLETE');
    assert.ok(summary.includes('No evidence'));
  });

  it('clearEvidence by overwriting state file removes all entries', () => {
    addEvidence('feat-clear', { type: 'test', result: 'pass', source: 'unit' }, tempDir);

    // Clear by writing empty chain
    const chainPath = join(tempDir, '.aing', 'state', 'evidence-feat-clear.json');
    writeFileSync(chainPath, JSON.stringify({ feature: 'feat-clear', entries: [], verdict: null }));

    const { verdict, entries } = evaluateChain('feat-clear', tempDir);
    assert.equal(entries.length, 0);
    assert.equal(verdict, 'INCOMPLETE');
  });

  it('evaluateChain returns summary string', () => {
    addEvidence('feat-sum', { type: 'test', result: 'pass', source: 'vitest' }, tempDir);
    const { summary } = evaluateChain('feat-sum', tempDir);
    assert.ok(typeof summary === 'string');
    assert.ok(summary.includes('PASS'));
    assert.ok(summary.includes('test'));
  });
});
