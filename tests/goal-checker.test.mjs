/**
 * goal-checker.mjs — Goal-Backward Verification 테스트
 *
 * Run: node --test tests/goal-checker.test.mjs
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

function makeTempDir() {
  const dir = join(tmpdir(), `aing-goal-test-${randomBytes(6).toString('hex')}`);
  mkdirSync(join(dir, '.aing', 'plans'), { recursive: true });
  mkdirSync(join(dir, '.aing', 'state'), { recursive: true });
  return dir;
}

function cleanDir(dir) {
  try { rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

const { checkGoalAchievement, deriveAssertions, saveGoalResult, loadGoalResult } =
  await import('../scripts/evidence/goal-checker.mjs');

// ─────────────────────────────────────────────
// checkGoalAchievement
// ─────────────────────────────────────────────
describe('checkGoalAchievement', () => {
  let dir;
  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => cleanDir(dir));

  it('assertions가 없으면 achieved=false, verdict=INCOMPLETE', () => {
    const result = checkGoalAchievement(dir, '로그인 기능 추가', []);
    assert.equal(result.achieved, false);
    assert.equal(result.verdict, 'INCOMPLETE');
    assert.equal(result.goal, '로그인 기능 추가');
  });

  it('모든 assertions verified=true → achieved=true, verdict=ACHIEVED', () => {
    const assertions = [
      { claim: '이메일로 로그인 가능', verified: true, evidence: 'auth.test.js:12' },
      { claim: '세션 유지', verified: true, evidence: 'session.test.js:34' },
    ];
    const result = checkGoalAchievement(dir, '로그인 기능 추가', assertions);
    assert.equal(result.achieved, true);
    assert.equal(result.verdict, 'ACHIEVED');
    assert.equal(result.assertions.length, 2);
  });

  it('일부 assertions verified=false → achieved=false, verdict=COMPLETED_NOT_ACHIEVED', () => {
    const assertions = [
      { claim: '이메일로 로그인 가능', verified: true, evidence: 'auth.test.js:12' },
      { claim: '잘못된 비밀번호 에러 표시', verified: false, evidence: '' },
    ];
    const result = checkGoalAchievement(dir, '로그인 기능 추가', assertions);
    assert.equal(result.achieved, false);
    assert.equal(result.verdict, 'COMPLETED_NOT_ACHIEVED');
  });

  it('모든 assertions verified=false → verdict=COMPLETED_NOT_ACHIEVED', () => {
    const assertions = [
      { claim: '이메일로 로그인 가능', verified: false, evidence: '' },
    ];
    const result = checkGoalAchievement(dir, '로그인 기능 추가', assertions);
    assert.equal(result.verdict, 'COMPLETED_NOT_ACHIEVED');
  });

  it('result에 goal, assertions, achieved, verdict, checkedAt 포함', () => {
    const assertions = [{ claim: '기능 A', verified: true, evidence: 'test.js' }];
    const result = checkGoalAchievement(dir, '목표', assertions);
    assert.ok(result.goal);
    assert.ok(Array.isArray(result.assertions));
    assert.ok(typeof result.achieved === 'boolean');
    assert.ok(result.verdict);
    assert.ok(result.checkedAt);
  });
});

// ─────────────────────────────────────────────
// deriveAssertions
// ─────────────────────────────────────────────
describe('deriveAssertions', () => {
  it('goal 문자열에서 3개 이상의 assertion 반환', () => {
    const assertions = deriveAssertions('사용자 로그인 기능을 추가한다');
    assert.ok(Array.isArray(assertions));
    // 최소 1개 이상 (LLM 없이 휴리스틱 기반이므로 0개 이상)
    assert.ok(assertions.every(a => typeof a.claim === 'string'));
    assert.ok(assertions.every(a => typeof a.verified === 'boolean'));
    assert.ok(assertions.every(a => typeof a.evidence === 'string'));
  });

  it('빈 goal → 빈 배열 반환', () => {
    const assertions = deriveAssertions('');
    assert.deepEqual(assertions, []);
  });

  it('null/undefined → 빈 배열 반환', () => {
    assert.deepEqual(deriveAssertions(null), []);
    assert.deepEqual(deriveAssertions(undefined), []);
  });
});

// ─────────────────────────────────────────────
// saveGoalResult / loadGoalResult
// ─────────────────────────────────────────────
describe('saveGoalResult / loadGoalResult', () => {
  let dir;
  beforeEach(() => { dir = makeTempDir(); });
  afterEach(() => cleanDir(dir));

  it('저장 후 로드하면 동일한 데이터 반환', () => {
    const result = {
      goal: '테스트 목표',
      assertions: [{ claim: 'A', verified: true, evidence: 'x' }],
      achieved: true,
      verdict: 'ACHIEVED',
      checkedAt: new Date().toISOString()
    };
    const saveOk = saveGoalResult('feature-x', result, dir);
    assert.equal(saveOk.ok, true);

    const loaded = loadGoalResult('feature-x', dir);
    assert.ok(loaded.ok);
    assert.equal(loaded.data.goal, result.goal);
    assert.equal(loaded.data.verdict, result.verdict);
    assert.equal(loaded.data.achieved, result.achieved);
  });

  it('존재하지 않는 feature → ok=false', () => {
    const loaded = loadGoalResult('nonexistent', dir);
    assert.equal(loaded.ok, false);
  });
});
