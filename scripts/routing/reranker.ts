/**
 * aing Reranker — 2nd-stage scoring for intent routing candidates.
 * Wrapper pattern: does NOT modify model-router or team-orchestrator interfaces.
 * @module scripts/routing/reranker
 */

import { getCostMode, type CostMode } from './model-router.js';
import { getSuccessRate } from './routing-history.js';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface RankedCandidate {
  route: string;
  sparseScore: number;   // 1단계 keyword/pattern confidence
  denseScore: number;     // 2단계 reranker signals
  finalScore: number;     // fused score
  signals: RerankerSignals;
}

export interface RerankerSignals {
  costPenalty: number;        // 0-1, high cost routes penalized in budget mode
  historySuccessRate: number; // 0-1, from routing-history
  historyWeight: number;      // how much history contributed (0 if cold-start)
}

export interface RerankerOptions {
  costMode?: CostMode;
  projectDir?: string;
}

// ─────────────────────────────────────────────
// Alpha table: per-route fusion weights
// alpha=1.0 → trust sparse(keyword) only
// alpha=0.0 → trust dense(reranker) only
// ─────────────────────────────────────────────

const ALPHA_TABLE: Record<string, number> = {
  // High-confidence keyword routes — trust sparse more
  'debug':           0.7,
  'review-cso':      0.7,
  'review-pipeline': 0.7,
  'perf':            0.7,
  'tdd':             0.65,
  'refactor':        0.65,
  'explore':         0.6,

  // Lower-confidence routes — let reranker have more influence
  'auto':            0.5,
  'plan':            0.5,
  'plan-only':       0.5,
  'team':            0.55,
  'wizard':          0.5,
};

const DEFAULT_ALPHA = 0.5;

// ─────────────────────────────────────────────
// Cost penalty by route and cost mode
// ─────────────────────────────────────────────

/** Routes that require opus-tier agents get penalized in budget mode */
const EXPENSIVE_ROUTES = new Set(['team', 'review-cso', 'plan']);
const MODERATE_ROUTES = new Set(['auto', 'review-pipeline', 'refactor', 'debug']);

function computeCostPenalty(route: string, costMode: CostMode): number {
  if (costMode === 'quality') return 0;

  if (EXPENSIVE_ROUTES.has(route)) {
    return costMode === 'budget' ? 0.15 : 0.05;
  }
  if (MODERATE_ROUTES.has(route)) {
    return costMode === 'budget' ? 0.05 : 0;
  }
  return 0;
}

// ─────────────────────────────────────────────
// Core reranker
// ─────────────────────────────────────────────

/**
 * Compute dense (reranker) score for a single route candidate.
 * Combines cost penalty and history success rate.
 */
export function computeDenseScore(
  route: string,
  options: RerankerOptions = {},
): { denseScore: number; signals: RerankerSignals } {
  const costMode = options.costMode ?? getCostMode();

  const costPenalty = computeCostPenalty(route, costMode);
  const { total, rate } = getSuccessRate(route, options.projectDir);

  // Cold-start: if < 5 entries, don't let history drag score down
  const historyWeight = total >= 5 ? 1.0 : 0;
  const historySuccessRate = historyWeight > 0 ? rate : 0.5; // neutral default

  // Dense score: base 0.5 + history bonus - cost penalty
  // Range: roughly [0, 1]
  const denseScore = Math.max(0, Math.min(1,
    0.5 + (historySuccessRate - 0.5) * 0.4 * historyWeight - costPenalty
  ));

  return {
    denseScore,
    signals: { costPenalty, historySuccessRate, historyWeight },
  };
}

/**
 * Fuse sparse (keyword confidence) and dense (reranker) scores.
 * Formula: finalScore = alpha * sparse + (1 - alpha) * dense
 */
export function fuseScores(
  route: string,
  sparseScore: number,
  denseScore: number,
): number {
  const alpha = ALPHA_TABLE[route] ?? DEFAULT_ALPHA;
  return alpha * sparseScore + (1 - alpha) * denseScore;
}

/**
 * Rerank a list of route candidates.
 * Input: array of { route, confidence } from 1st-stage routing.
 * Output: sorted RankedCandidate[] by finalScore descending.
 */
export function rerank(
  candidates: Array<{ route: string; confidence: number }>,
  options: RerankerOptions = {},
): RankedCandidate[] {
  return candidates
    .map(c => {
      const { denseScore, signals } = computeDenseScore(c.route, options);
      const finalScore = fuseScores(c.route, c.confidence, denseScore);
      return {
        route: c.route,
        sparseScore: c.confidence,
        denseScore,
        finalScore,
        signals,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
