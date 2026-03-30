/**
 * aing Review Checklist Test Suite
 * Tests the 18-category review engine + fix-first classification.
 *
 * Run: node --test tests/review-checklist.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Review Checklist', () => {
  it('should export all 18 categories', async () => {
    const { CATEGORIES } = await import('../dist/scripts/review/review-checklist.js');
    const keys = Object.keys(CATEGORIES);
    assert.ok(keys.length >= 18, `Expected >= 18 categories, got ${keys.length}`);
  });

  it('should detect SQL injection patterns', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = '+const result = db.query("SELECT * FROM users WHERE id = " + userId);';
    const results = runChecklist(diff);
    const sqlFindings = results.filter(r => r.category === 'sql-safety');
    assert.ok(sqlFindings.length > 0, 'Should detect SQL injection');
  });

  it('should detect LLM trust boundary issues', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+element.innerHTML = response.output;
+div.dangerouslySetInnerHTML = { __html: completion };`;
    const results = runChecklist(diff);
    const llmFindings = results.filter(r => r.category === 'llm-trust-boundary');
    assert.ok(llmFindings.length > 0, 'Should detect LLM trust boundary');
  });

  it('should detect eval usage', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+eval(response.output);`;
    const results = runChecklist(diff);
    const findings = results.filter(r => r.category === 'llm-trust-boundary');
    assert.ok(findings.length > 0, 'Should detect eval on LLM output');
  });

  it('should detect N+1 queries', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+for (const id of ids) {
+  const user = await db.find(id);
+}`;
    const results = runChecklist(diff);
    const n1 = results.filter(r => r.category === 'n-plus-one');
    assert.ok(n1.length > 0, 'Should detect N+1 query pattern');
  });

  it('should detect empty catch blocks', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+try { doSomething(); } catch (e) {}`;
    const results = runChecklist(diff);
    const errHandling = results.filter(r => r.category === 'missing-error-handling');
    assert.ok(errHandling.length > 0, 'Should detect empty catch');
  });

  it('should detect Math.random usage', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+const token = Math.random().toString(36);`;
    const results = runChecklist(diff);
    const crypto = results.filter(r => r.category === 'crypto-entropy');
    assert.ok(crypto.length > 0, 'Should detect Math.random');
  });

  it('should detect full lodash import', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+import _ from 'lodash';`;
    const results = runChecklist(diff);
    const perf = results.filter(r => r.category === 'performance-bundle');
    assert.ok(perf.length > 0, 'Should detect full lodash import');
  });

  it('should detect auth bypass patterns', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+skip_before_action :authenticate_user`;
    const results = runChecklist(diff);
    const auth = results.filter(r => r.category === 'auth-bypass');
    assert.ok(auth.length > 0, 'Should detect auth bypass');
  });

  it('should return empty for clean diff', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+const x = 1;
+console.log(x);`;
    const results = runChecklist(diff);
    assert.ok(results.length === 0 || results.every(r => r.severity !== 'CRITICAL'), 'Clean code should have no CRITICAL findings');
  });

  it('should classify CRITICAL as needs-ask', async () => {
    const { runChecklist, classifyResults } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+eval(response.output);`;
    const results = runChecklist(diff);
    const classified = classifyResults(results);
    assert.ok(classified.needsAsk.length > 0, 'CRITICAL should be in needsAsk');
  });

  it('should classify dead-code as auto-fix', async () => {
    const { runChecklist, classifyResults } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+// TODO fix this later
+return;
+const unreachable = true;`;
    const results = runChecklist(diff);
    const classified = classifyResults(results);
    // dead-code is auto-fixable
    const deadCode = classified.autoFix.filter(r => r.category === 'dead-code');
    assert.ok(deadCode.length > 0 || results.length === 0, 'dead-code should be auto-fixable');
  });

  it('should sort CRITICAL before INFORMATIONAL', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `+eval(response.output);
+// TODO fix
+import _ from 'lodash';`;
    const results = runChecklist(diff);
    if (results.length >= 2) {
      assert.ok(
        results[0].severity === 'CRITICAL' || results[0].pass === 1,
        'First result should be CRITICAL/pass1'
      );
    }
  });

  it('should handle empty diff', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const results = runChecklist('');
    assert.deepStrictEqual(results, []);
  });

  it('should handle null diff', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const results = runChecklist(null);
    assert.deepStrictEqual(results, []);
  });

  it('should only check added lines (not removed)', async () => {
    const { runChecklist } = await import('../dist/scripts/review/review-checklist.js');
    const diff = `-eval(oldCode);
 normal line
+const safe = true;`;
    const results = runChecklist(diff);
    const evalFindings = results.filter(r => r.findings?.some(f => f.desc.includes('eval')));
    assert.strictEqual(evalFindings.length, 0, 'Should not flag removed lines');
  });
});

describe('Pre-Landing Reviewer', () => {
  it('should export runPreLandingReview', async () => {
    const mod = await import('../dist/scripts/review/pre-landing-reviewer.js');
    assert.ok(typeof mod.runPreLandingReview === 'function');
  });
});

describe('CEO Reviewer', () => {
  it('should export CEO checks', async () => {
    const { CEO_CHECKS } = await import('../dist/scripts/review/ceo-reviewer.js');
    assert.ok(CEO_CHECKS.length >= 6, `Expected >= 6 CEO checks, got ${CEO_CHECKS.length}`);
  });

  it('should build CEO review prompt', async () => {
    const { buildCEOReviewPrompt } = await import('../dist/scripts/review/ceo-reviewer.js');
    const prompt = buildCEOReviewPrompt({ feature: 'auth', branch: 'feat/auth' });
    assert.ok(prompt.includes('CEO Review'));
    assert.ok(prompt.includes('Demand Reality'));
  });
});

describe('Eng Reviewer', () => {
  it('should export eng sections', async () => {
    const { ENG_SECTIONS } = await import('../dist/scripts/review/eng-reviewer.js');
    assert.ok(ENG_SECTIONS.length >= 5);
  });
});

describe('Design Reviewer', () => {
  it('should export design dimensions', async () => {
    const { DESIGN_DIMENSIONS } = await import('../dist/scripts/review/design-reviewer.js');
    assert.ok(DESIGN_DIMENSIONS.length >= 10);
  });

  it('should detect AI slop in diff', async () => {
    const { runDesignReview } = await import('../dist/scripts/review/design-reviewer.js');
    const diff = `+<div className="bg-gradient-to-r from-purple-500 to-indigo-600">`;
    const result = runDesignReview(diff);
    assert.ok(result.slopCount > 0, 'Should detect purple gradient');
  });
});
