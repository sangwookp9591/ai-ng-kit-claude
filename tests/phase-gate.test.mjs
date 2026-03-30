import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Each suite uses a unique directory to avoid cache cross-contamination
const BASE = join(import.meta.dirname, '.test-phase-gate-tmp');

async function importMod() {
  try {
    return await import('../dist/scripts/pipeline/phase-gate.js');
  } catch {
    return null;
  }
}

async function importState() {
  try {
    return await import('../dist/scripts/core/state.js');
  } catch {
    return null;
  }
}

// Write health state via writeState (invalidates TTL cache)
async function setHealth(stateMod, dir, workers) {
  const activeCount = workers.filter(w => w.status === 'active').length;
  const staleCount = workers.filter(w => w.status === 'stale').length;
  const health = { workers, activeCount, staleCount, healthScore: 100 };
  const path = join(dir, '.aing', 'state', 'team-health.json');
  mkdirSync(join(dir, '.aing', 'state'), { recursive: true });
  stateMod.writeState(path, health);
}

async function setTrace(stateMod, dir, agents) {
  const activeCount = agents.filter(a => a.status === 'active').length;
  const trace = { agents, activeCount, totalSpawned: agents.length };
  const path = join(dir, '.aing', 'state', 'agent-trace.json');
  mkdirSync(join(dir, '.aing', 'state'), { recursive: true });
  stateMod.writeState(path, trace);
}

describe('phase-gate: exec→verify', () => {
  const DIR = join(BASE, 'exec-verify');
  let mod, state;

  before(async () => {
    mkdirSync(join(DIR, '.aing', 'state'), { recursive: true });
    mod = await importMod();
    state = await importState();
    if (!mod || !state) console.warn('SKIP: dist not found — run tsc first');
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('allows transition when all workers are terminal', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'jay', startedAt: '', lastSeen: '', status: 'completed' },
      { agentName: 'jerry', startedAt: '', lastSeen: '', status: 'failed' },
    ]);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('exec', 'verify', DIR);
    assert.equal(result.canTransition, true);
    assert.equal(result.blockers.length, 0);
    assert.equal(result.completedTasks, 2);
    assert.equal(result.totalTasks, 2);
  });

  it('blocks transition when active workers remain', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'jay', startedAt: '', lastSeen: '', status: 'active' },
      { agentName: 'jerry', startedAt: '', lastSeen: '', status: 'completed' },
    ]);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('exec', 'verify', DIR);
    assert.equal(result.canTransition, false);
    assert.ok(result.blockers.some(b => b.includes('jay')));
  });

  it('blocks when stale workers remain', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'milla', startedAt: '', lastSeen: '', status: 'stale' },
    ]);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('exec', 'verify', DIR);
    assert.equal(result.canTransition, false);
    assert.ok(result.blockers.some(b => b.includes('stale')));
  });

  it('blocks when active trace agents remain', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'jay', startedAt: '', lastSeen: '', status: 'completed' },
    ]);
    await setTrace(state, DIR, [
      { status: 'active', subagentType: 'aing:executor' },
    ]);
    const result = await mod.checkPhaseGate('exec', 'verify', DIR);
    assert.equal(result.canTransition, false);
    assert.ok(result.blockers.some(b => b.includes('trace')));
  });
});

describe('phase-gate: verify→fix', () => {
  const DIR = join(BASE, 'verify-fix');
  let mod, state;

  before(async () => {
    mkdirSync(join(DIR, '.aing', 'state'), { recursive: true });
    mod = await importMod();
    state = await importState();
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('allows transition when at least one worker failed', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'sam', startedAt: '', lastSeen: '', status: 'failed' },
      { agentName: 'milla', startedAt: '', lastSeen: '', status: 'completed' },
    ]);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('verify', 'fix', DIR);
    assert.equal(result.canTransition, true);
    assert.equal(result.blockers.length, 0);
  });

  it('blocks when no failures found', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'sam', startedAt: '', lastSeen: '', status: 'completed' },
    ]);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('verify', 'fix', DIR);
    assert.equal(result.canTransition, false);
    assert.ok(result.blockers.some(b => b.includes('No failures')));
  });
});

describe('phase-gate: fix→exec', () => {
  const DIR = join(BASE, 'fix-exec');
  let mod, state;

  before(async () => {
    mkdirSync(join(DIR, '.aing', 'state'), { recursive: true });
    mod = await importMod();
    state = await importState();
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('always allows transition (warns if workers active)', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'jay', startedAt: '', lastSeen: '', status: 'active' },
    ]);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('fix', 'exec', DIR);
    assert.equal(result.canTransition, true);
    assert.ok(result.warnings.length > 0, 'should warn about active workers');
  });

  it('allows with no workers at all', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, []);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('fix', 'exec', DIR);
    assert.equal(result.canTransition, true);
    assert.equal(result.warnings.length, 0);
  });
});

describe('phase-gate: team-prefixed phases', () => {
  const DIR = join(BASE, 'team-prefix');
  let mod, state;

  before(async () => {
    mkdirSync(join(DIR, '.aing', 'state'), { recursive: true });
    mod = await importMod();
    state = await importState();
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('handles team-exec→team-verify (all terminal)', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'jay', startedAt: '', lastSeen: '', status: 'completed' },
    ]);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('team-exec', 'team-verify', DIR);
    assert.equal(result.canTransition, true);
  });
});

describe('phase-gate: generic transitions', () => {
  const DIR = join(BASE, 'generic');
  let mod, state;

  before(async () => {
    mkdirSync(join(DIR, '.aing', 'state'), { recursive: true });
    mod = await importMod();
    state = await importState();
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('allows unknown phase combos with warnings if active workers present', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, [
      { agentName: 'able', startedAt: '', lastSeen: '', status: 'active' },
    ]);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('plan', 'exec', DIR);
    assert.equal(result.canTransition, true, 'generic transitions are always allowed');
    assert.ok(result.warnings.length > 0, 'should warn about active workers');
  });

  it('allows unknown phases with no workers, no warnings', async () => {
    if (!mod || !state) return;
    await setHealth(state, DIR, []);
    await setTrace(state, DIR, []);
    const result = await mod.checkPhaseGate('plan', 'exec', DIR);
    assert.equal(result.canTransition, true);
    assert.equal(result.warnings.length, 0);
  });
});
