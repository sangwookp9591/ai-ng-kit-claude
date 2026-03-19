/**
 * sw-kit PreToolUse Hook Handler
 * Injects tool-specific guidelines before Write/Edit operations.
 */

import { createLogger } from '../scripts/core/logger.mjs';

const log = createLogger('pre-tool-use');

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
  const parsed = input ? JSON.parse(input) : {};
  const toolName = parsed.tool_name || '';
  const toolInput = parsed.tool_input || {};

  // No-op for non-write tools (matcher already filters)
  if (!toolName) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  process.stdout.write(JSON.stringify({}));

} catch (err) {
  log.error('Pre-tool-use failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
