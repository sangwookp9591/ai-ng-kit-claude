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
import { addEvidence } from './evidence-chain.mjs';
import { createLogger } from '../core/logger.mjs';

const log = createLogger('llm-judge');

/**
 * LLM Judge evaluation criteria.
 */
export const JUDGE_CRITERIA = {
  CORRECTNESS: 'correctness',       // Does it produce correct output?
  COMPLETENESS: 'completeness',     // Are all requirements addressed?
  CODE_QUALITY: 'code-quality',     // Is the code well-structured?
  SECURITY: 'security',             // Are there security concerns?
  PERFORMANCE: 'performance',       // Are there performance issues?
  UX_QUALITY: 'ux-quality',         // Is the user experience good?
  DESIGN_QUALITY: 'design-quality', // Visual/design quality
};

/**
 * Build a judge prompt for evaluating a specific aspect.
 *
 * @param {string} criterion - One of JUDGE_CRITERIA values
 * @param {object} context
 * @param {string} context.feature - Feature being evaluated
 * @param {string} context.actual - Actual output/code to evaluate
 * @param {string} [context.expected] - Expected behavior/output
 * @param {string} [context.groundTruth] - Ground truth for comparison
 * @returns {string} Prompt for the judge agent
 */
export function buildJudgePrompt(criterion, context) {
  const criteriaDescriptions = {
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
 * @param {string} response - Raw judge response text
 * @returns {{ score: number, issues: string[], summary: string } | null}
 */
export function parseJudgeResponse(response) {
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
  } catch (err) {
    log.error(`Failed to parse judge response: ${err.message}`);
    return null;
  }
}

/**
 * Add LLM judge evaluation as evidence.
 * Called after an agent runs the judge prompt and gets a result.
 *
 * @param {string} feature
 * @param {object} result - Parsed judge result
 * @param {string} criterion - Which criterion was evaluated
 * @param {string} [projectDir]
 */
export function addJudgeEvidence(feature, result, criterion, projectDir) {
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
 *
 * @param {object} signals
 * @param {boolean} [signals.hasUI] - UI changes
 * @param {boolean} [signals.hasSecurity] - Security-sensitive changes
 * @param {boolean} [signals.hasAPI] - API changes
 * @param {boolean} [signals.hasDB] - Database changes
 * @returns {string[]} Array of JUDGE_CRITERIA values to evaluate
 */
export function selectCriteria(signals = {}) {
  const criteria = [JUDGE_CRITERIA.CORRECTNESS, JUDGE_CRITERIA.COMPLETENESS];

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
 * @param {Array<{ criterion: string, score: number, summary: string }>} results
 * @returns {string}
 */
export function formatJudgeResults(results) {
  if (!results || results.length === 0) return 'No LLM judge evaluations.';

  const lines = ['LLM Judge Evaluations:'];
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
