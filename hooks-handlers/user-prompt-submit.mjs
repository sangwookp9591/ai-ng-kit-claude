/**
 * sw-kit UserPromptSubmit Hook Handler v1.3.1
 */
import { readFileSync } from 'node:fs';
import { detectIntent } from '../scripts/i18n/intent-detector.mjs';

let raw = '';
try {
  raw = readFileSync(0, 'utf-8');
} catch (_) {}

try {
  if (!raw || !raw.trim()) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  const parsed = JSON.parse(raw);
  const userPrompt = parsed.prompt || parsed.user_prompt || parsed.content || '';

  if (!userPrompt) {
    process.stdout.write(JSON.stringify({}));
    process.exit(0);
  }

  const intent = detectIntent(userPrompt);
  const parts = [];

  if (intent.agent) parts.push(`Suggested agent: sw-kit:${intent.agent}`);
  if (intent.pdcaStage) parts.push(`PDCA stage hint: ${intent.pdcaStage}`);
  if (intent.isWizardMode) parts.push(`Wizard mode detected -- guide the user step by step`);

  if (parts.length > 0) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { additionalContext: parts.join(' | ') }
    }));
  } else {
    process.stdout.write(JSON.stringify({}));
  }
} catch (err) {
  process.stderr.write(`[sw-kit:user-prompt] ${err.message}\n`);
  process.stdout.write(JSON.stringify({}));
}
