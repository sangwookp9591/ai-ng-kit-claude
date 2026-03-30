/**
 * Unit tests for scripts/routing/complexity-scorer.ts
 * Covers: scoreComplexity with various signal combinations
 */
import { describe, it, expect } from 'vitest';

import { scoreComplexity } from '../../../scripts/routing/complexity-scorer.js';

// ---------------------------------------------------------------------------
// Default / empty signals
// ---------------------------------------------------------------------------
describe('scoreComplexity — defaults', () => {
  it('returns low complexity for empty signals', () => {
    const result = scoreComplexity();
    expect(result.level).toBe('low');
    expect(result.score).toBe(0);
    expect(result.breakdown).toEqual({ files: 0, lines: 0, domains: 0 });
  });

  it('returns low complexity for explicit empty object', () => {
    const result = scoreComplexity({});
    expect(result.level).toBe('low');
    expect(result.score).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// File count contribution (0-3)
// ---------------------------------------------------------------------------
describe('scoreComplexity — fileCount', () => {
  it('scores 0 for 1-2 files', () => {
    expect(scoreComplexity({ fileCount: 1 }).breakdown.files).toBe(0);
    expect(scoreComplexity({ fileCount: 2 }).breakdown.files).toBe(0);
  });

  it('scores 1 for 3-5 files', () => {
    expect(scoreComplexity({ fileCount: 3 }).breakdown.files).toBe(1);
    expect(scoreComplexity({ fileCount: 5 }).breakdown.files).toBe(1);
  });

  it('scores 2 for 6-15 files', () => {
    expect(scoreComplexity({ fileCount: 6 }).breakdown.files).toBe(2);
    expect(scoreComplexity({ fileCount: 15 }).breakdown.files).toBe(2);
  });

  it('scores 3 for >15 files', () => {
    expect(scoreComplexity({ fileCount: 16 }).breakdown.files).toBe(3);
    expect(scoreComplexity({ fileCount: 100 }).breakdown.files).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Line count contribution (0-3)
// ---------------------------------------------------------------------------
describe('scoreComplexity — lineCount', () => {
  it('scores 0 for <=30 lines', () => {
    expect(scoreComplexity({ lineCount: 10 }).breakdown.lines).toBe(0);
    expect(scoreComplexity({ lineCount: 30 }).breakdown.lines).toBe(0);
  });

  it('scores 1 for 31-100 lines', () => {
    expect(scoreComplexity({ lineCount: 31 }).breakdown.lines).toBe(1);
    expect(scoreComplexity({ lineCount: 100 }).breakdown.lines).toBe(1);
  });

  it('scores 2 for 101-500 lines', () => {
    expect(scoreComplexity({ lineCount: 101 }).breakdown.lines).toBe(2);
    expect(scoreComplexity({ lineCount: 500 }).breakdown.lines).toBe(2);
  });

  it('scores 3 for >500 lines', () => {
    expect(scoreComplexity({ lineCount: 501 }).breakdown.lines).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Domain count contribution (0-4)
// ---------------------------------------------------------------------------
describe('scoreComplexity — domainCount', () => {
  it('scores 0 for 1 domain', () => {
    expect(scoreComplexity({ domainCount: 1 }).breakdown.domains).toBe(0);
  });

  it('scores 2 for 2 domains', () => {
    expect(scoreComplexity({ domainCount: 2 }).breakdown.domains).toBe(2);
  });

  it('scores 3 for 3 domains', () => {
    expect(scoreComplexity({ domainCount: 3 }).breakdown.domains).toBe(3);
  });

  it('scores 4 for 4+ domains', () => {
    expect(scoreComplexity({ domainCount: 4 }).breakdown.domains).toBe(4);
    expect(scoreComplexity({ domainCount: 10 }).breakdown.domains).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Boolean modifiers
// ---------------------------------------------------------------------------
describe('scoreComplexity — boolean modifiers', () => {
  it('adds 1 for hasTests', () => {
    const result = scoreComplexity({ hasTests: true });
    expect(result.breakdown.tests).toBe(1);
  });

  it('adds 2 for hasArchChange', () => {
    const result = scoreComplexity({ hasArchChange: true });
    expect(result.breakdown.arch).toBe(2);
  });

  it('adds 2 for hasSecurity', () => {
    const result = scoreComplexity({ hasSecurity: true });
    expect(result.breakdown.security).toBe(2);
  });

  it('does not add modifiers when false/undefined', () => {
    const result = scoreComplexity({ hasTests: false });
    expect(result.breakdown.tests).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Level thresholds: low <= 3, mid 4-7, high >= 8
// ---------------------------------------------------------------------------
describe('scoreComplexity — level thresholds', () => {
  it('low: score <= 3', () => {
    // fileCount=5 (1) + lineCount=100 (1) + domainCount=1 (0) = 2
    expect(scoreComplexity({ fileCount: 5, lineCount: 100, domainCount: 1 }).level).toBe('low');
  });

  it('mid: score 4-7', () => {
    // fileCount=10 (2) + domainCount=2 (2) = 4
    expect(scoreComplexity({ fileCount: 10, domainCount: 2 }).level).toBe('mid');
  });

  it('boundary: score=3 is low', () => {
    // fileCount=16 (3) = 3
    expect(scoreComplexity({ fileCount: 16 }).level).toBe('low');
  });

  it('boundary: score=4 is mid', () => {
    // fileCount=16 (3) + hasTests (1) = 4
    expect(scoreComplexity({ fileCount: 16, hasTests: true }).level).toBe('mid');
  });

  it('boundary: score=7 is mid', () => {
    // fileCount=16 (3) + domainCount=2 (2) + hasArchChange (2) = 7
    expect(scoreComplexity({ fileCount: 16, domainCount: 2, hasArchChange: true }).level).toBe('mid');
  });

  it('high: score >= 8', () => {
    // fileCount=16 (3) + lineCount=501 (3) + hasArchChange (2) = 8
    expect(scoreComplexity({ fileCount: 16, lineCount: 501, hasArchChange: true }).level).toBe('high');
  });

  it('maximum possible score', () => {
    const result = scoreComplexity({
      fileCount: 100,  // 3
      lineCount: 1000, // 3
      domainCount: 5,  // 4
      hasTests: true,  // 1
      hasArchChange: true, // 2
      hasSecurity: true,   // 2
    });
    expect(result.score).toBe(15);
    expect(result.level).toBe('high');
  });
});
