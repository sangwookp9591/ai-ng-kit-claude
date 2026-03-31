export interface PreflightCheck {
    name: string;
    passed: boolean;
    detail?: string;
}
export interface PreflightResult {
    ready: boolean;
    checks: PreflightCheck[];
}
/**
 * Run all preflight checks.
 */
export declare function runPreflightChecks(projectDir?: string): PreflightResult;
/**
 * Format preflight results for display.
 */
export declare function formatPreflight(result: PreflightResult): string;
//# sourceMappingURL=preflight-check.d.ts.map