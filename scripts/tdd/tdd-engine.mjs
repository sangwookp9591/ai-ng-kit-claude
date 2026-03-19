/**
 * sw-kit TDD Engine v1.1.0
 * Enforces Red → Green → Refactor cycle within PDCA.
 * Harness Engineering: Verify axis — test-first development.
 * @module scripts/tdd/tdd-engine
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('tdd');

const TDD_PHASES = ['red', 'green', 'refactor'];

const TDD_PHASE_INFO = {
  red: {
    emoji: '🔴',
    name: 'RED',
    description: '실패하는 테스트를 먼저 작성합니다',
    rules: [
      '구현 코드를 작성하기 전에 테스트를 먼저 작성',
      '테스트가 올바른 이유로 실패하는지 확인',
      '한 번에 하나의 기능만 테스트'
    ]
  },
  green: {
    emoji: '🟢',
    name: 'GREEN',
    description: '테스트를 통과하는 최소한의 코드를 작성합니다',
    rules: [
      '테스트를 통과하는 가장 간단한 코드 작성',
      '과도한 설계 금지 — 필요한 것만',
      '모든 테스트가 통과하는지 확인'
    ]
  },
  refactor: {
    emoji: '🔵',
    name: 'REFACTOR',
    description: '코드를 정리하면서 테스트가 계속 통과하는지 확인합니다',
    rules: [
      '중복 제거, 네이밍 개선, 구조 정리',
      '리팩토링 후 반드시 테스트 재실행',
      '새로운 기능 추가 금지 — 정리만'
    ]
  }
};

function getTddPath(projectDir) {
  return join(projectDir || process.cwd(), '.sw-kit', 'state', 'tdd-state.json');
}

/**
 * Start a TDD cycle for a feature.
 * @param {string} feature
 * @param {string} testTarget - What to test (e.g. "user login API")
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, phase: string, message: string }}
 */
export function startTdd(feature, testTarget, projectDir) {
  const tddPath = getTddPath(projectDir);
  const state = readStateOrDefault(tddPath, { cycles: {} });

  state.cycles[feature] = {
    testTarget,
    phase: 'red',
    cycleCount: 0,
    startedAt: new Date().toISOString(),
    history: [],
    testResults: { red: null, green: null, refactor: null }
  };
  state.activeCycle = feature;

  writeState(tddPath, state);
  log.info(`TDD started: ${feature}`, { testTarget });

  const info = TDD_PHASE_INFO.red;
  return {
    ok: true,
    phase: 'red',
    message: `${info.emoji} TDD ${info.name} — ${info.description}\n\n규칙:\n${info.rules.map(r => `  • ${r}`).join('\n')}`
  };
}

/**
 * Record test result and advance TDD phase.
 * @param {string} feature
 * @param {'pass'|'fail'} testResult
 * @param {string} [evidence] - Test output summary
 * @param {string} [projectDir]
 * @returns {{ ok: boolean, phase: string, message: string, cycleComplete?: boolean }}
 */
