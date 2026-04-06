/**
 * E2E Pipeline Test: AING-DR plan-state 8단계 전체 흐름 검증
 *
 * 검증 대상:
 * 1. initPlanState → gate phase 초기화
 * 2. advancePhase → gate→foundation→...→adr 순차 전이
 * 3. checkAgentAllowed → 각 phase에서 올바른 agent만 허용, 잘못된 agent block
 * 4. autoAdvancePhase → agent 완료 후 자동 전이 (synthesis-check, critique 제외)
 * 5. completePlan → active:false, phase:'completed'
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
  completePlan,
  checkAgentAllowed,
  autoAdvancePhase,
  getExpectedAgent,
} = await import('../dist/scripts/hooks/plan-state.js');

// 각 테스트에서 사용할 독립 임시 디렉토리 생성 helper
// NOTE: .aing/state 디렉토리를 미리 생성해야 acquireLock이 lock 파일을 쓸 수 있음
function makeDir(name) {
  const dir = join(tmpdir(), `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(dir, '.aing', 'state'), { recursive: true });
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

// phase 순서대로 전진하는 helper
function advanceTo(dir, targetPhase) {
  const phaseOrder = ['gate', 'foundation', 'option-design', 'steelman', 'synthesis', 'synthesis-check', 'critique', 'adr'];
  const idx = phaseOrder.indexOf(targetPhase);
  for (let i = 1; i <= idx; i++) {
    advancePhase(dir, phaseOrder[i]);
  }
}

// ────────────────────────────────────────────────────────────
// 1. initPlanState — gate phase 초기화
// ────────────────────────────────────────────────────────────

describe('initPlanState: gate phase 초기화', () => {
  it('should initialize state with gate phase', () => {
    const dir = makeDir('init-gate');
    try {
      const state = initPlanState(dir, 'test-feature');
      assert.equal(state.phase, 'gate');
      assert.equal(state.active, true);
      assert.equal(state.feature, 'test-feature');
      assert.equal(state.iteration, 0);
      assert.deepEqual(state.phaseHistory, ['gate']);
    } finally { cleanup(dir); }
  });

  it('should persist state to disk', () => {
    const dir = makeDir('init-persist');
    try {
      const state = initPlanState(dir, 'persist-feature');
      const read = readPlanState(dir);
      assert.equal(read.phase, state.phase);
      assert.equal(read.feature, 'persist-feature');
      assert.equal(read.active, true);
    } finally { cleanup(dir); }
  });

  it('should set complexity and maxIterations correctly for high', () => {
    const dir = makeDir('init-complexity');
    try {
      const state = initPlanState(dir, 'complex-feature', { complexity: 'high' });
      assert.equal(state.complexity, 'high');
      assert.equal(state.maxIterations, 3);
    } finally { cleanup(dir); }
  });

  it('should set maxIterations=2 for low complexity', () => {
    const dir = makeDir('init-low');
    try {
      const state = initPlanState(dir, 'low-feature', { complexity: 'low' });
      assert.equal(state.complexity, 'low');
      assert.equal(state.maxIterations, 2);
    } finally { cleanup(dir); }
  });

  it('should set deliberate flag', () => {
    const dir = makeDir('init-deliberate');
    try {
      const state = initPlanState(dir, 'deliberate-feature', { deliberate: true });
      assert.equal(state.deliberate, true);
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 2. advancePhase — 순차 전이 gate→foundation→...→adr
// ────────────────────────────────────────────────────────────

describe('advancePhase: 순차 전이 검증', () => {
  it('should advance gate → foundation', () => {
    const dir = makeDir('adv-foundation');
    try {
      initPlanState(dir, 'adv-feature');
      const result = advancePhase(dir, 'foundation');
      assert.ok(result !== null);
      assert.equal(result.phase, 'foundation');
      assert.ok(result.phaseHistory.includes('foundation'));
    } finally { cleanup(dir); }
  });

  it('should advance foundation → option-design', () => {
    const dir = makeDir('adv-option-design');
    try {
      initPlanState(dir, 'adv-feature');
      advancePhase(dir, 'foundation');
      const result = advancePhase(dir, 'option-design');
      assert.ok(result !== null);
      assert.equal(result.phase, 'option-design');
    } finally { cleanup(dir); }
  });

  it('should advance option-design → steelman', () => {
    const dir = makeDir('adv-steelman');
    try {
      initPlanState(dir, 'adv-feature');
      advanceTo(dir, 'option-design');
      const result = advancePhase(dir, 'steelman');
      assert.ok(result !== null);
      assert.equal(result.phase, 'steelman');
    } finally { cleanup(dir); }
  });

  it('should advance steelman → synthesis', () => {
    const dir = makeDir('adv-synthesis');
    try {
      initPlanState(dir, 'adv-feature');
      advanceTo(dir, 'steelman');
      const result = advancePhase(dir, 'synthesis');
      assert.ok(result !== null);
      assert.equal(result.phase, 'synthesis');
    } finally { cleanup(dir); }
  });

  it('should advance synthesis → synthesis-check', () => {
    const dir = makeDir('adv-synthcheck');
    try {
      initPlanState(dir, 'adv-feature');
      advanceTo(dir, 'synthesis');
      const result = advancePhase(dir, 'synthesis-check');
      assert.ok(result !== null);
      assert.equal(result.phase, 'synthesis-check');
    } finally { cleanup(dir); }
  });

  it('should advance synthesis-check → critique', () => {
    const dir = makeDir('adv-critique');
    try {
      initPlanState(dir, 'adv-feature');
      advanceTo(dir, 'synthesis-check');
      const result = advancePhase(dir, 'critique');
      assert.ok(result !== null);
      assert.equal(result.phase, 'critique');
    } finally { cleanup(dir); }
  });

  it('should advance critique → adr', () => {
    const dir = makeDir('adv-adr');
    try {
      initPlanState(dir, 'adv-feature');
      advanceTo(dir, 'critique');
      const result = advancePhase(dir, 'adr');
      assert.ok(result !== null);
      assert.equal(result.phase, 'adr');
    } finally { cleanup(dir); }
  });

  it('should return null for invalid phase name', () => {
    const dir = makeDir('adv-invalid');
    try {
      initPlanState(dir, 'invalid-phase-feature');
      const result = advancePhase(dir, 'nonexistent-phase');
      assert.equal(result, null);
    } finally { cleanup(dir); }
  });

  it('should return null when no active plan', () => {
    const dir = makeDir('adv-nostate');
    try {
      const result = advancePhase(dir, 'foundation');
      assert.equal(result, null);
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 3. checkAgentAllowed — phase별 agent 허용/차단
// ────────────────────────────────────────────────────────────

describe('checkAgentAllowed: phase별 agent 허용/차단', () => {
  it('should block all agents in gate phase', () => {
    const dir = makeDir('agent-gate');
    try {
      initPlanState(dir, 'gate-feature');
      const result = checkAgentAllowed(dir, 'ryan');
      assert.equal(result.allowed, false);
      assert.ok(result.reason?.includes('gate'));
    } finally { cleanup(dir); }
  });

  it('should allow ryan in foundation phase', () => {
    const dir = makeDir('agent-ryan');
    try {
      initPlanState(dir, 'foundation-feature');
      advancePhase(dir, 'foundation');
      const result = checkAgentAllowed(dir, 'ryan');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should block wrong agent (able) in foundation phase', () => {
    const dir = makeDir('agent-wrong-foundation');
    try {
      initPlanState(dir, 'foundation-wrong-feature');
      advancePhase(dir, 'foundation');
      const result = checkAgentAllowed(dir, 'able');
      assert.equal(result.allowed, false);
      assert.ok(result.reason?.includes('foundation'));
    } finally { cleanup(dir); }
  });

  it('should allow able in option-design phase', () => {
    const dir = makeDir('agent-able');
    try {
      initPlanState(dir, 'option-feature');
      advanceTo(dir, 'option-design');
      const result = checkAgentAllowed(dir, 'able');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should allow klay in steelman phase', () => {
    const dir = makeDir('agent-klay');
    try {
      initPlanState(dir, 'steelman-feature');
      advanceTo(dir, 'steelman');
      const result = checkAgentAllowed(dir, 'klay');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should allow able in synthesis phase', () => {
    const dir = makeDir('agent-able-synthesis');
    try {
      initPlanState(dir, 'synthesis-feature');
      advanceTo(dir, 'synthesis');
      const result = checkAgentAllowed(dir, 'able');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should allow noa in synthesis-check phase', () => {
    const dir = makeDir('agent-noa');
    try {
      initPlanState(dir, 'synthcheck-feature');
      advanceTo(dir, 'synthesis-check');
      const result = checkAgentAllowed(dir, 'noa');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should allow critic in critique phase', () => {
    const dir = makeDir('agent-critic');
    try {
      initPlanState(dir, 'critique-feature');
      advanceTo(dir, 'critique');
      const result = checkAgentAllowed(dir, 'critic');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should allow able in adr phase', () => {
    const dir = makeDir('agent-able-adr');
    try {
      initPlanState(dir, 'adr-feature');
      advanceTo(dir, 'adr');
      const result = checkAgentAllowed(dir, 'able');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should support aing: prefix normalization', () => {
    const dir = makeDir('agent-prefix');
    try {
      initPlanState(dir, 'prefix-feature');
      advancePhase(dir, 'foundation');
      const result = checkAgentAllowed(dir, 'aing:ryan');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should support uppercase normalization', () => {
    const dir = makeDir('agent-uppercase');
    try {
      initPlanState(dir, 'uppercase-feature');
      advancePhase(dir, 'foundation');
      const result = checkAgentAllowed(dir, 'Ryan');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should allow any agent when no active plan', () => {
    const dir = makeDir('agent-noplan');
    try {
      const result = checkAgentAllowed(dir, 'anyagent');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 4. autoAdvancePhase — agent 완료 후 자동 전이
// ────────────────────────────────────────────────────────────

describe('autoAdvancePhase: agent 완료 후 자동 전이', () => {
  it('should auto-advance from foundation to option-design when ryan completes', () => {
    const dir = makeDir('auto-ryan');
    try {
      initPlanState(dir, 'auto-foundation');
      advancePhase(dir, 'foundation');
      const next = autoAdvancePhase(dir, 'ryan');
      assert.equal(next, 'option-design');
      assert.equal(readPlanState(dir).phase, 'option-design');
    } finally { cleanup(dir); }
  });

  it('should auto-advance from option-design to steelman when able completes', () => {
    const dir = makeDir('auto-able');
    try {
      initPlanState(dir, 'auto-option');
      advanceTo(dir, 'option-design');
      const next = autoAdvancePhase(dir, 'able');
      assert.equal(next, 'steelman');
    } finally { cleanup(dir); }
  });

  it('should auto-advance from steelman to synthesis when klay completes', () => {
    const dir = makeDir('auto-klay');
    try {
      initPlanState(dir, 'auto-steelman');
      advanceTo(dir, 'steelman');
      const next = autoAdvancePhase(dir, 'klay');
      assert.equal(next, 'synthesis');
    } finally { cleanup(dir); }
  });

  it('should NOT auto-advance from synthesis-check (verdict required)', () => {
    const dir = makeDir('auto-noa');
    try {
      initPlanState(dir, 'auto-synthcheck');
      advanceTo(dir, 'synthesis-check');
      const next = autoAdvancePhase(dir, 'noa');
      assert.equal(next, null);
      assert.equal(readPlanState(dir).phase, 'synthesis-check');
    } finally { cleanup(dir); }
  });

  it('should NOT auto-advance from critique (verdict required)', () => {
    const dir = makeDir('auto-critic');
    try {
      initPlanState(dir, 'auto-critique');
      advanceTo(dir, 'critique');
      const next = autoAdvancePhase(dir, 'critic');
      assert.equal(next, null);
      assert.equal(readPlanState(dir).phase, 'critique');
    } finally { cleanup(dir); }
  });

  it('should return null when wrong agent completes', () => {
    const dir = makeDir('auto-wrong');
    try {
      initPlanState(dir, 'auto-wrong');
      advancePhase(dir, 'foundation');
      const next = autoAdvancePhase(dir, 'able'); // able is not ryan
      assert.equal(next, null);
    } finally { cleanup(dir); }
  });

  it('should return null when no active plan', () => {
    const dir = makeDir('auto-noPlan');
    try {
      const next = autoAdvancePhase(dir, 'ryan');
      assert.equal(next, null);
    } finally { cleanup(dir); }
  });

  it('should support aing: prefix in completed agent name', () => {
    const dir = makeDir('auto-prefix');
    try {
      initPlanState(dir, 'auto-prefix');
      advancePhase(dir, 'foundation');
      const next = autoAdvancePhase(dir, 'aing:ryan');
      assert.equal(next, 'option-design');
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 5. completePlan — active:false, phase:'completed'
// ────────────────────────────────────────────────────────────

describe('completePlan: 완료 상태 전이', () => {
  it('should set active:false and phase:completed', () => {
    const dir = makeDir('complete-basic');
    try {
      initPlanState(dir, 'complete-feature');
      completePlan(dir, 'HIGH', 'APPROVE');
      const state = readPlanState(dir);
      assert.equal(state.active, false);
      assert.equal(state.phase, 'completed');
    } finally { cleanup(dir); }
  });

  it('should persist confidence and verdict', () => {
    const dir = makeDir('complete-fields');
    try {
      initPlanState(dir, 'complete-fields-feature');
      completePlan(dir, 'MED', 'ITERATE');
      const state = readPlanState(dir);
      assert.equal(state.confidence, 'MED');
      assert.equal(state.verdict, 'ITERATE');
    } finally { cleanup(dir); }
  });

  it('should add completed to phaseHistory', () => {
    const dir = makeDir('complete-hist');
    try {
      initPlanState(dir, 'history-feature');
      completePlan(dir, 'HIGH', 'APPROVE');
      const state = readPlanState(dir);
      assert.ok(state.phaseHistory.includes('completed'));
    } finally { cleanup(dir); }
  });

  it('should allow agents after completion (no active plan)', () => {
    const dir = makeDir('complete-allow');
    try {
      initPlanState(dir, 'allow-feature');
      completePlan(dir, 'HIGH', 'APPROVE');
      const result = checkAgentAllowed(dir, 'anyagent');
      assert.equal(result.allowed, true);
    } finally { cleanup(dir); }
  });

  it('should work with LOW confidence REJECT verdict', () => {
    const dir = makeDir('complete-reject');
    try {
      initPlanState(dir, 'reject-feature');
      completePlan(dir, 'LOW', 'REJECT');
      const state = readPlanState(dir);
      assert.equal(state.confidence, 'LOW');
      assert.equal(state.verdict, 'REJECT');
      assert.equal(state.active, false);
    } finally { cleanup(dir); }
  });
});

// ────────────────────────────────────────────────────────────
// 6. getExpectedAgent — 현재 phase의 예상 agent 반환
// ────────────────────────────────────────────────────────────

describe('getExpectedAgent: 현재 phase의 예상 agent 반환', () => {
  it('should return ryan for foundation phase', () => {
    const dir = makeDir('expected-foundation');
    try {
      initPlanState(dir, 'expected-foundation');
      advancePhase(dir, 'foundation');
      const info = getExpectedAgent(dir);
      assert.ok(info !== null);
      assert.equal(info.phase, 'foundation');
      assert.ok(info.agents.includes('ryan'));
    } finally { cleanup(dir); }
  });

  it('should return able for option-design phase', () => {
    const dir = makeDir('expected-option-design');
    try {
      initPlanState(dir, 'expected-option');
      advanceTo(dir, 'option-design');
      const info = getExpectedAgent(dir);
      assert.ok(info !== null);
      assert.equal(info.phase, 'option-design');
      assert.ok(info.agents.includes('able'));
    } finally { cleanup(dir); }
  });

  it('should return klay for steelman phase', () => {
    const dir = makeDir('expected-steelman');
    try {
      initPlanState(dir, 'expected-steelman');
      advanceTo(dir, 'steelman');
      const info = getExpectedAgent(dir);
      assert.ok(info !== null);
      assert.equal(info.phase, 'steelman');
      assert.ok(info.agents.includes('klay'));
    } finally { cleanup(dir); }
  });

  it('should return null when no active plan', () => {
    const dir = makeDir('expected-none');
    try {
      const info = getExpectedAgent(dir);
      assert.equal(info, null);
    } finally { cleanup(dir); }
  });
});
