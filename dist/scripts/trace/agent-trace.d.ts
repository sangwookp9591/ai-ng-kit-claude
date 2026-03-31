/**
 * aing Agent Trace Analyzer v0.4.0
 * Structured recording of agent decisions and tool usage.
 * Harness Engineering: Verify axis — post-hoc debugging.
 * @module scripts/trace/agent-trace
 */
interface TraceEvent {
    agent: string;
    action: string;
    target: string;
    reason?: string;
    result?: string;
    durationMs?: number;
}
interface TraceEntry extends TraceEvent {
    seq: number;
    ts: string;
}
interface AgentSummary {
    actions: number;
    reads: number;
    writes: number;
    errors: number;
}
interface TraceSummaryResult {
    totalEvents: number;
    agents: Record<string, AgentSummary>;
    lastEvents: TraceEntry[];
}
/**
 * Record a trace event.
 */
export declare function recordTrace(event: TraceEvent, projectDir?: string): void;
/**
 * Record a tool use event from hook data.
 */
export declare function recordToolUse(toolName: string, toolInput: Record<string, unknown>, toolResponse?: string, projectDir?: string): void;
/**
 * Get trace summary for display.
 */
export declare function getTraceSummary(projectDir?: string): TraceSummaryResult;
/**
 * Format trace summary for display.
 */
export declare function formatTraceSummary(projectDir?: string): string;
/**
 * Clear trace history.
 */
export declare function clearTraces(projectDir?: string): void;
export {};
//# sourceMappingURL=agent-trace.d.ts.map