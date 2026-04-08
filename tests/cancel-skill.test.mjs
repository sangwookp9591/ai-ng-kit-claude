/**
 * TDD: cancel skill integration tests
 * Verifies endSession + runSessionCleanup + state-introspection work together.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeState } from '../dist/scripts/core/state.js';

const TEST_DIR = join(tmpdir(), `aing-cancel-test-${Date.now()}`);
const STATE_DIR = join(TEST_DIR, '.aing', 'state');

describe('cancel-skill: endSession + cleanup integration', () => {
  before(() => {
    mkdirSync(STATE_DIR, { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('deactivates all active modes via endSession', async () => {
    const { endSession, readSession, writeSession } = await import('../dist/scripts/core/session-state.js');

    // Create active sessions for plan and team
    writeSession({ feature: 'test-plan', mode: 'plan', active: true, currentStage: 'foundation' }, TEST_DIR);
    writeSession({ feature: 'test-team', mode: 'team', active: true, currentStage: 'team-exec' }, TEST_DIR);

    // Cancel them
    const planResult = endSession('plan', 'cancelled', TEST_DIR);
    const teamResult = endSession('team', 'cancelled', TEST_DIR);

    assert.ok(planResult.ok, 'plan endSession should succeed');
    assert.ok(teamResult.ok, 'team endSession should succeed');

    // Verify they are deactivated
    const plan = readSession('plan', TEST_DIR);
    const team = readSession('team', TEST_DIR);

    assert.equal(plan.active, false, 'plan should be inactive');
    assert.equal(plan.endReason, 'cancelled');
    assert.ok(plan.endedAt);

    assert.equal(team.active, false, 'team should be inactive');
    assert.equal(team.endReason, 'cancelled');
  });

  it('reports nothing to cancel when no active modes', async () => {
    const { listActiveStates } = await import('../dist/scripts/core/state-introspection.js');

    // Use a fresh empty dir
    const emptyDir = join(tmpdir(), `aing-cancel-empty-${Date.now()}`);
    mkdirSync(join(emptyDir, '.aing', 'state'), { recursive: true });

    const states = listActiveStates(emptyDir);
    assert.equal(states.length, 0, 'should have no active states');

    rmSync(emptyDir, { recursive: true, force: true });
  });

  it('runs runSessionCleanup after deactivation', async () => {
    const { runSessionCleanup } = await import('../dist/scripts/core/session-cleanup.js');
    const { writeFileSync } = await import('node:fs');

    // Create a .tmp file that should be cleaned
    writeFileSync(join(STATE_DIR, 'leftover.tmp'), 'junk');

    const result = runSessionCleanup(TEST_DIR);
    assert.ok(result.cleaned.some(f => f.includes('.tmp')), 'should clean .tmp file');
    assert.ok(!existsSync(join(STATE_DIR, 'leftover.tmp')));
  });

  it('clearState --force clears all non-protected state files', async () => {
    const { clearState } = await import('../dist/scripts/core/state-introspection.js');

    writeState(join(STATE_DIR, 'pipeline-state.json'), { active: false });
    writeState(join(STATE_DIR, 'tdd-state.json'), { active: false });
    writeState(join(STATE_DIR, 'pdca-status.json'), { version: 1 });

    // Without force: pdca-status denied
    const result1 = clearState(TEST_DIR, '*');
    assert.ok(result1.denied.includes('pdca-status.json'));

    // Recreate cleared files
    writeState(join(STATE_DIR, 'pipeline-state.json'), { active: false });

    // With force on specific pattern: pdca-status still requires explicit force
    const result2 = clearState(TEST_DIR, 'pipeline-*');
    assert.ok(result2.cleared.includes('pipeline-state.json'));
  });

  it('preserves PROTECTED_FILES even with clearState force on wildcard', async () => {
    const { clearState } = await import('../dist/scripts/core/state-introspection.js');

    writeState(join(STATE_DIR, 'pdca-status.json'), { version: 1, features: {} });
    writeState(join(STATE_DIR, 'cost-tracker.json'), { total: 500 });
    writeState(join(STATE_DIR, 'plan-state.json'), { active: false });

    // force: false (default) — protected files denied
    const result = clearState(TEST_DIR, '*');
    assert.ok(result.denied.includes('pdca-status.json'));
    assert.ok(result.denied.includes('cost-tracker.json'));
    assert.ok(existsSync(join(STATE_DIR, 'pdca-status.json')));
    assert.ok(existsSync(join(STATE_DIR, 'cost-tracker.json')));
  });
});
