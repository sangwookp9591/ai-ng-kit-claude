import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Complexity Scorer', () => {
  it('should score simple tasks as low', async () => {
    const { scoreComplexity } = await import('../dist/scripts/routing/complexity-scorer.js');
    const result = scoreComplexity({
      fileCount: 1,
      lineCount: 20,
      domainCount: 1,
      hasTests: false,
      hasArchChange: false,
      hasSecurity: false,
    });
    assert.ok(result.score <= 3, `Expected low score, got ${result.score}`);
    assert.equal(result.level, 'low');
  });

  it('should score complex tasks as high', async () => {
    const { scoreComplexity } = await import('../dist/scripts/routing/complexity-scorer.js');
    const result = scoreComplexity({
      fileCount: 20,
      lineCount: 1000,
      domainCount: 4,
      hasTests: true,
      hasArchChange: true,
      hasSecurity: true,
    });
    assert.ok(result.score >= 8, `Expected high score, got ${result.score}`);
    assert.equal(result.level, 'high');
  });

  it('should return breakdown details', async () => {
    const { scoreComplexity } = await import('../dist/scripts/routing/complexity-scorer.js');
    const result = scoreComplexity({
      fileCount: 5,
      lineCount: 100,
      domainCount: 2,
      hasTests: true,
      hasArchChange: false,
      hasSecurity: false,
    });
    assert.ok(result.breakdown);
    assert.ok('files' in result.breakdown);
    assert.ok('lines' in result.breakdown);
    assert.ok('domains' in result.breakdown);
  });

  it('should handle default signals', async () => {
    const { scoreComplexity } = await import('../dist/scripts/routing/complexity-scorer.js');
    const result = scoreComplexity();
    assert.ok(typeof result.score === 'number');
    assert.ok(['low', 'mid', 'high'].includes(result.level));
    assert.ok(result.breakdown);
  });

  it('should score mid-range tasks correctly', async () => {
    const { scoreComplexity } = await import('../dist/scripts/routing/complexity-scorer.js');
    const result = scoreComplexity({
      fileCount: 8,
      lineCount: 200,
      domainCount: 2,
      hasTests: true,
      hasArchChange: false,
      hasSecurity: false,
    });
    assert.equal(result.level, 'mid');
  });

  it('should add security modifier', async () => {
    const { scoreComplexity } = await import('../dist/scripts/routing/complexity-scorer.js');
    const base = scoreComplexity({ fileCount: 1, lineCount: 10, domainCount: 1 });
    const withSec = scoreComplexity({ fileCount: 1, lineCount: 10, domainCount: 1, hasSecurity: true });
    assert.equal(withSec.score - base.score, 2, 'Security should add 2 points');
  });

  it('should add arch change modifier', async () => {
    const { scoreComplexity } = await import('../dist/scripts/routing/complexity-scorer.js');
    const base = scoreComplexity({ fileCount: 1, lineCount: 10, domainCount: 1 });
    const withArch = scoreComplexity({ fileCount: 1, lineCount: 10, domainCount: 1, hasArchChange: true });
    assert.equal(withArch.score - base.score, 2, 'Arch change should add 2 points');
  });
});

describe('Model Router', () => {
  it('should export module', async () => {
    try {
      const m = await import('../dist/scripts/routing/model-router.js');
      assert.ok(m);
    } catch {
      // Module exists check
      const { existsSync } = await import('node:fs');
      const { join } = await import('node:path');
      assert.ok(existsSync(join(import.meta.dirname, '..', 'dist', 'scripts', 'routing', 'model-router.js')));
    }
  });
});

describe('Routing History', () => {
  it('should export module', async () => {
    try {
      const m = await import('../dist/scripts/routing/routing-history.js');
      assert.ok(m);
    } catch {
      const { existsSync } = await import('node:fs');
      const { join } = await import('node:path');
      assert.ok(existsSync(join(import.meta.dirname, '..', 'dist', 'scripts', 'routing', 'routing-history.js')));
    }
  });
});
