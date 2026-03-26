/**
 * TDD: state-gc.mjs tests
 * Verifies zombie feature detection, archival, and dry-run behavior.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeState } from '../scripts/core/state.mjs';

const TEST_DIR = join(tmpdir(), `aing-gc-test-${Date.now()}`);
const STATE_PATH = join(TEST_DIR, '.aing', 'state', 'pdca-status.json');

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

describe('state-gc: runGC', () => {
  before(() => {
    mkdirSync(join(TEST_DIR, '.aing', 'state'), { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns { removed: 0, archived: [] } when no features', async () => {
    const { runGC } = await import('../scripts/pdca/state-gc.mjs');
    writeState(STATE_PATH, { version: 1, features: {}, activeFeature: null });

    const result = runGC(TEST_DIR);
    assert.equal(result.removed, 0);
    assert.deepEqual(result.archived, []);
  });

  it('does not remove active, evidence-bearing features', async () => {
    const { runGC } = await import('../scripts/pdca/state-gc.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'healthy': makeFeature({
          currentStage: 'check',
          iteration: 1,
          evidence: [{ type: 'test', result: 'pass', ts: new Date().toISOString() }]
        })
      },
      activeFeature: 'healthy'
    });

    const result = runGC(TEST_DIR);
    assert.equal(result.removed, 0);
  });

  it('identifies and removes zombie features older than maxAgeDays', async () => {
    const { runGC } = await import('../scripts/pdca/state-gc.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'zombie-old': makeFeature({ startedAt: oldDate(8) }),
        'zombie-plan': makeFeature({ currentStage: 'plan', startedAt: oldDate(10) }),
        'healthy': makeFeature({
          currentStage: 'check',
          iteration: 2,
          evidence: [{ type: 'test', result: 'pass', ts: new Date().toISOString() }]
        })
      },
      activeFeature: 'healthy'
    });

    const result = runGC(TEST_DIR);
    assert.equal(result.removed, 2);
    assert.ok(result.archived.includes('zombie-old'));
    assert.ok(result.archived.includes('zombie-plan'));
    assert.ok(!result.archived.includes('healthy'));
  });

  it('archives removed features to .aing/archive/gc-{date}.json', async () => {
    const { runGC } = await import('../scripts/pdca/state-gc.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'z1': makeFeature({ startedAt: oldDate(9) }),
        'z2': makeFeature({ startedAt: oldDate(15), currentStage: 'do' })
      },
      activeFeature: null
    });

    const result = runGC(TEST_DIR);
    assert.ok(result.removed > 0);

    const archiveDir = join(TEST_DIR, '.aing', 'archive');
    assert.ok(existsSync(archiveDir), 'archive dir should exist');

    const archiveFiles = [];
    for (const name of (await import('node:fs')).readdirSync(archiveDir)) {
      if (name.startsWith('gc-') && name.endsWith('.json')) archiveFiles.push(name);
    }
    assert.ok(archiveFiles.length > 0, 'at least one gc archive file should exist');

    const archivePath = join(archiveDir, archiveFiles[archiveFiles.length - 1]);
    const archive = JSON.parse(readFileSync(archivePath, 'utf-8'));
    assert.ok(archive.features, 'archive should have features key');
    assert.ok(archive.gcAt, 'archive should have gcAt timestamp');
  });

  it('removes zombies from pdca-status.json after GC', async () => {
    const { runGC } = await import('../scripts/pdca/state-gc.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'to-remove': makeFeature({ startedAt: oldDate(8) }),
        'to-keep': makeFeature({
          currentStage: 'check',
          iteration: 1,
          evidence: [{ type: 'test', result: 'pass', ts: new Date().toISOString() }]
        })
      },
      activeFeature: 'to-keep'
    });

    runGC(TEST_DIR);

    const updated = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
    assert.ok(!updated.features['to-remove'], 'zombie should be removed from state');
    assert.ok(updated.features['to-keep'], 'healthy feature should remain');
  });

  it('dry-run returns candidates without modifying state', async () => {
    const { runGC } = await import('../scripts/pdca/state-gc.mjs');
    const original = {
      version: 1,
      features: {
        'dry-zombie': makeFeature({ startedAt: oldDate(8) })
      },
      activeFeature: null
    };
    writeState(STATE_PATH, original);

    const result = runGC(TEST_DIR, { dryRun: true });
    assert.ok(result.removed > 0, 'dry-run should report would-remove count');
    assert.ok(result.archived.includes('dry-zombie'));

    const unchanged = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
    assert.ok(unchanged.features['dry-zombie'], 'dry-run must not modify state');
  });

  it('respects custom maxAgeDays option', async () => {
    const { runGC } = await import('../scripts/pdca/state-gc.mjs');
    writeState(STATE_PATH, {
      version: 1,
      features: {
        'recent': makeFeature({ startedAt: oldDate(3) }),
        'old': makeFeature({ startedAt: oldDate(30) })
      },
      activeFeature: null
    });

    const result = runGC(TEST_DIR, { maxAgeDays: 2 });
    assert.ok(result.archived.includes('recent'), 'should include 3-day old with maxAgeDays=2');
    assert.ok(result.archived.includes('old'));
  });
});
