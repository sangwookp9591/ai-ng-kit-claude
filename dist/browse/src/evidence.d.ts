/**
 * Browse Evidence Collector — Screenshot and snapshot evidence for review pipelines.
 *
 * Captures before/after state, generates comparison reports, and saves
 * artifacts to .aing/browse-evidence/ for traceability.
 *
 * Zero external deps — uses Node.js built-in only.
 * @module browse/src/evidence
 */
import type { BrowseWrapper, Result, RefEntry } from './browse-wrapper.js';
export interface EvidenceCapture {
    id: string;
    timestamp: number;
    url: string;
    title: string;
    screenshotPath: string;
    snapshotTree: string;
    refs: RefEntry[];
    consoleErrors: string[];
    metadata: Record<string, string>;
}
export interface EvidenceComparison {
    before: EvidenceCapture;
    after: EvidenceCapture;
    diff: SnapshotDiff;
    summary: string;
}
export interface SnapshotDiff {
    added: string[];
    removed: string[];
    unchanged: number;
    totalBefore: number;
    totalAfter: number;
}
export interface EvidenceReport {
    title: string;
    captures: EvidenceCapture[];
    comparisons: EvidenceComparison[];
    verdict: 'pass' | 'fail' | 'warning';
    notes: string[];
    createdAt: string;
}
export declare class EvidenceCollector {
    private readonly evidenceDir;
    private readonly sessionId;
    private captures;
    private comparisons;
    private notes;
    constructor(projectRoot: string, sessionId?: string);
    /** Get the evidence directory path */
    getEvidenceDir(): string;
    /** Get current session ID */
    getSessionId(): string;
    /**
     * Capture current browser state as evidence.
     * Takes screenshot + snapshot + console errors.
     */
    capture(browse: BrowseWrapper, label: string, metadata?: Record<string, string>): Promise<Result<EvidenceCapture>>;
    /**
     * Compare two captures (before/after).
     * Produces a diff of the snapshot trees and a human-readable summary.
     */
    compare(beforeId: string, afterId: string): Result<EvidenceComparison>;
    /**
     * Capture before state, run an action, capture after state, and compare.
     * Returns the comparison result.
     */
    captureBeforeAfter(browse: BrowseWrapper, label: string, action: () => Promise<void>): Promise<Result<EvidenceComparison>>;
    addNote(note: string): void;
    /** Generate a final evidence report */
    generateReport(title: string, verdict: 'pass' | 'fail' | 'warning'): EvidenceReport;
    /** List all captures in this session */
    listCaptures(): EvidenceCapture[];
    /** List all evidence sessions in project */
    static listSessions(projectRoot: string): string[];
    /** Load an existing report from a session */
    static loadReport(projectRoot: string, sessionId: string): Result<EvidenceReport>;
}
/** Line-by-line diff of two snapshot trees */
export declare function diffSnapshots(before: string, after: string): SnapshotDiff;
//# sourceMappingURL=evidence.d.ts.map