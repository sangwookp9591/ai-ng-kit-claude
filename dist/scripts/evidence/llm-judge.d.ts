/**
 * LLM Judge evaluation criteria.
 */
export declare const JUDGE_CRITERIA: Record<string, string>;
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
export declare function buildJudgePrompt(criterion: string, context: JudgeContext): string;
/**
 * Parse judge response into structured result.
 */
export declare function parseJudgeResponse(response: string): JudgeResult | null;
/**
 * Add LLM judge evaluation as evidence.
 * Called after an agent runs the judge prompt and gets a result.
 */
export declare function addJudgeEvidence(feature: string, result: JudgeResult | null, criterion: string, projectDir?: string): void;
/**
 * Build a multi-criteria evaluation plan.
 * Returns which criteria to evaluate based on change type.
 */
export declare function selectCriteria(signals?: JudgeSignals): string[];
/**
 * Format judge results for display.
 */
export declare function formatJudgeResults(results: JudgeDisplayResult[]): string;
//# sourceMappingURL=llm-judge.d.ts.map