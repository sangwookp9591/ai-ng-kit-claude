/**
 * sw-kit UserPromptSubmit Hook v1.3.2
 */
import { readStdinJSON } from '../scripts/core/stdin.mjs';
import { detectIntent } from '../scripts/i18n/intent-detector.mjs';

const parsed = await readStdinJSON();
const prompt = parsed.prompt || parsed.user_prompt || parsed.content || '';

if (!prompt) { process.stdout.write('{}'); process.exit(0); }

try {
  const intent = detectIntent(prompt);
  const parts = [];
  if (intent.agent) parts.push(`Suggested agent: sw-kit:${intent.agent}`);
  if (intent.pdcaStage) parts.push(`PDCA stage hint: ${intent.pdcaStage}`);
  if (intent.isWizardMode) parts.push('Wizard mode -- guide step by step');

  process.stdout.write(parts.length > 0
    ? JSON.stringify({ hookSpecificOutput: { additionalContext: parts.join(' | ') } })
    : '{}');
} catch (err) {
  process.stderr.write(`[sw-kit:user-prompt] ${err.message}\n`);
  process.stdout.write('{}');
}
