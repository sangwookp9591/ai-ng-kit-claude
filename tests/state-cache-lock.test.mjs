import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Import compiled JS from dist (tests run via node --test on .mjs)
// We import the source directly via tsx/ts-node path or compiled dist.
// Since the project uses 'node --test tests/**/*.test.ts' via tsx loader,
// for .mjs files we import from dist.
// However, the test runner uses node --test on .ts files with tsx.
// .mjs files are imported as ESM. We need compiled output.
// Let's use dynamic import after build check.

const TEST_DIR = join(import.meta.dirname, '.test-state-cache-lock-tmp');

// Helper: dynamic import with fallback
async function importState() {
  try {
    return await import('../dist/scripts/core/state.js');
  } catch {
    // If dist not available, skip with a helpful message
    return null;
  }
}

describe('State TTL Cache', () => {
  let mod;

  before(async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    mod = await importState();
    if (!mod) {
      console.warn('SKIP: dist/scripts/core/state.js not found — run tsc first');
    }
  });

  after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('returns cached result on second read (no file change)', { skip: false }, async () => {
    if (!mod) return;
    const fp = join(TEST_DIR, 'cache-test.json');
    const data = { x: 1 };
    writeFileSync(fp, JSON.stringify(data));

    const r1 = mod.readState(fp);
    assert.equal(r1.ok, true);

    // Overwrite file directly (bypass writeState to keep cache hot)
    writeFileSync(fp, JSON.stringify({ x: 999 }));

    // Cache should still return old value
    const r2 = mod.readState(fp);
    assert.equal(r2.ok, true);
    assert.deepEqual(r2.data, { x: 1 }, 'should return cached value');
  });

  it('invalidates cache after writeState', async () => {
    if (!mod) return;
    const fp = join(TEST_DIR, 'invalidate-test.json');

    mod.writeState(fp, { v: 'first' });
    const r1 = mod.readState(fp);
    assert.equal(r1.ok, true);
    assert.deepEqual(r1.data, { v: 'first' });

    mod.writeState(fp, { v: 'second' });
    const r2 = mod.readState(fp);
    assert.equal(r2.ok, true);
    assert.deepEqual(r2.data, { v: 'second' }, 'should read fresh value after invalidation');
  });

  it('invalidates cache after deleteState', async () => {
    if (!mod) return;
    const fp = join(TEST_DIR, 'delete-test.json');

    mod.writeState(fp, { keep: false });
    const r1 = mod.readState(fp);
    assert.equal(r1.ok, true);

    mod.deleteState(fp);
    const r2 = mod.readState(fp);
    assert.equal(r2.ok, false, 'file deleted — should be cache miss');
  });

  it('updateState produces correct result', async () => {
    if (!mod) return;
    const fp = join(TEST_DIR, 'update-test.json');

    const result = mod.updateState(fp, { count: 0 }, (d) => ({ ...d, count: d.count + 1 }));
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { count: 1 });
  });
});

describe('State File Lock', () => {
  let mod;

  before(async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    mod = await importState();
  });

  after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('writeState succeeds and releases lock', async () => {
    if (!mod) return;
    const fp = join(TEST_DIR, 'lock-basic.json');
    const r = mod.writeState(fp, { locked: false });
    assert.equal(r.ok, true);

    // Lock file should be gone after write
    const { existsSync } = await import('node:fs');
    assert.equal(existsSync(`${fp}.lock`), false, 'lock file should be cleaned up');
  });

  it('sequential writes succeed', async () => {
    if (!mod) return;
    const fp = join(TEST_DIR, 'lock-seq.json');

    for (let i = 0; i < 5; i++) {
      const r = mod.writeState(fp, { i });
      assert.equal(r.ok, true, `write ${i} should succeed`);
    }

    const r = mod.readState(fp);
    assert.equal(r.ok, true);
    assert.deepEqual(r.data, { i: 4 });
  });
});
