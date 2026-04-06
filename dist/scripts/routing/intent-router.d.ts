/**
 * aing Intent Router
 * 자연어 입력을 분석하여 최적의 aing 파이프라인으로 라우팅합니다.
 * @module scripts/routing/intent-router
 */
import { type RerankerOptions } from './reranker.js';
type Route = 'auto' | 'plan' | 'plan-only' | 'team' | 'wizard' | 'debug' | 'review-pipeline' | 'review-cso' | 'explore' | 'perf' | 'refactor' | 'tdd';
type Preset = 'solo' | 'duo' | 'squad' | 'full' | 'design';
export interface IntentResult {
    route: Route;
    preset: Preset;
    confidence: number;
    reason: string;
    originalInput: string;
}
/**
 * 자연어 입력을 분석하여 최적의 aing 파이프라인으로 라우팅합니다.
 */
export declare function routeIntent(input: string | null): IntentResult;
export interface RankedIntentResult extends IntentResult {
    finalScore: number;
    sparseScore: number;
    denseScore: number;
}
/**
 * 2단계 라우팅: 1단계 routeIntent() 결과 + 대안 후보들을 리랭킹하여 정렬된 리스트를 반환합니다.
 * 기존 routeIntent() API는 변경 없이 유지됩니다.
 */
export declare function routeIntentRanked(input: string | null, options?: RerankerOptions): RankedIntentResult[];
export {};
//# sourceMappingURL=intent-router.d.ts.map