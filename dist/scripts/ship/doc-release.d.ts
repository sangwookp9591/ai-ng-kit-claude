export interface DocFileEntry {
    file: string;
    focus: string;
}
export interface StaleDoc {
    file: string;
    focus: string;
    exists: boolean;
    reason: string;
}
/**
 * Documents to check for staleness after shipping.
 */
export declare const DOC_FILES: DocFileEntry[];
/**
 * Find which docs may be stale based on changed files.
 */
export declare function findStaleDocs(changedFiles: string[], projectDir?: string): StaleDoc[];
/**
 * Get changed files from diff against base branch.
 * Note: Uses execSync with git commands (no user input in command string), safe from injection.
 */
export declare function getChangedFiles(baseBranch: string, projectDir?: string): string[];
/**
 * Build doc update prompt for agents.
 */
export declare function buildDocUpdatePrompt(staleDocs: StaleDoc[], changedFiles: string[]): string;
/**
 * Format doc release summary.
 */
export declare function formatDocReleaseSummary(staleDocs: StaleDoc[]): string;
//# sourceMappingURL=doc-release.d.ts.map