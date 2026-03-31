export interface PreLandingResult {
    passed: boolean;
    critical: number;
    total: number;
    autoFixed?: number;
    needsDecision?: number;
    formatted: string;
}
/**
 * Run pre-landing review against the branch diff.
 */
export declare function runPreLandingReview(baseBranch: string, projectDir?: string): PreLandingResult;
//# sourceMappingURL=pre-landing-reviewer.d.ts.map