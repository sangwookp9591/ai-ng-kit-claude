/**
 * sw-kit PostToolUse Hook v1.3.2
 */
import { readStdinJSON } from '../scripts/core/stdin.mjs';
import { collectBasicEvidence } from '../scripts/evidence/evidence-collector-lite.mjs';
import { recordToolUse } from '../scripts/trace/agent-trace.mjs';
import { resetErrorCount } from '../scripts/guardrail/safety-invariants.mjs';

const parsed = await readStdinJSON();
const projectDir = process.env.PROJECT_DIR || process.cwd();

try {
  const toolName = parsed.tool_name || '';
  const toolResponse = parsed.tool_response || '';

  if (toolName) {
    recordToolUse(toolName, parsed.tool_input || {}, toolResponse, projectDir);
    resetErrorCount(projectDir);
  }

  if (toolName === 'Bash' && toolResponse) {
    const ev = collectBasicEvidence(toolName, toolResponse);
    if (ev) process.stderr.write(`[sw-kit:evidence] ${ev.type}: ${ev.result}\n`);
  }

  process.stdout.write('{}');
} catch (err) {
  process.stderr.write(`[sw-kit:post-tool-use] ${err.message}\n`);
  process.stdout.write('{}');
}
