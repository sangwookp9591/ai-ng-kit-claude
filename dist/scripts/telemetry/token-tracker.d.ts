export declare const TELEMETRY_DIR = ".aing/telemetry";
export declare const TOKEN_FILE = "token-usage.jsonl";
export interface TokenUsageEntry {
    ts: string;
    agent: string;
    stage: string;
    model?: string;
    totalTokens: number | null;
    toolUses: number | null;
    durationMs: number | null;
}
export interface TokenSummary {
    byStage: Record<string, {
        tokens: number;
        agents: number;
        duration: number;
        agentTokens: Record<string, number>;
    }>;
    byAgent: Record<string, {
        tokens: number;
        tasks: number;
        duration: number;
    }>;
    total: {
        tokens: number;
        agents: number;
        duration: number;
    };
}
/**
 * Append a token usage entry to the JSONL file.
 * Best-effort: never throws; logs warn on failure.
 */
export declare function logTokenUsage(entry: TokenUsageEntry, projectDir?: string): void;
/**
 * Read and aggregate token usage from JSONL file.
 * null values are treated as 0.
 */
export declare function getTokenSummary(projectDir?: string): TokenSummary;
/**
 * Format token summary as human-readable text for Completion Reports.
 *
 * Example output:
 *   Token Usage:
 *     plan:   ~12.3k tokens (Ryan 8k, Able 4k)
 *     exec:   ~84.5k tokens (Jay 45k, Derek 39k)
 *     total:  ~96.8k tokens
 */
export declare function formatTokenReport(summary: TokenSummary): string;
/**
 * Check whether the current session token usage has exceeded the given limit.
 *
 * @param limit - token limit, or null to disable the check
 * @param projectDir - optional project directory for telemetry lookup
 */
export declare function checkSessionTokenLimit(limit: number | null, projectDir?: string): {
    exceeded: boolean;
    usage: number;
    limit: number | null;
};
/**
 * Delete the token usage file (for testing / reset).
 */
export declare function clearTokenUsage(projectDir?: string): void;
//# sourceMappingURL=token-tracker.d.ts.map