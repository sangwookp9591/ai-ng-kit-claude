/**
 * TDD: state-introspection.ts tests
 * Verifies listActiveStates, clearState, getStateStatus.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeState } from '../dist/scripts/core/state.js';

const TEST_DIR = join(tmpdir(), `aing-introspect-test-${Date.now()}`);
const STATE_DIR = join(TEST_DIR, '.aing', 'state');

describe('state-introspection: listActiveStates', () => {
  before(() => {
    mkdirSync(STATE_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns active states with correct metadata', async () => {
    const { listActiveStates } = await import('../dist/scripts/core/state-introspection.js');

    writeState(join(STATE_DIR, 'plan-state.json'), {
      active: true,
      feature: 'test',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    writeState(join(STATE_DIR, 'team-session.json'), {
      active: false,
      feature: 'done',
    });

    const states = listActiveStates(TEST_DIR);
    assert.ok(states.length >= 1, 'should have at least 1 active state');
    const plan = states.find(s => s.file === 'plan-state.json');
    assert.ok(plan, 'plan-state.json should be in active list');
    assert.equal(plan.active, true);
    assert.ok(plan.ageMinutes >= 0);
  });

  it('returns empty array for empty state dir', async () => {
    const { listActiveStates } = await import('../dist/scripts/core/state-introspection.js');
    const emptyDir = join(tmpdir(), `aing-introspect-empty-${Date.now()}`);
    mkdirSync(join(emptyDir, '.aing', 'state'), { recursive: true });

    const states = listActiveStates(emptyDir);
    assert.deepEqual(states, []);

    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('handles malformed JSON gracefully', async () => {
    const { listActiveStates } = await import('../dist/scripts/core/state-introspection.js');
    const badFile = join(STATE_DIR, 'tdd-state.json');
    writeFileSync(badFile, '{ broken json !!!');

    // Should not throw
    const states = listActiveStates(TEST_DIR);
    // malformed file should not appear as active
    const tdd = states.find(s => s.file === 'tdd-state.json');
    assert.ok(!tdd, 'malformed file should not be in active list');

    rmSync(badFile, { force: true });
  });
});

describe('state-introspection: clearState', () => {
  before(() => {
    mkdirSync(STATE_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('deletes matching files', async () => {
    const { clearState } = await import('../dist/scripts/core/state-introspection.js');
    writeState(join(STATE_DIR, 'team-session.json'), { active: false });
    writeState(join(STATE_DIR, 'plan-state.json'), { active: false });

    const result = clearState(TEST_DIR, 'team-*');
    assert.ok(result.cleared.includes('team-session.json'));
    assert.ok(!existsSync(join(STATE_DIR, 'team-session.json')));
    // plan-state should still exist (doesn't match pattern)
    assert.ok(existsSync(join(STATE_DIR, 'plan-state.json')));
  });

  it('denies protected files without force', async () => {
    const { clearState } = await import('../dist/scripts/core/state-introspection.js');
    writeState(join(STATE_DIR, 'pdca-status.json'), { version: 1 });

    const result = clearState(TEST_DIR, 'pdca-*');
    assert.ok(result.denied.includes('pdca-status.json'));
    assert.ok(existsSync(join(STATE_DIR, 'pdca-status.json')));
  });

  it('clears protected files with force: true', async () => {
    const { clearState } = await import('../dist/scripts/core/state-introspection.js');
    writeState(join(STATE_DIR, 'pdca-status.json'), { version: 1 });

    const result = clearState(TEST_DIR, 'pdca-*', { force: true });
    assert.ok(result.cleared.includes('pdca-status.json'));
    assert.ok(!existsSync(join(STATE_DIR, 'pdca-status.json')));
  });
});

describe('state-introspection: getStateStatus', () => {
  before(() => {
    mkdirSync(STATE_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns correct aggregate counts', async () => {
    const { getStateStatus } = await import('../dist/scripts/core/state-introspection.js');

    writeState(join(STATE_DIR, 'plan-state.json'), { active: true, startedAt: new Date().toISOString() });
    writeState(join(STATE_DIR, 'cost-tracker.json'), { total: 100 });
    writeFileSync(join(STATE_DIR, 'hud-setup-done'), new Date().toISOString());

    const status = getStateStatus(TEST_DIR);
    assert.ok(status.totalFiles >= 3);
    assert.ok(status.activeCount >= 1);
    assert.ok(status.diskUsageBytes > 0);
  });
});
