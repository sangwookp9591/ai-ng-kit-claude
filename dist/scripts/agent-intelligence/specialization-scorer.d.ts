import type { AgentPerformance } from './feedback-loop.js';
export interface SpecializationScore {
    agent: string;
    domain: string;
    score: number;
    confidence: number;
    taskCount: number;
}
export interface DomainWeights {
    completionRate: number;
    avgReviewScore: number;
    domainExperience: number;
}
export interface DomainWeightEntry {
    domain: string;
    weights: DomainWeights;
    updatedAt: string;
}
export interface WeightsStore {
    version: 1;
    domains: Record<string, DomainWeightEntry>;
}
/** Clamp weight to minimum 0.01, then normalize so all weights sum to 1.0 */
export declare function normalizeWeights(raw: DomainWeights): DomainWeights;
/** Load persisted weights store from disk */
export declare function loadWeightsStore(projectDir: string): WeightsStore;
/** Save weights store to disk */
export declare function saveWeightsStore(projectDir: string, store: WeightsStore): void;
/** Get weights for a domain, resetting to defaults if stale (>30 days) */
export declare function getWeightsForDomain(store: WeightsStore, domain: string): DomainWeights;
/**
 * Update weights for a domain based on correlation analysis of feedback data.
 * Only updates when taskCount > 10 for statistical significance.
 */
export declare function updateWeightsFromFeedback(store: WeightsStore, domain: string, performances: AgentPerformance[]): WeightsStore;
/**
 * Score an agent's specialization for a given domain.
 * Uses adaptive per-domain weights when available, otherwise defaults (0.4/0.4/0.2).
 * confidence: min(taskCount * 10, 100) — 10+ tasks = 100%
 */
export declare function scoreSpecialization(performance: AgentPerformance, domain: string, weights?: DomainWeights): SpecializationScore;
/**
 * Rank all agents by their specialization score for a domain.
 * Agents with cold-start (taskCount < 3) are ranked last.
 * Deterministic tie-breaking: score desc → confidence desc → agent name asc
 */
export declare function recommendAgent(performances: AgentPerformance[], domain: string, weights?: DomainWeights): {
    agent: string;
    score: number;
}[];
//# sourceMappingURL=specialization-scorer.d.ts.map