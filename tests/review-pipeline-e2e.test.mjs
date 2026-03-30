/**
 * aing Review Pipeline E2E Tests
 * Tests the complete review flow: tier selection → checklist → pre-landing → dashboard.
 *
 * Run: node --test tests/review-pipeline-e2e.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Review Pipeline Integration', () => {
  it('should select tiers based on complexity', async () => {
    const { selectTiers } = await import('../dist/scripts/review/review-engine.js');

    const low = selectTiers('low');
    assert.deepStrictEqual(low, ['eng-review']);

    const mid = selectTiers('mid', { hasUI: true });
    assert.ok(mid.includes('eng-review'));
    assert.ok(mid.includes('design-review'));
    assert.strictEqual(mid.length, 2);

    const high = selectTiers('high', { hasUI: true, hasProductChange: true });
    assert.ok(high.length >= 4);
  });

  it('should run checklist on real-looking diff', async () => {
    const { runChecklist, classifyResults } = await import('../dist/scripts/review/review-checklist.js');

    const diff = [
      '+const query = "SELECT * FROM users WHERE id = " + req.params.id;',
      '+try { parse(input); } catch (e) {}',
      '+const delay = setTimeout(fn, 86400000);',
      '+import _ from "lodash";',
    ].join('\n');

    const results = runChecklist(diff);
    assert.ok(results.length >= 2, `Expected >= 2 categories flagged, got ${results.length}`);

    const classified = classifyResults(results);
    assert.ok(classified.summary.total >= 2, 'Should flag at least 2 issues');
    assert.ok(classified.summary.autoFixable >= 1, 'Should have at least 1 auto-fixable issue');
  });

  it('should build review dashboard', async () => {
    const { buildDashboard, formatDashboard } = await import('../dist/scripts/review/review-dashboard.js');
    const dashboard = buildDashboard('/tmp');
    assert.ok(dashboard.rows.length >= 4);
    assert.ok(dashboard.rows.some(r => r.key === 'eng-review'));

    const formatted = formatDashboard(dashboard);
    assert.ok(formatted.includes('REVIEW READINESS DASHBOARD'));
    assert.ok(formatted.includes('VERDICT'));
  });

  it('should check ship readiness via PDCA integration', async () => {
    const { checkShipReadiness } = await import('../dist/scripts/review/pdca-integration.js');
    const result = checkShipReadiness({
      pdcaStage: 'review',
      pdcaVerdict: 'ACHIEVED',
      evidenceVerdict: 'PASS',
      projectDir: '/tmp',
    });
    // Dashboard won't be CLEARED (no review log in /tmp), but function should work
    assert.ok(typeof result.canShip === 'boolean');
    assert.ok(Array.isArray(result.blockers));
  });

  it('should format ship readiness', async () => {
    const { formatShipReadiness } = await import('../dist/scripts/review/pdca-integration.js');
    const formatted = formatShipReadiness(
      { canShip: false, reason: 'test', blockers: ['Review not cleared'] },
      { rows: [] }
    );
    assert.ok(formatted.includes('NOT READY') || formatted.includes('READY'));
  });
});

describe('Scope Drift Integration', () => {
  it('should analyze drift with three-way comparison', async () => {
    const { threeWayComparison, formatThreeWay } = await import('../dist/scripts/review/scope-drift.js');

    const result = threeWayComparison({
      todosContent: '- [x] Add login API\n- [ ] Add signup API',
      commitMessages: ['feat: add login endpoint'],
      changedFiles: ['src/auth/login.ts', 'src/unrelated/config.ts'],
    });

    assert.ok(result.intent.length > 0);
    assert.ok(result.delivered.length > 0);
    assert.ok(['CLEAN', 'DRIFT DETECTED', 'REQUIREMENTS MISSING', 'DRIFT DETECTED + REQUIREMENTS MISSING'].includes(result.verdict));

    const formatted = formatThreeWay(result);
    assert.ok(formatted.includes('Scope Check'));
  });
});

describe('Outside Voice', () => {
  it('should build adversarial prompt', async () => {
    const { buildAdversarialPrompt } = await import('../dist/scripts/review/outside-voice.js');
    const prompt = buildAdversarialPrompt({
      planContent: 'Build JWT auth with refresh tokens',
      feature: 'auth',
      branch: 'feat/auth',
    });
    assert.ok(prompt.includes('brutally honest'));
    assert.ok(prompt.includes('auth'));
  });
});

describe('Autoplan Integration', () => {
  it('should build pipeline based on complexity', async () => {
    const { buildAutoplanPipeline } = await import('../dist/scripts/pipeline/autoplan-engine.js');

    const low = buildAutoplanPipeline({ feature: 'test', complexityLevel: 'low' });
    assert.ok(low.phases.length >= 1);
    assert.ok(low.phases.some(p => p.name === 'Eng Review'));

    const high = buildAutoplanPipeline({
      feature: 'test',
      complexityLevel: 'high',
      hasUI: true,
      hasProductChange: true,
    });
    assert.ok(high.phases.length >= 3);
  });

  it('should classify decisions', async () => {
    const { classifyDecision, DECISION_TYPES } = await import('../dist/scripts/pipeline/autoplan-engine.js');

    // Mechanical: clear winner
    const mech = classifyDecision({ optionScoreDelta: 5 });
    assert.strictEqual(mech.type, DECISION_TYPES.MECHANICAL);
    assert.strictEqual(mech.autoDecide, true);

    // Taste: close call
    const taste = classifyDecision({ optionScoreDelta: 1 });
    assert.strictEqual(taste.type, DECISION_TYPES.TASTE);

    // User challenge: both disagree with user
    const challenge = classifyDecision({ hasUserPreference: true, crossModelDisagree: true, optionScoreDelta: 2 });
    assert.strictEqual(challenge.type, DECISION_TYPES.USER_CHALLENGE);
    assert.strictEqual(challenge.autoDecide, false);
  });
});

describe('CSO Audit Integration', () => {
  it('should build audit prompt with all phases', async () => {
    const { buildAuditPrompt, CSO_PHASES } = await import('../dist/scripts/review/cso-audit.js');
    const prompt = buildAuditPrompt({ stack: 'Node.js + Next.js' });
    assert.ok(prompt.includes('CSO Security Audit'));
    assert.ok(prompt.includes('OWASP'));
    assert.ok(prompt.includes('STRIDE'));

    // Should include all 14 phases
    for (const phase of CSO_PHASES) {
      assert.ok(prompt.includes(phase.name), `Missing phase: ${phase.name}`);
    }
  });
});

describe('Evidence Chain Integration', () => {
  it('should add and evaluate evidence', async () => {
    const { addEvidence, evaluateChain } = await import('../dist/scripts/evidence/evidence-chain.js');

    // Add evidence to temp location
    addEvidence('e2e-test', { type: 'test', result: 'pass', source: 'jest' }, '/tmp');
    addEvidence('e2e-test', { type: 'build', result: 'pass', source: 'tsc' }, '/tmp');

    const chain = evaluateChain('e2e-test', '/tmp');
    assert.strictEqual(chain.verdict, 'PASS');
    assert.ok(chain.entries.length >= 2);
  });
});

describe('LLM Judge Integration', () => {
  it('should parse judge response from mixed text', async () => {
    const { parseJudgeResponse } = await import('../dist/scripts/evidence/llm-judge.js');
    const response = 'Analysis: {"score": 7, "issues": ["naming"], "summary": "Good"}';
    const result = parseJudgeResponse(response);
    assert.strictEqual(result.score, 7);
    assert.strictEqual(result.issues.length, 1);
  });

  it('should select criteria for different signals', async () => {
    const { selectCriteria, JUDGE_CRITERIA } = await import('../dist/scripts/evidence/llm-judge.js');

    const uiCriteria = selectCriteria({ hasUI: true, hasSecurity: true });
    assert.ok(uiCriteria.includes(JUDGE_CRITERIA.UX_QUALITY));
    assert.ok(uiCriteria.includes(JUDGE_CRITERIA.SECURITY));
    assert.ok(uiCriteria.includes(JUDGE_CRITERIA.CODE_QUALITY)); // Always included
  });
});

describe('Telemetry Integration', () => {
  it('should log and read usage', async () => {
    const { logSkillUsage, readUsageLog } = await import('../dist/scripts/telemetry/telemetry-engine.js');

    logSkillUsage({
      skill: 'e2e-test',
      duration_s: 5,
      outcome: 'success',
      complexityLevel: 'low',
    }, '/tmp');

    const logs = readUsageLog('/tmp', 10);
    assert.ok(logs.length > 0);
    const latest = logs[logs.length - 1];
    assert.strictEqual(latest.skill, 'e2e-test');
    assert.strictEqual(latest.outcome, 'success');
  });

  it('should generate usage summary', async () => {
    const { getUsageSummary, formatUsageSummary } = await import('../dist/scripts/telemetry/telemetry-engine.js');
    const summary = getUsageSummary('/tmp');
    assert.ok(summary.totalSessions >= 0);

    const formatted = formatUsageSummary(summary);
    assert.ok(typeof formatted === 'string');
  });
});
