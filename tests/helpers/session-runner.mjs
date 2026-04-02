/**
 * aing Session Runner — E2E Skill Test Runner
 * Spawns claude -p subprocess, streams NDJSON, tracks cost/duration.
 *
 * @module tests/helpers/session-runner
 */
import { spawn } from 'node:child_process';

/**
 * @typedef {object} SkillTestResult
 * @property {Array} toolCalls - Tool invocations recorded
 * @property {string} output - Full stdout
 * @property {string} exitReason - 'success' | 'timeout' | 'error'
 * @property {number} durationMs
 * @property {number} firstResponseMs - Time to first output
 * @property {string} model
 */

/**
 * Run a skill test by spawning claude -p.
 *
 * @param {object} options
 * @param {string} options.prompt - The prompt to send
 * @param {string} [options.model='claude-sonnet-4-6'] - Model to use
 * @param {number} [options.maxTurns=10] - Max tool turns
 * @param {number} [options.timeoutMs=120000] - Timeout in ms
 * @param {string} [options.cwd] - Working directory
 * @param {string[]} [options.allowedTools] - Tool allowlist
 * @returns {Promise<SkillTestResult>}
 */
export async function runSkillTest(options) {
  const {
    prompt,
    model = 'claude-sonnet-4-6',
    maxTurns = 10,
    timeoutMs = 120000,
    cwd = process.cwd(),
    allowedTools,
  } = options;

  const args = [
    '-p', prompt,
    '--model', model,
    '--output-format', 'stream-json',
    '--verbose',
    '--max-turns', String(maxTurns),
  ];

  if (allowedTools?.length) {
    args.push('--allowed-tools', allowedTools.join(','));
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let firstResponseMs = 0;
    let output = '';
    const toolCalls = [];
    let timedOut = false;

    const proc = spawn('claude', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;

      if (!firstResponseMs) {
        firstResponseMs = Date.now() - startTime;
      }

      // Parse NDJSON lines for tool calls
      for (const line of text.split('\n').filter(Boolean)) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'tool_use') {
            toolCalls.push({
              tool: parsed.name || parsed.tool,
              input: parsed.input,
              timestamp: Date.now() - startTime,
            });
          }
        } catch {
          // Not JSON, skip
        }
      }
    });

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;

      resolve({
        toolCalls,
        output,
        stderr,
        exitCode: code,
        exitReason: timedOut ? 'timeout' : code === 0 ? 'success' : 'error',
        durationMs,
        firstResponseMs,
        model,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Extract tool usage summary from test result.
 * @param {SkillTestResult} result
 * @returns {Record<string, number>}
 */
export function extractToolSummary(result) {
  const summary = {};
  for (const call of result.toolCalls) {
    summary[call.tool] = (summary[call.tool] || 0) + 1;
  }
  return summary;
}

/**
 * Check if a skill test passed based on criteria.
 * @param {SkillTestResult} result
 * @param {object} criteria
 * @param {string[]} [criteria.requiredTools] - Tools that must be called
 * @param {string[]} [criteria.forbiddenTools] - Tools that must NOT be called
 * @param {number} [criteria.maxDurationMs] - Max acceptable duration
 * @param {string[]} [criteria.outputContains] - Strings that must appear in output
 * @returns {{ passed: boolean, failures: string[] }}
 */
export function checkCriteria(result, criteria) {
  const failures = [];

  if (result.exitReason === 'timeout') {
    failures.push(`Timed out after ${result.durationMs}ms`);
  }

  if (result.exitReason === 'error') {
    failures.push(`Exit code ${result.exitCode}`);
  }

  if (criteria.requiredTools) {
    const used = new Set(result.toolCalls.map(c => c.tool));
    for (const tool of criteria.requiredTools) {
      if (!used.has(tool)) {
        failures.push(`Required tool not called: ${tool}`);
      }
    }
  }

  if (criteria.forbiddenTools) {
    const used = new Set(result.toolCalls.map(c => c.tool));
    for (const tool of criteria.forbiddenTools) {
      if (used.has(tool)) {
        failures.push(`Forbidden tool was called: ${tool}`);
      }
    }
  }

  if (criteria.maxDurationMs && result.durationMs > criteria.maxDurationMs) {
    failures.push(`Duration ${result.durationMs}ms exceeded max ${criteria.maxDurationMs}ms`);
  }

  if (criteria.outputContains) {
    for (const expected of criteria.outputContains) {
      if (!result.output.includes(expected)) {
        failures.push(`Output missing expected: "${expected}"`);
      }
    }
  }

  return { passed: failures.length === 0, failures };
}
