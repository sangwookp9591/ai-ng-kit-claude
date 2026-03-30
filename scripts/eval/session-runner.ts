/**
 * aing Eval Session Runner — subprocess manager for skill evaluation
 *
 * Spawns `claude -p` as a child process, captures NDJSON output,
 * provides timeout handling, cost estimation, and progress heartbeats.
 *
 * @module scripts/eval/session-runner
 */

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createLogger } from '../core/logger.js';

const log = createLogger('eval-session-runner');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExitReason = 'completed' | 'timeout' | 'error' | 'max_turns';

export interface SessionRunnerOptions {
  /** The skill to invoke (e.g. 'auto', 'review-code'). */
  skill: string;
  /** The prompt to send to the skill. */
  prompt: string;
  /** Working directory for the spawned process. Defaults to process.cwd(). */
  cwd?: string;
  /** Timeout in milliseconds. Defaults to 120_000 (2 min). */
  timeout?: number;
  /** Maximum turns for the Claude session. Defaults to 5. */
  maxTurns?: number;
  /** Output format. Defaults to 'stream-json'. */
  outputFormat?: 'stream-json' | 'json' | 'text';
  /** Extra environment variables merged with process.env. */
  env?: Record<string, string>;
  /** Extra CLI flags passed to claude. */
  extraArgs?: string[];
  /** Enable progress heartbeat logging. Defaults to true. */
  heartbeat?: boolean;
  /** Heartbeat interval in milliseconds. Defaults to 10_000. */
  heartbeatInterval?: number;
}

export interface SessionMessage {
  role: string;
  content: string;
  timestamp: number;
}

export interface SessionToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: string;
  timestamp: number;
}

export interface SessionRunnerResult {
  /** Whether the session completed without errors. */
  success: boolean;
  /** Parsed assistant messages from the session. */
  output: SessionMessage[];
  /** Tool calls made during the session. */
  toolCalls: SessionToolCall[];
  /** Total duration in milliseconds. */
  duration_ms: number;
  /** Estimated cost in USD based on token approximations. */
  cost_estimate: number;
  /** Why the session ended. */
  exitReason: ExitReason;
  /** Raw stdout from the subprocess. */
  rawOutput: string;
  /** Stderr output if any. */
  stderr: string;
  /** Process exit code. */
  exitCode: number | null;
  /** Token usage estimates. */
  tokenEstimate: TokenEstimate;
}

export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

// Rough cost per 1M tokens (Sonnet-class pricing)
const COST_PER_1M_INPUT = 3.0;
const COST_PER_1M_OUTPUT = 15.0;

// Approximate tokens per character (rough heuristic)
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function estimateCost(input: string, output: string): { tokens: TokenEstimate; cost: number } {
  const inputTokens = estimateTokens(input);
  const outputTokens = estimateTokens(output);
  const totalTokens = inputTokens + outputTokens;

  const cost =
    (inputTokens / 1_000_000) * COST_PER_1M_INPUT +
    (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT;

  return {
    tokens: { inputTokens, outputTokens, totalTokens },
    cost: Math.round(cost * 1000) / 1000,
  };
}

// ---------------------------------------------------------------------------
// NDJSON line parser
// ---------------------------------------------------------------------------

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: Record<string, unknown>) => b.type === 'text')
      .map((b: Record<string, unknown>) => String(b.text ?? ''))
      .join('\n');
  }
  return String(content ?? '');
}

function parseLine(
  line: string,
  messages: SessionMessage[],
  toolCalls: SessionToolCall[],
): void {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return;
  }

  const now = Date.now();

  switch (obj.type) {
    case 'assistant': {
      const msg = obj.message as Record<string, unknown> | undefined;
      if (msg) {
        messages.push({
          role: String(msg.role ?? 'assistant'),
          content: extractText(msg.content),
          timestamp: now,
        });
      }
      break;
    }

    case 'tool_use': {
      toolCalls.push({
        name: String(obj.name ?? 'unknown'),
        input: (obj.input as Record<string, unknown>) ?? {},
        timestamp: now,
      });
      break;
    }

    case 'tool_result': {
      const resultText =
        typeof obj.content === 'string'
          ? obj.content
          : JSON.stringify(obj.content);
      const matchName = String(obj.name ?? obj.tool_use_id ?? '');
      for (let i = toolCalls.length - 1; i >= 0; i--) {
        if (
          toolCalls[i].result === undefined &&
          (!matchName || toolCalls[i].name === matchName)
        ) {
          toolCalls[i].result = resultText;
          break;
        }
      }
      break;
    }

    case 'result': {
      if (obj.result) {
        messages.push({
          role: 'assistant',
          content: extractText(obj.result),
          timestamp: now,
        });
      }
      break;
    }

    case 'content_block_delta': {
      const delta = obj.delta as Record<string, unknown> | undefined;
      if (delta?.type === 'text_delta' && delta.text) {
        if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
          messages[messages.length - 1].content += String(delta.text);
        } else {
          messages.push({ role: 'assistant', content: String(delta.text), timestamp: now });
        }
      }
      break;
    }

    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Synchronous runner (for simple/fast invocations)
