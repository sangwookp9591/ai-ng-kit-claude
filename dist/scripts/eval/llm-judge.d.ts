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
    clarity: {
        score: number;
        rationale: string;
    };
    completeness: {
        score: number;
        rationale: string;
    };
    actionability: {
        score: number;
        rationale: string;
    };
    accuracy: {
        score: number;
        rationale: string;
    };
    coherence: {
        score: number;
        rationale: string;
    };
}
export declare const EVAL_CRITERIA: readonly ["clarity", "completeness", "actionability", "accuracy", "coherence"];
export type EvalCriterion = typeof EVAL_CRITERIA[number];
export declare function buildEvalJudgePrompt(skillContent: string): string;
export declare function parseJudgeResponse(response: string): LlmJudgeResponse | null;
export declare function detectRegressions(skill: string, currentScores: Record<string, number>, projectDir: string): RegressionAlert[];
/**
 * Run the LLM judge on a skill and return structured scores.
 * Falls back to a synthetic score based on content heuristics if
 * the LLM subprocess is unavailable.
 */
export declare function runLlmJudge(skill: string, projectDir?: string): JudgeResult;
/**
 * Heuristic scoring for when the LLM subprocess is unavailable.
 * Produces rough estimates based on content structure.
 */
export declare function computeHeuristicScore(content: string): Record<EvalCriterion, number>;
export {};
//# sourceMappingURL=llm-judge.d.ts.map