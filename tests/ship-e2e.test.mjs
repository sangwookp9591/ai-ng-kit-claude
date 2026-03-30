/**
 * aing Ship Pipeline E2E Tests
 * Tests the full ship workflow: preflight → merge → test → review → version → changelog → PR
 *
 * Run: node --test tests/ship-e2e.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Ship Orchestrator', () => {
  it('should export executeShipPipeline', async () => {
    const { executeShipPipeline } = await import('../dist/scripts/ship/ship-orchestrator.js');
    assert.ok(typeof executeShipPipeline === 'function');
  });

  it('should detect base branch', async () => {
    // The module has internal detectBaseBranch — test via preflight
    const { runPreflightChecks } = await import('../dist/scripts/ship/preflight-check.js');
    const result = runPreflightChecks();
    assert.ok(result.checks.length >= 3, 'Should have at least 3 preflight checks');
    assert.ok(result.checks.some(c => c.name === 'Feature branch'));
    assert.ok(result.checks.some(c => c.name === 'Clean working tree'));
  });

  it('should format preflight results', async () => {
    const { runPreflightChecks, formatPreflight } = await import('../dist/scripts/ship/preflight-check.js');
    const result = runPreflightChecks();
    const formatted = formatPreflight(result);
    assert.ok(formatted.includes('Ship Preflight'));
    assert.ok(formatted.includes('✓') || formatted.includes('✗'));
  });
});

describe('Test Triage', () => {
  it('should export triageTestFailures', async () => {
    const { triageTestFailures } = await import('../dist/scripts/ship/test-triage.js');
    assert.ok(typeof triageTestFailures === 'function');
  });

  it('should format triage results', async () => {
    const { formatTriage } = await import('../dist/scripts/ship/test-triage.js');
    const result = { passed: true, total: 10, failed: 0, preExisting: [], branchNew: [] };
    const formatted = formatTriage(result);
    assert.ok(formatted.includes('ALL PASS'));
  });

  it('should format failed triage', async () => {
    const { formatTriage } = await import('../dist/scripts/ship/test-triage.js');
    const result = { passed: false, total: 10, failed: 2, preExisting: ['old fail'], branchNew: ['new fail'] };
    const formatted = formatTriage(result);
    assert.ok(formatted.includes('NEW failures'));
    assert.ok(formatted.includes('Pre-existing'));
    assert.ok(formatted.includes('FAIL'));
  });
});

describe('Ship Engine Integration', () => {
  it('should init and track ship state', async () => {
    const { initShip, getShipState, getSteps, formatShipProgress } = await import('../dist/scripts/ship/ship-engine.js');
    const state = initShip('test-feature', 'feat/test', 'main', '/tmp');
    assert.strictEqual(state.feature, 'test-feature');
    assert.strictEqual(state.currentStep, 0);
    assert.strictEqual(state.status, 'pending');

    const steps = getSteps();
    assert.strictEqual(steps.length, 7);

    const formatted = formatShipProgress(state);
    assert.ok(formatted.includes('test-feature'));
  });

  it('should advance steps', async () => {
    const { initShip, advanceStep, getShipState } = await import('../dist/scripts/ship/ship-engine.js');
    initShip('adv-test', 'feat/adv', 'main', '/tmp');
    const after = advanceStep({ step: 'preflight', status: 'pass' }, '/tmp');
    assert.strictEqual(after.currentStep, 1);
    assert.strictEqual(after.status, 'in_progress');
  });

  it('should fail on step failure', async () => {
    const { initShip, advanceStep } = await import('../dist/scripts/ship/ship-engine.js');
    initShip('fail-test', 'feat/fail', 'main', '/tmp');
    const after = advanceStep({ step: 'preflight', status: 'fail' }, '/tmp');
    assert.strictEqual(after.status, 'failed');
  });
});

describe('Version + Changelog Integration', () => {
  it('should parse and bump versions', async () => {
    const { parseVersion, determineBumpType } = await import('../dist/scripts/ship/version-bump.js');
    assert.deepStrictEqual(parseVersion('2.5.0'), { major: 2, minor: 5, patch: 0 });
    assert.strictEqual(determineBumpType({ hasNewFeature: true }), 'minor');
    assert.strictEqual(determineBumpType({ hasBreaking: true }), 'major');
    assert.strictEqual(determineBumpType({ hasBugFix: true }), 'patch');
  });

  it('should parse commit messages for changelog', async () => {
    const { parseCommitMessage, generateChangelog } = await import('../dist/scripts/ship/changelog-gen.js');

    const parsed = parseCommitMessage('feat(auth): add JWT');
    assert.strictEqual(parsed.type, 'feat');
    assert.strictEqual(parsed.scope, 'auth');

    const commits = [
      { hash: 'abc1234', message: 'feat: new feature', author: 'dev', date: '2026-03-30' },
      { hash: 'def5678', message: 'fix: bug fix', author: 'dev', date: '2026-03-30' },
    ];
    const changelog = generateChangelog('2.6.0', commits);
    assert.ok(changelog.includes('2.6.0'));
    assert.ok(changelog.includes('Features') || changelog.includes('Bug Fixes'));
  });

  it('should generate PR title and body', async () => {
    const { generateTitle, generateBody } = await import('../dist/scripts/ship/pr-creator.js');
    const title = generateTitle('user-auth', '2.6.0', 'minor');
    assert.ok(title.length <= 70);
    assert.ok(title.includes('2.6.0'));

    const body = generateBody({ feature: 'auth', changelog: '## 2.6.0' });
    assert.ok(body.includes('Summary'));
    assert.ok(body.includes('Test Plan'));
  });
});
