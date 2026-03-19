/**
 * sw-kit PostToolUse Hook Handler v1.3.1
 * Collects evidence, records trace, resets error counter.
 */
import { readFileSync } from 'node:fs';
import { collectBasicEvidence } from '../scripts/evidence/evidence-collector-lite.mjs';
import { recordToolUse } from '../scripts/trace/agent-trace.mjs';
import { resetErrorCount } from '../scripts/guardrail/safety-invariants.mjs';

let parsed = {};
try { parsed = JSON.parse(readFileSync(0, 'utf-8')); } catch (_) {}

try {
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const toolName = parsed.tool_name || '';
  const toolResponse = parsed.tool_response || '';

  recordToolUse(toolName, parsed.tool_input || {}, toolResponse, projectDir);
  resetErrorCount(projectDir);

  if (toolName === 'Bash' && toolResponse) {
    const evidence = collectBasicEvidence(toolName, toolResponse);
    if (evidence) {
      process.stderr.write(`[sw-kit:evidence] ${evidence.type}: ${evidence.result}\n`);
    }
  }

  process.stdout.write(JSON.stringify({}));
} catch (err) {
  process.stderr.write(`[sw-kit:post-tool-use] ${err.message}\n`);
  process.stdout.write(JSON.stringify({}));
}