// ---------------------------------------------------------------------------

/**
 * Run a skill session synchronously via execFileSync.
 * Good for quick validations where streaming is not needed.
 */
export function runSkillSessionSync(
  skill: string,
  prompt: string,
  options: Partial<SessionRunnerOptions> = {},
): SessionRunnerResult {
  const {
    cwd = process.cwd(),
    timeout = 120_000,
    maxTurns = 5,
    env: extraEnv = {},
    extraArgs = [],
  } = options;

  const fullPrompt = `/aing ${skill} ${prompt}`;
  const args = [
    '-p', fullPrompt,
    '--max-turns', String(maxTurns),
    '--output-format', 'json',
    ...extraArgs,
  ];

  const startTime = Date.now();
  let rawOutput = '';
  let stderr = '';
  let exitCode: number | null = 0;
  let exitReason: ExitReason = 'completed';

  try {
    rawOutput = execFileSync('claude', args, {
      cwd,
      timeout,
      encoding: 'utf-8',
      env: { ...process.env, ...extraEnv },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; status?: number };
    rawOutput = error.stdout ?? '';
    stderr = error.stderr ?? '';
    exitCode = error.status ?? 1;

    if (error.code === 'ETIMEDOUT' || String(error.message).includes('timed out')) {
      exitReason = 'timeout';
    } else {
      exitReason = 'error';
    }
  }

  const duration_ms = Date.now() - startTime;

  // Parse output
  const messages: SessionMessage[] = [];
  const toolCalls: SessionToolCall[] = [];

  // Try JSON parse of the whole output first
  try {
    const parsed = JSON.parse(rawOutput) as Record<string, unknown>;
    if (parsed.result) {
      messages.push({
        role: 'assistant',
        content: extractText(parsed.result),
        timestamp: startTime,
      });
    }
  } catch {
    // Try NDJSON line-by-line
    for (const line of rawOutput.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) parseLine(trimmed, messages, toolCalls);
    }
  }

  // Check for max_turns exit
  if (rawOutput.includes('max_turns') || rawOutput.includes('turn limit')) {
    exitReason = 'max_turns';
  }

  const outputText = messages.map(m => m.content).join('\n');
  const { tokens, cost } = estimateCost(fullPrompt, outputText);

  const success = exitCode === 0 && exitReason === 'completed';

  if (success) {
    log.info(`Session [${skill}] completed in ${duration_ms}ms, ~$${cost}`);
  } else {
    log.warn(`Session [${skill}] exited: ${exitReason} (${duration_ms}ms)`);
  }

  return {
    success,
    output: messages,
    toolCalls,
    duration_ms,
    cost_estimate: cost,
    exitReason,
    rawOutput,
    stderr,
    exitCode,
    tokenEstimate: tokens,
  };
}

// ---------------------------------------------------------------------------
// Async runner (streaming with heartbeats)
// ---------------------------------------------------------------------------

/**
 * Run a skill session asynchronously, capturing NDJSON stream output
 * with progress heartbeat logging.
 */
