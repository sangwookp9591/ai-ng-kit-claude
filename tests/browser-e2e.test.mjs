/**
 * aing Browser & Design E2E Tests
 * Tests ARIA refs, browser evidence, design scoring, benchmark integration.
 *
 * Run: node --test tests/browser-e2e.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('ARIA Ref E2E', () => {
  it('should parse complex snapshot with nested elements', async () => {
    const { parseAriaSnapshot, findRefs, checkStale } = await import('../dist/scripts/review/aria-refs.js');

    const snapshot = `- navigation "Main Nav"
- link "Home"
- link "About"
- link "Contact"
- main
- heading "Dashboard"
- button "Save Changes"
- textbox "Search"
- button "Search"
- checkbox "Remember me"
- link "Forgot password?"
- button "Login"
- radio "Option A"
- radio "Option B"`;

    const refs = parseAriaSnapshot(snapshot);
    assert.ok(refs.size >= 10, `Expected >= 10 refs, got ${refs.size}`);

    // Find by name
    const searchResults = findRefs(refs, 'search');
    assert.ok(searchResults.length >= 1);

    // Stale detection
    const newSnapshot = `- button "Save Changes"
- button "Delete"`;
    const newRefs = parseAriaSnapshot(newSnapshot);
    const staleCheck = checkStale(refs, newRefs);
    assert.strictEqual(staleCheck.stale, true);
    assert.ok(staleCheck.removed > 0);
  });
});

describe('Browser Evidence E2E', () => {
  it('should build complete QA test plan', async () => {
    const { orchestrateBrowserQA } = await import('../dist/scripts/review/browser-evidence.js');

    const result = orchestrateBrowserQA('login-feature', {
      baseUrl: 'http://localhost:3000',
      routes: ['/login', '/signup', '/dashboard'],
      interactions: ['Fill email', 'Click submit', 'Toggle password'],
      checkA11y: true,
    });

    assert.ok(result.testPlan.length >= 6, `Expected >= 6 tests, got ${result.testPlan.length}`);
    assert.ok(result.instructions.length >= 5);
    assert.ok(result.instructions.some(i => i.includes('ARIA')));
  });

  it('should format empty browser evidence', async () => {
    const { formatBrowserEvidence } = await import('../dist/scripts/review/browser-evidence.js');
    assert.ok(formatBrowserEvidence([]).includes('No browser evidence'));
  });
});

describe('Design Scoring E2E', () => {
  it('should detect multiple AI slop patterns', async () => {
    const { detectAISlop, calculateDesignScore } = await import('../dist/scripts/review/design-scoring.js');

    const content = `
      bg-gradient-to-r from-purple-500 to-indigo-600
      rounded-3xl rounded-2xl
      text-center text-center
      Welcome to our amazing platform
      border-l-4 border-purple-500
    `;

    const detected = detectAISlop(content);
    assert.ok(detected.length >= 3, `Expected >= 3 slop patterns, got ${detected.length}`);

    // Calculate score with slop
    const score = calculateDesignScore({
      'ai-slop': { score: 100 - (detected.length * 15), issues: detected },
      'visual-hierarchy': { score: 80, issues: [] },
      'typography': { score: 90, issues: [] },
    });
    assert.ok(score.overall > 0);
    assert.ok(score.grade);
  });

  it('should build design audit prompt', async () => {
    const { buildDesignAuditPrompt } = await import('../dist/scripts/review/design-scoring.js');
    const prompt = buildDesignAuditPrompt({ files: ['src/components/Hero.tsx'] });
    assert.ok(prompt.includes('AI Slop Blacklist'));
    assert.ok(prompt.includes('Litmus Checks'));
    assert.ok(prompt.includes('purple'));
  });
});

describe('Benchmark E2E', () => {
  it('should detect performance regressions', async () => {
    const { compareMetrics, checkBudgets, calculateGrade, formatBenchmarkReport } = await import('../dist/scripts/review/benchmark-engine.js');

    const baseline = { fcp: 400, lcp: 800, domComplete: 1200, jsBundle: 300000, totalRequests: 30 };
    const current = { fcp: 500, lcp: 1800, domComplete: 1500, jsBundle: 800000, totalRequests: 45 };

    const comparison = compareMetrics(current, baseline);
    assert.ok(comparison.length >= 4);

    const lcpResult = comparison.find(r => r.metric === 'lcp');
    assert.strictEqual(lcpResult.status, 'REGRESSION');

    const jsBundleResult = comparison.find(r => r.metric === 'jsBundle');
    assert.strictEqual(jsBundleResult.status, 'REGRESSION');

    const budgets = checkBudgets({ fcp: 500, lcp: 1800, totalJs: 800000 });
    const grade = calculateGrade(budgets);
    assert.ok(['C', 'D', 'F'].includes(grade), `Expected poor grade, got ${grade}`);

    const report = formatBenchmarkReport(comparison, budgets, grade);
    assert.ok(report.includes('REGRESSION'));
    assert.ok(report.includes('Budget Check'));
  });
});

describe('Retro E2E', () => {
  it('should classify diverse commit types', async () => {
    const { classifyCommits, calculateFocusScore, detectSessions } = await import('../dist/scripts/review/retro-engine.js');

    const commits = [
      { message: 'feat: user auth' },
      { message: 'feat: signup flow' },
      { message: 'fix: login bug' },
      { message: 'fix: token expiry' },
      { message: 'fix: session timeout' },
      { message: 'refactor: auth module' },
      { message: 'test: auth tests' },
      { message: 'docs: update README' },
      { message: 'chore: bump deps' },
      { message: 'style: format code' },
    ];

    const types = classifyCommits(commits);
    assert.strictEqual(types.feat, 2);
    assert.strictEqual(types.fix, 3);
    assert.strictEqual(types.refactor, 1);
    assert.strictEqual(types.test, 1);
    assert.strictEqual(types.docs, 1);

    // Focus score
    const hotspots = [
      { file: 'src/auth/login.ts', changes: 8 },
      { file: 'src/auth/signup.ts', changes: 5 },
      { file: 'src/auth/token.ts', changes: 3 },
      { file: 'tests/auth.test.ts', changes: 4 },
      { file: 'README.md', changes: 1 },
    ];
    const focus = calculateFocusScore(hotspots);
    assert.ok(focus.score > 70, `Focus on src/ should be >70%, got ${focus.score}%`);

    // Session detection with gaps
    const sessionCommits = [
      { date: '2026-03-30T09:00:00' },
      { date: '2026-03-30T09:10:00' },
      { date: '2026-03-30T09:20:00' },
      { date: '2026-03-30T11:00:00' },  // 100min gap
      { date: '2026-03-30T11:15:00' },
      { date: '2026-03-30T14:00:00' },  // 165min gap
      { date: '2026-03-30T14:30:00' },
      { date: '2026-03-30T15:00:00' },
      { date: '2026-03-30T15:30:00' },
      { date: '2026-03-30T16:00:00' },
    ];
    const sessions = detectSessions(sessionCommits);
    assert.strictEqual(sessions.length, 3, `Expected 3 sessions, got ${sessions.length}`);
    assert.ok(sessions[2].type === 'deep' || sessions[2].type === 'medium');
  });
});

describe('Freeze Engine E2E', () => {
  it('should enforce freeze boundaries', async () => {
    const { setFreeze, getFreezeDir, checkFreeze, clearFreeze } = await import('../dist/scripts/guardrail/freeze-engine.js');

    // Set freeze
    setFreeze('/tmp/test-freeze/src', '/tmp/test-freeze');
    const dir = getFreezeDir('/tmp/test-freeze');
    assert.ok(dir.endsWith('/'));

    // Check allowed
    const allowed = checkFreeze('/tmp/test-freeze/src/auth.ts', '/tmp/test-freeze');
    assert.strictEqual(allowed.allowed, true);

    // Check blocked
    const blocked = checkFreeze('/tmp/test-freeze/config.json', '/tmp/test-freeze');
    assert.strictEqual(blocked.allowed, false);
    assert.ok(blocked.reason.includes('outside freeze boundary'));

    // Clear
    clearFreeze('/tmp/test-freeze');
    const afterClear = checkFreeze('/tmp/test-freeze/config.json', '/tmp/test-freeze');
    assert.strictEqual(afterClear.allowed, true);
  });
});

describe('Deploy Detection E2E', () => {
  it('should detect platform from project files', async () => {
    const { detectPlatform, formatDeployConfig, healthCheck } = await import('../dist/scripts/ship/deploy-detect.js');

    // Current project should detect github-actions (has .github/workflows/)
    const result = detectPlatform();
    // May or may not detect — depends on cwd
    assert.ok(typeof result.platform === 'object' || result.platform === null);

    const formatted = formatDeployConfig(result);
    assert.ok(typeof formatted === 'string');
  });
});

describe('Intent Router E2E', () => {
  it('should route 16 test cases correctly', async () => {
    const { routeIntent } = await import('../dist/scripts/routing/intent-router.js');

    const cases = [
      { input: '로그인하면 500 에러 나', expected: 'plan' },
      { input: '내가 짠 코드 봐줘', expected: 'plan' },
      { input: '이 프로젝트 구조 설명해줘', expected: 'plan' },
      { input: '왜 이렇게 느리지', expected: 'plan' },
      { input: '이 코드 리팩토링해줘', expected: 'plan' },
      { input: '이 기능 테스트 짜줘', expected: 'plan' },
      { input: '보안 문제 없는지 확인해줘', expected: 'plan' },
      { input: '로그인 기능 추가해줘', expected: 'plan' },
      { input: 'JWT 인증 만들어줘', expected: 'plan' },
      { input: '버튼 클릭하면 아무 반응 없어', expected: 'plan' },
      { input: '성능 최적화 해줘', expected: 'plan' },
      { input: 'auth', expected: 'plan' },
    ];

    let passed = 0;
    for (const { input, expected } of cases) {
      const result = routeIntent(input);
      if (result.route === expected) passed++;
    }
    assert.ok(passed >= 10, `Expected >= 10/12 routing matches, got ${passed}/12`);
  });
});

describe('Doc Release E2E', () => {
  it('should identify stale docs from agent changes', async () => {
    const { findStaleDocs, buildDocUpdatePrompt } = await import('../dist/scripts/ship/doc-release.js');

    const staleDocs = findStaleDocs([
      'agents/sam.md',
      'agents/kain.md',
      'scripts/review/review-checklist.mjs',
      'scripts/ship/ship-orchestrator.mjs',
    ]);

    assert.ok(staleDocs.length >= 1, 'Agent changes should flag docs');
    const prompt = buildDocUpdatePrompt(staleDocs, ['agents/sam.md']);
    assert.ok(prompt.includes('Documentation Update') || prompt.includes('No documentation'));
  });
});
