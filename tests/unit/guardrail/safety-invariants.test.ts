/**
 * Unit tests for scripts/guardrail/safety-invariants.ts
 * Covers: loadInvariants, checkStepLimit, checkFileChangeLimit,
 *         checkForbiddenPath, checkErrorLimit, resetErrorCount, resetTrackers, getTrackerStatus
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let invariantStore: Record<string, unknown> = {};

vi.mock('../../../scripts/core/state.js', () => ({
  readStateOrDefault: vi.fn((path: string, defaultVal: unknown) => {
    return invariantStore[path] ?? JSON.parse(JSON.stringify(defaultVal));
  }),
  writeState: vi.fn((path: string, data: unknown) => {
    invariantStore[path] = JSON.parse(JSON.stringify(data));
    return { ok: true };
  }),
  updateState: vi.fn((path: string, defaultVal: unknown, mutator: (data: unknown) => unknown) => {
    const current = invariantStore[path] ?? (typeof defaultVal === 'function' ? (defaultVal as () => unknown)() : JSON.parse(JSON.stringify(defaultVal)));
    const updated = mutator(JSON.parse(JSON.stringify(current)));
    invariantStore[path] = updated;
    return { ok: true, data: updated };
  }),
}));

vi.mock('../../../scripts/core/config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  getConfig: vi.fn((_path: string, fallback: unknown) => fallback),
  resetConfigCache: vi.fn(),
}));

vi.mock('../../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

import {
  loadInvariants,
  checkStepLimit,
  checkFileChangeLimit,
  checkForbiddenPath,
  checkErrorLimit,
  resetErrorCount,
  resetTrackers,
  getTrackerStatus,
} from '../../../scripts/guardrail/safety-invariants.js';
import { getConfig } from '../../../scripts/core/config.js';

beforeEach(() => {
  vi.clearAllMocks();
  invariantStore = {};
  vi.mocked(getConfig).mockImplementation((_path: string, fallback: unknown) => fallback);
});

// ── loadInvariants ───────────────────────────────────────────────────────

describe('loadInvariants', () => {
  it('returns defaults when no config', () => {
    const inv = loadInvariants();
    expect(inv.maxSteps).toBe(50);
    expect(inv.maxFileChanges).toBe(20);
    expect(inv.maxSessionMinutes).toBe(120);
    expect(inv.maxConsecutiveErrors).toBe(5);
    expect(inv.forbiddenPaths).toContain('/etc/');
    expect(inv.forbiddenPaths).toContain('/usr/');
  });

  it('merges user config with defaults', () => {
    vi.mocked(getConfig).mockImplementation((path: string, fallback: unknown) => {
      if (path === 'guardrail.invariants') return { maxSteps: 100 };
      return fallback;
    });

    const inv = loadInvariants();
    expect(inv.maxSteps).toBe(100);
    expect(inv.maxFileChanges).toBe(20); // default preserved
  });

  it('caps user config at hard max', () => {
    vi.mocked(getConfig).mockImplementation((path: string, fallback: unknown) => {
      if (path === 'guardrail.invariants') return { maxSteps: 999 };
      return fallback;
    });

    const inv = loadInvariants();
    expect(inv.maxSteps).toBe(200); // hard max
  });

  it('merges custom forbidden paths with defaults', () => {
    vi.mocked(getConfig).mockImplementation((path: string, fallback: unknown) => {
      if (path === 'guardrail.invariants') return { forbiddenPaths: ['/custom/path/'] };
      return fallback;
    });

    const inv = loadInvariants();
    expect(inv.forbiddenPaths).toContain('/custom/path/');
    expect(inv.forbiddenPaths).toContain('/etc/'); // defaults preserved
  });

  it('handles boolean config', () => {
    vi.mocked(getConfig).mockImplementation((path: string, fallback: unknown) => {
      if (path === 'guardrail.invariants') return { requireTestBeforeCommit: true };
      return fallback;
    });

    const inv = loadInvariants();
    expect(inv.requireTestBeforeCommit).toBe(true);
  });
});

// ── checkStepLimit ───────────────────────────────────────────────────────

describe('checkStepLimit', () => {
  it('returns ok for first step', () => {
    const result = checkStepLimit('/tmp/inv-test');
    expect(result.ok).toBe(true);
    expect(result.current).toBe(1);
    expect(result.max).toBe(50);
  });

  it('increments step count', () => {
    checkStepLimit('/tmp/inv-test');
    checkStepLimit('/tmp/inv-test');
    const result = checkStepLimit('/tmp/inv-test');
    expect(result.current).toBe(3);
  });

  it('returns not ok when limit exceeded', () => {
    // Set step count to 50
    const path = '/tmp/inv-test/.aing/state/invariants-tracker.json';
    invariantStore[path] = { steps: 50, fileChanges: 0, errors: 0 };

    const result = checkStepLimit('/tmp/inv-test');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Safety');
  });
});

// ── checkFileChangeLimit ─────────────────────────────────────────────────

describe('checkFileChangeLimit', () => {
  it('returns ok for first file change', () => {
    const result = checkFileChangeLimit('src/a.ts', '/tmp/inv-test');
    expect(result.ok).toBe(true);
    expect(result.current).toBe(1);
  });

  it('does not count duplicate file changes', () => {
    checkFileChangeLimit('src/a.ts', '/tmp/inv-test');
    checkFileChangeLimit('src/a.ts', '/tmp/inv-test');
    const result = checkFileChangeLimit('src/a.ts', '/tmp/inv-test');
    expect(result.current).toBe(1); // same file, counted once
  });

  it('counts distinct file changes', () => {
    checkFileChangeLimit('src/a.ts', '/tmp/inv-test');
    checkFileChangeLimit('src/b.ts', '/tmp/inv-test');
    const result = checkFileChangeLimit('src/c.ts', '/tmp/inv-test');
    expect(result.current).toBe(3);
  });

  it('returns not ok when limit exceeded', () => {
    const path = '/tmp/inv-test/.aing/state/invariants-tracker.json';
    invariantStore[path] = {
      steps: 0, fileChanges: 20, errors: 0,
      changedFiles: Array.from({ length: 20 }, (_, i) => `file${i}.ts`),
    };

    const result = checkFileChangeLimit('new-file.ts', '/tmp/inv-test');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Safety');
  });
});

// ── checkForbiddenPath ───────────────────────────────────────────────────

describe('checkForbiddenPath', () => {
  it('blocks /etc/ paths', () => {
    const result = checkForbiddenPath('/etc/passwd');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Safety');
  });

  it('blocks /usr/ paths', () => {
    const result = checkForbiddenPath('/usr/local/bin/app');
    expect(result.ok).toBe(false);
  });

  it('blocks /System/ paths', () => {
    const result = checkForbiddenPath('/System/Library/thing');
    expect(result.ok).toBe(false);
  });

  it('blocks ~/.ssh/ paths', () => {
    const result = checkForbiddenPath('~/.ssh/id_rsa');
    expect(result.ok).toBe(false);
  });

  it('blocks ~/.aws/credentials', () => {
    const result = checkForbiddenPath('~/.aws/credentials');
    expect(result.ok).toBe(false);
  });

  it('allows normal project paths', () => {
    const result = checkForbiddenPath('/home/user/project/src/index.ts');
    expect(result.ok).toBe(true);
  });

  it('allows relative paths', () => {
    const result = checkForbiddenPath('src/main.ts');
    expect(result.ok).toBe(true);
  });
});

// ── checkErrorLimit ──────────────────────────────────────────────────────

describe('checkErrorLimit', () => {
  it('returns ok for first error', () => {
    const result = checkErrorLimit('/tmp/inv-test');
    expect(result.ok).toBe(true);
    expect(result.current).toBe(1);
  });

  it('returns not ok when consecutive errors exceed limit', () => {
    const path = '/tmp/inv-test/.aing/state/invariants-tracker.json';
    invariantStore[path] = { steps: 0, fileChanges: 0, errors: 5 };

    const result = checkErrorLimit('/tmp/inv-test');
    expect(result.ok).toBe(false);
    expect(result.current).toBe(6);
    expect(result.max).toBe(5);
  });
});

// ── resetErrorCount ──────────────────────────────────────────────────────

describe('resetErrorCount', () => {
  it('resets error count to 0', () => {
    checkErrorLimit('/tmp/inv-test');
    checkErrorLimit('/tmp/inv-test');
    checkErrorLimit('/tmp/inv-test');

    resetErrorCount('/tmp/inv-test');

    const result = checkErrorLimit('/tmp/inv-test');
    expect(result.current).toBe(1); // just the new one
  });
});

// ── resetTrackers ────────────────────────────────────────────────────────

describe('resetTrackers', () => {
  it('resets all trackers', () => {
    checkStepLimit('/tmp/inv-test');
    checkFileChangeLimit('a.ts', '/tmp/inv-test');
    checkErrorLimit('/tmp/inv-test');

    resetTrackers('/tmp/inv-test');

    const status = getTrackerStatus('/tmp/inv-test');
    expect(status.steps).toBe('0/50');
    expect(status.fileChanges).toBe('0/20');
    expect(status.errors).toBe('0/5');
  });
});

// ── getTrackerStatus ─────────────────────────────────────────────────────

describe('getTrackerStatus', () => {
  it('returns formatted status', () => {
    checkStepLimit('/tmp/inv-test');
    checkStepLimit('/tmp/inv-test');

    const status = getTrackerStatus('/tmp/inv-test');
    expect(status.steps).toBe('2/50');
    expect(status.fileChanges).toContain('/20');
    expect(status.errors).toContain('/5');
  });

  it('returns zero status when no activity', () => {
    const status = getTrackerStatus('/tmp/inv-test');
    expect(status.steps).toBe('0/50');
  });

  it('includes changed files list', () => {
    checkFileChangeLimit('src/x.ts', '/tmp/inv-test');
    checkFileChangeLimit('src/y.ts', '/tmp/inv-test');

    const status = getTrackerStatus('/tmp/inv-test');
    expect(status.changedFiles).toContain('src/x.ts');
    expect(status.changedFiles).toContain('src/y.ts');
  });
});
