import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  orchestrateBrowserQA,
  buildBrowserTestPlan,
  BROWSER_EVIDENCE_TYPES,
  formatBrowserEvidence,
  addScreenshotEvidence,
  addConsoleEvidence,
} from '../scripts/review/browser-evidence.mjs';

describe('MCP Browse QA Orchestrator', () => {
  it('buildBrowserTestPlan creates tests for routes', () => {
    const plan = buildBrowserTestPlan({
      feature: 'login',
      routes: ['http://localhost:3000/login', 'http://localhost:3000/signup'],
      interactions: [],
    });
    assert.ok(plan.length >= 2);
    assert.ok(plan[0].name.includes('Page load'));
    assert.ok(plan[0].steps.length >= 3);
  });

  it('buildBrowserTestPlan creates tests for interactions', () => {
    const plan = buildBrowserTestPlan({
      feature: 'checkout',
      routes: [],
      interactions: ['Click buy button', 'Fill payment form'],
    });
    assert.ok(plan.length >= 2);
    assert.ok(plan[0].evidenceType === BROWSER_EVIDENCE_TYPES.VISUAL_DIFF);
  });

  it('orchestrateBrowserQA returns test plan with instructions', () => {
    const result = orchestrateBrowserQA('test-feature', {
      baseUrl: 'http://localhost:3000',
      routes: ['/home', '/about'],
      interactions: ['Click nav link'],
    });
    assert.ok(result.testPlan.length >= 3);
    assert.ok(result.instructions.length >= 5);
    assert.equal(result.evidenceCount, 0);
  });

  it('BROWSER_EVIDENCE_TYPES has 5 types', () => {
    assert.equal(Object.keys(BROWSER_EVIDENCE_TYPES).length, 5);
    assert.ok(BROWSER_EVIDENCE_TYPES.SCREENSHOT);
    assert.ok(BROWSER_EVIDENCE_TYPES.CONSOLE);
    assert.ok(BROWSER_EVIDENCE_TYPES.VISUAL_DIFF);
  });

  it('formatBrowserEvidence handles empty entries', () => {
    const result = formatBrowserEvidence([]);
    assert.ok(result.includes('No browser evidence'));
  });
});
