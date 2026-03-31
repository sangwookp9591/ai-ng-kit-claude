/**
 * aing Cost Reporter
 * 비용/토큰 사용량을 인간 친화적으로 보고합니다.
 * @module scripts/evidence/cost-reporter
 */
export interface AgentStats {
    actions: number;
    reads: number;
    writes: number;
    errors: number;
    estimatedTokens: number;
}
export interface CostTotals {
    actions: number;
    estimatedTokens: number;
    estimatedCostUSD: number;
}
interface CostTrackerData {
    sessions: unknown[];
    total: Record<string, unknown>;
    tokensUsed: number;
    apiCalls: number;
    sessionStart?: string;
}
export interface CostReport {
    timestamp: string;
    agents: Record<string, AgentStats>;
    totals: CostTotals;
    costTracker: CostTrackerData;
}
/**
 * 비용 보고서를 생성합니다.
 */
export declare function generateCostReport(projectDir?: string): CostReport;
/**
 * 보고서를 사람이 읽기 쉬운 문자열로 포맷합니다.
 */
export declare function formatCostReport(report: CostReport): string;
/**
 * Generate a compact cost summary for stop hook display (3 lines max).
 */
export declare function formatCompactSummary(projectDir?: string): string;
export {};
//# sourceMappingURL=cost-reporter.d.ts.map