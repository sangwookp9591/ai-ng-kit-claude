/**
 * aing CLI Bridge Factory — Unified interface for external AI CLI tools.
 * Creates bridges for any CLI AI tool (Codex, Gemini, etc.)
 * that exposes a `-p` prompt flag.
 * @module scripts/multi-ai/cli-bridge
 */
import { execFileSync } from 'node:child_process';
import { createLogger } from '../core/logger.mjs';

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

// ── Factory ────────────────────────────────────────────────────────────

/**
 * Create a bridge for a CLI AI tool.
 *
 * @param {string} name   - Human-readable name (e.g. 'codex')
 * @param {string} command - Executable name on $PATH (e.g. 'codex')
 * @returns {{ name: string, command: string, isAvailable: () => boolean, ask: (prompt: string, opts?: { timeout?: number }) => object }}
 */
export function createBridge(name, command) {
  /**
   * Check whether the CLI tool is installed and on $PATH.
   * @returns {boolean}
   */
  function isAvailable() {
    try {
      execFileSync('which', [command], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Send a prompt to the CLI tool and return the response.
   *
   * @param {string} prompt - The prompt text
   * @param {{ timeout?: number }} [opts={}] - Options
   * @returns {{ ok: boolean, response?: string, error?: string, source: string, timedOut?: boolean }}
   */
  function ask(prompt, opts = {}) {
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
    } catch (err) {
      const isTimeout = !!err.killed;
      const reason = isTimeout ? 'timeout' : err.message;
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
export const codex = createBridge('codex', 'codex');

/** Google Gemini CLI bridge */
export const gemini = createBridge('gemini', 'gemini');

// ── Utilities ──────────────────────────────────────────────────────────

/**
 * Return only the bridges whose CLI tool is actually installed.
 * @returns {Array<{ name: string, command: string, isAvailable: () => boolean, ask: Function }>}
 */
export function getAvailableBridges() {
  const bridges = [codex, gemini];
  return bridges.filter(b => b.isAvailable());
}

/**
 * Build a terse, bug-focused review prompt from a diff.
 *
 * @param {string} diff         - The code diff to review
 * @param {string} [instructions] - Optional extra instructions
 * @returns {string} Complete prompt suitable for any AI CLI tool
 */
export function buildReviewPrompt(diff, instructions) {
  return `Review this code diff. Be direct and terse. Focus on bugs, security, and logic errors.
${instructions ? `Instructions: ${instructions}\n` : ''}
DIFF:
${diff.slice(0, MAX_DIFF_LENGTH)}`;
}
