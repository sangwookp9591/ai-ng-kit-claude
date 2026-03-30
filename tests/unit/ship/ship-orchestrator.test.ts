/**
 * Unit tests for scripts/ship/ship-orchestrator.ts
 * Covers: executeShipPipeline — preflight, merge-base, tests, review, version, changelog, PR
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
}));

vi.mock('../../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

vi.mock('../../../scripts/ship/ship-engine.js', () => ({
  initShip: vi.fn(),
  advanceStep: vi.fn(),
  getShipState: vi.fn(() => ({
    feature: 'test-feature',
    branch: 'feature/test',
    baseBranch: 'main',
    currentStep: 0,
    status: 'in_progress',
    stepResults: [],
    startedAt: new Date().toISOString(),
  })),
}));

vi.mock('../../../scripts/ship/version-bump.js', () => ({
  determineBumpType: vi.fn(({ hasBreaking, hasNewFeature }: { hasBreaking: boolean; hasNewFeature: boolean }) => {
    if (hasBreaking) return 'major';
    if (hasNewFeature) return 'minor';
    return 'patch';
  }),
  bumpVersion: vi.fn(() => ({ oldVersion: '1.0.0', newVersion: '1.0.1', bumpType: 'patch' })),
  readVersion: vi.fn(() => '1.0.0'),
}));

vi.mock('../../../scripts/ship/changelog-gen.js', () => ({
  getCommitsSince: vi.fn(() => [
    { hash: 'abc123', message: 'feat: add login', type: 'feat' },
    { hash: 'def456', message: 'fix: typo', type: 'fix' },
  ]),
  generateChangelog: vi.fn(() => '## v1.0.1\n- feat: add login\n- fix: typo'),
  prependChangelog: vi.fn(),
}));

vi.mock('../../../scripts/ship/pr-creator.js', () => ({
  generateTitle: vi.fn(() => 'feat: test-feature v1.0.1'),
  generateBody: vi.fn(() => 'PR body content'),
  isGhAvailable: vi.fn(() => true),
}));

vi.mock('../../../scripts/review/review-dashboard.js', () => ({
  buildDashboard: vi.fn(() => ({
    verdict: 'CLEARED',
    verdictReason: 'All checks passed',
  })),
}));

vi.mock('../../../scripts/evidence/evidence-chain.js', () => ({
  evaluateChain: vi.fn(() => ({ verdict: 'PASS', summary: 'All pass' })),
}));

vi.mock('../../../scripts/telemetry/telemetry-engine.js', () => ({
  logSkillUsage: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { executeShipPipeline } from '../../../scripts/ship/ship-orchestrator.js';
import { initShip, advanceStep, getShipState } from '../../../scripts/ship/ship-engine.js';
import { determineBumpType } from '../../../scripts/ship/version-bump.js';
import { evaluateChain } from '../../../scripts/evidence/evidence-chain.js';
import { buildDashboard } from '../../../scripts/review/review-dashboard.js';
import { isGhAvailable } from '../../../scripts/ship/pr-creator.js';

const mockExecSync = vi.mocked(execSync);

beforeEach(() => {
  vi.clearAllMocks();
  // Restore default mock return values (tests may override these)
  vi.mocked(evaluateChain).mockReturnValue({ verdict: 'PASS', summary: 'All pass', entries: [] });
  vi.mocked(buildDashboard).mockReturnValue({ verdict: 'CLEARED', verdictReason: 'All checks passed' } as ReturnType<typeof buildDashboard>);
  vi.mocked(isGhAvailable).mockReturnValue(true);
  vi.mocked(initShip).mockImplementation(() => undefined as unknown as ReturnType<typeof initShip>);
  // Default: all git commands succeed
  mockExecSync.mockImplementation((cmd: string) => {
    const cmdStr = String(cmd);
    if (cmdStr.includes('branch --show-current')) return 'feature/test';
    if (cmdStr.includes('rev-parse --verify origin/main')) return 'abc123';
    if (cmdStr.includes('status --porcelain')) return '';
    if (cmdStr.includes('git fetch')) return '';
    if (cmdStr.includes('git merge')) return '';
    if (cmdStr.includes('git log')) return 'abc123 feat: add login\ndef456 fix: typo';
    if (cmdStr.includes('git diff')) return '';
    if (cmdStr.includes('git add') || cmdStr.includes('git commit') || cmdStr.includes('git push')) return '';
    if (cmdStr.includes('gh pr create')) return 'https://github.com/owner/repo/pull/42';
    if (cmdStr.includes('npm test') || cmdStr.includes('node --test')) return 'Tests: 10 passed, 0 failed';
    return '';
  });
});

// ── Preflight ────────────────────────────────────────────────────────────

describe('executeShipPipeline — preflight', () => {
  it('fails when on base branch', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (String(cmd).includes('branch --show-current')) return 'main';
      if (String(cmd).includes('rev-parse --verify origin/main')) return 'abc';
      if (String(cmd).includes('status --porcelain')) return '';
      return '';
    });

    const result = await executeShipPipeline({
      feature: 'test',
      baseBranch: 'main',
      projectDir: '/tmp/ship-test-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('feature branch');
  });

  it('fails when uncommitted changes exist', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (String(cmd).includes('branch --show-current')) return 'feature/x';
      if (String(cmd).includes('rev-parse --verify origin/main')) return 'abc';
      if (String(cmd).includes('status --porcelain')) return 'M src/index.ts\nA new-file.ts';
      return '';
    });

    const result = await executeShipPipeline({
      feature: 'x',
      baseBranch: 'main',
      projectDir: '/tmp/ship-test-2',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Uncommitted');
  });

  it('fails when evidence chain is FAIL', async () => {
    vi.mocked(evaluateChain).mockReturnValue({
      verdict: 'FAIL',
      summary: 'test failed',
      entries: [],
    });

    const result = await executeShipPipeline({
      feature: 'broken',
      baseBranch: 'main',
      projectDir: '/tmp/ship-test-3',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Evidence chain');
  });

  it('fails when review dashboard is not CLEARED', async () => {
    vi.mocked(buildDashboard).mockReturnValue({
      verdict: 'BLOCKED',
      verdictReason: 'Critical issues',
    } as unknown as ReturnType<typeof buildDashboard>);

    const result = await executeShipPipeline({
      feature: 'blocked',
      baseBranch: 'main',
      projectDir: '/tmp/ship-test-4',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Review dashboard');
  });
});

// ── Merge base ───────────────────────────────────────────────────────────

describe('executeShipPipeline — merge base', () => {
  it('skips merge in dry-run mode', async () => {
    const result = await executeShipPipeline({
      feature: 'test',
      baseBranch: 'main',
      dryRun: true,
      projectDir: '/tmp/ship-test-5',
    });

    expect(result.success).toBe(true);
    // Should not call git merge in dry-run
    const mergeCalls = mockExecSync.mock.calls.filter(c => String(c[0]).includes('git merge'));
    expect(mergeCalls).toHaveLength(0);
  });

  it('fails on merge conflict', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('branch --show-current')) return 'feature/x';
      if (cmdStr.includes('rev-parse --verify origin/main')) return 'abc';
      if (cmdStr.includes('git merge origin/')) throw new Error('CONFLICT');
      if (cmdStr.includes('status --porcelain') && mockExecSync.mock.calls.length > 3) return 'UU src/file.ts';
      if (cmdStr.includes('status --porcelain')) return '';
      if (cmdStr.includes('git fetch')) return '';
      if (cmdStr.includes('merge --abort')) return '';
      return '';
    });

    const result = await executeShipPipeline({
      feature: 'conflict',
      baseBranch: 'main',
      projectDir: '/tmp/ship-test-6',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('conflict');
  });
});

// ── Version bump ─────────────────────────────────────────────────────────

describe('executeShipPipeline — version bump', () => {
  it('detects breaking change for major bump', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('branch --show-current')) return 'feature/break';
      if (cmdStr.includes('rev-parse')) return 'abc';
      if (cmdStr.includes('status --porcelain')) return '';
      if (cmdStr.includes('git fetch') || cmdStr.includes('git merge')) return '';
      if (cmdStr.includes('git log')) return 'abc BREAKING: remove API\ndef fix: typo';
      if (cmdStr.includes('git diff')) return '';
      if (cmdStr.includes('git add') || cmdStr.includes('git commit') || cmdStr.includes('git push')) return '';
      if (cmdStr.includes('gh pr create')) return 'https://github.com/o/r/pull/1';
      return '';
    });

    await executeShipPipeline({
      feature: 'break',
      baseBranch: 'main',
      skipTests: true,
      projectDir: '/tmp/ship-test-7',
    });

    expect(determineBumpType).toHaveBeenCalledWith(
      expect.objectContaining({ hasBreaking: true })
    );
  });

  it('detects feat commit for minor bump', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('branch --show-current')) return 'feature/new';
      if (cmdStr.includes('rev-parse')) return 'abc';
      if (cmdStr.includes('status --porcelain')) return '';
      if (cmdStr.includes('git fetch') || cmdStr.includes('git merge')) return '';
      if (cmdStr.includes('git log')) return 'abc123 feat: add feature\ndef456 fix: typo';
      if (cmdStr.includes('git diff')) return '';
      if (cmdStr.includes('git add') || cmdStr.includes('git commit') || cmdStr.includes('git push')) return '';
      if (cmdStr.includes('gh pr create')) return 'https://github.com/o/r/pull/2';
      return '';
    });

    await executeShipPipeline({
      feature: 'new-feature',
      baseBranch: 'main',
      skipTests: true,
      projectDir: '/tmp/ship-test-8',
    });

    expect(determineBumpType).toHaveBeenCalledWith(
      expect.objectContaining({ hasNewFeature: true })
    );
  });
});

// ── Pre-landing review ───────────────────────────────────────────────────

describe('executeShipPipeline — pre-landing review', () => {
  it('detects dangerous patterns and flags them in pre-landing', async () => {
    // The pre-landing review checks for patterns like ${...}.*query (SQL injection risk)
    const injectionDiff = '+  const sql = `$' + '{input} query`;';
    mockExecSync.mockImplementation((cmd: string) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('branch --show-current')) return 'feature/danger';
      if (cmdStr.includes('rev-parse')) return 'abc';
      if (cmdStr.includes('status --porcelain')) return '';
      if (cmdStr.includes('git fetch') || cmdStr.includes('git merge')) return '';
      if (cmdStr.includes('git log')) return 'abc fix: something';
      if (cmdStr.includes('git diff')) return injectionDiff;
      if (cmdStr.includes('git add') || cmdStr.includes('git commit') || cmdStr.includes('git push')) return '';
      if (cmdStr.includes('gh pr create')) return 'https://github.com/o/r/pull/3';
      return '';
    });

    const result = await executeShipPipeline({
      feature: 'danger-test',
      baseBranch: 'main',
      skipTests: true,
      projectDir: '/tmp/ship-test-9',
    });

    // SQL injection risk is critical and should block the pipeline
    expect(result.success).toBe(false);
    expect(result.error).toContain('injection');
  });
});

// ── Full pipeline ────────────────────────────────────────────────────────

describe('executeShipPipeline — full pipeline', () => {
  it('succeeds with all steps passing', async () => {
    const result = await executeShipPipeline({
      feature: 'good-feature',
      baseBranch: 'main',
      skipTests: true,
      projectDir: '/tmp/ship-test-10',
    });

    expect(result.success).toBe(true);
    expect(result.pr).toBe('https://github.com/owner/repo/pull/42');
    expect(initShip).toHaveBeenCalled();
    expect(advanceStep).toHaveBeenCalled();
  });

  it('returns null PR when gh CLI is unavailable', async () => {
    vi.mocked(isGhAvailable).mockReturnValue(false);

    const result = await executeShipPipeline({
      feature: 'no-gh',
      baseBranch: 'main',
      skipTests: true,
      projectDir: '/tmp/ship-test-11',
    });

    expect(result.success).toBe(true);
    expect(result.pr).toBeNull();
  });

  it('dry-run skips push and PR', async () => {
    const result = await executeShipPipeline({
      feature: 'dry',
      baseBranch: 'main',
      dryRun: true,
      skipTests: true,
      projectDir: '/tmp/ship-test-12',
    });

    expect(result.success).toBe(true);
    const pushCalls = mockExecSync.mock.calls.filter(c => String(c[0]).includes('git push'));
    expect(pushCalls).toHaveLength(0);
  });

  it('returns state on failure', async () => {
    // Force preflight failure
    mockExecSync.mockImplementation((cmd: string) => {
      if (String(cmd).includes('branch --show-current')) return 'main';
      if (String(cmd).includes('rev-parse')) return 'abc';
      if (String(cmd).includes('status --porcelain')) return '';
      return '';
    });

    const result = await executeShipPipeline({
      feature: 'fail',
      baseBranch: 'main',
      projectDir: '/tmp/ship-test-13',
    });

    expect(result.success).toBe(false);
    expect(result.state).toBeDefined();
    expect(getShipState).toHaveBeenCalled();
  });

  it('catches unexpected errors inside pipeline', async () => {
    // Force an error inside the try block (advanceStep is called within the pipeline)
    vi.mocked(advanceStep).mockImplementation(() => { throw new Error('Unexpected crash'); });

    const result = await executeShipPipeline({
      feature: 'crash',
      baseBranch: 'main',
      projectDir: '/tmp/ship-test-14',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unexpected crash');
  });
});
