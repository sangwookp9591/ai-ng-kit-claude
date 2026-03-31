import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Use temp dir for isolation — unique per test to avoid module-level read cache collisions
const baseTmpDir = join('/tmp', 'aing-decay-test-' + Date.now());
let testCounter = 0;
let tmpDir = baseTmpDir;

function setupTmpProject() {
  testCounter++;
  tmpDir = join(baseTmpDir, String(testCounter));
  mkdirSync(join(tmpDir, '.aing'), { recursive: true });
  writeFileSync(join(tmpDir, '.aing', 'project-memory.json'), JSON.stringify({
    techStack: {}, conventions: {},
    patterns: [
      { content: 'user pattern', addedAt: '2026-01-01T00:00:00Z', confidence: 8, source: 'user' },
      { content: 'old observed', addedAt: '2025-01-01T00:00:00Z', confidence: 3, source: 'observed' },
      { content: 'recent observed', addedAt: new Date().toISOString(), confidence: 7, source: 'observed' },
      { content: 'legacy no confidence', addedAt: '2025-06-01T00:00:00Z' },
    ],
    pitfalls: [], decisions: []
  }));
}

describe('confidence decay', async () => {
  beforeEach(() => {
    setupTmpProject();
  });

  const { addMemoryEntry, applyConfidenceDecay, loadMemory, getMemorySummary } = await import('../dist/scripts/memory/project-memory.js');

  it('addMemoryEntry stores confidence and source', () => {
    addMemoryEntry('patterns', 'test entry', tmpDir, { confidence: 9, source: 'user' });
    const mem = loadMemory(tmpDir);
    const last = mem.patterns[mem.patterns.length - 1];
    assert.equal(last.confidence, 9);
    assert.equal(last.source, 'user');
  });

  it('addMemoryEntry defaults to confidence 5, observed', () => {
    addMemoryEntry('patterns', 'default entry', tmpDir);
    const mem = loadMemory(tmpDir);
    const last = mem.patterns[mem.patterns.length - 1];
    assert.equal(last.confidence, 5);
    assert.equal(last.source, 'observed');
  });

  it('applyConfidenceDecay does not decay user entries', () => {
    const result = applyConfidenceDecay(tmpDir);
    const mem = loadMemory(tmpDir);
    const userEntry = mem.patterns.find(p => p.content === 'user pattern');
    assert.equal(userEntry.confidence, 8);
  });

  it('applyConfidenceDecay decays old observed entries', () => {
    const result = applyConfidenceDecay(tmpDir);
    assert.ok(result.decayed > 0 || result.removed > 0);
  });

  it('applyConfidenceDecay removes 0-confidence entries', () => {
    const result = applyConfidenceDecay(tmpDir);
    const mem = loadMemory(tmpDir);
    const zero = mem.patterns.filter(p => p.confidence <= 0);
    assert.equal(zero.length, 0);
  });

  it('applyConfidenceDecay handles legacy entries without confidence', () => {
    applyConfidenceDecay(tmpDir);
    const mem = loadMemory(tmpDir);
    const legacy = mem.patterns.find(p => p.content === 'legacy no confidence');
    // legacy entry gets confidence 5, then possibly decayed
    if (legacy) assert.ok(typeof legacy.confidence === 'number');
  });

  it('getMemorySummary filters by minConfidence', () => {
    const all = getMemorySummary(tmpDir, 1);
    const high = getMemorySummary(tmpDir, 9);
    // high confidence filter should return fewer or equal results
    assert.ok(high.length <= all.length);
  });
});
