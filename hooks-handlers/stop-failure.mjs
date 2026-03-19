/**
 * sw-kit StopFailure Hook Handler v1.3.1
 * Classifies errors, emergency backup, recovery guidance.
 */
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { readState, writeState } from '../scripts/core/state.mjs';
import { join } from 'node:path';

const ERROR_CATEGORIES = {
  rate_limit: { pattern: /rate.?limit|429|too many/i, recovery: 'Wait 1-2 minutes and retry.' },
  auth_failure: { pattern: /auth|401|403|unauthorized|forbidden/i, recovery: 'Check API key/token.' },
  server_error: { pattern: /500|502|503|504|internal.?server/i, recovery: 'Server error. Retry shortly.' },
  overloaded: { pattern: /overloaded|capacity|busy/i, recovery: 'Service overloaded. Wait a few minutes.' },
  timeout: { pattern: /timeout|timed?.?out/i, recovery: 'Request timed out. Split work into smaller tasks.' },
  context_overflow: { pattern: /context|token.?limit|too.?long/i, recovery: 'Context limit reached. Use /compact.' }
};

let parsed = {};
try { parsed = JSON.parse(readFileSync(0, 'utf-8')); } catch (_) {}

try {
  const errorMsg = parsed.error || parsed.message || '';
  const projectDir = process.env.PROJECT_DIR || process.cwd();

  let category = 'unknown';
  let recovery = 'Unexpected error. Restart session.';

  for (const [cat, { pattern, recovery: rec }] of Object.entries(ERROR_CATEGORIES)) {
    if (pattern.test(errorMsg)) { category = cat; recovery = rec; break; }
  }

  // Emergency PDCA backup
  const stateFile = join(projectDir, '.sw-kit', 'state', 'pdca-status.json');
  const stateResult = readState(stateFile);
  if (stateResult.ok) {
    writeState(join(projectDir, '.sw-kit', 'state', 'pdca-emergency-backup.json'), {
      backupAt: new Date().toISOString(), reason: `StopFailure: ${category}`, state: stateResult.data
    });
  }

  // Log error
  try {
    const logDir = join(projectDir, '.sw-kit', 'logs');
    mkdirSync(logDir, { recursive: true });
    appendFileSync(join(logDir, 'errors.jsonl'),
      JSON.stringify({ ts: new Date().toISOString(), category, message: errorMsg.slice(0, 500), recovery }) + '\n'
    );
  } catch (_) {}

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { additionalContext: `[sw-kit Self-Healing] Error: ${category} -- ${recovery}` }
  }));
} catch (err) {
  process.stderr.write(`[sw-kit:stop-failure] ${err.message}\n`);
  process.stdout.write(JSON.stringify({}));
}
