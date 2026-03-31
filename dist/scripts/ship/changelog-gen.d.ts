export interface ParsedCommit {
    type: string;
    scope: string | null;
    description: string;
}
export interface CommitEntry {
    hash: string;
    message: string;
    author: string;
    date: string;
}
/**
 * Parse conventional commit message.
 */
export declare function parseCommitMessage(message: string): ParsedCommit;
/**
 * Get commits since last tag or a specific ref.
 * Note: Uses execSync with git log (no user input in command), safe from injection.
 */
export declare function getCommitsSince(since?: string | null, projectDir?: string): CommitEntry[];
/**
 * Generate changelog content for a version.
 */
export declare function generateChangelog(version: string, commits: CommitEntry[]): string;
/**
 * Prepend changelog section to CHANGELOG.md.
 */
export declare function prependChangelog(content: string, projectDir?: string): void;
//# sourceMappingURL=changelog-gen.d.ts.map