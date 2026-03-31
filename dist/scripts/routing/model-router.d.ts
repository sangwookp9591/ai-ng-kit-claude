/**
 * aing Model Router — Adaptive model selection based on task complexity and risk.
 * Routes agents to optimal model tier (haiku/sonnet/opus) based on signals.
 * @module scripts/routing/model-router
 */
import { ComplexitySignals } from './complexity-scorer.js';
export type CostMode = 'quality' | 'balanced' | 'budget';
export type ModelTier = 'haiku' | 'sonnet' | 'opus';
interface RoutingResult {
    model: string;
    reason: string;
    escalated: boolean;
}
interface RouteOptions {
    costMode?: CostMode;
    forceModel?: string;
    context?: string;
}
/**
 * Route an agent to the optimal model tier.
 */
export declare function routeModel(agentName: string, signals?: ComplexitySignals, options?: RouteOptions): RoutingResult;
/**
 * Get cost mode from environment or default.
 */
export declare function getCostMode(): CostMode;
export {};
//# sourceMappingURL=model-router.d.ts.map