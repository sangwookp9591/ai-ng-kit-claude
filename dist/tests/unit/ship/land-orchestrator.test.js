/**
 * Unit tests for scripts/ship/land-orchestrator.ts
 * Covers: executeLandPipeline, formatLandReport, pre-merge checks, merge strategy, deploy, canary
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// ── Mocks ────────────────────────────────────────────────────────────────
vi.mock('node:child_process', () => ({
    execSync: vi.fn(),
}));
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    })),
}));
vi.mock('../../../scripts/ship/deploy-detect.js', () => ({
    detectPlatform: vi.fn(() => ({ platform: 'vercel', config: { url: 'https://app.vercel.app' } })),
    healthCheck: vi.fn(() => ({ healthy: true, statusCode: 200 })),
}));
vi.mock('../../../scripts/ship/canary-monitor.js', () => ({
    runCanaryLoop: vi.fn(() => ({
        passed: true,
        checks: [{ ok: true }, { ok: true }],
        alerts: [],
    })),
    formatCanaryResult: vi.fn(() => 'Canary: 2/2 passed'),
}));
vi.mock('../../../scripts/evidence/evidence-chain.js', () => ({
    addEvidence: vi.fn(),
}));
vi.mock('../../../scripts/telemetry/telemetry-engine.js', () => ({
    logSkillUsage: vi.fn(),
}));
import { execSync } from 'node:child_process';
import { executeLandPipeline, formatLandReport, } from '../../../scripts/ship/land-orchestrator.js';
import { healthCheck as platformHealthCheck } from '../../../scripts/ship/deploy-detect.js';
import { runCanaryLoop } from '../../../scripts/ship/canary-monitor.js';
import { addEvidence } from '../../../scripts/evidence/evidence-chain.js';
const mockExecSync = vi.mocked(execSync);
const APPROVED_PR = JSON.stringify({
    reviewDecision: 'APPROVED',
    mergeable: 'MERGEABLE',
    baseRefName: 'main',
    headRefName: 'feat/auth',
    url: 'https://github.com/o/r/pull/123',
    title: 'feat: add auth',
});
const PASSING_CHECKS = JSON.stringify([{ bucket: 'pass' }, { bucket: 'pass' }]);
beforeEach(() => {
    vi.clearAllMocks();
    mockExecSync.mockImplementation((cmd) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('pr view') && cmdStr.includes('--json'))
            return APPROVED_PR;
        if (cmdStr.includes('pr checks'))
            return PASSING_CHECKS;
        if (cmdStr.includes('pr merge'))
            return '';
        if (cmdStr.includes('--jq .baseRefName'))
            return 'main';
        if (cmdStr.includes('git checkout'))
            return '';
        if (cmdStr.includes('git pull'))
            return '';
        if (cmdStr.includes('sleep'))
            return '';
        return '';
    });
});
// ── Pre-merge checks ─────────────────────────────────────────────────────
describe('executeLandPipeline — pre-merge checks', () => {
    it('passes when PR is approved with passing CI', async () => {
        const result = await executeLandPipeline({
            prNumber: 123,
            feature: 'auth',
            canaryUrl: 'https://app.test',
            projectDir: '/tmp/land-test-1',
        });
        expect(result.success).toBe(true);
        const prStep = result.steps.find(s => s.name === 'pre-merge-checks');
        expect(prStep?.status).toBe('pass');
    });
    it('fails when PR is not approved', async () => {
        mockExecSync.mockImplementation((cmd) => {
            const cmdStr = String(cmd);
            if (cmdStr.includes('pr view') && cmdStr.includes('--json')) {
                return JSON.stringify({
                    reviewDecision: 'CHANGES_REQUESTED',
                    mergeable: 'MERGEABLE',
                    baseRefName: 'main',
                    headRefName: 'feat/x',
                    url: 'https://github.com/o/r/pull/1',
                    title: 'feat: x',
                });
            }
            if (cmdStr.includes('pr checks'))
                return PASSING_CHECKS;
            return '';
        });
        const result = await executeLandPipeline({
            prNumber: 1,
            feature: 'x',
            projectDir: '/tmp/land-test-2',
        });
        expect(result.success).toBe(false);
        expect(result.error).toContain('Pre-merge');
    });
    it('fails when PR has conflicts', async () => {
        mockExecSync.mockImplementation((cmd) => {
            const cmdStr = String(cmd);
            if (cmdStr.includes('pr view') && cmdStr.includes('--json')) {
                return JSON.stringify({
                    reviewDecision: 'APPROVED',
                    mergeable: 'CONFLICTING',
                    baseRefName: 'main',
                    headRefName: 'feat/y',
                    url: 'https://github.com/o/r/pull/2',
                    title: 'feat: y',
                });
            }
            if (cmdStr.includes('pr checks'))
                return PASSING_CHECKS;
            return '';
        });
        const result = await executeLandPipeline({
            prNumber: 2,
            feature: 'y',
            projectDir: '/tmp/land-test-3',
        });
        expect(result.success).toBe(false);
    });
    it('fails when CI checks fail', async () => {
        mockExecSync.mockImplementation((cmd) => {
            const cmdStr = String(cmd);
            if (cmdStr.includes('pr view') && cmdStr.includes('--json'))
                return APPROVED_PR;
            if (cmdStr.includes('pr checks')) {
                return JSON.stringify([{ bucket: 'pass' }, { bucket: 'fail' }]);
            }
            return '';
        });
        const result = await executeLandPipeline({
            prNumber: 3,
            feature: 'ci-fail',
            projectDir: '/tmp/land-test-4',
        });
        expect(result.success).toBe(false);
    });
    it('fails when gh CLI cannot fetch PR info', async () => {
        mockExecSync.mockImplementation((cmd) => {
            if (String(cmd).includes('pr view'))
                throw new Error('gh: not logged in');
            return '';
        });
        const result = await executeLandPipeline({
            prNumber: 99,
            feature: 'no-gh',
            projectDir: '/tmp/land-test-5',
        });
        expect(result.success).toBe(false);
        expect(result.error).toContain('Pre-merge');
    });
});
// ── Merge strategy ───────────────────────────────────────────────────────
describe('executeLandPipeline — merge strategy', () => {
    it('uses squash by default', async () => {
        await executeLandPipeline({
            prNumber: 10,
            feature: 'squash',
            canaryUrl: 'https://app.test',
            projectDir: '/tmp/land-test-6',
        });
        const mergeCalls = mockExecSync.mock.calls.filter(c => String(c[0]).includes('pr merge'));
        expect(mergeCalls.length).toBeGreaterThan(0);
        expect(String(mergeCalls[0][0])).toContain('--squash');
    });
    it('uses rebase when specified', async () => {
        await executeLandPipeline({
            prNumber: 11,
            feature: 'rebase',
            mergeStrategy: 'rebase',
            canaryUrl: 'https://app.test',
            projectDir: '/tmp/land-test-7',
        });
        const mergeCalls = mockExecSync.mock.calls.filter(c => String(c[0]).includes('pr merge'));
        expect(String(mergeCalls[0][0])).toContain('--rebase');
    });
    it('uses merge when specified', async () => {
        await executeLandPipeline({
            prNumber: 12,
            feature: 'merge',
            mergeStrategy: 'merge',
            canaryUrl: 'https://app.test',
            projectDir: '/tmp/land-test-8',
        });
        const mergeCalls = mockExecSync.mock.calls.filter(c => String(c[0]).includes('pr merge'));
        expect(String(mergeCalls[0][0])).toContain('--merge');
    });
    it('skips merge in dry-run', async () => {
        const result = await executeLandPipeline({
            prNumber: 13,
            feature: 'dry',
            dryRun: true,
            canaryUrl: 'https://app.test',
            projectDir: '/tmp/land-test-9',
        });
        expect(result.success).toBe(true);
        const mergeStep = result.steps.find(s => s.name === 'merge');
        expect(mergeStep?.status).toBe('skip');
    });
    it('fails when merge command throws', async () => {
        mockExecSync.mockImplementation((cmd) => {
            const cmdStr = String(cmd);
            if (cmdStr.includes('pr view') && cmdStr.includes('--json'))
                return APPROVED_PR;
            if (cmdStr.includes('pr checks'))
                return PASSING_CHECKS;
            if (cmdStr.includes('pr merge'))
                throw new Error('Merge failed: branch protection');
            return '';
        });
        const result = await executeLandPipeline({
            prNumber: 14,
            feature: 'merge-fail',
            projectDir: '/tmp/land-test-10',
        });
        expect(result.success).toBe(false);
        const mergeStep = result.steps.find(s => s.name === 'merge');
        expect(mergeStep?.status).toBe('fail');
    });
});
// ── Deploy wait ──────────────────────────────────────────────────────────
describe('executeLandPipeline — deploy wait', () => {
    it('skips when no URL available', async () => {
        vi.mocked(platformHealthCheck).mockReturnValue({ healthy: false, statusCode: 0 });
        const { detectPlatform } = await import('../../../scripts/ship/deploy-detect.js');
        vi.mocked(detectPlatform).mockReturnValue({ platform: 'unknown', config: null });
        const result = await executeLandPipeline({
            prNumber: 20,
            feature: 'no-url',
            projectDir: '/tmp/land-test-11',
        });
        const deployStep = result.steps.find(s => s.name === 'wait-for-deploy');
        expect(deployStep?.status).toBe('skip');
    });
    it('passes when health check succeeds', async () => {
        vi.mocked(platformHealthCheck).mockReturnValue({ healthy: true, statusCode: 200 });
        const result = await executeLandPipeline({
            prNumber: 21,
            feature: 'deploy-ok',
            canaryUrl: 'https://deployed.test',
            projectDir: '/tmp/land-test-12',
        });
        const deployStep = result.steps.find(s => s.name === 'wait-for-deploy');
        expect(deployStep?.status).toBe('pass');
    });
});
// ── Canary ───────────────────────────────────────────────────────────────
describe('executeLandPipeline — canary', () => {
    it('runs canary checks and records evidence', async () => {
        vi.mocked(platformHealthCheck).mockReturnValue({ healthy: true, statusCode: 200 });
        await executeLandPipeline({
            prNumber: 30,
            feature: 'canary-test',
            canaryUrl: 'https://app.test',
            canaryChecks: 3,
            projectDir: '/tmp/land-test-13',
        });
        expect(addEvidence).toHaveBeenCalledWith('canary-test', expect.objectContaining({ type: 'deploy', source: 'land-orchestrator' }), '/tmp/land-test-13');
    });
    it('skips canary when no URL', async () => {
        const { detectPlatform } = await import('../../../scripts/ship/deploy-detect.js');
        vi.mocked(detectPlatform).mockReturnValue({ platform: 'unknown', config: null });
        const result = await executeLandPipeline({
            prNumber: 31,
            feature: 'no-canary',
            projectDir: '/tmp/land-test-14',
        });
        const canaryStep = result.steps.find(s => s.name === 'canary');
        expect(canaryStep?.status).toBe('skip');
    });
    it('reports canary failure', async () => {
        vi.mocked(platformHealthCheck).mockReturnValue({ healthy: true, statusCode: 200 });
        vi.mocked(runCanaryLoop).mockReturnValue({
            passed: false,
            checks: [{ ok: true }, { ok: false }],
            alerts: ['High error rate'],
        });
        const result = await executeLandPipeline({
            prNumber: 32,
            feature: 'canary-fail',
            canaryUrl: 'https://app.test',
            projectDir: '/tmp/land-test-15',
        });
        const canaryStep = result.steps.find(s => s.name === 'canary');
        expect(canaryStep?.status).toBe('fail');
        expect(result.success).toBe(false);
    });
});
// ── formatLandReport ─────────────────────────────────────────────────────
describe('formatLandReport', () => {
    it('formats successful report with all steps', () => {
        const result = {
            success: true,
            steps: [
                { name: 'pre-merge-checks', status: 'pass', duration_ms: 500, details: {} },
                { name: 'merge', status: 'pass', duration_ms: 2000, details: {} },
                { name: 'wait-for-deploy', status: 'pass', duration_ms: 15000, details: {} },
                { name: 'canary', status: 'pass', duration_ms: 5000, details: {} },
            ],
            deployUrl: 'https://app.vercel.app',
        };
        const report = formatLandReport(result, 123);
        expect(report).toContain('Deployment Report');
        expect(report).toContain('#123');
        expect(report).toContain('https://app.vercel.app');
        expect(report).toContain('HEALTHY');
        expect(report).toContain('pre-merge-checks');
        expect(report).toContain('PASS');
    });
    it('formats failure report with error', () => {
        const result = {
            success: false,
            steps: [
                { name: 'pre-merge-checks', status: 'fail', duration_ms: 200, details: {} },
            ],
            deployUrl: null,
            error: 'PR not approved',
        };
        const report = formatLandReport(result, 456);
        expect(report).toContain('ISSUES');
        expect(report).toContain('FAIL');
        expect(report).toContain('PR not approved');
        expect(report).toContain('N/A');
    });
    it('formats duration in ms for fast steps', () => {
        const result = {
            success: true,
            steps: [
                { name: 'merge', status: 'pass', duration_ms: 500, details: {} },
            ],
            deployUrl: null,
        };
        const report = formatLandReport(result, 1);
        expect(report).toContain('500ms');
    });
    it('formats duration in seconds for slow steps', () => {
        const result = {
            success: true,
            steps: [
                { name: 'wait-for-deploy', status: 'pass', duration_ms: 30000, details: {} },
            ],
            deployUrl: null,
        };
        const report = formatLandReport(result, 2);
        expect(report).toContain('30.0s');
    });
    it('shows SKIP status for skipped steps', () => {
        const result = {
            success: true,
            steps: [
                { name: 'merge', status: 'skip', duration_ms: 0, details: {} },
            ],
            deployUrl: null,
        };
        const report = formatLandReport(result, 3);
        expect(report).toContain('SKIP');
    });
});
//# sourceMappingURL=land-orchestrator.test.js.map