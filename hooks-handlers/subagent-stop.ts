/**
 * aing SubagentStop Hook Handler v2.0.0
 * Updates agent-trace.json: marks agent completed/failed with duration.
 * Auto-checks matching subtask in .aing/tasks/ on success.
 * Outputs additionalContext with agent run summary.
 *
 * Claude Code SubagentStop hook input:
 *   { agent_id, agent_type, session_id, cwd, permission_mode,
 *     last_assistant_message, agent_transcript_path, hook_event_name }
 */

import { readStdinJSON } from '../scripts/core/stdin.js';
import { updateState, readStateOrDefault, readState } from '../scripts/core/state.js';
import { createLogger } from '../scripts/core/logger.js';
import { markWorkerDone } from '../scripts/pipeline/team-heartbeat.js';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

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
  // Claude Code native fields
  agent_id?: string;
  agent_type?: string;
  last_assistant_message?: string;
  session_id?: string;
  [key: string]: unknown;
}

interface AgentSpawnEntry {
  id: string;
  ccAgentId?: string;
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
  const toolResponse: string = parsed.tool_response || parsed.last_assistant_message || '';
  // Claude Code provides agent_type at top level
  const subagentType: string = parsed.agent_type || toolInput.subagent_type || 'unknown';
  const description: string = toolInput.description || '';
  const ccAgentId: string = parsed.agent_id || '';

  let agentName: string = toolInput.name || '';
  if (!agentName && subagentType !== 'unknown') {
    agentName = subagentType.replace(/^aing:/, '');
  }
  if (!agentName || agentName === 'unknown') {
    const descMatch = description.match(/^(\w+)\s*[:\-—]/);
    if (descMatch) agentName = descMatch[1].toLowerCase();
    else agentName = 'unknown';
  }

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

    // Match: ccAgentId (exact) → name+type → type-only → FIFO
    let idx = -1;
    if (ccAgentId) {
      idx = store.agents.findIndex(entry => (entry as any).ccAgentId === ccAgentId && entry.status === 'active');
    }
    if (idx === -1 && agentName && agentName !== 'unknown') {
      idx = store.agents.reduceRight((found: number, entry, i) => {
        if (found !== -1) return found;
        if (entry.name === agentName && entry.subagentType === subagentType && entry.status === 'active') return i;
        return -1;
      }, -1);
    }
    if (idx === -1) {
      idx = store.agents.reduceRight((found: number, entry, i) => {
        if (found !== -1) return found;
        if (entry.subagentType === subagentType && entry.status === 'active') return i;
        return -1;
      }, -1);
    }
    // Last resort: only for unknown agents, match oldest active (FIFO)
    if (idx === -1 && subagentType === 'unknown') {
      idx = store.agents.findIndex(entry => entry.status === 'active');
    }

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

  // Auto-check subtask: find matching subtask by agent name and mark done
  if (isSuccess && agentName && agentName !== 'unknown') {
    try {
      const taskDir = join(projectDir, '.aing', 'tasks');
      const files = readdirSync(taskDir).filter((f: string) => f.startsWith('task-') && f.endsWith('.json') && f !== '_index.json');
      for (const file of files) {
        const taskPath = join(taskDir, file);
        const taskResult = readState(taskPath);
        if (!taskResult.ok) continue;
        const task = taskResult.data as any;
        if (task.status === 'completed') continue;
        const nameCap = agentName.charAt(0).toUpperCase() + agentName.slice(1);
        const sub = task.subtasks?.find((s: any) =>
          s.status === 'pending' &&
          (s.title.includes(`agent: ${nameCap}`) ||
           s.title.includes(`agent: ${agentName}`) ||
           s.title.toLowerCase().includes(`[${agentName}]`) ||
           s.title.toLowerCase().includes(`${agentName}:`))
        );
        if (sub) {
          sub.status = 'done';
          sub.checkedAt = completedAt;
          task.updatedAt = completedAt;
          const allDone = task.subtasks.every((s: any) => s.status === 'done');
          if (allDone) {
            task.status = 'completed';
            task.completedAt = completedAt;
          }
          const { writeState: ws } = await import('../scripts/core/state.js');
          ws(taskPath, task);
          const indexPath = join(taskDir, '_index.json');
          const idx = readStateOrDefault(indexPath, []) as any[];
          const ei = idx.findIndex((t: any) => t.id === task.id);
          const entry = { id: task.id, title: task.title, status: task.status, updatedAt: completedAt };
          if (ei >= 0) idx[ei] = entry; else idx.push(entry);
          ws(indexPath, idx);
          log.info('Auto-checked subtask', { taskId: task.id, subtask: sub.title, agentName, allDone });
          break;
        }
      }
    } catch (autoCheckErr: unknown) {
      log.error('Auto-check subtask failed (non-fatal)', { error: (autoCheckErr as Error).message });
    }
  }

  log.info('SubagentStop tracked', { agentName, subagentType, finalStatus, durationMs, activeCount });

} catch (err: unknown) {
  log.error('SubagentStop handler failed', { error: (err as Error).message });
  process.stdout.write(JSON.stringify({}));
}
