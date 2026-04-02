/**
 * aing SubagentStart Hook Handler v1.0.0
 * Tracks agent spawn events: name, subagent_type, model, timestamp.
 * Appends to .aing/state/agent-trace.json and reports active agent count.
 */

import { readStdinJSON } from '../scripts/core/stdin.js';
import { updateState, readStateOrDefault } from '../scripts/core/state.js';
import { createLogger } from '../scripts/core/logger.js';
import { registerWorker } from '../scripts/pipeline/team-heartbeat.js';
import { join } from 'node:path';

const log = createLogger('subagent-start');

interface SubagentStartInput {
  tool_name?: string;
  tool_input?: {
    subagent_type?: string;
    model?: string;
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
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
}

interface AgentTraceStore {
  agents: AgentSpawnEntry[];
  activeCount: number;
  totalSpawned: number;
}

function getAgentTracePath(projectDir: string): string {
  return join(projectDir, '.aing', 'state', 'agent-trace.json');
}

function makeAgentId(subagentType: string, ts: string): string {
  const suffix = ts.replace(/[^0-9]/g, '').slice(-8);
  return `${subagentType.replace(/[^a-z0-9]/gi, '-')}-${suffix}`;
}

const parsed: SubagentStartInput = await readStdinJSON();
const projectDir: string = process.env.PROJECT_DIR || process.cwd();

try {
  const toolInput = parsed.tool_input || {};
  const subagentType: string = toolInput.subagent_type || 'unknown';
  const model: string = toolInput.model || 'sonnet';
  const agentName: string = toolInput.name || subagentType.replace(/^aing:/, '');
  const description: string = toolInput.description || '';
  const spawnedAt: string = new Date().toISOString();
  const agentId: string = makeAgentId(subagentType, spawnedAt);

  const tracePath = getAgentTracePath(projectDir);

  const defaultStore: AgentTraceStore = { agents: [], activeCount: 0, totalSpawned: 0 };

  // Register worker in team health tracker
  await registerWorker(agentName, description, projectDir);

  updateState(tracePath, defaultStore, (data: unknown) => {
    const store = data as AgentTraceStore;

    const entry: AgentSpawnEntry = {
      id: agentId,
      name: agentName,
      subagentType,
      model,
      description,
      spawnedAt,
      status: 'active',
    };

    store.agents.push(entry);
    store.activeCount = store.agents.filter(a => a.status === 'active').length;
    store.totalSpawned = (store.totalSpawned || 0) + 1;

    // Keep last 100 agent entries
    if (store.agents.length > 100) {
      store.agents = store.agents.slice(-100);
    }

    return store;
  });

  // Read updated store to get active count for output
  const store = readStateOrDefault(tracePath, defaultStore) as AgentTraceStore;
  const activeCount: number = store.agents.filter(a => a.status === 'active').length;

  const context = [
    `[aing:agent-trace] SubagentStart: ${agentName} (${subagentType}) model=${model}`,
    `Active agents: ${activeCount} | Total spawned this session: ${store.totalSpawned}`,
    `[aing:context-rule] You are a SUB-AGENT. Keep work focused and efficient:`,
    `- If your task is too large, report partial results immediately via SendMessage before context runs out.`,
    `- Keep responses concise. Avoid re-reading files you've already read. Minimize unnecessary tool calls.`,
  ].join('\n');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { additionalContext: context }
  }));

  log.info('SubagentStart tracked', { agentId, agentName, subagentType, model, activeCount });

} catch (err: unknown) {
  log.error('SubagentStart handler failed', { error: (err as Error).message });
  process.stdout.write(JSON.stringify({}));
}
