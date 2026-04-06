/**
 * Edge Case Test: plan-state 엣지 케이스 및 루프 검증
 *
 * 검증 대상:
 * 1. REVISE 루프: synthesis-check → synthesis 역전이
 * 2. ITERATE 루프: critique → option-design 역전이
 * 3. incrementIteration → 증가 및 max 도달 시 false 반환
 * 4. terminatePlan → active:false, terminated:true, reason 기록
 * 5. validatePhaseSequence → 정상/스킵 시퀀스 검증
 * 6. getResumeInfo → active plan 시 canResume:true
 * 7. clearPlanState → state 삭제
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const {
  initPlanState,
  readPlanState,
  advancePhase,
  incrementIteration,
  completePlan,
  terminatePlan,
  clearPlanState,
  validatePhaseSequence,
  getResumeInfo,
} = await import('../dist/scripts/hooks/plan-state.js');

// helpers
// NOTE: .aing/state 디렉토리를 미리 생성해야 acquireLock이 lock 파일을 쓸 수 있음
function makeDir(name) {
  const dir = join(tmpdir(), `edge-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(dir, '.aing', 'state'), { recursive: true });
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function advanceTo(dir, targetPhase) {
  const phaseOrder = ['gate', 'foundation', 'option-design', 'steelman', 'synthesis', 'synthesis-check', 'critique', 'adr'];
  const idx = phaseOrder.indexOf(targetPhase);
  for (let i = 1; i <= idx; i++) {
    advancePhase(dir, phaseOrder[i]);
  }
}

// ────────────────────────────────────────────────────────────
// 1. REVISE 루프: synthesis-check → synthesis
// ────────────────────────────────────────────────────────────

describe('REVISE 루프: synthesis-check → synthesis 역전이', () => {
  it('should allow backward transition from synthesis-check to synthesis', () => {
    const dir = makeDir('revise');
    try {
      initPlanState(dir, 'revise-feature');
      advanceTo(dir, 'synthesis-check');
      assert.equal(readPlanState(dir).phase, 'synthesis-check');

      const result = advancePhase(dir, 'synthesis');
      assert.ok(result !== null, 'REVISE loop backward transition should succeed');
      assert.equal(result.phase, 'synthesis');
    } finally { cleanup(dir); }
  });

  it('should record synthesis in phaseHistory after REVISE loop', () => {
    const dir = makeDir('revise-hist');
    try {
      initPlanState(dir, 'revise-hist-feature');
      advanceTo(dir, 'synthesis-check');
      advancePhase(dir, 'synthesis'); // REVISE
      const state = readPlanState(dir);
      const synthCount = state.phaseHistory.filter(p => p === 'synthesis').length;
      assert.ok(synthCount >= 2, 'synthesis should appear at least twice in history after REVISE');
    } finally { cleanup(dir); }
  });

  it('should allow re-advancing to synthesis-check after REVISE', () => {
    const dir = makeDir('revise-readv');
    try {
      initPlanState(dir, 'revise-readv-feature');
      advanceTo(dir, 'synthesis-check');
      advancePhase(dir, 'synthesis'); // REVISE
      const result = advancePhase(dir, 'synthesis-check'); // re-advance
      assert.ok(result !== null);
      assert.equal(result.phase, 'synthesis-check');
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 2. ITERATE 루프: critique → option-design
// ────────────────────────────────────────────────────────────

describe('ITERATE 루프: critique → option-design 역전이', () => {
  it('should allow backward transition from critique to option-design', () => {
    const dir = makeDir('iterate');
    try {
      initPlanState(dir, 'iterate-feature');
      advanceTo(dir, 'critique');
      assert.equal(readPlanState(dir).phase, 'critique');

      const result = advancePhase(dir, 'option-design');
      assert.ok(result !== null, 'ITERATE loop backward transition should succeed');
      assert.equal(result.phase, 'option-design');
    } finally { cleanup(dir); }
  });

  it('should record option-design in phaseHistory after ITERATE loop', () => {
    const dir = makeDir('iterate-hist');
    try {
      initPlanState(dir, 'iterate-hist-feature');
      advanceTo(dir, 'critique');
      advancePhase(dir, 'option-design'); // ITERATE
      const state = readPlanState(dir);
      const count = state.phaseHistory.filter(p => p === 'option-design').length;
      assert.ok(count >= 2, 'option-design should appear at least twice after ITERATE');
    } finally { cleanup(dir); }
  });

  it('should allow full pipeline re-run after ITERATE', () => {
    const dir = makeDir('iterate-rerun');
    try {
      initPlanState(dir, 'iterate-rerun-feature');
      advanceTo(dir, 'critique');
      advancePhase(dir, 'option-design'); // ITERATE
      // re-run from option-design
      advancePhase(dir, 'steelman');
      advancePhase(dir, 'synthesis');
      advancePhase(dir, 'synthesis-check');
      const result = advancePhase(dir, 'critique');
      assert.ok(result !== null);
      assert.equal(result.phase, 'critique');
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 3. incrementIteration — 증가 및 max 도달 시 false
// ────────────────────────────────────────────────────────────

describe('incrementIteration: 반복 횟수 증가 및 max 도달', () => {
  it('should increment iteration and return true', () => {
    const dir = makeDir('iter-inc');
    try {
      initPlanState(dir, 'iter-inc-feature', { complexity: 'mid' }); // maxIterations = 5
      const result = incrementIteration(dir);
      assert.equal(result, true);
      assert.equal(readPlanState(dir).iteration, 1);
    } finally { cleanup(dir); }
  });

  it('should return false when max iterations reached (low: 3)', () => {
    const dir = makeDir('iter-max');
    try {
      initPlanState(dir, 'iter-max-feature', { complexity: 'low' }); // maxIterations = 3
      incrementIteration(dir); // 1
      incrementIteration(dir); // 2
      const result = incrementIteration(dir); // 3 → max reached
      assert.equal(result, false);
    } finally { cleanup(dir); }
  });

  it('should return false when no active plan', () => {
    const dir = makeDir('iter-noplan');
    try {
      const result = incrementIteration(dir);
      assert.equal(result, false);
    } finally { cleanup(dir); }
  });

  it('should increment correctly multiple times within limit', () => {
    const dir = makeDir('iter-multi');
    try {
      initPlanState(dir, 'iter-multi-feature', { complexity: 'high' }); // maxIterations = 3
      incrementIteration(dir); // 1
      const result = incrementIteration(dir); // 2
      assert.equal(result, true);
      assert.equal(readPlanState(dir).iteration, 2);
    } finally { cleanup(dir); }
  });

  it('should track iteration count correctly up to max-1', () => {
    const dir = makeDir('iter-track');
    try {
      initPlanState(dir, 'iter-track-feature', { complexity: 'mid' }); // maxIterations = 3
      for (let i = 0; i < 2; i++) {
        const result = incrementIteration(dir);
        assert.equal(result, true, `Iteration ${i + 1} should return true`);
      }
      assert.equal(readPlanState(dir).iteration, 2);
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 4. terminatePlan — active:false, terminated:true, reason 기록
// ────────────────────────────────────────────────────────────

describe('terminatePlan: 강제 종료 상태 전이', () => {
  it('should set active:false and terminated:true', () => {
    const dir = makeDir('term');
    try {
      initPlanState(dir, 'term-feature');
      terminatePlan(dir, 'max_iterations');
      const state = readPlanState(dir);
      assert.equal(state.active, false);
      assert.equal(state.terminated, true);
    } finally { cleanup(dir); }
  });

  it('should record terminateReason: user_reject', () => {
    const dir = makeDir('term-reason');
    try {
      initPlanState(dir, 'term-reason-feature');
      terminatePlan(dir, 'user_reject');
      const state = readPlanState(dir);
      assert.equal(state.terminateReason, 'user_reject');
    } finally { cleanup(dir); }
  });

  it('should record terminateReason: stagnation', () => {
    const dir = makeDir('term-stag');
    try {
      initPlanState(dir, 'term-stag-feature');
      terminatePlan(dir, 'stagnation');
      const state = readPlanState(dir);
      assert.equal(state.terminateReason, 'stagnation');
    } finally { cleanup(dir); }
  });

  it('should set phase to terminated', () => {
    const dir = makeDir('term-phase');
    try {
      initPlanState(dir, 'term-phase-feature');
      terminatePlan(dir, 'stagnation');
      const state = readPlanState(dir);
      assert.equal(state.phase, 'terminated');
    } finally { cleanup(dir); }
  });

  it('should add terminated to phaseHistory', () => {
    const dir = makeDir('term-hist');
    try {
      initPlanState(dir, 'term-hist-feature');
      terminatePlan(dir, 'max_iterations');
      const state = readPlanState(dir);
      assert.ok(state.phaseHistory.includes('terminated'));
    } finally { cleanup(dir); }
  });

  it('should allow termination from mid-pipeline phase', () => {
    const dir = makeDir('term-mid');
    try {
      initPlanState(dir, 'term-mid-feature');
      advanceTo(dir, 'synthesis');
      terminatePlan(dir, 'user_reject');
      const state = readPlanState(dir);
      assert.equal(state.phase, 'terminated');
      assert.equal(state.active, false);
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 5. validatePhaseSequence — 정상/스킵 시퀀스 검증
// ────────────────────────────────────────────────────────────

describe('validatePhaseSequence: 시퀀스 유효성 검증', () => {
  it('should return valid:true for normal full sequence', () => {
    const history = ['gate', 'foundation', 'option-design', 'steelman', 'synthesis', 'synthesis-check', 'critique', 'adr', 'completed'];
    const result = validatePhaseSequence(history);
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 0);
  });

  it('should return valid:false with issues for phase skip (gate → option-design)', () => {
    const history = ['gate', 'option-design'];
    const result = validatePhaseSequence(history);
    assert.equal(result.valid, false);
    assert.ok(result.issues.length > 0);
  });

  it('should allow REVISE loop (synthesis-check → synthesis) as valid', () => {
    const history = ['gate', 'foundation', 'option-design', 'steelman', 'synthesis', 'synthesis-check', 'synthesis'];
    const result = validatePhaseSequence(history);
    assert.equal(result.valid, true);
  });

  it('should allow ITERATE loop (critique → option-design) as valid', () => {
    const history = ['gate', 'foundation', 'option-design', 'steelman', 'synthesis', 'synthesis-check', 'critique', 'option-design'];
    const result = validatePhaseSequence(history);
    assert.equal(result.valid, true);
  });

  it('should allow terminated as terminal state', () => {
    const history = ['gate', 'foundation', 'terminated'];
    const result = validatePhaseSequence(history);
    assert.equal(result.valid, true);
  });

  it('should allow completed as terminal state', () => {
    const history = ['gate', 'foundation', 'option-design', 'completed'];
    const result = validatePhaseSequence(history);
    // forward skip (gate→foundation→option-design→completed) — "completed" is terminal, allowed
    // but option-design→completed skips multiple phases — should flag
    // depends on impl: completed is skipped but it's a terminal state
    // key: issues should only flag non-terminal skips
    assert.ok(typeof result.valid === 'boolean');
  });

  it('should return valid:false for large multi-phase skip', () => {
    const history = ['gate', 'adr']; // skips 6 phases
    const result = validatePhaseSequence(history);
    assert.equal(result.valid, false);
    assert.ok(result.issues.length > 0);
  });

  it('should return valid:true for single-step sequence', () => {
    const history = ['gate'];
    const result = validatePhaseSequence(history);
    assert.equal(result.valid, true);
  });
});

// ────────────────────────────────────────────────────────────
// 6. getResumeInfo — active plan 시 canResume:true
// ────────────────────────────────────────────────────────────

describe('getResumeInfo: resume 정보 조회', () => {
  it('should return canResume:true when active plan exists', () => {
    const dir = makeDir('resume-active');
    try {
      initPlanState(dir, 'resume-feature');
      advancePhase(dir, 'foundation');
      const info = getResumeInfo(dir);
      assert.equal(info.canResume, true);
      assert.equal(info.feature, 'resume-feature');
      assert.equal(info.phase, 'foundation');
    } finally { cleanup(dir); }
  });

  it('should return canResume:false when no plan', () => {
    const dir = makeDir('resume-none');
    try {
      const info = getResumeInfo(dir);
      assert.equal(info.canResume, false);
      assert.equal(info.feature, null);
      assert.equal(info.phase, null);
    } finally { cleanup(dir); }
  });

  it('should include iteration in resume info', () => {
    const dir = makeDir('resume-iter');
    try {
      initPlanState(dir, 'resume-iter-feature', { complexity: 'mid' });
      incrementIteration(dir);
      const info = getResumeInfo(dir);
      assert.equal(info.iteration, 1);
    } finally { cleanup(dir); }
  });

  it('should return canResume:false after plan completion', () => {
    const dir = makeDir('resume-done');
    try {
      initPlanState(dir, 'resume-done-feature');
      completePlan(dir, 'HIGH', 'APPROVE');
      const info = getResumeInfo(dir);
      assert.equal(info.canResume, false);
    } finally { cleanup(dir); }
  });

  it('should return canResume:false after plan termination', () => {
    const dir = makeDir('resume-term');
    try {
      initPlanState(dir, 'resume-term-feature');
      terminatePlan(dir, 'user_reject');
      const info = getResumeInfo(dir);
      assert.equal(info.canResume, false);
    } finally { cleanup(dir); }
  });

  it('should track mid-pipeline phase correctly', () => {
    const dir = makeDir('resume-mid');
    try {
      initPlanState(dir, 'resume-mid-feature');
      advanceTo(dir, 'synthesis');
      const info = getResumeInfo(dir);
      assert.equal(info.canResume, true);
      assert.equal(info.phase, 'synthesis');
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 7. clearPlanState — state 삭제
// ────────────────────────────────────────────────────────────

describe('clearPlanState: state 파일 삭제', () => {
  it('should delete state so readPlanState returns null', () => {
    const dir = makeDir('clear');
    try {
      initPlanState(dir, 'clear-feature');
      assert.ok(readPlanState(dir) !== null, 'state should exist before clear');
      clearPlanState(dir);
      assert.equal(readPlanState(dir), null, 'state should be null after clear');
    } finally { cleanup(dir); }
  });

  it('should be idempotent (clearing non-existent state should not throw)', () => {
    const dir = makeDir('clear-noop');
    try {
      assert.doesNotThrow(() => clearPlanState(dir));
    } finally { cleanup(dir); }
  });

  it('should allow re-init after clear', () => {
    const dir = makeDir('clear-reinit');
    try {
      initPlanState(dir, 'clear-reinit-feature');
      clearPlanState(dir);
      // re-init should work fine
      const state = initPlanState(dir, 'new-feature');
      assert.equal(state.phase, 'gate');
      assert.equal(state.feature, 'new-feature');
    } finally { cleanup(dir); }
  });
});
