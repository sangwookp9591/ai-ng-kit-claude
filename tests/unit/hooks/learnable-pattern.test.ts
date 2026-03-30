/**
 * Unit tests for detectLearnablePattern (post-tool-use enhancement)
 * TDD: RED -> GREEN -> REFACTOR
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../scripts/core/state.js', () => ({
  readStateOrDefault: vi.fn(),
  writeState: vi.fn(),
}));

import { readStateOrDefault, writeState } from '../../../scripts/core/state.js';
import {
  detectLearnablePattern,
  recordPatternUse,
  type LearnablePattern,
  type PatternStore,
} from '../../../scripts/hooks/learnable-pattern.js';

const mockReadStateOrDefault = vi.mocked(readStateOrDefault);
const mockWriteState = vi.mocked(writeState);

beforeEach(() => {
  vi.resetAllMocks();
  mockWriteState.mockReturnValue({ ok: true });
});

// ---------------------------------------------------------------------------
// detectLearnablePattern — command type
// ---------------------------------------------------------------------------
describe('detectLearnablePattern — command', () => {
  it('returns null when bash command count is below threshold', () => {
    const store: PatternStore = { patterns: [] };
    mockReadStateOrDefault.mockReturnValue(store);

    const result = detectLearnablePattern(
      '/project',
      'Bash',
      { command: 'npm run test' },
      'ok'
    );
    expect(result).toBeNull();
  });

  it('detects repeated bash command after 3 uses', () => {
    const existing: PatternStore = {
      patterns: [
        { type: 'command', pattern: 'npm run test', count: 2, firstSeen: '2026-01-01T00:00:00Z', lastSeen: '2026-01-01T00:00:00Z' },
      ],
    };
    mockReadStateOrDefault.mockReturnValue(existing);

    const result = detectLearnablePattern(
      '/project',
      'Bash',
      { command: 'npm run test' },
      'ok'
    );
    expect(result).not.toBeNull();
    expect(result?.type).toBe('command');
    expect(result?.pattern).toBe('npm run test');
    expect(result?.suggestion).toContain('alias');
  });

  it('extracts base command (strips arguments)', () => {
    const existing: PatternStore = {
      patterns: [
        { type: 'command', pattern: 'git log', count: 2, firstSeen: '2026-01-01T00:00:00Z', lastSeen: '2026-01-01T00:00:00Z' },
      ],
    };
    mockReadStateOrDefault.mockReturnValue(existing);

    const result = detectLearnablePattern(
      '/project',
      'Bash',
      { command: 'git log --oneline -10' },
      'ok'
    );
    expect(result?.pattern).toBe('git log');
  });
});

// ---------------------------------------------------------------------------
// detectLearnablePattern — file pattern type
// ---------------------------------------------------------------------------
describe('detectLearnablePattern — filePattern', () => {
  it('returns null for first Glob use', () => {
    mockReadStateOrDefault.mockReturnValue({ patterns: [] });

    const result = detectLearnablePattern(
      '/project',
      'Glob',
      { pattern: '**/*.test.ts' },
      '5 files'
    );
    expect(result).toBeNull();
  });

  it('detects repeated glob pattern after 3 uses', () => {
    const existing: PatternStore = {
      patterns: [
        { type: 'filePattern', pattern: '**/*.test.ts', count: 2, firstSeen: '2026-01-01T00:00:00Z', lastSeen: '2026-01-01T00:00:00Z' },
      ],
    };
    mockReadStateOrDefault.mockReturnValue(existing);

    const result = detectLearnablePattern(
      '/project',
      'Glob',
      { pattern: '**/*.test.ts' },
      '5 files'
    );
    expect(result?.type).toBe('filePattern');
    expect(result?.suggestion).toContain('common');
  });
});

// ---------------------------------------------------------------------------
// detectLearnablePattern — errorFix type
// ---------------------------------------------------------------------------
describe('detectLearnablePattern — errorFix', () => {
  it('returns null when tool succeeded without prior error', () => {
    mockReadStateOrDefault.mockReturnValue({ patterns: [] });

    const result = detectLearnablePattern(
      '/project',
      'Bash',
      { command: 'npm test' },
      'PASS all tests'
    );
    expect(result).toBeNull();
  });

  it('detects error->fix pattern when prior attempt failed and current succeeded', () => {
    // Prior state has an error cycle in progress for the same command
    const existing: PatternStore = {
      patterns: [
        {
          type: 'errorFix',
          pattern: 'npm test',
          count: 1,
          firstSeen: '2026-01-01T00:00:00Z',
          lastSeen: '2026-01-01T00:00:00Z',
          pendingError: 'Error: Cannot find module',
        },
      ],
    };
    mockReadStateOrDefault.mockReturnValue(existing);

    const result = detectLearnablePattern(
      '/project',
      'Bash',
      { command: 'npm test' },
      'PASS all tests'
    );
    expect(result?.type).toBe('errorFix');
    expect(result?.suggestion).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// recordPatternUse
// ---------------------------------------------------------------------------
describe('recordPatternUse', () => {
  it('creates new pattern entry on first use', () => {
    mockReadStateOrDefault.mockReturnValue({ patterns: [] });

    recordPatternUse('/project', 'command', 'npm run build');

    const [, data] = mockWriteState.mock.calls[0];
    const store = data as PatternStore;
    expect(store.patterns).toHaveLength(1);
    expect(store.patterns[0].count).toBe(1);
    expect(store.patterns[0].type).toBe('command');
  });

  it('increments count and updates lastSeen on repeated use', () => {
    const existing: PatternStore = {
      patterns: [
        { type: 'command', pattern: 'npm run build', count: 1, firstSeen: '2026-01-01T00:00:00Z', lastSeen: '2026-01-01T00:00:00Z' },
      ],
    };
    mockReadStateOrDefault.mockReturnValue(existing);

    recordPatternUse('/project', 'command', 'npm run build');

    const [, data] = mockWriteState.mock.calls[0];
    const store = data as PatternStore;
    expect(store.patterns[0].count).toBe(2);
  });

  it('writes to correct path', () => {
    mockReadStateOrDefault.mockReturnValue({ patterns: [] });

    recordPatternUse('/my/project', 'command', 'tsc');

    const [filePath] = mockWriteState.mock.calls[0];
    expect(filePath).toBe('/my/project/.aing/state/learned-patterns.json');
  });

  it('caps pattern store at 200 entries', () => {
    const many: LearnablePattern[] = Array.from({ length: 200 }, (_, i) => ({
      type: 'command' as const,
      pattern: `cmd-${i}`,
      count: 1,
      firstSeen: '2026-01-01T00:00:00Z',
      lastSeen: '2026-01-01T00:00:00Z',
    }));
    mockReadStateOrDefault.mockReturnValue({ patterns: many });

    recordPatternUse('/project', 'command', 'new-cmd');

    const [, data] = mockWriteState.mock.calls[0];
    const store = data as PatternStore;
    expect(store.patterns.length).toBeLessThanOrEqual(200);
  });
});
