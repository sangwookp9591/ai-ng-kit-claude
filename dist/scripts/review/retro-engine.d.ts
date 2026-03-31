export interface CommitInfo {
    hash: string;
    message: string;
    author: string;
    date: string;
}
export interface AuthorStats {
    commits: number;
    name: string;
}
export interface FileHotspot {
    changes: number;
    file: string;
}
export interface GitMetrics {
    commits: CommitInfo[];
    authors: AuthorStats[];
    hotspots: FileHotspot[];
    totalCommits: number;
    totalAuthors: number;
    window: string;
}
export interface WorkSession {
    start: string;
    end: string;
    commits: number;
    durationMin: number;
    type: 'deep' | 'medium' | 'micro';
}
export interface CommitTypes {
    feat: number;
    fix: number;
    refactor: number;
    test: number;
    chore: number;
    docs: number;
    style: number;
    ci: number;
    other: number;
}
export interface FocusScore {
    score: number;
    focusDir: string;
}
/**
 * Gather git metrics for a time window.
 */
export declare function gatherMetrics(window?: string, projectDir?: string): GitMetrics;
/**
 * Detect work sessions from commit timestamps.
 * Sessions are separated by 45+ minute gaps.
 */
export declare function detectSessions(commits: CommitInfo[]): WorkSession[];
/**
 * Classify commits by conventional type.
 */
export declare function classifyCommits(commits: CommitInfo[]): CommitTypes;
/**
 * Calculate focus score: % of commits in most-changed top-level directory.
 */
export declare function calculateFocusScore(hotspots: FileHotspot[]): FocusScore;
/**
 * Generate full retrospective report.
 */
export declare function generateRetro(window?: string, projectDir?: string): string;
/**
 * Save retro snapshot for trend tracking.
 */
export declare function saveRetroSnapshot(metrics: GitMetrics, projectDir?: string): void;
//# sourceMappingURL=retro-engine.d.ts.map