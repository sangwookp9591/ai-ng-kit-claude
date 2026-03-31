export interface JudgeCriteria {
    name: string;
    description: string;
    /** Relative weight when computing the total score. */
    weight: number;
}
export interface CriterionScore {
    name: string;
    score: number;
    reasoning: string;
}
export interface JudgeResult {
    /** Weighted total score on a 0-10 scale. */
    totalScore: number;
    criteria: CriterionScore[];
    summary: string;
}
export declare const DEFAULT_CRITERIA: JudgeCriteria[];
/**
 * Use an LLM (via `claude -p`) to judge the quality of a skill's output.
 *
 * @param skillName       Name of the skill being evaluated.
 * @param output          The raw output the skill produced.
 * @param expectedBehavior  Description of what the skill should have done.
 * @param criteria        Evaluation criteria (defaults to {@link DEFAULT_CRITERIA}).
 * @returns               Structured {@link JudgeResult}.
 */
export declare function judgeOutput(skillName: string, output: string, expectedBehavior: string, criteria?: JudgeCriteria[]): Promise<JudgeResult>;
//# sourceMappingURL=llm-judge.d.ts.map