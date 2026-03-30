/**
 * Unit tests for scripts/ship/changelog-gen.ts
 * Covers: parseCommitMessage, generateChangelog, prependChangelog, getCommitsSince
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('../../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  parseCommitMessage,
  generateChangelog,
  prependChangelog,
  getCommitsSince,
} from '../../../scripts/ship/changelog-gen.js';

const mockExecSync = vi.mocked(execSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockExistsSync = vi.mocked(existsSync);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── parseCommitMessage ───────────────────────────────────────────────────

describe('parseCommitMessage', () => {
  it('parses feat commit', () => {
    expect(parseCommitMessage('feat: add login')).toEqual({
      type: 'feat', scope: null, description: 'add login',
    });
  });

  it('parses fix commit with scope', () => {
    expect(parseCommitMessage('fix(auth): token refresh')).toEqual({
      type: 'fix', scope: 'auth', description: 'token refresh',
    });
  });

  it('parses refactor commit', () => {
    expect(parseCommitMessage('refactor: simplify state')).toEqual({
      type: 'refactor', scope: null, description: 'simplify state',
    });
  });

  it('parses chore commit with scope', () => {
    expect(parseCommitMessage('chore(deps): update vitest')).toEqual({
      type: 'chore', scope: 'deps', description: 'update vitest',
    });
  });

  it('returns "other" for non-conventional commit', () => {
    expect(parseCommitMessage('Update README')).toEqual({
      type: 'other', scope: null, description: 'Update README',
    });
  });

  it('handles empty message', () => {
    expect(parseCommitMessage('')).toEqual({
      type: 'other', scope: null, description: '',
    });
  });

  it('handles commit with colon in description', () => {
    const result = parseCommitMessage('feat: support key: value pairs');
    expect(result.type).toBe('feat');
    expect(result.description).toBe('support key: value pairs');
  });
});

// ── getCommitsSince ──────────────────────────────────────────────────────

describe('getCommitsSince', () => {
  it('parses git log output into CommitEntry array', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (String(cmd).includes('describe --tags')) throw new Error('no tags');
      if (String(cmd).includes('git log')) {
        return 'abc1234|feat: add login|Alice|2025-01-01 10:00:00\ndef5678|fix: typo|Bob|2025-01-02 11:00:00';
      }
      return '';
    });

    const commits = getCommitsSince(null, '/tmp/cl-test');
    expect(commits).toHaveLength(2);
    expect(commits[0].hash).toBe('abc1234');
    expect(commits[0].message).toBe('feat: add login');
    expect(commits[0].author).toBe('Alice');
    expect(commits[1].hash).toBe('def5678');
  });

  it('returns empty array when no commits', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (String(cmd).includes('describe --tags')) throw new Error('no tags');
      if (String(cmd).includes('git log')) return '';
      return '';
    });

    expect(getCommitsSince(null, '/tmp/cl-test')).toEqual([]);
  });

  it('returns empty array on git error', () => {
    mockExecSync.mockImplementation(() => { throw new Error('not a git repo'); });

    expect(getCommitsSince(null, '/tmp/cl-test')).toEqual([]);
  });

  it('uses provided since ref', () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (String(cmd).includes('v1.0.0..HEAD')) return 'abc|msg|author|date';
      return '';
    });

    const commits = getCommitsSince('v1.0.0', '/tmp/cl-test');
    expect(commits).toHaveLength(1);
  });
});

// ── generateChangelog ────────────────────────────────────────────────────

describe('generateChangelog', () => {
  it('groups commits by category', () => {
    const commits = [
      { hash: 'abc', message: 'feat: add login', author: 'A', date: '2025-01-01' },
      { hash: 'def', message: 'fix: typo in README', author: 'B', date: '2025-01-02' },
      { hash: 'ghi', message: 'feat: add logout', author: 'A', date: '2025-01-03' },
    ];

    const output = generateChangelog('1.1.0', commits);
    expect(output).toContain('## 1.1.0');
    expect(output).toContain('### Features');
    expect(output).toContain('### Bug Fixes');
    expect(output).toContain('add login');
    expect(output).toContain('add logout');
    expect(output).toContain('typo in README');
  });

  it('includes commit hashes', () => {
    const commits = [
      { hash: 'abc1234', message: 'feat: something', author: 'A', date: '2025-01-01' },
    ];

    const output = generateChangelog('2.0.0', commits);
    expect(output).toContain('abc1234');
  });

  it('includes scope in bold when present', () => {
    const commits = [
      { hash: 'abc', message: 'fix(auth): token refresh', author: 'A', date: '2025-01-01' },
    ];

    const output = generateChangelog('1.0.1', commits);
    expect(output).toContain('**auth:**');
  });

  it('handles non-conventional commits as Other', () => {
    const commits = [
      { hash: 'xyz', message: 'Update dependencies', author: 'A', date: '2025-01-01' },
    ];

    const output = generateChangelog('1.0.0', commits);
    expect(output).toContain('### Other');
  });

  it('handles empty commits', () => {
    const output = generateChangelog('1.0.0', []);
    expect(output).toContain('## 1.0.0');
  });

  it('includes date in header', () => {
    const output = generateChangelog('3.0.0', []);
    const datePattern = /\d{4}-\d{2}-\d{2}/;
    expect(datePattern.test(output)).toBe(true);
  });
});

// ── prependChangelog ─────────────────────────────────────────────────────

describe('prependChangelog', () => {
  it('creates new CHANGELOG.md when none exists', () => {
    mockExistsSync.mockReturnValue(false);

    prependChangelog('## v1.0.0\n- feat: init', '/tmp/cl-test');

    expect(mockWriteFileSync).toHaveBeenCalled();
    const content = mockWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain('# Changelog');
    expect(content).toContain('## v1.0.0');
  });

  it('prepends to existing CHANGELOG with header', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('# Changelog\n\n## v0.9.0\n- old stuff');

    prependChangelog('## v1.0.0\n- new stuff', '/tmp/cl-test');

    const content = mockWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain('## v1.0.0');
    expect(content).toContain('## v0.9.0');
    // New version should appear before old
    expect(content.indexOf('v1.0.0')).toBeLessThan(content.indexOf('v0.9.0'));
  });

  it('adds header when existing file lacks one', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('## v0.1.0\n- initial');

    prependChangelog('## v0.2.0\n- update', '/tmp/cl-test');

    const content = mockWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain('# Changelog');
  });
});
