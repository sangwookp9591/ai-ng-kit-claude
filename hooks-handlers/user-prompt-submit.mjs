/**
 * sw-kit UserPromptSubmit Hook Handler v1.3.0
 * Detects user intent (ko/en), suggests agents/skills.
 */

import { createLogger } from '../scripts/core/logger.mjs';
import { detectIntent } from '../scripts/i18n/intent-detector.mjs';

const log = createLogger('user-prompt');

try {
  const chunks = [];
  process.stdin.setEncoding('utf-8');

  await new Promise((resolve) => {
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', resolve);
    setTimeout(resolve, 2000);
  });

  const raw = chunks.join('');
  if (!raw || !raw.trim()) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  const userPrompt = parsed.prompt || parsed.user_prompt || parsed.content || '';

  if (!userPrompt) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  const intent = detectIntent(userPrompt);
  const contextParts = [];

  if (intent.agent) {
    contextParts.push(`Suggested agent: sw-kit:${intent.agent}`);
  }
  if (intent.pdcaStage) {
    contextParts.push(`PDCA stage hint: ${intent.pdcaStage}`);
  }
  if (intent.isWizardMode) {
    contextParts.push(`Wizard mode detected -- guide the user step by step`);
  }

  if (contextParts.length > 0) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        additionalContext: contextParts.join(' | ')
      }
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }

} catch (err) {
  const msg = err && err.message ? err.message : String(err);
  process.stderr.write(`[sw-kit:user-prompt] ERROR: ${msg}\n`);
  process.stdout.write(JSON.stringify({}));
}
