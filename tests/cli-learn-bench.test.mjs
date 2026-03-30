import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('aing-bench', async () => {
  const { benchmark, runBenchSuite, formatBenchResults } = await import('../scripts/cli/aing-bench.mjs');

  it('benchmark returns timing stats', () => {
    const result = benchmark('noop', () => {}, 50);
    assert.equal(result.name, 'noop');
    assert.equal(result.iterations, 50);
    assert.ok(result.p50 >= 0);
    assert.ok(result.p95 >= result.p50);
    assert.ok(result.avg >= 0);
  });

  it('runBenchSuite runs multiple benchmarks', () => {
    const suite = [
      { name: 'a', fn: () => {}, iterations: 10 },
      { name: 'b', fn: () => Math.random(), iterations: 10 },
    ];
    const results = runBenchSuite(suite);
    assert.equal(results.length, 2);
  });

  it('formatBenchResults produces readable output', () => {
    const results = [benchmark('test', () => {}, 10)];
    const out = formatBenchResults(results);
    assert.ok(out.includes('test'));
    assert.ok(out.includes('p50='));
  });
});

describe('aing-learn', async () => {
  // Note: these tests use the real LEARNINGS_DIR (~/.aing/learnings/)
  // We test with a unique slug to avoid polluting real data
  const slug = 'test-learn-' + Date.now();
  const { listLearnings, searchLearnings, addLearning, pruneLearnings, getStats } = await import('../scripts/cli/aing-learn.mjs');

  it('listLearnings returns empty for new slug', () => {
    const result = listLearnings(slug);
    assert.deepEqual(result, []);
  });

  it('addLearning creates entry with defaults', () => {
    const entry = addLearning(slug, { pattern: 'test pattern', context: 'test context' });
    assert.equal(entry.confidence, 7);
    assert.equal(entry.source, 'user');
    assert.ok(entry.ts);
  });

  it('listLearnings returns added entries', () => {
    const result = listLearnings(slug);
    assert.equal(result.length, 1);
    assert.equal(result[0].pattern, 'test pattern');
  });

  it('searchLearnings finds by pattern', () => {
    addLearning(slug, { pattern: 'auth bug', context: 'login flow' });
    const result = searchLearnings(slug, 'auth');
    assert.ok(result.length > 0);
  });

  it('searchLearnings returns empty for no match', () => {
    const result = searchLearnings(slug, 'zzzznonexistent');
    assert.equal(result.length, 0);
  });

  it('getStats counts entries', () => {
    const stats = getStats(slug);
    assert.ok(stats.total >= 2);
    assert.ok(stats.bySource.user >= 1);
  });

  it('pruneLearnings keeps user entries', () => {
    const result = pruneLearnings(slug, 0); // maxAge=0 prunes everything except user
    assert.ok(result.pruned === 0); // all entries are 'user' source, so none pruned
  });

  // Cleanup
  it('cleanup test data', async () => {
    const { homedir } = await import('node:os');
    const { unlinkSync } = await import('node:fs');
    const file = join(homedir(), '.aing', 'learnings', `${slug}.jsonl`);
    if (existsSync(file)) unlinkSync(file);
  });
});
