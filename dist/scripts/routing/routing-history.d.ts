/**
 * aing Routing History (Innovation #3 — Adaptive Routing)
 * Tracks routing decisions and outcomes for future optimization.
 * @module scripts/routing/routing-history
 */
interface RoutingEntry {
    agent: string;
    model: string;
    intent: string;
    complexity: object;
    outcome: 'success' | 'fail';
    route?: string;
}
interface SuccessRate {
    total: number;
    success: number;
    rate: number;
}
/**
 * Record a routing decision and its outcome.
 * Uses atomic updateState() to prevent race conditions in multi-agent environments.
 */
export declare function recordRouting(entry: RoutingEntry, projectDir?: string): {
    ok: boolean;
    error?: string;
};
/**
 * Get success rate for a model/agent combination.
 * @param model - 모델명으로 필터
 * @param agent - (optional) 에이전트명으로 추가 필터
 * @param projectDir - (optional) 프로젝트 디렉토리
 */
export declare function getSuccessRate(model: string, agent?: string, projectDir?: string): SuccessRate;
/**
 * Get success rate for a route.
 * @param route - 라우트명으로 필터
 * @param projectDir - (optional) 프로젝트 디렉토리
 */
export declare function getSuccessRate(route: string, projectDir?: string): SuccessRate;
/**
 * 피드백 기반 confidence 동적 조정.
 *
 * 공식: base * (1 + 0.25 * (rate - 0.5))
 * 범위: [0.875 * base, 1.125 * base]
 *
 * 콜드 스타트 보호: total < 5이면 base 그대로 반환 (rate=0 페널티 방지)
 *
 * @param baseConfidence - 기본 confidence 값
 * @param route - 히스토리에서 조회할 라우트명
 * @param projectDir - (optional) 프로젝트 디렉토리
 */
export declare function adjustConfidence(baseConfidence: number, route: string, projectDir?: string): number;
export {};
//# sourceMappingURL=routing-history.d.ts.map