/**
 * sw-kit Structured Logger
 * All output goes to stderr (never stdout — stdout is reserved for hook responses).
 * Logs also persist to .sw-kit/logs/ for debugging.
 * @module scripts/core/logger
 */

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LOG_LEVELS[process.env.SW_KIT_LOG_LEVEL || 'info'];

/**
 * Create a logger scoped to a module name.
 * @param {string} moduleName - e.g. 'pdca-engine', 'session-start'
 * @returns {{ debug, info, warn, error }}
 */
export function createLogger(moduleName) {
  return {
    debug: (msg, data) => log('debug', moduleName, msg, data),
    info: (msg, data) => log('info', moduleName, msg, data),
    warn: (msg, data) => log('warn', moduleName, msg, data),
    error: (msg, data) => log('error', moduleName, msg, data)
  };
}

function log(level, module, message, data) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    module,
    msg: message,
    ...(data !== undefined ? { data } : {})
  };

  // stderr for immediate visibility
  const line = `[sw-kit:${module}] ${level.toUpperCase()}: ${message}`;
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else if (level === 'warn') {
    process.stderr.write(line + '\n');
  }

  // Persist to log file (best effort)
  persistLog(entry);
}

function persistLog(entry) {
  try {
    const logDir = join(process.cwd(), '.sw-kit', 'logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
    const date = entry.ts.slice(0, 10);
    const logFile = join(logDir, `${date}.jsonl`);
    appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (_) {
    // Log persistence is best-effort — never crash the hook
  }
}
