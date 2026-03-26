/**
 * TDD: status-view.mjs tests
 * Verifies STATUS.md generation from pdca-status.json.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeState } from '../scripts/core/state.mjs';

const TEST_DIR = join(tmpdir(), `aing-status-view-test-${Date.now()}`);
const STATE_PATH = join(TEST_DIR, '.aing', 'state', 'pdca-status.json');
const STATUS_PATH = join(TEST_DIR, '.aing', 'STATUS.md');

function makeFeature(overrides = {}) {
  return {
    currentStage: 'plan',
    iteration: 0,
    startedAt: new Date().toISOString(),
    history: [{ stage: 'plan', action: 'started', ts: new Date().toISOString() }],
    evidence: [],
    ...overrides
  };
}

function oldDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

describe('status-view: generateStatusView', () => {
  before(() => {
    mkdirSync(join(TEST_DIR, '.aing', 'state'), { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('creates STATUS.md at .aing/STATUS.md', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, { version: 1, features: {}, activeFeature: null });

    const result = generateStatusView(TEST_DIR);
    assert.ok(result.path, 'result should have path');
    assert.ok(existsSync(result.path), 'STATUS.md should exist');
    assert.ok(result.path.endsWith('STATUS.md'));
  });

  it('returns correct featureCount', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'feat-a': makeFeature(),
        'feat-b': makeFeature({ currentStage: 'do', iteration: 1 })
      },
      activeFeature: 'feat-b'
    });

    const result = generateStatusView(TEST_DIR);
    assert.equal(result.featureCount, 2);
  });

  it('returns activeFeature name', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'my-feature': makeFeature({ currentStage: 'check', iteration: 2 })
      },
      activeFeature: 'my-feature'
    });

    const result = generateStatusView(TEST_DIR);
    assert.equal(result.activeFeature, 'my-feature');
  });

  it('returns correct zombieCount', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'zombie-1': makeFeature({ startedAt: oldDate(8) }),
        'zombie-2': makeFeature({ startedAt: oldDate(10) }),
        'healthy': makeFeature({
          currentStage: 'check',
          iteration: 1,
          evidence: [{ type: 'test', result: 'pass', ts: new Date().toISOString() }]
        })
      },
      activeFeature: 'healthy'
    });

    const result = generateStatusView(TEST_DIR);
    assert.equal(result.zombieCount, 2);
  });

  it('STATUS.md contains required header', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, { version: 1, features: {}, activeFeature: null });

    generateStatusView(TEST_DIR);
    const content = readFileSync(STATUS_PATH, 'utf-8');
    assert.ok(content.includes('# aing Status'), 'should have main heading');
    assert.ok(content.includes('Auto-generated'), 'should have auto-generated notice');
  });

  it('STATUS.md contains Active Feature section when activeFeature is set', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'active-feat': makeFeature({ currentStage: 'do', iteration: 1 })
      },
      activeFeature: 'active-feat'
    });

    generateStatusView(TEST_DIR);
    const content = readFileSync(STATUS_PATH, 'utf-8');
    assert.ok(content.includes('## Active Feature'), 'should have Active Feature section');
    assert.ok(content.includes('active-feat'), 'should mention active feature name');
    assert.ok(content.includes('do'), 'should mention current stage');
  });

  it('STATUS.md contains All Features table', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'feat-x': makeFeature(),
        'feat-y': makeFeature({ currentStage: 'review', iteration: 3 })
      },
      activeFeature: 'feat-y'
    });

    generateStatusView(TEST_DIR);
    const content = readFileSync(STATUS_PATH, 'utf-8');
    assert.ok(content.includes('## All Features'), 'should have All Features section');
    assert.ok(content.includes('feat-x'), 'should list feat-x');
    assert.ok(content.includes('feat-y'), 'should list feat-y');
    // Table header
    assert.ok(content.includes('| Feature |'), 'should have table header');
  });

  it('STATUS.md shows Zombie warning when zombies exist', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'zomb': makeFeature({ startedAt: oldDate(9) })
      },
      activeFeature: null
    });

    generateStatusView(TEST_DIR);
    const content = readFileSync(STATUS_PATH, 'utf-8');
    assert.ok(content.includes('## Warnings'), 'should have Warnings section');
    assert.ok(content.includes('zombie'), 'should mention zombie features');
  });

  it('STATUS.md shows no Warnings section when no zombies', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'clean': makeFeature({
          currentStage: 'check',
          iteration: 1,
          evidence: [{ type: 'test', result: 'pass', ts: new Date().toISOString() }]
        })
      },
      activeFeature: 'clean'
    });

    generateStatusView(TEST_DIR);
    const content = readFileSync(STATUS_PATH, 'utf-8');
    assert.ok(!content.includes('## Warnings'), 'should NOT have Warnings section when no zombies');
  });

  it('returns { path, featureCount, zombieCount, activeFeature } shape', async () => {
    const { generateStatusView } = await import('../scripts/pdca/status-view.mjs');
    writeState(STATE_PATH, { version: 1, features: {}, activeFeature: null });

    const result = generateStatusView(TEST_DIR);
    assert.ok('path' in result);
    assert.ok('featureCount' in result);
    assert.ok('zombieCount' in result);
    assert.ok('activeFeature' in result);
  });
});
