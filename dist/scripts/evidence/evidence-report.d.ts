/**
 * aing Evidence Report Generator
 * Creates completion reports from evidence chains.
 * @module scripts/evidence/evidence-report
 */
export interface ReportOptions {
    lessons?: string[];
}
export interface ReportResult {
    ok: boolean;
    path?: string;
}
/**
 * Generate a completion report for a feature.
 */
export declare function generateReport(feature: string, options?: ReportOptions, projectDir?: string): ReportResult;
//# sourceMappingURL=evidence-report.d.ts.map