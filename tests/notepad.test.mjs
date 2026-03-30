import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '.test-notepad-tmp');

async function importNotepad() {
  try {
    return await import('../dist/scripts/memory/notepad.js');
  } catch {
    return null;
  }
}

describe('Notepad — readNotepad', () => {
  let mod;
  before(async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    mod = await importNotepad();
    if (!mod) console.warn('SKIP: dist/scripts/memory/notepad.js not found — run tsc first');
  });
  after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('returns empty tiers when file is missing', async () => {
    if (!mod) return;
    const notepad = await mod.readNotepad(TEST_DIR);
    assert.deepEqual(notepad, { priority: [], working: [], manual: [] });
  });
});

describe('Notepad — writePriority', () => {
  let mod;
  const dir = join(TEST_DIR, 'priority');
  before(async () => {
    mkdirSync(dir, { recursive: true });
    mod = await importNotepad();
  });

  it('writes and reads back a priority entry', async () => {
    if (!mod) return;
    await mod.writePriority('test priority note', dir);
    const notepad = await mod.readNotepad(dir);
    assert.equal(notepad.priority.length, 1);
    assert.equal(notepad.priority[0].content, 'test priority note');
  });

  it('throws when content exceeds 500 chars', async () => {
    if (!mod) return;
    const long = 'x'.repeat(501);
    await assert.rejects(() => mod.writePriority(long, dir), /500 character limit/);
  });

  it('caps priority entries at 10 (drops oldest)', async () => {
    if (!mod) return;
    const capDir = join(TEST_DIR, 'priority-cap');
    mkdirSync(capDir, { recursive: true });
    for (let i = 0; i < 12; i++) {
      await mod.writePriority(`note ${i}`, capDir);
    }
    const notepad = await mod.readNotepad(capDir);
    assert.equal(notepad.priority.length, 10);
    assert.equal(notepad.priority[0].content, 'note 2');
    assert.equal(notepad.priority[9].content, 'note 11');
  });
});

describe('Notepad — writeWorking', () => {
  let mod;
  const dir = join(TEST_DIR, 'working');
  before(async () => {
    mkdirSync(dir, { recursive: true });
    mod = await importNotepad();
  });

  it('writes and reads back a working entry', async () => {
    if (!mod) return;
    await mod.writeWorking('working context note', dir);
    const notepad = await mod.readNotepad(dir);
    assert.equal(notepad.working.length, 1);
    assert.equal(notepad.working[0].content, 'working context note');
  });
});

describe('Notepad — writeManual', () => {
  let mod;
  const dir = join(TEST_DIR, 'manual');
  before(async () => {
    mkdirSync(dir, { recursive: true });
    mod = await importNotepad();
  });

  it('writes and reads back a manual entry', async () => {
    if (!mod) return;
    await mod.writeManual('manual permanent note', dir);
    const notepad = await mod.readNotepad(dir);
    assert.equal(notepad.manual.length, 1);
    assert.equal(notepad.manual[0].content, 'manual permanent note');
  });
});

describe('Notepad — pruneWorking', () => {
  let mod;
  const dir = join(TEST_DIR, 'prune');
  before(async () => {
    mkdirSync(dir, { recursive: true });
    mod = await importNotepad();
  });

  it('returns 0 when no entries are stale', async () => {
    if (!mod) return;
    await mod.writeWorking('fresh note', dir);
    const removed = await mod.pruneWorking(dir);
    assert.equal(removed, 0);
  });

  it('removes entries with old createdAt timestamps', async () => {
    if (!mod) return;
    const staleDir = join(TEST_DIR, 'prune-stale');
    mkdirSync(staleDir, { recursive: true });
    // Write a fresh entry first
    await mod.writeWorking('fresh', staleDir);
    // Manually inject a stale entry by writing raw state
    const { writeState } = await import('../dist/scripts/core/state.js');
    const notepadPath = join(staleDir, '.aing', 'notepad.json');
    const notepad = await mod.readNotepad(staleDir);
    const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    notepad.working.push({ content: 'stale note', createdAt: staleDate, updatedAt: staleDate });
    writeState(notepadPath, notepad);

    const removed = await mod.pruneWorking(staleDir);
    assert.equal(removed, 1);
    const after = await mod.readNotepad(staleDir);
    assert.equal(after.working.length, 1);
    assert.equal(after.working[0].content, 'fresh');
  });
});

describe('Notepad — getNotepadSummary', () => {
  let mod;
  const dir = join(TEST_DIR, 'summary');
  before(async () => {
    mkdirSync(dir, { recursive: true });
    mod = await importNotepad();
  });

  it('returns empty string when notepad is empty', async () => {
    if (!mod) return;
    const summary = await mod.getNotepadSummary(dir);
    assert.equal(summary, '');
  });

  it('includes priority notes in summary', async () => {
    if (!mod) return;
    const summaryDir = join(TEST_DIR, 'summary-with-data');
    mkdirSync(summaryDir, { recursive: true });
    await mod.writePriority('important context', summaryDir);
    await mod.writeManual('manual ref', summaryDir);
    const summary = await mod.getNotepadSummary(summaryDir);
    assert.ok(summary.includes('Priority Notes'), `Expected "Priority Notes" in: ${summary}`);
    assert.ok(summary.includes('important context'), `Expected content in: ${summary}`);
    assert.ok(summary.includes('Manual Notes'), `Expected "Manual Notes" in: ${summary}`);
  });
});
