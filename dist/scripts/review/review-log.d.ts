export interface ReviewLogEntry {
    skill: string;
    timestamp?: string;
    ts?: string;
    status: string;
    commit?: string;
    issues_found?: number;
    critical_gaps?: number;
    unresolved?: number;
    mode?: string;
    source?: string;
    findings_count?: number;
    [key: string]: unknown;
}
export interface StalenessResult {
    stale: boolean;
    reason?: string;
}
/**
 * Append a review entry to the JSONL log.
 */
export declare function appendReviewLog(entry: ReviewLogEntry, projectDir?: string): void;
/**
 * Read all review entries.
 */
export declare function readReviewLog(projectDir?: string): ReviewLogEntry[];
/**
 * Get the most recent entry for a given skill.
 */
export declare function getLatestReview(skill: string, projectDir?: string): ReviewLogEntry | null;
/**
 * Check if a review is stale (>7 days old or different commit).
 */
export declare function checkStaleness(entry: ReviewLogEntry | null, currentCommit?: string): StalenessResult;
//# sourceMappingURL=review-log.d.ts.map