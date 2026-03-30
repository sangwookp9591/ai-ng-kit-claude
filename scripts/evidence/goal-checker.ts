/**
 * aing Goal-Backward Verification
 *
 * "작업 완료 ≠ 목표 달성"
 * 기존 증거 체인(test/build/lint PASS)이 완료 기준이라면,
 * Goal-Backward Verification은 달성 기준입니다:
 * "사용자가 원래 요청한 것이 실제로 작동하는가?"
 *
 * @module scripts/evidence/goal-checker
 */

import { writeState, readState } from '../core/state.js';
import { join } from 'node:path';

export interface GoalAssertion {
  claim: string;
  verified: boolean;
  evidence: string;
}

export type GoalVerdict = 'ACHIEVED' | 'COMPLETED_NOT_ACHIEVED' | 'INCOMPLETE';

export interface GoalResult {
  goal: string;
  assertions: GoalAssertion[];
  achieved: boolean;
  verdict: GoalVerdict;
  checkedAt: string;
}

export interface StateResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Goal-Backward Verification 수행.
 */
export function checkGoalAchievement(_projectDir: string, goalDescription: string, assertions: GoalAssertion[]): GoalResult {
  if (!assertions || assertions.length === 0) {
    return {
      goal: goalDescription,
      assertions: [],
      achieved: false,
      verdict: 'INCOMPLETE',
      checkedAt: new Date().toISOString()
    };
  }

  const allVerified = assertions.every(a => a.verified === true);
  const achieved = allVerified;
  const verdict: GoalVerdict = achieved ? 'ACHIEVED' : 'COMPLETED_NOT_ACHIEVED';

  return {
    goal: goalDescription,
    assertions,
    achieved,
    verdict,
    checkedAt: new Date().toISOString()
  };
}

/**
 * 목표 문자열에서 달성 조건(assertions)을 휴리스틱으로 도출합니다.
 * LLM 없이 동작하는 정적 분석 기반입니다.
 */
export function deriveAssertions(goalDescription: string): GoalAssertion[] {
  if (!goalDescription) return [];

  const goal = goalDescription.trim();
  if (!goal) return [];

  // 키워드 기반 휴리스틱: 목표 유형 감지 → 전형적 assertion 세트 반환
  const assertions: GoalAssertion[] = [];

  // 로그인/인증 관련
  if (/로그인|login|auth|인증/.test(goal)) {
    assertions.push(
      { claim: '유효한 자격증명으로 로그인 가능', verified: false, evidence: '' },
      { claim: '로그인 후 세션/토큰 발급', verified: false, evidence: '' },
      { claim: '잘못된 자격증명 시 에러 반환', verified: false, evidence: '' }
    );
  }

  // CRUD / API 관련
  if (/추가|생성|create|add|등록/.test(goal)) {
    assertions.push(
      { claim: '새 항목 생성 API 존재', verified: false, evidence: '' },
      { claim: '생성된 항목 저장소에 반영됨', verified: false, evidence: '' }
    );
  }

  if (/수정|업데이트|update|edit/.test(goal)) {
    assertions.push(
      { claim: '항목 수정 API 존재', verified: false, evidence: '' },
      { claim: '수정 결과 저장소에 반영됨', verified: false, evidence: '' }
    );
  }

  if (/삭제|제거|delete|remove/.test(goal)) {
    assertions.push(
      { claim: '항목 삭제 API 존재', verified: false, evidence: '' },
      { claim: '삭제 후 항목 조회 불가', verified: false, evidence: '' }
    );
  }

  if (/조회|검색|search|list|목록/.test(goal)) {
    assertions.push(
      { claim: '목록 조회 API 존재', verified: false, evidence: '' },
      { claim: '검색 조건 필터링 동작', verified: false, evidence: '' }
    );
  }

  // 테스트 관련
  if (/테스트|test|tdd/.test(goal)) {
    assertions.push(
      { claim: '테스트 파일 존재', verified: false, evidence: '' },
      { claim: '모든 테스트 통과', verified: false, evidence: '' }
    );
  }

  // assertion이 없는 경우 범용 assertion
  if (assertions.length === 0) {
    assertions.push(
      { claim: `"${goal}" 기능이 구현됨`, verified: false, evidence: '' },
      { claim: `관련 테스트가 통과함`, verified: false, evidence: '' }
    );
  }

  return assertions;
}

/**
 * Goal-Backward Verification 결과를 상태 파일에 저장합니다.
 */
export function saveGoalResult(feature: string, result: GoalResult, projectDir?: string): StateResult {
  const dir = projectDir || process.cwd();
  const filePath = join(dir, '.aing', 'state', `goal-${feature}.json`);
  return writeState(filePath, result) as StateResult;
}

/**
 * 저장된 Goal-Backward Verification 결과를 읽어옵니다.
 */
export function loadGoalResult(feature: string, projectDir?: string): StateResult<GoalResult> {
  const dir = projectDir || process.cwd();
  const filePath = join(dir, '.aing', 'state', `goal-${feature}.json`);
  return readState(filePath) as StateResult<GoalResult>;
}
