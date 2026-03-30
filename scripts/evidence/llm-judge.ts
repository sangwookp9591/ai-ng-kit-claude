/**
 * aing LLM Judge — AI-Powered Quality Evaluation
 * 200% Synergy: gstack LLM Judge + aing Evidence Chain
 *
 * Adds LLM-based evaluation as a first-class evidence type.
 * The judge evaluates outputs against expected quality criteria
 * and produces a 0-10 score that feeds into Sam's completeness scoring.
 *
 * @module scripts/evidence/llm-judge
 */
import { addEvidence } from './evidence-chain.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('llm-judge');

/**
 * LLM Judge evaluation criteria.
 */
export const JUDGE_CRITERIA: Record<string, string> = {
  CORRECTNESS: 'correctness',
  COMPLETENESS: 'completeness',
  CODE_QUALITY: 'code-quality',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  UX_QUALITY: 'ux-quality',
  DESIGN_QUALITY: 'design-quality',
};

export interface JudgeContext {
  feature: string;
  actual: string;
  expected?: string;
  groundTruth?: string;
}

export interface JudgeResult {
  score: number;
  issues: string[];
  summary: string;
}

export interface JudgeSignals {
  hasUI?: boolean;
  hasSecurity?: boolean;
  hasAPI?: boolean;
  hasDB?: boolean;
}

export interface JudgeDisplayResult {
  criterion: string;
  score: number;
  summary: string;
}

/**
 * Build a judge prompt for evaluating a specific aspect.
 */
export function buildJudgePrompt(criterion: string, context: JudgeContext): string {
  const criteriaDescriptions: Record<string, string> = {
    [JUDGE_CRITERIA.CORRECTNESS]: 'Evaluate whether the output is functionally correct. Check for logic errors, edge cases, and correctness of behavior.',
    [JUDGE_CRITERIA.COMPLETENESS]: 'Evaluate whether all stated requirements are addressed. Check for missing features, incomplete implementations, and unhandled cases.',
    [JUDGE_CRITERIA.CODE_QUALITY]: 'Evaluate code structure, readability, DRY principle adherence, error handling, and maintainability.',
    [JUDGE_CRITERIA.SECURITY]: 'Evaluate for security vulnerabilities: injection, XSS, auth bypass, data exposure, OWASP Top 10.',
    [JUDGE_CRITERIA.PERFORMANCE]: 'Evaluate for performance issues: N+1 queries, memory leaks, unnecessary computation, missing caching.',
    [JUDGE_CRITERIA.UX_QUALITY]: 'Evaluate user experience: loading states, error messages, accessibility, responsive design.',
    [JUDGE_CRITERIA.DESIGN_QUALITY]: 'Evaluate visual design quality. Check for AI slop patterns: generic gradients, 3-column grids, emoji overuse, stock-photo aesthetics.',
  };

  return `You are an expert evaluator. Score the following on a 0-10 scale.

## Criterion: ${criterion}
${criteriaDescriptions[criterion] || 'General quality evaluation.'}

## Feature: ${context.feature}

## Actual Output:
${(context.actual || '').slice(0, 15000)}

${context.expected ? `## Expected Behavior:\n${context.expected}\n` : ''}
${context.groundTruth ? `## Ground Truth:\n${context.groundTruth}\n` : ''}

## Instructions:
1. Evaluate strictly against the criterion above
2. Score 0-10 (10 = perfect, 7 = good with minor issues, 5 = acceptable, 3 = poor, 0 = completely wrong)
3. List specific issues found (max 5)
4. Be direct. No hedging.

Respond ONLY in this JSON format:
{
  "score": <number 0-10>,
  "issues": ["issue 1", "issue 2", ...],
  "summary": "<one sentence verdict>"
}`;
}

/**
 * Parse judge response into structured result.
 */
export function parseJudgeResponse(response: string): JudgeResult | null {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.warn('No JSON found in judge response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.max(0, Math.min(10, Number(parsed.score) || 0)),
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 10) : [],
      summary: String(parsed.summary || 'No summary'),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Failed to parse judge response: ${message}`);
    return null;
  }
}

/**
 * Add LLM judge evaluation as evidence.
 * Called after an agent runs the judge prompt and gets a result.
 */
export function addJudgeEvidence(feature: string, result: JudgeResult | null, criterion: string, projectDir?: string): void {
  if (!result) return;

  // Score >= 7 is pass, < 5 is fail, 5-6 is incomplete
  const verdictResult = result.score >= 7 ? 'pass'
    : result.score < 5 ? 'fail'
    : 'not_available';

  addEvidence(feature, {
    type: 'llm-judge',
    result: verdictResult,
    source: `judge-${criterion}`,
    details: {
      criterion,
      score: result.score,
      issues: result.issues,
      summary: result.summary,
    },
  }, projectDir);

  log.info(`LLM Judge [${criterion}]: ${result.score}/10 → ${verdictResult}`);
}

/**
 * Build a multi-criteria evaluation plan.
 * Returns which criteria to evaluate based on change type.
 */
export function selectCriteria(signals: JudgeSignals = {}): string[] {
  const criteria: string[] = [JUDGE_CRITERIA.CORRECTNESS, JUDGE_CRITERIA.COMPLETENESS];

  if (signals.hasUI) {
    criteria.push(JUDGE_CRITERIA.UX_QUALITY);
    criteria.push(JUDGE_CRITERIA.DESIGN_QUALITY);
  }

  if (signals.hasSecurity) {
    criteria.push(JUDGE_CRITERIA.SECURITY);
  }

  if (signals.hasAPI || signals.hasDB) {
    criteria.push(JUDGE_CRITERIA.PERFORMANCE);
  }

  criteria.push(JUDGE_CRITERIA.CODE_QUALITY);  // Always

  return criteria;
}

/**
 * Format judge results for display.
 */
export function formatJudgeResults(results: JudgeDisplayResult[]): string {
  if (!results || results.length === 0) return 'No LLM judge evaluations.';

  const lines: string[] = ['LLM Judge Evaluations:'];
  let totalScore = 0;

  for (const r of results) {
    const icon = r.score >= 7 ? '✓' : r.score < 5 ? '✗' : '△';
    lines.push(`  ${icon} ${r.criterion}: ${r.score}/10 — ${r.summary}`);
    totalScore += r.score;
  }

  const avg = (totalScore / results.length).toFixed(1);
  lines.push(`  Average: ${avg}/10`);

  return lines.join('\n');
}
