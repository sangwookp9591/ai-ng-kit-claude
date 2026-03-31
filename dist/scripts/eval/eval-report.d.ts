/**
 * aing Eval Report Generator
 *
 * Formats eval results as markdown tables and persists
 * reports to .aing/evals/eval-{timestamp}.json.
 *
 * @module scripts/eval/eval-report
 */
import type { EvalRunSummary } from './eval-engine.js';
interface ReportSuccess {
    ok: true;
    data: {
        markdown: string;
        path: string;
    };
}
interface ReportFailure {
    ok: false;
    error: string;
}
type ReportOutcome = ReportSuccess | ReportFailure;
/**
 * Format an EvalRunSummary as a full markdown report.
 */
export declare function formatEvalReport(summary: EvalRunSummary): string;
/**
 * Generate and save an eval report to disk.
 */
export declare function saveEvalReport(summary: EvalRunSummary, projectDir?: string): ReportOutcome;
export {};
//# sourceMappingURL=eval-report.d.ts.map