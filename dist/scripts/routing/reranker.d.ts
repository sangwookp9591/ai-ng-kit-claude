/**
 * aing Reranker — 2nd-stage scoring for intent routing candidates.
 * Wrapper pattern: does NOT modify model-router or team-orchestrator interfaces.
 * @module scripts/routing/reranker
 */
import { type CostMode } from './model-router.js';
export interface RankedCandidate {
    route: string;
    sparseScore: number;
    denseScore: number;
    finalScore: number;
    signals: RerankerSignals;
}
export interface RerankerSignals {
    costPenalty: number;
    historySuccessRate: number;
    historyWeight: number;
}
export interface RerankerOptions {
    costMode?: CostMode;
    projectDir?: string;
}
/**
 * Compute dense (reranker) score for a single route candidate.
 * Combines cost penalty and history success rate.
 */
export declare function computeDenseScore(route: string, options?: RerankerOptions): {
    denseScore: number;
    signals: RerankerSignals;
};
/**
 * Fuse sparse (keyword confidence) and dense (reranker) scores.
 * Formula: finalScore = alpha * sparse + (1 - alpha) * dense
 */
export declare function fuseScores(route: string, sparseScore: number, denseScore: number): number;
/**
 * Rerank a list of route candidates.
 * Input: array of { route, confidence } from 1st-stage routing.
 * Output: sorted RankedCandidate[] by finalScore descending.
 */
export declare function rerank(candidates: Array<{
    route: string;
    confidence: number;
}>, options?: RerankerOptions): RankedCandidate[];
//# sourceMappingURL=reranker.d.ts.map