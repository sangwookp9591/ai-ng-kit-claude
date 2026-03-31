interface ReviewTier {
    key: string;
    label: string;
    required: boolean;
    trigger: string;
}
interface DashboardRow extends ReviewTier {
    runs: number;
    lastRun: string | null;
    status: 'CLEAR' | 'ISSUES' | null;
    stale: boolean;
    staleReason?: string;
    findings: number;
    criticalGaps: number;
}
export interface Dashboard {
    rows: DashboardRow[];
    currentCommit: string;
    verdict: 'CLEARED' | 'NOT CLEARED';
    verdictReason: string;
}
/**
 * Build the dashboard data.
 */
export declare function buildDashboard(projectDir?: string): Dashboard;
/**
 * Format dashboard for terminal display.
 */
export declare function formatDashboard(dashboard: Dashboard): string;
export {};
//# sourceMappingURL=review-dashboard.d.ts.map