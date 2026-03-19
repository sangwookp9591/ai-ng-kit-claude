/**
 * sw-kit PostToolUse Hook Handler
 * Collects evidence (test/build results), updates PDCA state.
 */

import { createLogger } from '../scripts/core/logger.mjs';
import { collectBasicEvidence } from '../scripts/evidence/evidence-collector-lite.mjs';
import { recordToolUse } from '../scripts/trace/agent-trace.mjs';
import { resetErrorCount } from '../scripts/guardrail/safety-invariants.mjs';

const log = createLogger('post-tool-use');

try {
  let input = '';
  const chunks = [];
  process.stdin.setEncoding('utf-8');

  await new Promise((resolve) => {
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', resolve);
    setTimeout(resolve, 2000);
  });

  input = chunks.join('');
  if (!input || !input.trim()) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  let parsed;
  try { parsed = JSON.parse(input); } catch (_) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const toolName = parsed.tool_name || '';
  const toolResponse = parsed.tool_response || '';

  // Record tool use trace
  recordToolUse(toolName, parsed.tool_input || {}, toolResponse, projectDir);
  resetErrorCount(projectDir);

  // Collect evidence from Bash outputs (test/build results)
  if (toolName === 'Bash' && toolResponse) {
    const evidence = collectBasicEvidence(toolName, toolResponse);
    if (evidence) {
      log.info('Evidence collected', { type: evidence.type, result: evidence.result });
    }
  }

  process.stdout.write(JSON.stringify({}));

} catch (err) {
  log.error('Post-tool-use failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
