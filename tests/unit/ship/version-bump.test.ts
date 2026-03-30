/**
 * Unit tests for scripts/ship/version-bump.ts
 * Covers: parseVersion, determineBumpType, bumpVersion, readVersion
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  parseVersion,
  determineBumpType,
  bumpVersion,
  readVersion,
} from '../../../scripts/ship/version-bump.js';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── parseVersion ─────────────────────────────────────────────────────────

describe('parseVersion', () => {
  it('parses standard semver', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('handles v prefix', () => {
    expect(parseVersion('v2.0.1')).toEqual({ major: 2, minor: 0, patch: 1 });
  });

  it('handles whitespace', () => {
    expect(parseVersion(' 3.1.4 ')).toEqual({ major: 3, minor: 1, patch: 4 });
  });

  it('handles zero version', () => {
    expect(parseVersion('0.0.0')).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it('handles missing parts', () => {
    expect(parseVersion('1')).toEqual({ major: 1, minor: 0, patch: 0 });
  });

  it('handles two parts', () => {
    expect(parseVersion('1.2')).toEqual({ major: 1, minor: 2, patch: 0 });
  });

  it('handles non-numeric gracefully', () => {
    const result = parseVersion('abc');
    expect(result.major).toBe(0);
  });
});

// ── determineBumpType ────────────────────────────────────────────────────

describe('determineBumpType', () => {
  it('returns major for breaking changes', () => {
    expect(determineBumpType({ hasBreaking: true, hasNewFeature: false })).toBe('major');
  });

  it('returns minor for new features', () => {
    expect(determineBumpType({ hasBreaking: false, hasNewFeature: true })).toBe('minor');
  });

  it('returns patch for bug fixes only', () => {
    expect(determineBumpType({ hasBreaking: false, hasNewFeature: false, hasBugFix: true })).toBe('patch');
  });

  it('returns patch when no signals', () => {
    expect(determineBumpType({ hasBreaking: false, hasNewFeature: false })).toBe('patch');
  });

  it('breaking takes priority over feature', () => {
    expect(determineBumpType({ hasBreaking: true, hasNewFeature: true })).toBe('major');
  });

  it('feature takes priority over bug fix', () => {
    expect(determineBumpType({ hasBreaking: false, hasNewFeature: true, hasBugFix: true })).toBe('minor');
  });
});

// ── bumpVersion ──────────────────────────────────────────────────────────

describe('bumpVersion', () => {
  it('bumps patch from VERSION file', () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('VERSION'));
    mockReadFileSync.mockReturnValue('1.2.3');

    const result = bumpVersion('patch', '/tmp/bump-test');
    expect(result.oldVersion).toBe('1.2.3');
    expect(result.newVersion).toBe('1.2.4');
    expect(result.bumpType).toBe('patch');
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('VERSION'),
      '1.2.4\n'
    );
  });

  it('bumps minor and resets patch', () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('VERSION'));
    mockReadFileSync.mockReturnValue('2.3.5');

    const result = bumpVersion('minor', '/tmp/bump-test');
    expect(result.newVersion).toBe('2.4.0');
  });

  it('bumps major and resets minor and patch', () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('VERSION'));
    mockReadFileSync.mockReturnValue('1.9.8');

    const result = bumpVersion('major', '/tmp/bump-test');
    expect(result.newVersion).toBe('2.0.0');
  });

  it('reads from package.json when no VERSION file', () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('package.json'));
    mockReadFileSync.mockReturnValue('{"version": "3.0.0"}');

    const result = bumpVersion('patch', '/tmp/bump-test');
    expect(result.oldVersion).toBe('3.0.0');
    expect(result.newVersion).toBe('3.0.1');
    // Should not write to VERSION file (reads from package.json)
  });

  it('defaults to 0.0.0 when no version source exists', () => {
    mockExistsSync.mockReturnValue(false);

    const result = bumpVersion('patch', '/tmp/bump-test');
    expect(result.oldVersion).toBe('0.0.0');
    expect(result.newVersion).toBe('0.0.1');
  });
});

// ── readVersion ──────────────────────────────────────────────────────────

describe('readVersion', () => {
  it('reads from VERSION file', () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('VERSION'));
    mockReadFileSync.mockReturnValue('5.1.0\n');

    expect(readVersion('/tmp/rv-test')).toBe('5.1.0');
  });

  it('reads from package.json when no VERSION', () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('package.json'));
    mockReadFileSync.mockReturnValue('{"version":"2.0.0"}');

    expect(readVersion('/tmp/rv-test')).toBe('2.0.0');
  });

  it('returns 0.0.0 when nothing exists', () => {
    mockExistsSync.mockReturnValue(false);

    expect(readVersion('/tmp/rv-test')).toBe('0.0.0');
  });

  it('handles package.json without version field', () => {
    mockExistsSync.mockImplementation((p: unknown) => String(p).endsWith('package.json'));
    mockReadFileSync.mockReturnValue('{"name":"my-pkg"}');

    expect(readVersion('/tmp/rv-test')).toBe('0.0.0');
  });
});
