export interface AssistantMessage {
    role: string;
    content: string;
    timestamp: number;
}
export interface ToolCall {
    name: string;
    input: Record<string, unknown>;
    result?: string;
    timestamp: number;
}
export interface SessionResult {
    messages: AssistantMessage[];
    toolCalls: ToolCall[];
    duration: number;
    success: boolean;
    error?: string;
    rawOutput: string;
}
export interface SessionOptions {
    /** The prompt to send to `claude -p`. */
    prompt: string;
    /** Working directory for the spawned process. Defaults to process.cwd(). */
    cwd?: string;
    /** Timeout in milliseconds. Defaults to 120 000 (2 min). */
    timeout?: number;
    /** Extra environment variables merged with process.env. */
    env?: Record<string, string>;
    /** Additional CLI flags passed to claude. */
    extraArgs?: string[];
}
/**
 * Spawn a `claude -p` session, capture its NDJSON output, and return a
 * structured {@link SessionResult}.
 */
export declare function runSession(options: SessionOptions): Promise<SessionResult>;
//# sourceMappingURL=session-runner.d.ts.map