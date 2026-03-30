/**
 * aing QA Engine E2E Tests
 * Tests QA orchestrator, health score, regression detection.
 *
 * Run: node --test tests/qa-e2e.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('QA Orchestrator', () => {
  it('should export runQACycle', async () => {
    const { runQACycle } = await import('../dist/scripts/qa/qa-orchestrator.js');
    assert.ok(typeof runQACycle === 'function');
  });

  it('should format QA results', async () => {
    const { formatQAResult } = await import('../dist/scripts/qa/qa-orchestrator.js');
    const result = {
      healthScore: 85,
      grade: 'B',
      cycles: 2,
      findings: ['error 1'],
      allFixed: false,
      healthHistory: [
        { cycle: 0, score: 60, grade: 'D' },
        { cycle: 1, score: 75, grade: 'C' },
        { cycle: 2, score: 85, grade: 'B' },
      ],
    };
    const formatted = formatQAResult(result);
    assert.ok(formatted.includes('B'));
    assert.ok(formatted.includes('85'));
    assert.ok(formatted.includes('Health Score Trend'));
    assert.ok(formatted.includes('Cycle 0'));
  });

  it('should format all-fixed result', async () => {
    const { formatQAResult } = await import('../dist/scripts/qa/qa-orchestrator.js');
    const result = { healthScore: 100, grade: 'A', cycles: 1, findings: [], allFixed: true };
    const formatted = formatQAResult(result);
    assert.ok(formatted.includes('ALL FIXED'));
    assert.ok(formatted.includes('100'));
  });
});

describe('Regression Detector', () => {
  it('should detect new failures vs baseline', async () => {
    const { detectRegression } = await import('../dist/scripts/qa/regression-detector.js');
    // No baseline = no regression
    const result = detectRegression('nonexistent-feature', { passCount: 10, errors: ['err1'] }, '/tmp');
    assert.strictEqual(result.hasRegression, false);
    assert.ok(result.details.noBaseline);
  });

  it('should format regression results', async () => {
    const { formatRegression } = await import('../dist/scripts/qa/regression-detector.js');

    const noBaseline = formatRegression({ details: { noBaseline: true } });
    assert.ok(noBaseline.includes('No baseline'));

    const clean = formatRegression({
      hasRegression: false,
      newFailures: [],
      fixedTests: 2,
      details: { baselinePass: 8, currentPass: 10, delta: 2 },
    });
    assert.ok(clean.includes('CLEAN'));
    assert.ok(clean.includes('Fixed: 2'));
  });

  it('should format regression detected', async () => {
    const { formatRegression } = await import('../dist/scripts/qa/regression-detector.js');
    const regressed = formatRegression({
      hasRegression: true,
      newFailures: ['test_auth_login'],
      fixedTests: 0,
      details: { baselinePass: 10, currentPass: 9, delta: -1 },
    });
    assert.ok(regressed.includes('REGRESSION DETECTED'));
    assert.ok(regressed.includes('test_auth_login'));
  });
});

describe('QA Health Score Integration', () => {
  it('should calculate weighted health score', async () => {
    const { calculateHealthScore } = await import('../dist/scripts/review/qa-health-score.js');

    // Perfect score
    const perfect = calculateHealthScore({
      console: { errors: 0 },
      links: { broken: 0 },
      visual: { issues: [] },
      functional: { issues: [] },
      ux: { issues: [] },
      performance: { issues: [] },
      content: { issues: [] },
      accessibility: { issues: [] },
    });
    assert.strictEqual(perfect.overall, 100);
    assert.strictEqual(perfect.grade, 'A');

    // With console errors
    const withErrors = calculateHealthScore({
      console: { errors: 5 },
    });
    assert.ok(withErrors.overall < 100);
  });

  it('should format health score with bars', async () => {
    const { calculateHealthScore, formatHealthScore } = await import('../dist/scripts/review/qa-health-score.js');
    const score = calculateHealthScore({ console: { errors: 0 } });
    const formatted = formatHealthScore(score);
    assert.ok(formatted.includes('QA Health Score'));
    assert.ok(formatted.includes('█'));
  });
});
