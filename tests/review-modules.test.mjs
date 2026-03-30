/**
 * aing Review Modules Test Suite
 * Tests the review pipeline, ship workflow, and related modules.
 *
 * Run: node --test tests/review-modules.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Review Engine', () => {
  it('should export review agents for all tiers', async () => {
    const { REVIEW_AGENTS, selectTiers } = await import('../dist/scripts/review/review-engine.js');
    assert.ok(REVIEW_AGENTS['eng-review'], 'eng-review tier missing');
    assert.ok(REVIEW_AGENTS['ceo-review'], 'ceo-review tier missing');
    assert.ok(REVIEW_AGENTS['design-review'], 'design-review tier missing');
    assert.ok(REVIEW_AGENTS['outside-voice'], 'outside-voice tier missing');
  });

  it('should select eng-review for low complexity', async () => {
    const { selectTiers } = await import('../dist/scripts/review/review-engine.js');
    const tiers = selectTiers('low');
    assert.deepStrictEqual(tiers, ['eng-review']);
  });

  it('should add design-review for mid complexity with UI', async () => {
    const { selectTiers } = await import('../dist/scripts/review/review-engine.js');
    const tiers = selectTiers('mid', { hasUI: true });
    assert.ok(tiers.includes('eng-review'));
    assert.ok(tiers.includes('design-review'));
  });

  it('should include all tiers for high complexity', async () => {
    const { selectTiers } = await import('../dist/scripts/review/review-engine.js');
    const tiers = selectTiers('high', { hasUI: true, hasProductChange: true });
    assert.ok(tiers.includes('eng-review'));
    assert.ok(tiers.includes('ceo-review'));
    assert.ok(tiers.includes('design-review'));
    assert.ok(tiers.includes('outside-voice'));
  });

  it('should have 2-pass review checklist', async () => {
    const { REVIEW_PASSES } = await import('../dist/scripts/review/review-engine.js');
    assert.ok(REVIEW_PASSES.CRITICAL.length >= 5, 'Need at least 5 critical checks');
    assert.ok(REVIEW_PASSES.INFORMATIONAL.length >= 5, 'Need at least 5 informational checks');
  });

  it('should classify findings correctly', async () => {
    const { classifyFinding } = await import('../dist/scripts/review/review-engine.js');
    assert.strictEqual(classifyFinding({ severity: 'CRITICAL', type: 'sql-injection' }), 'ask');
    assert.strictEqual(classifyFinding({ severity: 'MEDIUM', type: 'dead-code' }), 'auto-fix');
    assert.strictEqual(classifyFinding({ severity: 'HIGH', type: 'auth-bypass' }), 'ask');
  });
});

describe('Ship Engine', () => {
  it('should export ship steps', async () => {
    const { getSteps } = await import('../dist/scripts/ship/ship-engine.js');
    const steps = getSteps();
    assert.strictEqual(steps.length, 7);
    assert.strictEqual(steps[0], 'preflight');
    assert.strictEqual(steps[6], 'push-and-pr');
  });
});

describe('Version Bump', () => {
  it('should parse semantic versions', async () => {
    const { parseVersion } = await import('../dist/scripts/ship/version-bump.js');
    assert.deepStrictEqual(parseVersion('1.2.3'), { major: 1, minor: 2, patch: 3 });
    assert.deepStrictEqual(parseVersion('v2.5.0'), { major: 2, minor: 5, patch: 0 });
  });

  it('should determine bump type from signals', async () => {
    const { determineBumpType } = await import('../dist/scripts/ship/version-bump.js');
    assert.strictEqual(determineBumpType({ hasBreaking: true }), 'major');
    assert.strictEqual(determineBumpType({ hasNewFeature: true }), 'minor');
    assert.strictEqual(determineBumpType({ hasBugFix: true }), 'patch');
    assert.strictEqual(determineBumpType({}), 'patch');
  });
});

describe('Changelog', () => {
  it('should parse conventional commits', async () => {
    const { parseCommitMessage } = await import('../dist/scripts/ship/changelog-gen.js');
    const result = parseCommitMessage('feat(auth): add JWT support');
    assert.strictEqual(result.type, 'feat');
    assert.strictEqual(result.scope, 'auth');
    assert.strictEqual(result.description, 'add JWT support');
  });
});

describe('CSO Audit', () => {
  it('should have all 14 phases', async () => {
    const { CSO_PHASES } = await import('../dist/scripts/review/cso-audit.js');
    assert.strictEqual(CSO_PHASES.length, 14);
    assert.strictEqual(CSO_PHASES[0].name, 'stack-detection');
    assert.strictEqual(CSO_PHASES[9].name, 'owasp-top10');
  });

  it('should have OWASP Top 10 checks', async () => {
    const { OWASP_CHECKS } = await import('../dist/scripts/review/cso-audit.js');
    assert.ok(Object.keys(OWASP_CHECKS).length >= 10);
  });
});

describe('Design Scoring', () => {
  it('should have 10 AI slop patterns', async () => {
    const { AI_SLOP_BLACKLIST } = await import('../dist/scripts/review/design-scoring.js');
    assert.strictEqual(AI_SLOP_BLACKLIST.length, 10);
  });

  it('should detect slop patterns in content', async () => {
    const { detectAISlop } = await import('../dist/scripts/review/design-scoring.js');
    const detected = detectAISlop('bg-gradient-to-r from-purple-500 to-indigo-600');
    assert.ok(detected.length > 0, 'Should detect purple gradient');
  });

  it('should have 7 litmus checks', async () => {
    const { LITMUS_CHECKS } = await import('../dist/scripts/review/design-scoring.js');
    assert.strictEqual(LITMUS_CHECKS.length, 7);
  });
});

describe('QA Health Score', () => {
  it('should calculate weighted score', async () => {
    const { calculateHealthScore } = await import('../dist/scripts/review/qa-health-score.js');
    const result = calculateHealthScore({
      console: { errors: 0 },
      links: { broken: 0 },
      visual: { issues: [] },
      functional: { issues: [] },
      ux: { issues: [] },
      performance: { issues: [] },
      content: { issues: [] },
      accessibility: { issues: [] },
    });
    assert.strictEqual(result.overall, 100);
    assert.strictEqual(result.grade, 'A');
  });

  it('should deduct for critical issues', async () => {
    const { calculateHealthScore } = await import('../dist/scripts/review/qa-health-score.js');
    const result = calculateHealthScore({
      console: { errors: 5 },
      functional: { issues: [{ severity: 'CRITICAL' }] },
    });
    assert.ok(result.overall < 100, `Expected < 100, got ${result.overall}`);
  });
});

describe('Autoplan', () => {
  it('should have 6 decision principles', async () => {
    const { DECISION_PRINCIPLES } = await import('../dist/scripts/pipeline/autoplan-engine.js');
    assert.strictEqual(DECISION_PRINCIPLES.length, 6);
  });

  it('should classify user challenges correctly', async () => {
    const { classifyDecision, DECISION_TYPES } = await import('../dist/scripts/pipeline/autoplan-engine.js');
    const result = classifyDecision({
      hasUserPreference: true,
      crossModelDisagree: true,
      optionScoreDelta: 2,
    });
    assert.strictEqual(result.type, DECISION_TYPES.USER_CHALLENGE);
    assert.strictEqual(result.autoDecide, false);
  });
});
