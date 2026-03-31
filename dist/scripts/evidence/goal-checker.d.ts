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
export declare function checkGoalAchievement(_projectDir: string, goalDescription: string, assertions: GoalAssertion[]): GoalResult;
/**
 * 목표 문자열에서 달성 조건(assertions)을 휴리스틱으로 도출합니다.
 * LLM 없이 동작하는 정적 분석 기반입니다.
 */
export declare function deriveAssertions(goalDescription: string): GoalAssertion[];
/**
 * Goal-Backward Verification 결과를 상태 파일에 저장합니다.
 */
export declare function saveGoalResult(feature: string, result: GoalResult, projectDir?: string): StateResult;
/**
 * 저장된 Goal-Backward Verification 결과를 읽어옵니다.
 */
export declare function loadGoalResult(feature: string, projectDir?: string): StateResult<GoalResult>;
//# sourceMappingURL=goal-checker.d.ts.map