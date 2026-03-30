/**
 * aing Agent Trace Analyzer v0.4.0
 * Structured recording of agent decisions and tool usage.
 * Harness Engineering: Verify axis — post-hoc debugging.
 * @module scripts/trace/agent-trace
 */

import { readStateOrDefault, writeState, updateState } from '../core/state.js';
import { join } from 'node:path';

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

interface TraceStore {
  events: TraceEntry[];
  summary: Record<string, AgentSummary>;
}

interface TraceSummaryResult {
  totalEvents: number;
  agents: Record<string, AgentSummary>;
  lastEvents: TraceEntry[];
}

function getTracePath(projectDir?: string): string {
  return join(projectDir || process.cwd(), '.aing', 'state', 'agent-traces.json');
}

/**
 * Record a trace event.
 */
export function recordTrace(event: TraceEvent, projectDir?: string): void {
  const tracePath = getTracePath(projectDir);

  updateState(tracePath, { events: [], summary: {} }, (data: unknown) => {
    const traces = data as TraceStore;
    const entry: TraceEntry = {
      seq: traces.events.length + 1,
      ts: new Date().toISOString(),
      ...event
    };

    traces.events.push(entry);

    // Update summary counts
    if (!traces.summary[event.agent]) {
      traces.summary[event.agent] = { actions: 0, reads: 0, writes: 0, errors: 0 };
    }
    const agentSummary = traces.summary[event.agent];
    agentSummary.actions++;
    if (event.action === 'read') agentSummary.reads++;
    if (event.action === 'write' || event.action === 'edit') agentSummary.writes++;
    if (event.result === 'fail') agentSummary.errors++;

    // Keep last 200 events
    if (traces.events.length > 200) {
      traces.events = traces.events.slice(-200);
    }

    return traces;
  });
}

/**
 * Record a tool use event from hook data.
 */
export function recordToolUse(toolName: string, toolInput: Record<string, unknown>, toolResponse?: string, projectDir?: string): void {
  const isAgentCall = toolName === 'Agent' || toolName === 'Task';
  const target = isAgentCall
    ? ((toolInput?.description as string) || (toolInput?.subagent_type as string) || 'agent').slice(0, 80)
    : ((toolInput?.file_path as string) || (toolInput?.command as string)?.slice(0, 80) || (toolInput?.pattern as string) || 'unknown');
  const agent = (toolInput?._agentName as string) || 'session';
  const isError = toolResponse && (
    toolResponse.includes('Error') ||
    toolResponse.includes('error') ||
    toolResponse.includes('FAIL')
  );

  recordTrace({
    agent,
    action: isAgentCall ? 'spawn' : toolName.toLowerCase(),
    target,
    result: isError ? 'fail' : 'success'
  }, projectDir);
}

/**
 * Get trace summary for display.
 */
export function getTraceSummary(projectDir?: string): TraceSummaryResult {
  const traces = readStateOrDefault(getTracePath(projectDir), { events: [], summary: {} }) as TraceStore;

  return {
    totalEvents: traces.events.length,
    agents: traces.summary,
    lastEvents: traces.events.slice(-5)
  };
}

/**
 * Format trace summary for display.
 */
export function formatTraceSummary(projectDir?: string): string {
  const { totalEvents, agents, lastEvents } = getTraceSummary(projectDir);

  if (totalEvents === 0) return '[aing Trace] No traces recorded.';

  const lines: string[] = [
    `[aing Trace] ${totalEvents} events recorded`,
    ''
  ];

  // Per-agent breakdown
  for (const [agent, stats] of Object.entries(agents)) {
    const errorTag = stats.errors > 0 ? ` ${stats.errors}err` : '';
    lines.push(`  ${agent}: ${stats.actions} actions (${stats.reads}R ${stats.writes}W${errorTag})`);
  }

  // Last 3 events
  lines.push('');
  lines.push('  Recent:');
  for (const e of lastEvents.slice(-3)) {
    const icon = e.result === 'fail' ? 'x' : 'v';
    lines.push(`  ${icon} ${e.ts.slice(11, 19)} ${e.action} -> ${e.target.slice(0, 50)}`);
  }

  return lines.join('\n');
}

/**
 * Clear trace history.
 */
export function clearTraces(projectDir?: string): void {
  writeState(getTracePath(projectDir), { events: [], summary: {} });
}
