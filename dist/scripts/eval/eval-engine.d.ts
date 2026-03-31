/**
 * aing Eval Engine — 3-Tier Skill Quality Assessment
 *
 * Tier 1: Static validation (free, <5s)
 * Tier 2: E2E via `claude -p` subprocess (~$3.85)
 * Tier 3: LLM-as-judge quality scoring (~$0.15)
 *
 * Eval system with aing-native patterns.
 *
 * @module scripts/eval/eval-engine
 */
export declare enum EvalTier {
    STATIC = "STATIC",
    E2E = "E2E",
    LLM_JUDGE = "LLM_JUDGE"
}
export type Severity = 'error' | 'warning' | 'info';
export interface EvalFinding {
    rule: string;
    message: string;
    severity: Severity;
    line?: number;
}
export interface EvalResult {
    tier: EvalTier;
    skill: string;
    score: number;
    maxScore: number;
    passed: boolean;
    findings: EvalFinding[];
    duration_ms: number;
    cost_estimate: number;
}
export interface EvalRunSummary {
    timestamp: string;
    results: EvalResult[];
    totalPassed: number;
    totalFailed: number;
    totalSkills: number;
    coveragePercent: number;
}
interface EvalSuccess<T> {
    ok: true;
    data: T;
}
interface EvalFailure {
    ok: false;
    error: string;
}
type EvalOutcome<T> = EvalSuccess<T> | EvalFailure;
export declare function discoverSkills(projectDir: string): string[];
/**
 * Run an evaluation for a single skill at the specified tier.
 */
export declare function runEval(skill: string, tier: EvalTier, projectDir?: string): EvalOutcome<EvalResult>;
/**
 * Run evaluations for all discovered skills at one or more tiers.
 */
export declare function runEvalSuite(tiers: EvalTier[], projectDir?: string, skillFilter?: string[]): EvalOutcome<EvalRunSummary>;
/**
 * Load the most recent eval run from disk.
 */
export declare function loadLatestEval(projectDir?: string): EvalOutcome<EvalRunSummary>;
export {};
//# sourceMappingURL=eval-engine.d.ts.map