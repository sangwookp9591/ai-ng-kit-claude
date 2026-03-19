/**
 * sw-kit UserPromptSubmit Hook Handler
 * Detects user intent (ko/en), suggests agents/skills, tracks context.
 */

import { createLogger } from '../scripts/core/logger.mjs';
import { trackInjection } from '../scripts/core/context-budget.mjs';
import { detectIntent } from '../scripts/i18n/intent-detector.mjs';

const log = createLogger('user-prompt');

try {
  let input = '';
  const chunks = [];
  process.stdin.setEncoding('utf-8');

  await new Promise((resolve) => {
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', resolve);
    setTimeout(resolve, 2000); // Safety timeout
  });

  input = chunks.join('');
  const parsed = input ? JSON.parse(input) : {};
  const userPrompt = parsed.prompt || '';

  if (!userPrompt) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  // Detect intent (multilingual)
  const intent = detectIntent(userPrompt);
  const contextParts = [];

  if (intent.agent) {
    contextParts.push(`Suggested agent: sw-kit:${intent.agent}`);
  }
  if (intent.pdcaStage) {
    contextParts.push(`PDCA stage hint: ${intent.pdcaStage}`);
  }
  if (intent.isWizardMode) {
    contextParts.push(`Wizard mode detected — guide the user step by step`);
  }

  if (contextParts.length > 0) {
    const context = contextParts.join(' | ');
    trackInjection('user-prompt', context);

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        additionalContext: context
      }
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }

} catch (err) {
  log.error('User prompt handler failed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
