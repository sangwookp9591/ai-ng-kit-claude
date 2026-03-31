export interface ReviewDashboardRow {
    label: string;
    status?: string;
    runs: number;
}
export interface ReviewDashboard {
    verdict: string;
    verdictReason: string;
    rows?: ReviewDashboardRow[];
}
export interface PRContext {
    changelog?: string;
    reviewDashboard?: ReviewDashboard;
    evidence?: string;
    feature: string;
}
/**
 * Generate PR title from feature name and version.
 */
export declare function generateTitle(feature: string, version: string, bumpType: string): string;
/**
 * Generate PR body from changelog and review data.
 */
export declare function generateBody(context: PRContext): string;
/**
 * Build the gh pr create command (does not execute).
 */
export declare function buildPRCommand(title: string, body: string, baseBranch?: string): string;
/**
 * Check if gh CLI is available.
 * Note: Uses execSync with a fixed command string (no user input), safe from injection.
 */
export declare function isGhAvailable(): boolean;
//# sourceMappingURL=pr-creator.d.ts.map