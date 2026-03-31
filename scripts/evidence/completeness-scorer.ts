/**
 * aing Evidence-Based Completeness Scorer (Phase 4 — 200% Differentiator)
 *
 * Automatically calculates Completeness score from evidence artifacts.
 * Uses X/10 scoring with aing's evidence chain.
 *
 * @module scripts/evidence/completeness-scorer
 */

export interface GoalCondition {
  name: string;
  met: boolean;
}

export interface CompletenessEvidence {
  tests?: { passed: number; total: number };
  build?: { success: boolean };
  lint?: { errors: number };
  goals?: { conditions: GoalCondition[] };
  edgeCases?: { handled: number };
}

export type CompletenessVerdict = 'ACHIEVED' | 'COMPLETED BUT INCOMPLETE' | 'FAILED';

export interface CompletenessEvaluation {
  score: number;
  verdict: CompletenessVerdict;
  report: string;
}

/**
 * Calculate Completeness score (0-10) from evidence artifacts.
 *
 * Scoring breakdown:
 *   Tests:      0-3 points (pass ratio)
 *   Build:      0-2 points (success/fail)
 *   Lint:       0-1 point  (zero errors)
 *   Goals:      0-3 points (condition met ratio)
 *   Edge cases: 0-1 bonus  (any handled)
 */
export function calculateCompleteness(evidence: CompletenessEvidence): number {
  if (!evidence) return 0;

  let score = 0;

  // Test evidence (0-3 points)
  if (evidence.tests?.passed != null && evidence.tests?.total > 0) {
    const ratio = evidence.tests.passed / evidence.tests.total;
    score += Math.round(ratio * 3);
  }

  // Build evidence (0-2 points)
  if (evidence.build?.success) score += 2;

  // Lint evidence (0-1 point)
  if (evidence.lint?.errors === 0) score += 1;

  // Goal conditions met (0-3 points)
  if ((evidence.goals?.conditions?.length ?? 0) > 0) {
    const met = evidence.goals!.conditions.filter(c => c.met).length;
    const total = evidence.goals!.conditions.length;
    score += Math.round((met / total) * 3);
  }

  // Edge cases handled (0-1 bonus)
  if ((evidence.edgeCases?.handled ?? 0) > 0) score += 1;

  return Math.min(score, 10);
}

/**
 * Get verdict from completeness score.
 */
export function getVerdict(score: number): CompletenessVerdict {
  if (score >= 8) return 'ACHIEVED';
  if (score >= 5) return 'COMPLETED BUT INCOMPLETE';
  return 'FAILED';
}

/**
 * Format completeness report section.
 */
export function formatCompletenessReport(score: number, evidence: CompletenessEvidence): string {
  const goalsMet = evidence.goals?.conditions?.filter(c => c.met).length || 0;
  const goalsTotal = evidence.goals?.conditions?.length || 0;

  return [
    `Completeness: ${score}/10`,
    `  Tests: ${evidence.tests?.passed || 0}/${evidence.tests?.total || 0} passed`,
    `  Build: ${evidence.build?.success ? 'PASS' : 'FAIL'}`,
    `  Lint: ${evidence.lint?.errors ?? '?'} errors`,
    `  Goals: ${goalsMet}/${goalsTotal} met`,
    `  Verdict: ${getVerdict(score)}`,
  ].join('\n');
}

/**
 * Generate a full completeness evaluation from raw evidence.
 * Convenience wrapper combining calculation + formatting.
 */
export function evaluateCompleteness(evidence: CompletenessEvidence): CompletenessEvaluation {
  const score = calculateCompleteness(evidence);
  const verdict = getVerdict(score);
  const report = formatCompletenessReport(score, evidence);
  return { score, verdict, report };
}
