/**
 * aing Browser Modules Test Suite
 * Tests ARIA ref system, browser evidence, QA orchestration.
 *
 * Run: node --test tests/browser-modules.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('ARIA Ref System', () => {
  it('should parse interactive elements from snapshot', async () => {
    const { parseAriaSnapshot } = await import('../dist/scripts/review/aria-refs.js');

    const snapshot = `- button "Submit"
- link "Home"
- textbox "Email"
- heading "Welcome"
- button "Cancel"
- paragraph "Some text"
- checkbox "Remember me"
- link "About"`;

    const refs = parseAriaSnapshot(snapshot);

    // Should only include interactive roles (not heading, paragraph)
    assert.ok(refs.size >= 5, `Expected >= 5 refs, got ${refs.size}`);

    // Verify ref naming
    assert.ok(refs.has('@e1'), 'First ref should be @e1');
    assert.strictEqual(refs.get('@e1').role, 'button');
    assert.strictEqual(refs.get('@e1').name, 'Submit');
  });

  it('should handle duplicate role+name with nth()', async () => {
    const { parseAriaSnapshot } = await import('../dist/scripts/review/aria-refs.js');

    const snapshot = `- button "Save"
- button "Save"
- button "Delete"`;

    const refs = parseAriaSnapshot(snapshot);

    // First Save should not have nth
    const first = refs.get('@e1');
    assert.ok(!first.selector.includes('.nth('), 'First "Save" should not have nth');

    // Second Save should have nth(1)
    const second = refs.get('@e2');
    assert.ok(second.selector.includes('.nth(1)'), `Second "Save" should have nth(1), got: ${second.selector}`);
  });

  it('should return empty map for empty snapshot', async () => {
    const { parseAriaSnapshot } = await import('../dist/scripts/review/aria-refs.js');
    const refs = parseAriaSnapshot('');
    assert.strictEqual(refs.size, 0);
  });

  it('should return empty map for null input', async () => {
    const { parseAriaSnapshot } = await import('../dist/scripts/review/aria-refs.js');
    const refs = parseAriaSnapshot(null);
    assert.strictEqual(refs.size, 0);
  });

  it('should format refs for display', async () => {
    const { parseAriaSnapshot, formatRefs } = await import('../dist/scripts/review/aria-refs.js');

    const snapshot = `- button "Submit"
- link "Home"`;

    const refs = parseAriaSnapshot(snapshot);
    const formatted = formatRefs(refs);

    assert.ok(formatted.includes('ARIA Refs:'));
    assert.ok(formatted.includes('@e1'));
    assert.ok(formatted.includes('Submit'));
  });

  it('should find refs by partial name', async () => {
    const { parseAriaSnapshot, findRefs } = await import('../dist/scripts/review/aria-refs.js');

    const snapshot = `- button "Submit Form"
- button "Cancel"
- link "Submit Report"`;

    const refs = parseAriaSnapshot(snapshot);
    const matches = findRefs(refs, 'submit');

    assert.ok(matches.length >= 2, `Expected >= 2 matches for "submit", got ${matches.length}`);
  });

  it('should detect stale refs', async () => {
    const { parseAriaSnapshot, checkStale } = await import('../dist/scripts/review/aria-refs.js');

    const oldSnapshot = `- button "A"
- button "B"
- button "C"`;

    const newSnapshot = `- button "A"
- button "B"`;

    const oldRefs = parseAriaSnapshot(oldSnapshot);
    const newRefs = parseAriaSnapshot(newSnapshot);
    const result = checkStale(oldRefs, newRefs);

    assert.strictEqual(result.stale, true);
    assert.strictEqual(result.removed, 1);
  });

  it('should build MCP actions from refs', async () => {
    const { parseAriaSnapshot, buildAction } = await import('../dist/scripts/review/aria-refs.js');

    const snapshot = `- button "Submit"`;
    const refs = parseAriaSnapshot(snapshot);

    const clickAction = buildAction('@e1', 'click', refs);
    assert.ok(clickAction, 'Should return action for valid ref');
    assert.strictEqual(clickAction.tool, 'mcp__playwright__browser_click');

    const fillAction = buildAction('@e1', 'fill', refs, 'test value');
    assert.ok(fillAction, 'Should return fill action');

    const invalidAction = buildAction('@e99', 'click', refs);
    assert.strictEqual(invalidAction, null, 'Should return null for invalid ref');
  });
});

describe('Browser Evidence Types', () => {
  it('should export evidence type constants', async () => {
    const { BROWSER_EVIDENCE_TYPES } = await import('../dist/scripts/review/browser-evidence.js');

    assert.ok(BROWSER_EVIDENCE_TYPES.SCREENSHOT);
    assert.ok(BROWSER_EVIDENCE_TYPES.CONSOLE);
    assert.ok(BROWSER_EVIDENCE_TYPES.NETWORK);
    assert.ok(BROWSER_EVIDENCE_TYPES.ACCESSIBILITY);
    assert.ok(BROWSER_EVIDENCE_TYPES.VISUAL_DIFF);
  });

  it('should build browser test plan', async () => {
    const { buildBrowserTestPlan } = await import('../dist/scripts/review/browser-evidence.js');

    const plan = buildBrowserTestPlan({
      feature: 'login',
      routes: ['http://localhost:3000/login', 'http://localhost:3000/dashboard'],
      interactions: ['Fill email', 'Click submit'],
    });

    // Should have page load tests + interaction tests
    assert.ok(plan.length >= 4, `Expected >= 4 tests, got ${plan.length}`);

    // Page load tests
    const pageLoadTests = plan.filter(t => t.name.startsWith('Page load'));
    assert.strictEqual(pageLoadTests.length, 2);

    // Interaction tests
    const interactionTests = plan.filter(t => t.name.startsWith('Interaction'));
    assert.strictEqual(interactionTests.length, 2);
  });

  it('should format browser evidence', async () => {
    const { formatBrowserEvidence } = await import('../dist/scripts/review/browser-evidence.js');

    const entries = [
      { type: 'browser-screenshot', result: 'pass', details: { url: 'http://localhost:3000' } },
      { type: 'browser-console', result: 'fail', details: { url: 'http://localhost:3000', errorCount: 3 } },
    ];

    const formatted = formatBrowserEvidence(entries);
    assert.ok(formatted.includes('Browser Evidence:'));
    assert.ok(formatted.includes('1/2 passed'));
  });

  it('should orchestrate browser QA', async () => {
    const { orchestrateBrowserQA } = await import('../dist/scripts/review/browser-evidence.js');

    const result = orchestrateBrowserQA('auth-feature', {
      baseUrl: 'http://localhost:3000',
      routes: ['/login', '/signup'],
      interactions: ['Fill form', 'Submit'],
      checkA11y: true,
      checkConsole: true,
    });

    assert.ok(result.testPlan.length > 0, 'Should generate test plan');
    assert.ok(result.instructions.length > 0, 'Should generate instructions');
    assert.ok(result.instructions.some(i => i.includes('accessibility')), 'Should include a11y check');
  });
});

describe('Benchmark Engine', () => {
  it('should compare metrics and detect regressions', async () => {
    const { compareMetrics } = await import('../dist/scripts/review/benchmark-engine.js');

    const baseline = { fcp: 400, lcp: 800, jsBundle: 400000, totalRequests: 40 };
    const current = { fcp: 700, lcp: 1800, jsBundle: 600000, totalRequests: 40 };

    const results = compareMetrics(current, baseline);
    const lcp = results.find(r => r.metric === 'lcp');

    assert.ok(lcp, 'Should have LCP comparison');
    assert.strictEqual(lcp.status, 'REGRESSION', `LCP 800→1800 should be REGRESSION, got ${lcp.status}`);
  });

  it('should check performance budgets', async () => {
    const { checkBudgets } = await import('../dist/scripts/review/benchmark-engine.js');

    const metrics = { fcp: 500, lcp: 1200, totalJs: 800000 };
    const results = checkBudgets(metrics);

    const fcp = results.find(r => r.metric === 'First Contentful Paint');
    assert.ok(fcp, 'Should check FCP budget');
    assert.strictEqual(fcp.status, 'PASS');

    const js = results.find(r => r.metric === 'Total JavaScript');
    assert.ok(js, 'Should check JS budget');
    assert.strictEqual(js.status, 'FAIL', 'JS 800KB should fail 500KB budget');
  });

  it('should calculate performance grade', async () => {
    const { calculateGrade } = await import('../dist/scripts/review/benchmark-engine.js');

    assert.strictEqual(calculateGrade([
      { status: 'PASS' }, { status: 'PASS' }, { status: 'PASS' },
    ]), 'A');

    assert.strictEqual(calculateGrade([
      { status: 'PASS' }, { status: 'FAIL' }, { status: 'FAIL' },
    ]), 'F');
  });
});

describe('Retro Engine', () => {
  it('should classify commits by type', async () => {
    const { classifyCommits } = await import('../dist/scripts/review/retro-engine.js');

    const commits = [
      { message: 'feat: add login' },
      { message: 'fix: null check' },
      { message: 'fix: typo' },
      { message: 'refactor: extract helper' },
      { message: 'test: add auth tests' },
      { message: 'random message' },
    ];

    const types = classifyCommits(commits);
    assert.strictEqual(types.feat, 1);
    assert.strictEqual(types.fix, 2);
    assert.strictEqual(types.refactor, 1);
    assert.strictEqual(types.test, 1);
    assert.strictEqual(types.other, 1);
  });

  it('should detect sessions with 45-min gap', async () => {
    const { detectSessions } = await import('../dist/scripts/review/retro-engine.js');

    const commits = [
      { date: '2026-03-30T10:00:00' },
      { date: '2026-03-30T10:15:00' },
      { date: '2026-03-30T10:30:00' },
      // 2-hour gap
      { date: '2026-03-30T12:30:00' },
      { date: '2026-03-30T12:45:00' },
    ];

    const sessions = detectSessions(commits);
    assert.strictEqual(sessions.length, 2, `Expected 2 sessions, got ${sessions.length}`);
    assert.strictEqual(sessions[0].commits, 3);
    assert.strictEqual(sessions[1].commits, 2);
  });

  it('should calculate focus score', async () => {
    const { calculateFocusScore } = await import('../dist/scripts/review/retro-engine.js');

    const hotspots = [
      { file: 'src/auth/login.ts', changes: 5 },
      { file: 'src/auth/signup.ts', changes: 3 },
      { file: 'tests/auth.test.ts', changes: 2 },
      { file: 'README.md', changes: 1 },
    ];

    const result = calculateFocusScore(hotspots);
    assert.ok(result.score > 50, 'src should dominate');
    assert.strictEqual(result.focusDir, 'src');
  });
});

describe('Freeze Engine', () => {
  it('should check freeze boundaries with trailing slash', async () => {
    const { checkFreeze } = await import('../dist/scripts/guardrail/freeze-engine.js');

    // No freeze = everything allowed
    const result = checkFreeze('/any/path');
    assert.strictEqual(result.allowed, true);
  });
});

describe('Deploy Detection', () => {
  it('should have platform definitions', async () => {
    const { PLATFORMS } = await import('../dist/scripts/ship/deploy-detect.js');

    assert.ok(PLATFORMS.length >= 5, `Expected >= 5 platforms, got ${PLATFORMS.length}`);

    const names = PLATFORMS.map(p => p.name);
    assert.ok(names.includes('Fly.io'));
    assert.ok(names.includes('Vercel'));
    assert.ok(names.includes('Netlify'));
  });
});

describe('Doc Release', () => {
  it('should identify stale docs from changed files', async () => {
    const { findStaleDocs } = await import('../dist/scripts/ship/doc-release.js');

    const staleDocs = findStaleDocs([
      'agents/sam.md',
      'skills/ship/SKILL.md.tmpl',
      'scripts/review/review-engine.mjs',
    ]);

    // Agent/skill changes should flag CLAUDE.md
    const claudeDoc = staleDocs.find(d => d.file === 'CLAUDE.md');
    assert.ok(claudeDoc, 'Agent changes should flag CLAUDE.md');
  });

  it('should always suggest checking TODOS.md', async () => {
    const { findStaleDocs } = await import('../dist/scripts/ship/doc-release.js');

    const staleDocs = findStaleDocs(['any-file.ts']);
    const todos = staleDocs.find(d => d.file === 'TODOS.md');
    assert.ok(todos, 'TODOS.md should always be suggested');
  });
});

describe('LLM Judge', () => {
  it('should parse JSON judge response', async () => {
    const { parseJudgeResponse } = await import('../dist/scripts/evidence/llm-judge.js');

    const response = 'Some preamble text. {"score": 8, "issues": ["minor naming"], "summary": "Good quality"} trailing text.';
    const result = parseJudgeResponse(response);

    assert.ok(result, 'Should parse JSON from mixed text');
    assert.strictEqual(result.score, 8);
    assert.strictEqual(result.issues.length, 1);
  });

  it('should clamp scores to 0-10', async () => {
    const { parseJudgeResponse } = await import('../dist/scripts/evidence/llm-judge.js');

    assert.strictEqual(parseJudgeResponse('{"score": 15, "issues": [], "summary": ""}').score, 10);
    assert.strictEqual(parseJudgeResponse('{"score": -5, "issues": [], "summary": ""}').score, 0);
  });

  it('should select criteria based on signals', async () => {
    const { selectCriteria, JUDGE_CRITERIA } = await import('../dist/scripts/evidence/llm-judge.js');

    const uiCriteria = selectCriteria({ hasUI: true });
    assert.ok(uiCriteria.includes(JUDGE_CRITERIA.UX_QUALITY));
    assert.ok(uiCriteria.includes(JUDGE_CRITERIA.DESIGN_QUALITY));

    const secCriteria = selectCriteria({ hasSecurity: true });
    assert.ok(secCriteria.includes(JUDGE_CRITERIA.SECURITY));
  });
});

describe('Telemetry', () => {
  it('should have telemetry tier constants', async () => {
    const { TELEMETRY_TIERS } = await import('../dist/scripts/telemetry/telemetry-engine.js');
    assert.strictEqual(TELEMETRY_TIERS.COMMUNITY, 'community');
    assert.strictEqual(TELEMETRY_TIERS.ANONYMOUS, 'anonymous');
    assert.strictEqual(TELEMETRY_TIERS.OFF, 'off');
  });
});
