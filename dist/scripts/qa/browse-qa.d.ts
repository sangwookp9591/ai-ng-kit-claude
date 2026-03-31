/**
 * QA testing module using aing-browse wrapper.
 * Integrates with qa-orchestrator for browser-based evidence collection.
 *
 * Uses BrowseWrapper for typed, structured access to the browse daemon
 * and EvidenceCollector for screenshot/snapshot evidence.
 */
export interface BrowseQAResult {
    url: string;
    passed: boolean;
    consoleErrors: string[];
    performanceMetrics: string;
    screenshots: string[];
    snapshotTree: string;
    issues: BrowseQAIssue[];
    evidenceSessionId?: string;
}
export interface BrowseQAIssue {
    severity: 'critical' | 'warning' | 'info';
    description: string;
    selector?: string;
    screenshot?: string;
}
/** Run a full QA check on a URL */
export declare function runBrowseQA(projectDir: string, url: string, outputDir: string): Promise<BrowseQAResult>;
/** Run QA flow test (multi-step user journey) */
export declare function runFlowTest(projectDir: string, steps: Array<{
    action: string;
    selector?: string;
    value?: string;
    expect?: string;
}>, outputDir: string): Promise<BrowseQAResult>;
//# sourceMappingURL=browse-qa.d.ts.map