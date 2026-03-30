/**
 * aing Structured Logger
 * All output goes to stderr (never stdout — stdout is reserved for hook responses).
 * Logs also persist to .aing/logs/ for debugging.
 * @module scripts/core/logger
 */

import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  ts: string;
  level: LogLevel;
  module: string;
  msg: string;
  data?: unknown;
}

interface Logger {
  debug: (msg: string, data?: unknown) => void;
  info: (msg: string, data?: unknown) => void;
  warn: (msg: string, data?: unknown) => void;
  error: (msg: string, data?: unknown) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL: number = LOG_LEVELS[(process.env.SW_KIT_LOG_LEVEL || 'info') as LogLevel] ?? LOG_LEVELS.info;

/**
 * Create a logger scoped to a module name.
 * @param moduleName - e.g. 'pdca-engine', 'session-start'
 */
export function createLogger(moduleName: string): Logger {
  return {
    debug: (msg: string, data?: unknown) => log('debug', moduleName, msg, data),
    info: (msg: string, data?: unknown) => log('info', moduleName, msg, data),
    warn: (msg: string, data?: unknown) => log('warn', moduleName, msg, data),
    error: (msg: string, data?: unknown) => log('error', moduleName, msg, data)
  };
}

function log(level: LogLevel, module: string, message: string, data?: unknown): void {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    module,
    msg: message,
    ...(data !== undefined ? { data } : {})
  };

  // stderr for immediate visibility
  const line = `[aing:${module}] ${level.toUpperCase()}: ${message}`;
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else if (level === 'warn') {
    process.stderr.write(line + '\n');
  }

  // Persist to log file (best effort)
  persistLog(entry);
}

function persistLog(entry: LogEntry): void {
  try {
    const logDir = join(process.env.SW_KIT_PROJECT_DIR || process.cwd(), '.aing', 'logs');
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
