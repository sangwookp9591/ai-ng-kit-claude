/**
 * sw-kit Agent Trace Analyzer v0.4.0
 * Structured recording of agent decisions and tool usage.
 * Harness Engineering: Verify axis — post-hoc debugging.
 * @module scripts/trace/agent-trace
 */

import { readStateOrDefault, writeState, updateState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('trace');

function getTracePath(projectDir) {
  return join(projectDir || process.cwd(), '.sw-kit', 'state', 'agent-traces.json');
}

/**
 * Record a trace event.
 * @param {object} event
 * @param {string} event.agent - Agent name (Sam, Able, Klay, Jay, etc.)
 * @param {string} event.action - What the agent did (read, write, bash, decide)
 * @param {string} event.target - File or command target
 * @param {string} [event.reason] - Why this action was taken
 * @param {string} [event.result] - Outcome (success, fail, skip)
 * @param {number} [event.durationMs] - Time taken
 * @param {string} [projectDir]
 */
export function recordTrace(event, projectDir) {
  const tracePath = getTracePath(projectDir);

  updateState(tracePath, { events: [], summary: {} }, (traces) => {
    const entry = {
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
 * @param {string} toolName
 * @param {object} toolInput
 * @param {string} [toolResponse]
 * @param {string} [projectDir]
 */
export function recordToolUse(toolName, toolInput, toolResponse, projectDir) {
  const target = toolInput?.file_path || toolInput?.command?.slice(0, 80) || toolInput?.pattern || 'unknown';
  const isError = toolResponse && (
    toolResponse.includes('Error') ||
    toolResponse.includes('error') ||
    toolResponse.includes('FAIL')
  );

  recordTrace({
    agent: 'session',
    action: toolName.toLowerCase(),
    target,
    result: isError ? 'fail' : 'success'
  }, projectDir);
}

/**
 * Get trace summary for display.
 * @param {string} [projectDir]
 * @returns {object} Summary with per-agent stats
 */
export function getTraceSummary(projectDir) {
  const traces = readStateOrDefault(getTracePath(projectDir), { events: [], summary: {} });

  return {
    totalEvents: traces.events.length,
    agents: traces.summary,
    lastEvents: traces.events.slice(-5)
  };
}

/**
 * Format trace summary for display.
 * @param {string} [projectDir]
 * @returns {string}
 */
export function formatTraceSummary(projectDir) {
  const { totalEvents, agents, lastEvents } = getTraceSummary(projectDir);

  if (totalEvents === 0) return '[sw-kit Trace] 기록된 트레이스가 없습니다.';

  const lines = [
    `[sw-kit Trace] ${totalEvents} events recorded`,
    ''
  ];

  // Per-agent breakdown
  for (const [agent, stats] of Object.entries(agents)) {
    const errorTag = stats.errors > 0 ? ` ⚠️${stats.errors}err` : '';
    lines.push(`  ${agent}: ${stats.actions} actions (${stats.reads}R ${stats.writes}W${errorTag})`);
  }

  // Last 3 events
  lines.push('');
  lines.push('  Recent:');
  for (const e of lastEvents.slice(-3)) {
    const icon = e.result === 'fail' ? '✗' : '✓';
    lines.push(`  ${icon} ${e.ts.slice(11, 19)} ${e.action} → ${e.target.slice(0, 50)}`);
  }

  return lines.join('\n');
}

/**
 * Clear trace history.
 * @param {string} [projectDir]
 */
export function clearTraces(projectDir) {
  writeState(getTracePath(projectDir), { events: [], summary: {} });
}
