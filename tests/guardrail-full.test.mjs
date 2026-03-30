/**
 * Guardrail Full — Comprehensive GAP tests
 *
 * Tests:
 * - scripts/guardrail/careful-checklist.mjs (checkCommand)
 * - scripts/guardrail/freeze-engine.mjs (setFreeze, clearFreeze, checkFreeze)
 * - scripts/guardrail/safety-invariants.mjs (loadInvariants)
 * - scripts/guardrail/cost-ceiling.mjs (recordUsage, loadLimits, initCostTracker)
 *
 * Run: node --test tests/guardrail-full.test.mjs
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
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

// ─────────────────────────────────────────────────────────────────
// 1. Careful Checklist
// ─────────────────────────────────────────────────────────────────
describe('Careful Checklist — dangerous command detection', async () => {
  const { checkCommand } = await import('../scripts/guardrail/careful-checklist.mjs');

  it('blocks rm -rf /', () => {
    const result = checkCommand('rm -rf /');
    assert.equal(result.safe, false);
    assert.ok(result.findings.length > 0);
  });

  it('blocks git push --force main', () => {
    const result = checkCommand('git push --force main');
    assert.equal(result.safe, false);
    assert.ok(result.findings.some(f => f.name.includes('git push --force')));
  });

  it('blocks git push -f origin main', () => {
    const result = checkCommand('git push -f origin main');
    assert.equal(result.safe, false);
  });

  it('blocks DROP TABLE', () => {
    const result = checkCommand('DROP TABLE users;');
    assert.equal(result.safe, false);
    assert.ok(result.findings.some(f => f.name.includes('DROP')));
  });

  it('blocks git reset --hard', () => {
    const result = checkCommand('git reset --hard HEAD~1');
    assert.equal(result.safe, false);
  });

  it('allows git status', () => {
    const result = checkCommand('git status');
    assert.equal(result.safe, true);
    assert.equal(result.findings.length, 0);
  });

  it('allows ls -la', () => {
    const result = checkCommand('ls -la');
    assert.equal(result.safe, true);
  });

  it('allows empty/null command', () => {
    assert.equal(checkCommand('').safe, true);
    assert.equal(checkCommand(null).safe, true);
  });

  it('allows safe exception: rm -rf node_modules', () => {
    const result = checkCommand('rm -rf node_modules');
    assert.equal(result.safe, true);
  });
});

// ─────────────────────────────────────────────────────────────────
// 2. Freeze Engine
// ─────────────────────────────────────────────────────────────────
describe('Freeze Engine — directory-scoped edit restriction', async () => {
  const { setFreeze, clearFreeze, checkFreeze } =
    await import('../scripts/guardrail/freeze-engine.mjs');

  let tempDir;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it('freeze blocks writes outside path', () => {
    setFreeze(join(tempDir, 'src'), tempDir);
    const result = checkFreeze('/etc/passwd', tempDir);
    assert.equal(result.allowed, false);
    assert.ok(result.reason && result.reason.includes('outside freeze boundary'));
  });

  it('freeze allows writes inside path', () => {
    const srcDir = join(tempDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    setFreeze(srcDir, tempDir);
    const result = checkFreeze(join(srcDir, 'index.js'), tempDir);
    assert.equal(result.allowed, true);
  });

  it('clearFreeze removes restriction', () => {
    setFreeze(join(tempDir, 'src'), tempDir);
    clearFreeze(tempDir);
    const result = checkFreeze('/anywhere/file.js', tempDir);
    assert.equal(result.allowed, true);
  });

  it('no freeze active allows everything', () => {
    const result = checkFreeze('/any/path/file.txt', tempDir);
    assert.equal(result.allowed, true);
  });
});

// ─────────────────────────────────────────────────────────────────
// 3. Safety Invariants
// ─────────────────────────────────────────────────────────────────
describe('Safety Invariants — hard limits', async () => {
  const { loadInvariants } = await import('../scripts/guardrail/safety-invariants.mjs');

  it('loadInvariants returns at least 5 invariant keys', () => {
    const inv = loadInvariants();
    const keys = Object.keys(inv);
    assert.ok(keys.length >= 5, `Expected >= 5 invariant keys, got ${keys.length}: ${keys}`);
  });

  it('invariants include expected fields', () => {
    const inv = loadInvariants();
    assert.ok('maxSteps' in inv);
    assert.ok('maxFileChanges' in inv);
    assert.ok('maxSessionMinutes' in inv);
    assert.ok('forbiddenPaths' in inv);
    assert.ok('maxConsecutiveErrors' in inv);
  });

  it('forbiddenPaths is a non-empty array', () => {
    const inv = loadInvariants();
    assert.ok(Array.isArray(inv.forbiddenPaths));
    assert.ok(inv.forbiddenPaths.length > 0);
  });
});

// ─────────────────────────────────────────────────────────────────
// 4. Cost Ceiling
// ─────────────────────────────────────────────────────────────────
describe('Cost Ceiling — budget enforcement', async () => {
  const { recordUsage, initCostTracker, loadLimits } =
    await import('../scripts/guardrail/cost-ceiling.mjs');

  let tempDir;

  beforeEach(() => {
    tempDir = makeTempDir();
    initCostTracker(tempDir);
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it('cost ceiling under limit → ok', () => {
    const result = recordUsage(100, 'test-task', tempDir);
    assert.equal(result.ok, true);
    assert.ok(result.usage);
  });

  it('cost ceiling over limit → blocked', () => {
    const limits = loadLimits(tempDir);
    // Exceed session token limit in one shot
    const result = recordUsage(limits.maxTokensPerSession + 1, 'big-task', tempDir);
    assert.equal(result.ok, false);
    assert.ok(result.warnings.length > 0);
  });

  it('loadLimits returns expected structure', () => {
    const limits = loadLimits(tempDir);
    assert.ok('maxTokensPerSession' in limits);
    assert.ok('maxApiCallsPerSession' in limits);
    assert.ok('warningThreshold' in limits);
  });
});
