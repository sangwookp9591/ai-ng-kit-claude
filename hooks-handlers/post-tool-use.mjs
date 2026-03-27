/**
 * aing PostToolUse Hook v1.3.2
 */
import { readStdinJSON } from '../scripts/core/stdin.mjs';
import { collectBasicEvidence } from '../scripts/evidence/evidence-collector-lite.mjs';
import { recordToolUse } from '../scripts/trace/agent-trace.mjs';
import { resetErrorCount } from '../scripts/guardrail/safety-invariants.mjs';
import { norchToolUse, norchAgentDone } from '../scripts/core/norch-bridge.mjs';

const parsed = await readStdinJSON();
const projectDir = process.env.PROJECT_DIR || process.cwd();

try {
  const toolName = parsed.tool_name || '';
  const toolResponse = parsed.tool_response || '';

  if (toolName) {
    // For Agent/Task calls, extract the actual agent name from subagent_type
    const toolInput = parsed.tool_input || {};
    if ((toolName === 'Agent' || toolName === 'Task') && toolInput.subagent_type) {
      const agentKey = toolInput.name || toolInput.subagent_type.replace('aing:', '');
      const agentName = toolInput.name || toolInput.subagent_type.replace('aing:', '');
      recordToolUse(toolName, { ...toolInput, _agentName: agentName }, toolResponse, projectDir);
      norchAgentDone('session', agentKey, toolInput.description);
    } else if (toolName === 'SendMessage' && toolInput.to) {
      const agentKey = toolInput.to.replace('aing:', '');
      recordToolUse(toolName, { ...toolInput, _agentName: agentKey }, toolResponse, projectDir);
      norchToolUse('session', 'SendMessage', toolInput.to, agentKey);
    } else {
      recordToolUse(toolName, toolInput, toolResponse, projectDir);
      norchToolUse('session', toolName, toolInput.file_path || toolInput.command?.slice(0, 60), null);
    }
    resetErrorCount(projectDir);
  }

  if (toolName === 'Bash' && toolResponse) {
    const ev = collectBasicEvidence(toolName, toolResponse);
    if (ev) process.stderr.write(`[aing:evidence] ${ev.type}: ${ev.result}\n`);
  }

  process.stdout.write('{}');
} catch (err) {
  process.stderr.write(`[aing:post-tool-use] ${err.message}\n`);
  process.stdout.write('{}');
}
