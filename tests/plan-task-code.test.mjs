/**
 * Plan-Task Code-Level Enforcement Tests
 * Tests: plan-gate, plan-state, quality-gate, complexity-scorer extensions
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '.test-plan-code-tmp');

describe('Plan-Task Code Enforcement', () => {
  before(() => {
    mkdirSync(join(TEST_DIR, '.aing', 'state'), { recursive: true });
  });

  after(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  // =========================================================================
  // plan-gate.ts
  // =========================================================================
  describe('Plan Gate (Pre-execution)', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/hooks/plan-gate.js');
    });

    it('should PASS for file path references', () => {
      const r = mod.checkPlanGate('src/auth/jwt.ts에 검증 미들웨어 추가');
      assert.equal(r.verdict, 'PASS');
      assert.ok(r.anchorsFound.includes('file-path'));
    });

    it('should PASS for code symbols', () => {
      const r = mod.checkPlanGate('validateToken 함수 수정');
      assert.equal(r.verdict, 'PASS');
      assert.ok(r.anchorsFound.includes('code-symbol'));
    });

    it('should PASS for issue references', () => {
      const r = mod.checkPlanGate('#42 이슈 해결');
      assert.equal(r.verdict, 'PASS');
      assert.ok(r.anchorsFound.includes('issue-ref'));
    });

    it('should PASS for numbered lists', () => {
      const r = mod.checkPlanGate('1. 인증 추가\n2. 테스트 작성\n3. 배포');
      assert.equal(r.verdict, 'PASS');
      assert.ok(r.anchorsFound.includes('numbered-list'));
    });

    it('should PASS for long descriptions (>15 words)', () => {
      const r = mod.checkPlanGate('사용자 로그인 시에 JWT 토큰을 발급하고 리프레시 토큰을 쿠키에 저장하는 인증 시스템을 구현해야 합니다 그리고 만료 처리와 갱신 로직도 필요합니다');
      assert.equal(r.verdict, 'PASS');
    });

    it('should BLOCK for vague short requests', () => {
      const r = mod.checkPlanGate('성능 개선');
      assert.equal(r.verdict, 'BLOCK');
      assert.equal(r.anchorsFound.length, 0);
    });

    it('should BLOCK for very short input', () => {
      const r = mod.checkPlanGate('고쳐줘');
      assert.equal(r.verdict, 'BLOCK');
    });

    it('should PASS with force: prefix', () => {
      const r = mod.checkPlanGate('force: 그냥 해줘');
      assert.equal(r.verdict, 'PASS');
      assert.ok(r.anchorsFound.includes('force:'));
    });

    it('should PASS for error references', () => {
      const r = mod.checkPlanGate('TypeError: Cannot read property 해결');
      assert.equal(r.verdict, 'PASS');
      assert.ok(r.anchorsFound.includes('error-ref'));
    });

    it('should PASS for code blocks', () => {
      const r = mod.checkPlanGate('이 코드 수정:\n```\nconst x = 1;\n```');
      assert.equal(r.verdict, 'PASS');
      assert.ok(r.anchorsFound.includes('code-block'));
    });
  });

  // =========================================================================
  // plan-state.ts
  // =========================================================================
  describe('Plan State Lifecycle', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/hooks/plan-state.js');
    });

    it('should initialize plan state', () => {
      const state = mod.initPlanState(TEST_DIR, 'auth-api', { complexity: 'mid' });
      assert.equal(state.active, true);
      assert.equal(state.phase, 'gate');
      assert.equal(state.feature, 'auth-api');
      assert.equal(state.iteration, 0);
      assert.equal(state.maxIterations, 3);
      assert.deepEqual(state.phaseHistory, ['gate']);
    });

    it('should advance phases', () => {
      mod.advancePhase(TEST_DIR, 'foundation');
      mod.advancePhase(TEST_DIR, 'option-design');
      const state = mod.readPlanState(TEST_DIR);
      assert.equal(state.phase, 'option-design');
      assert.ok(state.phaseHistory.includes('foundation'));
      assert.ok(state.phaseHistory.includes('option-design'));
    });

    it('should support loop (ITERATE back to option-design)', () => {
      mod.advancePhase(TEST_DIR, 'steelman');
      mod.advancePhase(TEST_DIR, 'synthesis');
      mod.advancePhase(TEST_DIR, 'synthesis-check');
      mod.advancePhase(TEST_DIR, 'critique');
      // ITERATE → back to option-design
      mod.advancePhase(TEST_DIR, 'option-design');
      const state = mod.readPlanState(TEST_DIR);
      assert.equal(state.phase, 'option-design');
    });

    it('should increment iteration and detect max', () => {
      const ok1 = mod.incrementIteration(TEST_DIR); // 1
      assert.equal(ok1, true);
      mod.incrementIteration(TEST_DIR); // 2
      mod.incrementIteration(TEST_DIR); // 3
      mod.incrementIteration(TEST_DIR); // 4
      const ok5 = mod.incrementIteration(TEST_DIR); // 5 = max for mid
      assert.equal(ok5, false); // max reached
    });

    it('should complete plan', () => {
      mod.completePlan(TEST_DIR, 'HIGH', 'APPROVE');
      const state = mod.readPlanState(TEST_DIR);
      assert.equal(state.active, false);
      assert.equal(state.phase, 'completed');
      assert.equal(state.confidence, 'HIGH');
    });

    it('should terminate plan', () => {
      mod.initPlanState(TEST_DIR, 'test-terminate');
      mod.terminatePlan(TEST_DIR, 'user_reject');
      const state = mod.readPlanState(TEST_DIR);
      assert.equal(state.active, false);
      assert.equal(state.terminated, true);
      assert.equal(state.terminateReason, 'user_reject');
    });

    it('should validate phase sequence', () => {
      const { valid, issues } = mod.validatePhaseSequence([
        'gate', 'foundation', 'option-design', 'steelman', 'synthesis', 'critique',
      ]);
      assert.equal(valid, false); // skipped synthesis-check
      assert.ok(issues.length > 0);

      const { valid: v2 } = mod.validatePhaseSequence([
        'gate', 'foundation', 'option-design', 'steelman', 'synthesis', 'synthesis-check', 'critique', 'completed',
      ]);
      assert.equal(v2, true);
    });

    it('should provide resume info', () => {
      mod.initPlanState(TEST_DIR, 'resume-test');
      mod.advancePhase(TEST_DIR, 'foundation');
      mod.advancePhase(TEST_DIR, 'steelman');
      const info = mod.getResumeInfo(TEST_DIR);
      assert.equal(info.canResume, true);
      assert.equal(info.feature, 'resume-test');
      assert.equal(info.phase, 'steelman');
    });
  });

  // =========================================================================
  // quality-gate.ts
  // =========================================================================
  describe('Quality Gate', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/hooks/quality-gate.js');
    });

    it('should measure evidence coverage', () => {
      const plan = `## Steps
- Add auth middleware in src/auth/jwt.ts:42
- Update routes in src/routes/api.ts
- Configure something manually
## Risks
- Token expiry: check src/utils/token.ts:15`;
      const coverage = mod.measureEvidenceCoverage(plan);
      assert.ok(coverage >= 50); // 3/4 have file refs
    });

    it('should measure criteria testability', () => {
      const plan = `- [ ] 로그인 시 JWT 토큰이 발급되어야 한다
- [ ] 응답 시간이 적절히 빨라야 한다
- [ ] 토큰 만료 시 401 반환`;
      const testability = mod.measureCriteriaTestability(plan);
      assert.ok(testability < 100); // "적절히" is vague
      assert.ok(testability >= 50);
    });

    it('should measure constraint compliance', () => {
      const json = {
        constraints: [
          { name: 'C1', honored: true },
          { name: 'C2', honored: true },
          { name: 'C3', honored: false },
        ]
      };
      const compliance = mod.measureConstraintCompliance(json);
      assert.equal(compliance, 67); // 2/3
    });

    it('should count FRAGILE unaddressed', () => {
      const critic = `- Auth token storage: FRAGILE — no plan for this
- DB connection pool: VERIFIED
- API rate limit: FRAGILE — mitigated by caching`;
      const count = mod.countFragileUnaddressed(critic);
      assert.equal(count, 1); // only first is unaddressed
    });

    it('should count IGNORED steelman', () => {
      const noa = `| 1 | antithesis | response | ABSORBED |
| 2 | tradeoff | noted | IGNORED |
| 3 | driver | accepted | REBUTTED |`;
      const count = mod.countIgnoredSteelman(noa);
      assert.equal(count, 1);
    });

    it('should run full quality gate — PASS', () => {
      const result = mod.checkQualityGate(
        '## Steps\n- Do thing in src/a.ts:1\n- Do other in src/b.ts:2\n## Risks\n- Risk in src/c.ts',
        { constraints: [{ name: 'C1', honored: true }] },
        'All VERIFIED',
        'All ABSORBED'
      );
      assert.equal(result.pass, true);
      assert.equal(result.failures.length, 0);
    });

    it('should run full quality gate — FAIL on IGNORED', () => {
      const result = mod.checkQualityGate(
        '## Steps\n- Do thing in src/a.ts:1',
        { constraints: [{ name: 'C1', honored: true }] },
        'VERIFIED',
        '| 1 | point | none | IGNORED |'
      );
      assert.equal(result.pass, false);
      assert.ok(result.failures.some(f => f.includes('IGNORED')));
    });
  });

  // =========================================================================
  // complexity-scorer.ts extensions
  // =========================================================================
  describe('Complexity Scorer Extensions', () => {
    let mod;
    before(async () => {
      mod = await import('../dist/scripts/routing/complexity-scorer.js');
    });

    it('should determine DR depth', () => {
      assert.equal(mod.getDRDepth('low'), 'lite');
      assert.equal(mod.getDRDepth('mid'), 'standard');
      assert.equal(mod.getDRDepth('high'), 'deep');
    });

    it('should force deliberate on security + high score', () => {
      assert.equal(mod.shouldForceDeliberate({ hasSecurity: true }, 6), true);
      assert.equal(mod.shouldForceDeliberate({ hasSecurity: true }, 4), false);  // score too low
      assert.equal(mod.shouldForceDeliberate({ hasArchChange: true }, 7), true);
      assert.equal(mod.shouldForceDeliberate({}, 10), false);  // no risk signal
    });

    it('should return max iterations by level', () => {
      assert.equal(mod.getMaxIterations('low'), 3);
      assert.equal(mod.getMaxIterations('mid'), 5);
      assert.equal(mod.getMaxIterations('high'), 5);
    });
  });
});
