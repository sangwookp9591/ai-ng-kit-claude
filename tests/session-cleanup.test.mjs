/**
 * TDD: session-cleanup.ts tests
 * Verifies transient cleanup: locks, temps, handoffs, stale mode states.
 * Protected files must never be touched.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync, statSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeState } from '../dist/scripts/core/state.js';

const TEST_DIR = join(tmpdir(), `aing-cleanup-test-${Date.now()}`);
const STATE_DIR = join(TEST_DIR, '.aing', 'state');
const ARCHIVE_DIR = join(TEST_DIR, '.aing', 'archive');

function setFileAge(filePath, ageMs) {
  const past = new Date(Date.now() - ageMs);
  utimesSync(filePath, past, past);
}

describe('session-cleanup: runSessionCleanup', () => {
  before(() => {
    mkdirSync(STATE_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('removes .tmp files from state dir', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');
    const tmpFile = join(STATE_DIR, 'some-file.abc123.tmp');
    writeFileSync(tmpFile, 'temp data');

    const result = runSessionCleanup(TEST_DIR);
    assert.ok(!existsSync(tmpFile), '.tmp file should be removed');
    assert.ok(result.cleaned.some(f => f.includes('.tmp')), 'cleaned list should include .tmp');
  });

  it('removes .lock files older than 30s but keeps fresh locks', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');

    const staleLock = join(STATE_DIR, 'pdca-status.json.lock');
    const freshLock = join(STATE_DIR, 'cost-tracker.json.lock');

    writeFileSync(staleLock, '99999');
    setFileAge(staleLock, 60_000); // 60s old — stale

    writeFileSync(freshLock, String(process.pid));
    // freshLock is just created — within 30s

    const result = runSessionCleanup(TEST_DIR);
    assert.ok(!existsSync(staleLock), 'stale lock (>30s) should be removed');
    assert.ok(existsSync(freshLock), 'fresh lock (<30s) should be kept');

    // cleanup fresh lock for next tests
    rmSync(freshLock, { force: true });
  });

  it('archives handoff-*.md files older than 7 days', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');

    const oldHandoff = join(STATE_DIR, 'handoff-2026-01-01T00-00-00-000Z.md');
    const freshHandoff = join(STATE_DIR, 'handoff-2026-04-08T12-00-00-000Z.md');

    writeFileSync(oldHandoff, '# Old handoff');
    setFileAge(oldHandoff, 8 * 24 * 60 * 60 * 1000); // 8 days

    writeFileSync(freshHandoff, '# Fresh handoff');
    // freshHandoff is just created

    const result = runSessionCleanup(TEST_DIR);
    assert.ok(!existsSync(oldHandoff), 'old handoff should be moved from state dir');
    assert.ok(existsSync(join(ARCHIVE_DIR, 'handoff-2026-01-01T00-00-00-000Z.md')), 'old handoff should be archived');
    assert.ok(existsSync(freshHandoff), 'fresh handoff should remain');

    // cleanup
    rmSync(freshHandoff, { force: true });
  });

  it('deactivates stale plan-state (>24h)', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');
    const planPath = join(STATE_DIR, 'plan-state.json');

    writeState(planPath, {
      active: true,
      feature: 'test-feature',
      startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    });

    const result = runSessionCleanup(TEST_DIR);
    const after = JSON.parse(readFileSync(planPath, 'utf-8'));
    assert.equal(after.active, false, 'stale plan-state should be deactivated');
    assert.ok(after.deactivatedAt, 'should have deactivatedAt timestamp');
    assert.ok(result.cleaned.some(f => f.includes('plan-state')));
  });

  it('deactivates stale persistent-mode (>30min)', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');
    const modePath = join(STATE_DIR, 'persistent-mode.json');

    writeState(modePath, {
      active: true,
      mode: 'auto',
      startedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    });

    const result = runSessionCleanup(TEST_DIR);
    const after = JSON.parse(readFileSync(modePath, 'utf-8'));
    assert.equal(after.active, false, 'stale persistent-mode should be deactivated');
    assert.ok(result.cleaned.some(f => f.includes('persistent-mode')));
  });

  it('never touches PROTECTED_FILES (pdca-status.json, cost-tracker.json, etc.)', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');
    const protectedFiles = [
      'pdca-status.json', 'cost-tracker.json', 'tech-stack.json',
      'agent-budget.json', 'agent-trace.json', 'agent-traces.json',
      'denial-audit.json', 'denial-learner-output.json',
      'invariants-tracker.json', 'progress-history.json',
      'team-health.json', 'version-check.json', 'hud-setup-done',
    ];

    for (const file of protectedFiles) {
      const path = join(STATE_DIR, file);
      writeFileSync(path, JSON.stringify({ protected: true }));
    }

    runSessionCleanup(TEST_DIR);

    for (const file of protectedFiles) {
      const path = join(STATE_DIR, file);
      assert.ok(existsSync(path), `${file} should NOT be deleted`);
      const content = JSON.parse(readFileSync(path, 'utf-8'));
      assert.equal(content.protected, true, `${file} content should be unchanged`);
    }
  });

  it('dryRun mode reports what would be cleaned without deleting', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');
    const tmpFile = join(STATE_DIR, 'dryrun-test.tmp');
    writeFileSync(tmpFile, 'will not be deleted');

    const result = runSessionCleanup(TEST_DIR, { dryRun: true });
    assert.ok(existsSync(tmpFile), 'file should NOT be deleted in dry-run');
    assert.ok(result.cleaned.length > 0 || result.skipped.length > 0, 'should report findings');

    // cleanup
    rmSync(tmpFile, { force: true });
  });

  it('handles missing .aing/state/ directory gracefully', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');
    const emptyDir = join(tmpdir(), `aing-cleanup-empty-${Date.now()}`);

    const result = runSessionCleanup(emptyDir);
    assert.deepEqual(result.cleaned, []);
    assert.deepEqual(result.errors, []);
  });

  it('handles malformed JSON in state files gracefully', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');
    const badFile = join(STATE_DIR, 'team-session.json');
    writeFileSync(badFile, '{ invalid json !!!');

    const result = runSessionCleanup(TEST_DIR);
    // Should not throw, malformed files are skipped
    assert.ok(result.errors.length > 0 || result.skipped.length > 0, 'malformed file should be in errors or skipped');

    // cleanup
    rmSync(badFile, { force: true });
  });
});
