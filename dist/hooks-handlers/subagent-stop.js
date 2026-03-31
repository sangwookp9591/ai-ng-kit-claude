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
function getAgentTracePath(projectDir) {
    return join(projectDir, '.aing', 'state', 'agent-trace.json');
}
function detectSuccess(toolResponse) {
    if (!toolResponse)
        return true;
    const lower = toolResponse.toLowerCase();
    // Explicit failure signals
    if (lower.includes('"error"') || lower.includes('error:') || lower.includes('failed') || lower.includes('exception')) {
        // Distinguish success messages that contain the word "error" (e.g. "no errors found")
        const noErrorPattern = /no (errors?|failures?)/i;
        if (noErrorPattern.test(toolResponse))
            return true;
        return false;
    }
    return true;
}
const parsed = await readStdinJSON();
const projectDir = process.env.PROJECT_DIR || process.cwd();
try {
    const toolInput = parsed.tool_input || {};
    const toolResponse = parsed.tool_response || '';
    const subagentType = toolInput.subagent_type || 'unknown';
    const agentName = toolInput.name || subagentType.replace(/^aing:/, '');
    const completedAt = new Date().toISOString();
    const isSuccess = detectSuccess(toolResponse);
    const finalStatus = isSuccess ? 'completed' : 'failed';
    const tracePath = getAgentTracePath(projectDir);
    const defaultStore = { agents: [], activeCount: 0, totalSpawned: 0 };
    let durationMs;
    // Update worker health tracker
    await markWorkerDone(agentName, finalStatus, projectDir);
    updateState(tracePath, defaultStore, (data) => {
        const store = data;
        // Find the most recent active entry matching this subagentType
        const idx = store.agents.reduceRight((found, entry, i) => {
            if (found !== -1)
                return found;
            if (entry.subagentType === subagentType && entry.status === 'active')
                return i;
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
    const store = readStateOrDefault(tracePath, defaultStore);
    const activeCount = store.agents.filter(a => a.status === 'active').length;
    const completedCount = store.agents.filter(a => a.status === 'completed').length;
    const failedCount = store.agents.filter(a => a.status === 'failed').length;
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
}
catch (err) {
    log.error('SubagentStop handler failed', { error: err.message });
    process.stdout.write(JSON.stringify({}));
}
//# sourceMappingURL=subagent-stop.js.map