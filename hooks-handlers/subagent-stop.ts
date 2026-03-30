/**
 * aing SubagentStop Hook Handler v1.0.0
 * Updates agent-trace.json: marks agent completed/failed with duration.
 * Outputs additionalContext with agent run summary.
 */

import { readStdinJSON } from '../scripts/core/stdin.js';
import { updateState, readStateOrDefault } from '../scripts/core/state.js';
import { createLogger } from '../scripts/core/logger.js';
import { markWorkerDone } from '../scripts/pipeline/team-heartbeat.js';
import { join } from 'node:path';

const log = createLogger('subagent-stop');

interface SubagentStopInput {
  tool_name?: string;
  tool_input?: {
    subagent_type?: string;
    model?: string;
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
  tool_response?: string;
  session_id?: string;
  [key: string]: unknown;
}

interface AgentSpawnEntry {
  id: string;
  name: string;
  subagentType: string;
  model: string;
  description: string;
  spawnedAt: string;
  status: 'active' | 'completed' | 'failed';
  durationMs?: number;
  completedAt?: string;
}

interface AgentTraceStore {
  agents: AgentSpawnEntry[];
  activeCount: number;
  totalSpawned: number;
}

function getAgentTracePath(projectDir: string): string {
  return join(projectDir, '.aing', 'state', 'agent-trace.json');
}

function detectSuccess(toolResponse: string): boolean {
  if (!toolResponse) return true;
  const lower = toolResponse.toLowerCase();
  // Explicit failure signals
  if (lower.includes('"error"') || lower.includes('error:') || lower.includes('failed') || lower.includes('exception')) {
    // Distinguish success messages that contain the word "error" (e.g. "no errors found")
    const noErrorPattern = /no (errors?|failures?)/i;
    if (noErrorPattern.test(toolResponse)) return true;
    return false;
  }
  return true;
}

const parsed: SubagentStopInput = await readStdinJSON();
const projectDir: string = process.env.PROJECT_DIR || process.cwd();

try {
  const toolInput = parsed.tool_input || {};
  const toolResponse: string = parsed.tool_response || '';
  const subagentType: string = toolInput.subagent_type || 'unknown';
  const agentName: string = toolInput.name || subagentType.replace(/^aing:/, '');
  const completedAt: string = new Date().toISOString();
  const isSuccess: boolean = detectSuccess(toolResponse);
  const finalStatus: 'completed' | 'failed' = isSuccess ? 'completed' : 'failed';

  const tracePath = getAgentTracePath(projectDir);
  const defaultStore: AgentTraceStore = { agents: [], activeCount: 0, totalSpawned: 0 };

  let durationMs: number | undefined;

  // Update worker health tracker
  await markWorkerDone(agentName, finalStatus, projectDir);

  updateState(tracePath, defaultStore, (data: unknown) => {
    const store = data as AgentTraceStore;

    // Find the most recent active entry matching this subagentType
    const idx = store.agents.reduceRight((found: number, entry, i) => {
      if (found !== -1) return found;
      if (entry.subagentType === subagentType && entry.status === 'active') return i;
      return -1;
    }, -1);

    if (idx !== -1) {
      const entry = store.agents[idx];
      const spawnMs = new Date(entry.spawnedAt).getTime();
      durationMs = Date.now() - spawnMs;
      entry.status = finalStatus;
      entry.completedAt = completedAt;
      entry.durationMs = durationMs;
    }

    store.activeCount = store.agents.filter(a => a.status === 'active').length;
    return store;
  });

  const store = readStateOrDefault(tracePath, defaultStore) as AgentTraceStore;
  const activeCount: number = store.agents.filter(a => a.status === 'active').length;
  const completedCount: number = store.agents.filter(a => a.status === 'completed').length;
  const failedCount: number = store.agents.filter(a => a.status === 'failed').length;

  const durationStr = durationMs !== undefined
    ? durationMs >= 1000
      ? `${(durationMs / 1000).toFixed(1)}s`
      : `${durationMs}ms`
    : 'unknown';

  const statusIcon = isSuccess ? 'done' : 'FAILED';
  const context = [
    `[aing:agent-trace] SubagentStop: ${agentName} (${subagentType}) -> ${statusIcon} in ${durationStr}`,
    `Active: ${activeCount} | Completed: ${completedCount} | Failed: ${failedCount}`,
  ].join('\n');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { additionalContext: context }
  }));

  log.info('SubagentStop tracked', { agentName, subagentType, finalStatus, durationMs, activeCount });

} catch (err: unknown) {
  log.error('SubagentStop handler failed', { error: (err as Error).message });
  process.stdout.write(JSON.stringify({}));
}