export function advanceTdd(feature, testResult, evidence, projectDir) {
  const tddPath = getTddPath(projectDir);
  const state = readStateOrDefault(tddPath, { cycles: {} });
  const cycle = state.cycles[feature];

  if (!cycle) return { ok: false, phase: 'none', message: `TDD 사이클 "${feature}" 없음` };

  const currentPhase = cycle.phase;

  cycle.history.push({
    phase: currentPhase,
    testResult,
    evidence: evidence?.slice(0, 200),
    ts: new Date().toISOString()
  });
  cycle.testResults[currentPhase] = testResult;

  // Phase transition rules
  if (currentPhase === 'red') {
    if (testResult === 'fail') {
      // RED: test fails correctly → move to GREEN
      cycle.phase = 'green';
      writeState(tddPath, state);
      const info = TDD_PHASE_INFO.green;
      return {
        ok: true, phase: 'green',
        message: `✅ 테스트가 올바르게 실패했습니다.\n\n${info.emoji} TDD ${info.name} — ${info.description}\n\n규칙:\n${info.rules.map(r => `  • ${r}`).join('\n')}`
      };
    } else {
      // RED: test passes (shouldn't!) → stay in RED
      writeState(tddPath, state);
      return {
        ok: false, phase: 'red',
        message: `⚠️ RED 단계에서 테스트가 통과했습니다. 테스트가 실제로 새 기능을 검증하는지 확인하세요.\n아직 구현하지 않은 기능의 테스트여야 합니다.`
      };
    }
  }

  if (currentPhase === 'green') {
    if (testResult === 'pass') {
      // GREEN: test passes → move to REFACTOR
      cycle.phase = 'refactor';
      writeState(tddPath, state);
      const info = TDD_PHASE_INFO.refactor;
      return {
        ok: true, phase: 'refactor',
        message: `✅ 테스트가 통과했습니다!\n\n${info.emoji} TDD ${info.name} — ${info.description}\n\n규칙:\n${info.rules.map(r => `  • ${r}`).join('\n')}`
      };
    } else {
      // GREEN: test still fails → stay in GREEN
      writeState(tddPath, state);
      return {
        ok: false, phase: 'green',
        message: `❌ 테스트가 아직 실패합니다. 최소한의 구현을 추가하세요.`
      };
    }
  }

  if (currentPhase === 'refactor') {
    if (testResult === 'pass') {
      // REFACTOR: tests still pass → cycle complete!
      cycle.cycleCount++;
      cycle.phase = 'red'; // Ready for next cycle
      cycle.testResults = { red: null, green: null, refactor: null };
      writeState(tddPath, state);
      return {
        ok: true, phase: 'complete', cycleComplete: true,
        message: `🎉 TDD 사이클 #${cycle.cycleCount} 완료!\n\n🔴 RED → 🟢 GREEN → 🔵 REFACTOR ✓\n\n다음 기능의 테스트를 작성하거나, "/swkit next"로 PDCA 다음 단계로 진행하세요.`
      };
    } else {
      // REFACTOR: tests broke → stay in REFACTOR
      writeState(tddPath, state);
      return {
        ok: false, phase: 'refactor',
        message: `⚠️ 리팩토링 후 테스트가 깨졌습니다! 변경사항을 되돌리고 다시 시도하세요.`
      };
    }
  }

  return { ok: false, phase: currentPhase, message: '알 수 없는 TDD 상태' };
}

/**
 * Get current TDD status.
 * @param {string} [feature]
 * @param {string} [projectDir]
 * @returns {object|null}
 */
export function getTddStatus(feature, projectDir) {
  const state = readStateOrDefault(getTddPath(projectDir), { cycles: {} });
  if (feature) return state.cycles[feature] || null;
  return state;
}

/**
 * Format TDD status for display.
 * @param {string} [feature]
 * @param {string} [projectDir]
 * @returns {string}
 */
export function formatTddStatus(feature, projectDir) {
  const state = readStateOrDefault(getTddPath(projectDir), { cycles: {}, activeCycle: null });
  const target = feature || state.activeCycle;
  if (!target || !state.cycles[target]) return '[sw-kit TDD] 활성 TDD 사이클 없음';

  const cycle = state.cycles[target];
  const info = TDD_PHASE_INFO[cycle.phase] || { emoji: '✅', name: 'COMPLETE' };

  const lines = [
    `[sw-kit TDD] ${target}`,
    `  Phase: ${info.emoji} ${info.name}`,
    `  Cycles completed: ${cycle.cycleCount}`,
    `  Target: ${cycle.testTarget}`,
    '',
    `  Flow: ${cycle.phase === 'red' ? '[🔴]' : '🔴'} → ${cycle.phase === 'green' ? '[🟢]' : '🟢'} → ${cycle.phase === 'refactor' ? '[🔵]' : '🔵'}`
  ];

  return lines.join('\n');
}

/**
 * Reset TDD cycle for a feature.
 */
export function resetTdd(feature, projectDir) {
  const tddPath = getTddPath(projectDir);
  const state = readStateOrDefault(tddPath, { cycles: {} });
  delete state.cycles[feature];
  if (state.activeCycle === feature) state.activeCycle = null;
  writeState(tddPath, state);
}

export { TDD_PHASES, TDD_PHASE_INFO };
