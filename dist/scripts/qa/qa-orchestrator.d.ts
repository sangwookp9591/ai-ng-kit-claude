export interface QAResult {
    healthScore: number;
    grade: string;
    cycles: number;
    findings: string[];
    allFixed: boolean;
    healthHistory?: HealthScoreEntry[];
}
export interface QAOptions {
    feature: string;
    testCommand?: string;
    fixMode?: boolean;
    projectDir?: string;
}
interface HealthScoreEntry {
    cycle: number;
    score: number;
    grade: string;
}
/**
 * Run a complete QA cycle.
 */
export declare function runQACycle(options: QAOptions): QAResult;
/**
 * Format QA result for display.
 */
export declare function formatQAResult(result: QAResult): string;
export {};
//# sourceMappingURL=qa-orchestrator.d.ts.map