export interface TriageResult {
    passed: boolean;
    total: number;
    failed: number;
    preExisting: string[];
    branchNew: string[];
}
/**
 * Run tests and triage failures.
 */
export declare function triageTestFailures(testCommand: string, baseBranch: string, projectDir?: string): TriageResult;
/**
 * Format triage results.
 */
export declare function formatTriage(result: TriageResult): string;
//# sourceMappingURL=test-triage.d.ts.map