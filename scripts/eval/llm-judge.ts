/**
 * aing Eval LLM Judge — Skill Quality Scoring via LLM
 *
 * 5-criteria evaluation (1-5 each, 25 max):
 *   clarity, completeness, actionability, accuracy, coherence
 *
 * Builds on patterns from scripts/evidence/llm-judge.ts but
 * specialized for skill definition quality assessment.
 *
 * @module scripts/eval/llm-judge
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';
import { readState } from '../core/state.js';

const log = createLogger('eval-llm-judge');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = 'error' | 'warning' | 'info';

export interface JudgeFinding {
  rule: string;
  message: string;
  severity: Severity;
}

export interface JudgeCriterionScore {
  criterion: string;
  score: number;
  maxScore: number;
  rationale: string;
}

export interface JudgeResult {
  score: number;
  maxScore: number;
  passed: boolean;
  findings: JudgeFinding[];
  criteria: JudgeCriterionScore[];
  regressions: RegressionAlert[];
}

export interface RegressionAlert {
  criterion: string;
  previousScore: number;
  currentScore: number;
  delta: number;
}

interface LlmJudgeResponse {
  clarity: { score: number; rationale: string };
  completeness: { score: number; rationale: string };
  actionability: { score: number; rationale: string };
  accuracy: { score: number; rationale: string };
  coherence: { score: number; rationale: string };
}

interface BaselineEntry {
  skill: string;
  criteria: Record<string, number>;
  timestamp: string;
}

interface BaselineData {
  baselines: BaselineEntry[];
}

// ---------------------------------------------------------------------------
// Criteria definitions
// ---------------------------------------------------------------------------

export const EVAL_CRITERIA = [
  'clarity',
  'completeness',
  'actionability',
  'accuracy',
  'coherence',
] as const;

export type EvalCriterion = typeof EVAL_CRITERIA[number];

const CRITERIA_DESCRIPTIONS: Record<EvalCriterion, string> = {
  clarity: 'How clear and unambiguous are the instructions? Can an AI agent follow them without confusion? Score 1-5.',
  completeness: 'Are all necessary steps, edge cases, and error handling described? No missing phases or gaps? Score 1-5.',
  actionability: 'Does the skill provide concrete, executable instructions (not vague guidance)? Are tool names and patterns specified? Score 1-5.',
  accuracy: 'Are the tool references, agent names, and technical details correct? No hallucinated APIs or features? Score 1-5.',
  coherence: 'Does the skill flow logically from start to finish? Are phases ordered correctly with clear transitions? Score 1-5.',
};

const MAX_SCORE_PER_CRITERION = 5;
const PASS_THRESHOLD = 15; // 60% of 25

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

export function buildEvalJudgePrompt(skillContent: string): string {
  const criteriaBlock = Object.entries(CRITERIA_DESCRIPTIONS)
    .map(([name, desc]) => `- **${name}**: ${desc}`)
    .join('\n');

  return `You are an expert evaluator of AI agent skill definitions. Score this skill on 5 criteria (1-5 each).

## Evaluation Criteria
${criteriaBlock}

## Skill Content
\`\`\`markdown
${skillContent.slice(0, 12000)}
\`\`\`

## Scoring Rules
- 5 = Excellent: clear, complete, immediately actionable
- 4 = Good: minor improvements possible
- 3 = Adequate: works but has gaps
- 2 = Poor: significant issues
- 1 = Failing: major problems or unusable

Be strict. Most skills should score 3-4 unless truly exceptional or deeply flawed.

Respond ONLY with this JSON:
{
  "clarity": {"score": <1-5>, "rationale": "<one sentence>"},
  "completeness": {"score": <1-5>, "rationale": "<one sentence>"},
  "actionability": {"score": <1-5>, "rationale": "<one sentence>"},
  "accuracy": {"score": <1-5>, "rationale": "<one sentence>"},
  "coherence": {"score": <1-5>, "rationale": "<one sentence>"}
}`;
}

// ---------------------------------------------------------------------------
// Response parser
// ---------------------------------------------------------------------------

export function parseJudgeResponse(response: string): LlmJudgeResponse | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log.warn('No JSON found in LLM judge response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    const result: Record<string, { score: number; rationale: string }> = {};
    for (const criterion of EVAL_CRITERIA) {
      const entry = parsed[criterion];
      if (!entry || typeof entry.score !== 'number') {
        log.warn(`Missing or invalid criterion: ${criterion}`);
        return null;
      }
      result[criterion] = {
        score: Math.max(1, Math.min(5, Math.round(entry.score))),
        rationale: String(entry.rationale || 'No rationale'),
      };
    }

    return result as unknown as LlmJudgeResponse;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`Failed to parse judge response: ${message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Regression detection
// ---------------------------------------------------------------------------

function loadBaseline(skill: string, projectDir: string): Record<string, number> | null {
  const baselinePath = join(projectDir, '.aing', 'evals', 'baselines.json');
  const result = readState(baselinePath);
  if (!result.ok) return null;

  const data = result.data as BaselineData;
  if (!data.baselines || !Array.isArray(data.baselines)) return null;

  const entry = data.baselines.find(b => b.skill === skill);
  return entry?.criteria ?? null;
}

export function detectRegressions(
  skill: string,
  currentScores: Record<string, number>,
  projectDir: string,
): RegressionAlert[] {
  const baseline = loadBaseline(skill, projectDir);
  if (!baseline) return [];

  const alerts: RegressionAlert[] = [];
  for (const [criterion, current] of Object.entries(currentScores)) {
    const previous = baseline[criterion];
    if (previous !== undefined && current < previous) {
      const delta = current - previous;
      // Only alert on drops of 2+ points (significant regression)
      if (delta <= -2) {
        alerts.push({ criterion, previousScore: previous, currentScore: current, delta });
      }
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// LLM invocation (subprocess via execFileSync -- no shell injection)
// ---------------------------------------------------------------------------

function invokeLlm(prompt: string, projectDir: string): string | null {
  try {
    const result = execFileSync(
      'claude',
      ['-p', prompt, '--max-turns', '1'],
      {
        cwd: projectDir,
        timeout: 60_000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error(`LLM invocation failed: ${message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the LLM judge on a skill and return structured scores.
 * Falls back to a synthetic score based on content heuristics if
 * the LLM subprocess is unavailable.
 */
