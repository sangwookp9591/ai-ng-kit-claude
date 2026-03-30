/**
 * aing CLI Bridge Factory — Unified interface for external AI CLI tools.
 * Creates bridges for any CLI AI tool (Codex, Gemini, etc.)
 * that exposes a `-p` prompt flag.
 * @module scripts/multi-ai/cli-bridge
 */
import { execFileSync } from 'node:child_process';
import { createLogger } from '../core/logger.js';

const log = createLogger('cli-bridge');

/**
 * Maximum response buffer size (10 MB).
 * CLI tools can be chatty; this prevents OOM on runaway output.
 */
const MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Default timeout for CLI calls (2 minutes).
 */
const DEFAULT_TIMEOUT = 120_000;

/**
 * Maximum diff length passed into review prompts (50 KB).
 * Keeps token usage bounded regardless of diff size.
 */
const MAX_DIFF_LENGTH = 50_000;

interface AskOptions {
  timeout?: number;
}

interface AskResult {
  ok: boolean;
  response?: string;
  error?: string;
  source: string;
  timedOut?: boolean;
}

interface Bridge {
  name: string;
  command: string;
  isAvailable: () => boolean;
  ask: (prompt: string, opts?: AskOptions) => AskResult;
}

// ── Factory ────────────────────────────────────────────────────────────

/**
 * Create a bridge for a CLI AI tool.
 */
export function createBridge(name: string, command: string): Bridge {
  /**
   * Check whether the CLI tool is installed and on $PATH.
   */
  function isAvailable(): boolean {
    try {
      execFileSync('which', [command], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a prompt to the CLI tool and return the response.
   */
  function ask(prompt: string, opts: AskOptions = {}): AskResult {
    const timeout = opts.timeout || DEFAULT_TIMEOUT;

    try {
      const result = execFileSync(command, ['-p', prompt], {
        encoding: 'utf-8',
        timeout,
        maxBuffer: MAX_BUFFER,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      log.info(`${name} responded (${result.length} chars)`);
      return { ok: true, response: result.trim(), source: name };
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException & { killed?: boolean };
      const isTimeout = !!error.killed;
      const reason = isTimeout ? 'timeout' : error.message;
      log.warn(`${name} call failed: ${reason}`);
      return {
        ok: false,
        error: reason,
        source: name,
        timedOut: isTimeout,
      };
    }
  }

  return { name, command, isAvailable, ask };
}

// ── Pre-built bridges ──────────────────────────────────────────────────

/** OpenAI Codex CLI bridge */
export const codex: Bridge = createBridge('codex', 'codex');

/** Google Gemini CLI bridge */
export const gemini: Bridge = createBridge('gemini', 'gemini');

// ── Utilities ──────────────────────────────────────────────────────────

/**
 * Return only the bridges whose CLI tool is actually installed.
 */
export function getAvailableBridges(): Bridge[] {
  const bridges: Bridge[] = [codex, gemini];
  return bridges.filter(b => b.isAvailable());
}

/**
 * Build a terse, bug-focused review prompt from a diff.
 */
export function buildReviewPrompt(diff: string, instructions?: string): string {
  return `Review this code diff. Be direct and terse. Focus on bugs, security, and logic errors.
${instructions ? `Instructions: ${instructions}\n` : ''}
DIFF:
${diff.slice(0, MAX_DIFF_LENGTH)}`;
}
