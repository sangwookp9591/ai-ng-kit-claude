/**
 * aing Agent Specialization Scorer
 * Computes domain specialization scores and recommends agents for tasks.
 * Supports adaptive per-domain weights with persistence.
 * @module scripts/agent-intelligence/specialization-scorer
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
const DEFAULT_WEIGHTS = {
    completionRate: 0.4,
    avgReviewScore: 0.4,
    domainExperience: 0.2,
};
const WEIGHTS_PATH = '.aing/state/specialization-weights.json';
const STALE_DAYS = 30;
/** Clamp weight to minimum 0.01, then normalize so all weights sum to 1.0 */
export function normalizeWeights(raw) {
    const clamped = {
        completionRate: Math.max(raw.completionRate, 0.01),
        avgReviewScore: Math.max(raw.avgReviewScore, 0.01),
        domainExperience: Math.max(raw.domainExperience, 0.01),
    };
    const sum = clamped.completionRate + clamped.avgReviewScore + clamped.domainExperience;
    return {
        completionRate: clamped.completionRate / sum,
        avgReviewScore: clamped.avgReviewScore / sum,
        domainExperience: clamped.domainExperience / sum,
    };
}
/** Load persisted weights store from disk */
export function loadWeightsStore(projectDir) {
    const path = join(projectDir, WEIGHTS_PATH);
    if (!existsSync(path)) {
        return { version: 1, domains: {} };
    }
    try {
        const data = JSON.parse(readFileSync(path, 'utf8'));
        return data;
    }
    catch {
        return { version: 1, domains: {} };
    }
}
/** Save weights store to disk */
export function saveWeightsStore(projectDir, store) {
    const path = join(projectDir, WEIGHTS_PATH);
    const dir = dirname(path);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, JSON.stringify(store, null, 2), 'utf8');
}
/** Get weights for a domain, resetting to defaults if stale (>30 days) */
export function getWeightsForDomain(store, domain) {
    const entry = store.domains[domain];
    if (!entry)
        return { ...DEFAULT_WEIGHTS };
    const elapsed = Date.now() - new Date(entry.updatedAt).getTime();
    if (elapsed > STALE_DAYS * 24 * 60 * 60 * 1000) {
        return { ...DEFAULT_WEIGHTS };
    }
    return normalizeWeights(entry.weights);
}
/**
 * Update weights for a domain based on correlation analysis of feedback data.
 * Only updates when taskCount > 10 for statistical significance.
 */
export function updateWeightsFromFeedback(store, domain, performances) {
    // Filter to agents with domain experience
    const relevant = performances.filter(p => (p.domains[domain] ?? 0) > 0);
    const totalDomainTasks = relevant.reduce((sum, p) => sum + (p.domains[domain] ?? 0), 0);
    if (totalDomainTasks <= 10)
        return store;
    // Compute simple correlation-like importance for each factor
    // by measuring variance contribution to overall success
    const n = relevant.length;
    if (n < 3)
        return store;
    const completionRates = relevant.map(p => p.completionRate);
    const reviewScores = relevant.map(p => p.avgReviewScore);
    const domainExps = relevant.map(p => {
        const total = p.totalTasks;
        return total > 0 ? ((p.domains[domain] ?? 0) / total) * 100 : 0;
    });
    // Use variance as a proxy for discriminative power
    const varCompletion = variance(completionRates);
    const varReview = variance(reviewScores);
    const varDomain = variance(domainExps);
    const totalVar = varCompletion + varReview + varDomain;
    if (totalVar === 0)
        return store;
    const rawWeights = {
        completionRate: varCompletion / totalVar,
        avgReviewScore: varReview / totalVar,
        domainExperience: varDomain / totalVar,
    };
    const normalized = normalizeWeights(rawWeights);
    const updated = { ...store };
    updated.domains = { ...updated.domains };
    updated.domains[domain] = {
        domain,
        weights: normalized,
        updatedAt: new Date().toISOString(),
    };
    return updated;
}
function variance(values) {
    if (values.length === 0)
        return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}
/**
 * Score an agent's specialization for a given domain.
 * Uses adaptive per-domain weights when available, otherwise defaults (0.4/0.4/0.2).
 * confidence: min(taskCount * 10, 100) — 10+ tasks = 100%
 */
export function scoreSpecialization(performance, domain, weights) {
    const w = weights ? normalizeWeights(weights) : DEFAULT_WEIGHTS;
    const domainTaskCount = performance.domains[domain] ?? 0;
    const totalTasks = performance.totalTasks;
    const taskCount = totalTasks;
    const confidence = Math.min(taskCount * 10, 100);
    const domainExperience = totalTasks > 0 ? Math.round((domainTaskCount / totalTasks) * 100) : 0;
    const rawScore = performance.completionRate * w.completionRate +
        performance.avgReviewScore * w.avgReviewScore +
        domainExperience * w.domainExperience;
    // Clamp to [0, 100]
    const score = Math.round(Math.max(0, Math.min(100, rawScore)));
    return {
        agent: performance.agent,
        domain,
        score,
        confidence,
        taskCount,
    };
}
/**
 * Rank all agents by their specialization score for a domain.
 * Agents with cold-start (taskCount < 3) are ranked last.
 * Deterministic tie-breaking: score desc → confidence desc → agent name asc
 */
export function recommendAgent(performances, domain, weights) {
    const scored = performances.map(p => scoreSpecialization(p, domain, weights));
    return scored
        .sort((a, b) => {
        const aColdStart = a.taskCount < 3;
        const bColdStart = b.taskCount < 3;
        if (aColdStart !== bColdStart)
            return aColdStart ? 1 : -1;
        // Primary: score descending
        if (b.score !== a.score)
            return b.score - a.score;
        // Secondary: confidence descending
        if (b.confidence !== a.confidence)
            return b.confidence - a.confidence;
        // Tertiary: agent name ascending (deterministic)
        return a.agent.localeCompare(b.agent);
    })
        .map(s => ({ agent: s.agent, score: s.score }));
}
//# sourceMappingURL=specialization-scorer.js.map