export function runLlmJudge(skill: string, projectDir?: string): JudgeResult {
  const dir = projectDir || process.cwd();
  const skillPath = join(dir, 'skills', skill, 'SKILL.md');
  const findings: JudgeFinding[] = [];
  const criteria: JudgeCriterionScore[] = [];

  if (!existsSync(skillPath)) {
    return {
      score: 0,
      maxScore: 25,
      passed: false,
      findings: [{ rule: 'skill-not-found', message: `SKILL.md not found: ${skillPath}`, severity: 'error' }],
      criteria: [],
      regressions: [],
    };
  }

  const content = readFileSync(skillPath, 'utf-8');
  const prompt = buildEvalJudgePrompt(content);

  // Try LLM invocation
  const llmResponse = invokeLlm(prompt, dir);
  let parsed: LlmJudgeResponse | null = null;

  if (llmResponse) {
    parsed = parseJudgeResponse(llmResponse);
  }

  if (parsed) {
    // Use LLM scores
    const scoreMap: Record<string, number> = {};
    for (const criterion of EVAL_CRITERIA) {
      const entry = parsed[criterion];
      criteria.push({
        criterion,
        score: entry.score,
        maxScore: MAX_SCORE_PER_CRITERION,
        rationale: entry.rationale,
      });
      scoreMap[criterion] = entry.score;

      if (entry.score <= 2) {
        findings.push({
          rule: `low-${criterion}`,
          message: `${criterion}: ${entry.rationale}`,
          severity: 'error',
        });
      } else if (entry.score === 3) {
        findings.push({
          rule: `mid-${criterion}`,
          message: `${criterion}: ${entry.rationale}`,
          severity: 'warning',
        });
      }
    }

    // Regression detection
    const regressions = detectRegressions(skill, scoreMap, dir);
    for (const reg of regressions) {
      findings.push({
        rule: 'regression',
        message: `Regression in ${reg.criterion}: ${reg.previousScore} -> ${reg.currentScore} (delta: ${reg.delta})`,
        severity: 'error',
      });
    }

    const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
    return {
      score: totalScore,
      maxScore: 25,
      passed: totalScore >= PASS_THRESHOLD,
      findings,
      criteria,
      regressions,
    };
  }

  // Fallback: heuristic scoring when LLM is unavailable
  log.warn('LLM unavailable, using heuristic scoring');
  findings.push({
    rule: 'llm-fallback',
    message: 'LLM judge unavailable -- using heuristic scoring',
    severity: 'info',
  });

  const heuristicScore = computeHeuristicScore(content);
  for (const [criterion, score] of Object.entries(heuristicScore)) {
    criteria.push({
      criterion,
      score,
      maxScore: MAX_SCORE_PER_CRITERION,
      rationale: 'Heuristic estimate (LLM unavailable)',
    });
  }

  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
  return {
    score: totalScore,
    maxScore: 25,
    passed: totalScore >= PASS_THRESHOLD,
    findings,
    criteria,
    regressions: [],
  };
}

/**
 * Heuristic scoring for when the LLM subprocess is unavailable.
 * Produces rough estimates based on content structure.
 */
export function computeHeuristicScore(content: string): Record<EvalCriterion, number> {
  const lines = content.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0).length;
  const headings = lines.filter(l => /^##\s/.test(l)).length;
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  const hasSteps = /^\d+\.\s/m.test(content) || /^-\s\[/m.test(content);
  const hasFrontmatter = content.startsWith('---');

  // clarity: headings + frontmatter + moderate length
  const clarity = Math.min(5, 1 + (hasFrontmatter ? 1 : 0) + Math.min(2, headings) + (nonEmpty > 20 ? 1 : 0));

  // completeness: length + sections + steps
  const completeness = Math.min(5, 1 + Math.min(2, Math.floor(nonEmpty / 15)) + Math.min(1, headings) + (hasSteps ? 1 : 0));

  // actionability: code blocks + steps + tool references
  const toolRefs = (content.match(/\b(Read|Write|Edit|Bash|Glob|Grep|TaskCreate|TeamCreate)\b/g) || []).length;
  const actionability = Math.min(5, 1 + Math.min(2, Math.floor(codeBlocks)) + (hasSteps ? 1 : 0) + (toolRefs > 0 ? 1 : 0));

  // accuracy: hard to assess heuristically, default to 3
  const accuracy = hasFrontmatter && nonEmpty > 10 ? 3 : 2;

  // coherence: headings flow + length balance
  const coherence = Math.min(5, 1 + Math.min(2, headings) + (nonEmpty > 10 && nonEmpty < 500 ? 1 : 0) + (hasFrontmatter ? 1 : 0));

  return { clarity, completeness, actionability, accuracy, coherence };
}
