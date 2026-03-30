/**
 * Unit tests for scripts/ship/pr-creator.ts
 * Covers: generateTitle, generateBody, buildPRCommand, isGhAvailable
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import {
  generateTitle,
  generateBody,
  buildPRCommand,
  isGhAvailable,
} from '../../../scripts/ship/pr-creator.js';

const mockExecSync = vi.mocked(execSync);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── generateTitle ────────────────────────────────────────────────────────

describe('generateTitle', () => {
  it('generates feat prefix for minor bump', () => {
    const title = generateTitle('auth-flow', '1.1.0', 'minor');
    expect(title).toBe('feat: auth-flow (v1.1.0)');
  });

  it('generates feat prefix for major bump', () => {
    const title = generateTitle('breaking-change', '2.0.0', 'major');
    expect(title).toBe('feat: breaking-change (v2.0.0)');
  });

  it('generates fix prefix for patch bump', () => {
    const title = generateTitle('typo-fix', '1.0.1', 'patch');
    expect(title).toBe('fix: typo-fix (v1.0.1)');
  });

  it('truncates long titles to 70 chars', () => {
    const longFeature = 'this-is-a-very-long-feature-name-that-exceeds-the-seventy-character-limit';
    const title = generateTitle(longFeature, '1.0.0', 'minor');
    expect(title.length).toBeLessThanOrEqual(70);
    expect(title).toContain('...');
  });

  it('does not truncate short titles', () => {
    const title = generateTitle('short', '1.0.0', 'patch');
    expect(title).not.toContain('...');
    expect(title.length).toBeLessThanOrEqual(70);
  });
});

// ── generateBody ─────────────────────────────────────────────────────────

describe('generateBody', () => {
  it('generates body with summary section', () => {
    const body = generateBody({ feature: 'auth' });
    expect(body).toContain('## Summary');
  });

  it('includes changelog when provided', () => {
    const body = generateBody({
      feature: 'auth',
      changelog: '## v1.0.0\n- feat: add login',
    });
    expect(body).toContain('## v1.0.0');
    expect(body).toContain('add login');
  });

  it('includes review dashboard when provided', () => {
    const body = generateBody({
      feature: 'auth',
      reviewDashboard: {
        verdict: 'CLEARED',
        verdictReason: 'All checks passed',
        rows: [
          { label: 'Eng Review', status: 'CLEAR', runs: 2 },
        ],
      },
    });
    expect(body).toContain('## Review Status');
    expect(body).toContain('CLEARED');
    expect(body).toContain('Eng Review');
    expect(body).toContain('2 runs');
  });

  it('includes evidence when provided', () => {
    const body = generateBody({
      feature: 'auth',
      evidence: 'All tests pass: 42/42',
    });
    expect(body).toContain('## Evidence');
    expect(body).toContain('All tests pass');
  });

  it('always includes test plan section', () => {
    const body = generateBody({ feature: 'minimal' });
    expect(body).toContain('## Test Plan');
    expect(body).toContain('All existing tests pass');
  });

  it('handles empty context', () => {
    const body = generateBody({ feature: '' });
    expect(body).toContain('## Summary');
    expect(body).toContain('## Test Plan');
  });
});

// ── buildPRCommand ───────────────────────────────────────────────────────

describe('buildPRCommand', () => {
  it('generates gh pr create command', () => {
    const cmd = buildPRCommand('feat: auth', 'PR body here');
    expect(cmd).toContain('gh pr create');
    expect(cmd).toContain('feat: auth');
    expect(cmd).toContain('PR body here');
  });

  it('includes base branch when specified', () => {
    const cmd = buildPRCommand('title', 'body', 'develop');
    expect(cmd).toContain('--base develop');
  });

  it('omits base flag when not specified', () => {
    const cmd = buildPRCommand('title', 'body');
    expect(cmd).not.toContain('--base');
  });

  it('escapes double quotes in title', () => {
    const cmd = buildPRCommand('feat: add "quotes"', 'body');
    expect(cmd).toContain('\\"quotes\\"');
  });
});

// ── isGhAvailable ────────────────────────────────────────────────────────

describe('isGhAvailable', () => {
  it('returns true when gh is found', () => {
    mockExecSync.mockReturnValue('/usr/local/bin/gh');
    expect(isGhAvailable()).toBe(true);
  });

  it('returns false when gh is not found', () => {
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });
    expect(isGhAvailable()).toBe(false);
  });
});