export function runSkillSession(
  skill: string,
  prompt: string,
  options: Partial<SessionRunnerOptions> = {},
): Promise<SessionRunnerResult> {
  const {
    cwd = process.cwd(),
    timeout = 120_000,
    maxTurns = 5,
    outputFormat = 'stream-json',
    env: extraEnv = {},
    extraArgs = [],
    heartbeat = true,
    heartbeatInterval = 10_000,
  } = options;

  const fullPrompt = `/aing ${skill} ${prompt}`;
  const args = [
    '-p', fullPrompt,
    '--max-turns', String(maxTurns),
    '--output-format', outputFormat,
    ...extraArgs,
  ];

  const messages: SessionMessage[] = [];
  const toolCalls: SessionToolCall[] = [];
  const chunks: string[] = [];
  const startTime = Date.now();

  return new Promise<SessionRunnerResult>((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let lastActivity = Date.now();

    const child: ChildProcess = spawn('claude', args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      signal: controller.signal,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Heartbeat logging
    if (heartbeat) {
      heartbeatTimer = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const idle = Math.round((Date.now() - lastActivity) / 1000);
        log.info(
          `Session [${skill}] heartbeat: ${elapsed}s elapsed, ${messages.length} msgs, ${toolCalls.length} tools, ${idle}s since last activity`,
        );
      }, heartbeatInterval);
    }

    let stderrBuf = '';
    let remainder = '';

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      chunks.push(text);
      lastActivity = Date.now();

      const lines = (remainder + text).split('\n');
      remainder = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) parseLine(trimmed, messages, toolCalls);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderrBuf += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);

      if (remainder.trim()) {
        parseLine(remainder.trim(), messages, toolCalls);
      }

      const duration_ms = Date.now() - startTime;
      const rawOutput = chunks.join('');
      const outputText = messages.map(m => m.content).join('\n');
      const { tokens, cost } = estimateCost(fullPrompt, outputText);

      let exitReason: ExitReason = code === 0 ? 'completed' : 'error';
      if (rawOutput.includes('max_turns') || rawOutput.includes('turn limit')) {
        exitReason = 'max_turns';
      }

      const success = code === 0 && exitReason === 'completed';

      log.info(
        `Session [${skill}] finished: ${exitReason} in ${duration_ms}ms, ` +
        `${messages.length} msgs, ${toolCalls.length} tools, ~$${cost}`,
      );

      resolve({
        success,
        output: messages,
        toolCalls,
        duration_ms,
        cost_estimate: cost,
        exitReason,
        rawOutput,
        stderr: stderrBuf,
        exitCode: code,
        tokenEstimate: tokens,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);

      const duration_ms = Date.now() - startTime;
      const rawOutput = chunks.join('');
      const { tokens, cost } = estimateCost(fullPrompt, rawOutput);

      const exitReason: ExitReason =
        err.name === 'AbortError' ? 'timeout' : 'error';

      log.error(`Session [${skill}] ${exitReason}: ${err.message}`);

      resolve({
        success: false,
        output: messages,
        toolCalls,
        duration_ms,
        cost_estimate: cost,
        exitReason,
        rawOutput,
        stderr: err.message,
        exitCode: null,
        tokenEstimate: tokens,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Batch runner
// ---------------------------------------------------------------------------

export interface BatchOptions {
  /** Run sessions sequentially (default) or with limited concurrency. */
  concurrency?: number;
}

export interface BatchResult {
  results: Map<string, SessionRunnerResult>;
  totalDuration_ms: number;
  totalCost: number;
}

/**
 * Run multiple skill sessions, optionally in parallel.
 */
export async function runSkillSessionBatch(
  sessions: Array<{ skill: string; prompt: string; options?: Partial<SessionRunnerOptions> }>,
  batchOptions: BatchOptions = {},
): Promise<BatchResult> {
  const { concurrency = 1 } = batchOptions;
  const results = new Map<string, SessionRunnerResult>();
  const startTime = Date.now();

  if (concurrency <= 1) {
    // Sequential execution
    for (const session of sessions) {
      const result = await runSkillSession(session.skill, session.prompt, session.options);
      results.set(session.skill, result);
    }
  } else {
    // Parallel with concurrency limit
    const queue = [...sessions];
    const running: Promise<void>[] = [];

    while (queue.length > 0 || running.length > 0) {
      while (running.length < concurrency && queue.length > 0) {
        const session = queue.shift()!;
        const promise = runSkillSession(session.skill, session.prompt, session.options)
          .then((result) => {
            results.set(session.skill, result);
          });
        running.push(promise);
      }

      if (running.length > 0) {
        await Promise.race(running);
        // Remove settled promises
        const settled = await Promise.allSettled(running);
        running.length = 0;
        for (const s of settled) {
          if (s.status === 'rejected') {
            log.error(`Batch session failed: ${String(s.reason)}`);
          }
        }
      }
    }
  }

  const totalDuration_ms = Date.now() - startTime;
  const totalCost = [...results.values()].reduce((sum, r) => sum + r.cost_estimate, 0);

  log.info(
    `Batch complete: ${results.size} sessions in ${totalDuration_ms}ms, total ~$${Math.round(totalCost * 100) / 100}`,
  );

  return { results, totalDuration_ms, totalCost };
}
