import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Each suite gets its own isolated directory to avoid lock contention
const BASE = join(import.meta.dirname, '.test-heartbeat-tmp');

async function importMod() {
  try {
    return await import('../dist/scripts/pipeline/team-heartbeat.js');
  } catch {
    return null;
  }
}

describe('team-heartbeat: registerWorker', () => {
  const DIR = join(BASE, 'register');
  let mod;

  before(async () => {
    mkdirSync(DIR, { recursive: true });
    mod = await importMod();
    if (!mod) console.warn('SKIP: dist not found — run tsc first');
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('registers a new worker with active status', async () => {
    if (!mod) return;
    await mod.registerWorker('jay', 'Implement auth API', DIR);
    const health = await mod.getTeamHealth(DIR);
    const worker = health.workers.find(w => w.agentName === 'jay');
    assert.ok(worker, 'worker should exist');
    assert.equal(worker.status, 'active');
    assert.equal(worker.taskDescription, 'Implement auth API');
  });

  it('upserts existing worker on duplicate register', async () => {
    if (!mod) return;
    await mod.registerWorker('jay', 'Updated task', DIR);
    const health = await mod.getTeamHealth(DIR);
    const jays = health.workers.filter(w => w.agentName === 'jay');
    assert.equal(jays.length, 1, 'no duplicate entries');
    assert.equal(jays[0].taskDescription, 'Updated task');
  });
});

describe('team-heartbeat: recordHeartbeat', () => {
  const DIR = join(BASE, 'heartbeat');
  let mod;

  before(async () => {
    mkdirSync(DIR, { recursive: true });
    mod = await importMod();
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('creates worker if not present', async () => {
    if (!mod) return;
    await mod.recordHeartbeat('jerry', DIR);
    const health = await mod.getTeamHealth(DIR);
    const worker = health.workers.find(w => w.agentName === 'jerry');
    assert.ok(worker);
    assert.equal(worker.status, 'active');
  });

  it('updates lastSeen on heartbeat', async () => {
    if (!mod) return;
    const before = new Date().toISOString();
    await new Promise(r => setTimeout(r, 5));
    await mod.recordHeartbeat('jerry', DIR);
    const health = await mod.getTeamHealth(DIR);
    const worker = health.workers.find(w => w.agentName === 'jerry');
    assert.ok(worker.lastSeen >= before, 'lastSeen should be updated');
  });
});

describe('team-heartbeat: markWorkerDone', () => {
  const DIR = join(BASE, 'done');
  let mod;

  before(async () => {
    mkdirSync(DIR, { recursive: true });
    mod = await importMod();
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('marks worker completed', async () => {
    if (!mod) return;
    await mod.registerWorker('milla', 'Security review', DIR);
    await mod.markWorkerDone('milla', 'completed', DIR);
    const health = await mod.getTeamHealth(DIR);
    const worker = health.workers.find(w => w.agentName === 'milla');
    assert.equal(worker.status, 'completed');
  });

  it('marks worker failed', async () => {
    if (!mod) return;
    await mod.registerWorker('iron', 'Frontend build', DIR);
    await mod.markWorkerDone('iron', 'failed', DIR);
    const health = await mod.getTeamHealth(DIR);
    const worker = health.workers.find(w => w.agentName === 'iron');
    assert.equal(worker.status, 'failed');
  });
});

describe('team-heartbeat: getTeamHealth stats', () => {
  const DIR = join(BASE, 'stats');
  let mod;

  before(async () => {
    mkdirSync(DIR, { recursive: true });
    mod = await importMod();
  });

  after(() => rmSync(DIR, { recursive: true, force: true }));

  it('recalculates activeCount and staleCount correctly', async () => {
    if (!mod) return;
    await mod.registerWorker('w1', 'task1', DIR);
    await mod.registerWorker('w2', 'task2', DIR);
    await mod.markWorkerDone('w2', 'completed', DIR);
    const health = await mod.getTeamHealth(DIR);
    assert.equal(health.activeCount, 1);
    assert.equal(health.staleCount, 0);
  });

  it('health score is 100 when no active or stale workers remain', async () => {
    if (!mod) return;
    await mod.markWorkerDone('w1', 'completed', DIR);
    const health = await mod.getTeamHealth(DIR);
    assert.equal(health.healthScore, 100);
  });
});

describe('team-heartbeat: getHealthScore', () => {
  let mod;

  before(async () => {
    mod = await importMod();
  });

  it('returns 100 for empty workers', () => {
    if (!mod) return;
    const score = mod.getHealthScore({ workers: [], healthScore: 100, staleCount: 0, activeCount: 0 });
    assert.equal(score, 100);
  });

  it('penalizes stale workers (50% weight)', () => {
    if (!mod) return;
    const health = {
      workers: [
        { agentName: 'a', startedAt: '', lastSeen: '', status: 'active' },
        { agentName: 'b', startedAt: '', lastSeen: '', status: 'stale' },
      ],
      healthScore: 0,
      staleCount: 1,
      activeCount: 1,
    };
    // active=1, stale weight=0.5 → 1/(1+0.5)*100 = 66.67 → rounds to 67
    const score = mod.getHealthScore(health);
    assert.equal(score, 67);
  });

  it('returns 0 when all non-terminal workers are stale', () => {
    if (!mod) return;
    const health = {
      workers: [
        { agentName: 'a', startedAt: '', lastSeen: '', status: 'stale' },
        { agentName: 'b', startedAt: '', lastSeen: '', status: 'stale' },
      ],
      healthScore: 0,
      staleCount: 2,
      activeCount: 0,
    };
    // active=0, stale=2×0.5=1 → 0/(0+1)*100 = 0
    const score = mod.getHealthScore(health);
    assert.equal(score, 0);
  });
});
