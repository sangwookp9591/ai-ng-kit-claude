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
function getAgentTracePath(projectDir) {
    return join(projectDir, '.aing', 'state', 'agent-trace.json');
}
function makeAgentId(subagentType, ts) {
    const suffix = ts.replace(/[^0-9]/g, '').slice(-8);
    return `${subagentType.replace(/[^a-z0-9]/gi, '-')}-${suffix}`;
}
const parsed = await readStdinJSON();
const projectDir = process.env.PROJECT_DIR || process.cwd();
try {
    const toolInput = parsed.tool_input || {};
    const subagentType = toolInput.subagent_type || 'unknown';
    const model = toolInput.model || 'sonnet';
    const agentName = toolInput.name || subagentType.replace(/^aing:/, '');
    const description = toolInput.description || '';
    const spawnedAt = new Date().toISOString();
    const agentId = makeAgentId(subagentType, spawnedAt);
    const tracePath = getAgentTracePath(projectDir);
    const defaultStore = { agents: [], activeCount: 0, totalSpawned: 0 };
    // Register worker in team health tracker
    await registerWorker(agentName, description, projectDir);
    updateState(tracePath, defaultStore, (data) => {
        const store = data;
        const entry = {
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
    const store = readStateOrDefault(tracePath, defaultStore);
    const activeCount = store.agents.filter(a => a.status === 'active').length;
    const context = [
        `[aing:agent-trace] SubagentStart: ${agentName} (${subagentType}) model=${model}`,
        `Active agents: ${activeCount} | Total spawned this session: ${store.totalSpawned}`,
        `[aing:context-rule] You are a SUB-AGENT with a limited context window. CRITICAL RULES:`,
        `- You CANNOT use /compact, /half-clone, or any slash commands.`,
        `- NEVER suggest "claude -r", "resume session", or "run /compact" — you are a child process, NOT a CLI session.`,
        `- If you feel context pressure (long conversation, many file reads), prioritize completing the most critical subtask FIRST.`,
        `- If your task is too large, report partial results immediately via SendMessage before context runs out.`,
        `- Keep responses concise. Avoid re-reading files you've already read. Minimize unnecessary tool calls.`,
    ].join('\n');
    process.stdout.write(JSON.stringify({
        hookSpecificOutput: { additionalContext: context }
    }));
    log.info('SubagentStart tracked', { agentId, agentName, subagentType, model, activeCount });
}
catch (err) {
    log.error('SubagentStart handler failed', { error: err.message });
    process.stdout.write(JSON.stringify({}));
}
//# sourceMappingURL=subagent-start.js.map