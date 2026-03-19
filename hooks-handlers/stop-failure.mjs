/**
 * sw-kit StopFailure Hook Handler (Innovation #5 — Self-Healing)
 * Classifies API errors, performs emergency backup, provides recovery guidance.
 */

import { readState, writeState } from '../scripts/core/state.mjs';
import { createLogger } from '../scripts/core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('stop-failure');

const ERROR_CATEGORIES = {
  rate_limit: { pattern: /rate.?limit|429|too many/i, recovery: '잠시 후 다시 시도하세요 (1-2분 대기).' },
  auth_failure: { pattern: /auth|401|403|unauthorized|forbidden/i, recovery: 'API 키/토큰을 확인하세요.' },
  server_error: { pattern: /500|502|503|504|internal.?server/i, recovery: '서버 오류입니다. 잠시 후 재시도하세요.' },
  overloaded: { pattern: /overloaded|capacity|busy/i, recovery: '서비스가 과부하 상태입니다. 몇 분 후 재시도하세요.' },
  timeout: { pattern: /timeout|timed?.?out/i, recovery: '요청이 시간 초과되었습니다. 작업을 분할하세요.' },
  context_overflow: { pattern: /context|token.?limit|too.?long/i, recovery: '컨텍스트 한계 도달. /compact 후 재시도하세요.' }
};

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
  const errorMsg = parsed.error || parsed.message || '';

  // Classify error
  let category = 'unknown';
  let recovery = '예상치 못한 오류입니다. 세션을 재시작하세요.';

  for (const [cat, { pattern, recovery: rec }] of Object.entries(ERROR_CATEGORIES)) {
    if (pattern.test(errorMsg)) {
      category = cat;
      recovery = rec;
      break;
    }
  }

  // Emergency backup of PDCA state
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const stateFile = join(projectDir, '.sw-kit', 'state', 'pdca-status.json');
  const stateResult = readState(stateFile);
  if (stateResult.ok) {
    const backupFile = join(projectDir, '.sw-kit', 'state', 'pdca-emergency-backup.json');
    writeState(backupFile, {
      backupAt: new Date().toISOString(),
      reason: `StopFailure: ${category}`,
      state: stateResult.data
    });
  }

  // Log error
  const errorLogFile = join(projectDir, '.sw-kit', 'logs', 'errors.jsonl');
  const errorEntry = {
    ts: new Date().toISOString(),
    category,
    message: errorMsg.slice(0, 500),
    recovery
  };

  try {
    const { appendFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(join(projectDir, '.sw-kit', 'logs'), { recursive: true });
    appendFileSync(errorLogFile, JSON.stringify(errorEntry) + '\n');
  } catch (_) { /* best effort */ }

  // Provide recovery guidance
  const context = `[sw-kit Self-Healing] Error: ${category} — ${recovery}`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { additionalContext: context }
  }));

  log.error('StopFailure handled', { category, recovery });

} catch (err) {
  log.error('StopFailure handler crashed', { error: err.message });
  process.stdout.write(JSON.stringify({}));
}
