/**
 * Session Runner — spawns Claude Code sessions and captures structured output.
 *
 * Usage:
 *   const result = await runSession({ prompt: '/aing auto "task"', timeout: 120_000 });
 *   console.log(result.messages, result.toolCalls, result.duration);
 */
import { spawn } from 'node:child_process';

// ── Public types ──────────────────────────────────────────────────────────

export interface AssistantMessage {
  role: string;
  content: string;
  timestamp: number;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: string;
  timestamp: number;
}

export interface SessionResult {
  messages: AssistantMessage[];
  toolCalls: ToolCall[];
  duration: number;
  success: boolean;
  error?: string;
  rawOutput: string;
}

export interface SessionOptions {
  /** The prompt to send to `claude -p`. */
  prompt: string;
  /** Working directory for the spawned process. Defaults to process.cwd(). */
  cwd?: string;
  /** Timeout in milliseconds. Defaults to 120 000 (2 min). */
  timeout?: number;
  /** Extra environment variables merged with process.env. */
  env?: Record<string, string>;
  /** Additional CLI flags passed to claude. */
  extraArgs?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract text from a content block array (Claude's message format) or a
 * plain string.
 */
function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text ?? '')
      .join('\n');
  }
  return String(content ?? '');
}

/**
 * Parse a single NDJSON line emitted by `claude -p --output-format stream-json`.
 *
 * Known shapes (non-exhaustive):
 *   { "type": "assistant", "message": { "role": "assistant", "content": [...] } }
 *   { "type": "tool_use",  "name": "Bash", "input": { "command": "..." } }
 *   { "type": "tool_result", "name": "Bash", "content": "..." }
 *   { "type": "result", "result": "...", "is_error": false }
 */
function parseLine(
  line: string,
  messages: AssistantMessage[],
  toolCalls: ToolCall[],
): void {
  let obj: any;
  try {
    obj = JSON.parse(line);
  } catch {
    // Non-JSON output — skip silently.
    return;
  }

  const now = Date.now();

  switch (obj.type) {
    case 'assistant': {
      const msg = obj.message;
      if (msg) {
        messages.push({
          role: msg.role ?? 'assistant',
          content: extractText(msg.content),
          timestamp: now,
        });
      }
      break;
    }

    case 'tool_use': {
      toolCalls.push({
        name: obj.name ?? 'unknown',
        input: obj.input ?? {},
        timestamp: now,
      });
      break;
    }

    case 'tool_result': {
      // Attach result to the most recent tool call with a matching name.
      const resultText =
        typeof obj.content === 'string'
          ? obj.content
          : JSON.stringify(obj.content);
      const matchName = obj.name ?? obj.tool_use_id;
      for (let i = toolCalls.length - 1; i >= 0; i--) {
        if (
          toolCalls[i].result === undefined &&
          (matchName == null || toolCalls[i].name === matchName)
        ) {
          toolCalls[i].result = resultText;
          break;
        }
      }
      break;
    }

    case 'result': {
      // Final result line — treat as an assistant message.
      if (obj.result) {
        messages.push({
          role: 'assistant',
          content: extractText(obj.result),
          timestamp: now,
        });
      }
      break;
    }

    // content_block_start / content_block_delta / content_block_stop — streaming
    // variants that some Claude CLI versions emit. Accumulate text deltas.
    case 'content_block_delta': {
      const delta = obj.delta;
      if (delta?.type === 'text_delta' && delta.text) {
        // Append to the last assistant message or create a new one.
        if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
          messages[messages.length - 1].content += delta.text;
        } else {
          messages.push({ role: 'assistant', content: delta.text, timestamp: now });
        }
      }
      break;
    }

    default:
      // Unrecognised type — ignore.
      break;
  }
}

// ── Main entry ────────────────────────────────────────────────────────────

/**
 * Spawn a `claude -p` session, capture its NDJSON output, and return a
 * structured {@link SessionResult}.
 */
export async function runSession(options: SessionOptions): Promise<SessionResult> {
  const {
    prompt,
    cwd = process.cwd(),
    timeout = 120_000,
    env: extraEnv = {},
    extraArgs = [],
  } = options;

  const messages: AssistantMessage[] = [];
  const toolCalls: ToolCall[] = [];
  const chunks: string[] = [];
  const startTime = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  return new Promise<SessionResult>((resolve) => {
    const args = ['-p', prompt, '--output-format', 'stream-json', ...extraArgs];

    const child = spawn('claude', args, {
      cwd,
      env: { ...process.env, ...extraEnv },
      signal: controller.signal,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrBuf = '';
    let remainder = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      chunks.push(text);

      // NDJSON: split on newlines; keep a remainder for partial lines.
      const lines = (remainder + text).split('\n');
      remainder = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) parseLine(trimmed, messages, toolCalls);
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      stderrBuf += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      // Flush remaining partial line.
      if (remainder.trim()) {
        parseLine(remainder.trim(), messages, toolCalls);
      }

      const duration = Date.now() - startTime;
      const success = code === 0;
      const rawOutput = chunks.join('');

      resolve({
        messages,
        toolCalls,
        duration,
        success,
        error: success ? undefined : stderrBuf || `Process exited with code ${code}`,
        rawOutput,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      resolve({
        messages,
        toolCalls,
        duration,
        success: false,
        error: err.name === 'AbortError' ? `Session timed out after ${timeout}ms` : err.message,
        rawOutput: chunks.join(''),
      });
    });
  });
}
