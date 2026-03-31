/**
 * aing Eval Session Runner — subprocess manager for skill evaluation
 *
 * Spawns `claude -p` as a child process, captures NDJSON output,
 * provides timeout handling, cost estimation, and progress heartbeats.
 *
 * @module scripts/eval/session-runner
 */
export type ExitReason = 'completed' | 'timeout' | 'error' | 'max_turns';
export interface SessionRunnerOptions {
    /** The skill to invoke (e.g. 'auto', 'review-code'). */
    skill: string;
    /** The prompt to send to the skill. */
    prompt: string;
    /** Working directory for the spawned process. Defaults to process.cwd(). */
    cwd?: string;
    /** Timeout in milliseconds. Defaults to 120_000 (2 min). */
    timeout?: number;
    /** Maximum turns for the Claude session. Defaults to 5. */
    maxTurns?: number;
    /** Output format. Defaults to 'stream-json'. */
    outputFormat?: 'stream-json' | 'json' | 'text';
    /** Extra environment variables merged with process.env. */
    env?: Record<string, string>;
    /** Extra CLI flags passed to claude. */
    extraArgs?: string[];
    /** Enable progress heartbeat logging. Defaults to true. */
    heartbeat?: boolean;
    /** Heartbeat interval in milliseconds. Defaults to 10_000. */
    heartbeatInterval?: number;
}
export interface SessionMessage {
    role: string;
    content: string;
    timestamp: number;
}
export interface SessionToolCall {
    name: string;
    input: Record<string, unknown>;
    result?: string;
    timestamp: number;
}
export interface SessionRunnerResult {
    /** Whether the session completed without errors. */
    success: boolean;
    /** Parsed assistant messages from the session. */
    output: SessionMessage[];
    /** Tool calls made during the session. */
    toolCalls: SessionToolCall[];
    /** Total duration in milliseconds. */
    duration_ms: number;
    /** Estimated cost in USD based on token approximations. */
    cost_estimate: number;
    /** Why the session ended. */
    exitReason: ExitReason;
    /** Raw stdout from the subprocess. */
    rawOutput: string;
    /** Stderr output if any. */
    stderr: string;
    /** Process exit code. */
    exitCode: number | null;
    /** Token usage estimates. */
    tokenEstimate: TokenEstimate;
}
export interface TokenEstimate {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}
/**
 * Run a skill session synchronously via execFileSync.
 * Good for quick validations where streaming is not needed.
 */
export declare function runSkillSessionSync(skill: string, prompt: string, options?: Partial<SessionRunnerOptions>): SessionRunnerResult;
/**
 * Run a skill session asynchronously, capturing NDJSON stream output
 * with progress heartbeat logging.
 */
export declare function runSkillSession(skill: string, prompt: string, options?: Partial<SessionRunnerOptions>): Promise<SessionRunnerResult>;
export interface BatchOptions {
    /** Run sessions sequentially (default) or with limited concurrency. */
    concurrency?: number;
}
export interface BatchResult {
    results: Map<string, SessionRunnerResult>;
    totalDuration_ms: number;
    totalCost: number;
}
/**
 * Run multiple skill sessions, optionally in parallel.
 */
export declare function runSkillSessionBatch(sessions: Array<{
    skill: string;
    prompt: string;
    options?: Partial<SessionRunnerOptions>;
}>, batchOptions?: BatchOptions): Promise<BatchResult>;
//# sourceMappingURL=session-runner.d.ts.map