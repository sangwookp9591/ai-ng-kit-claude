/**
 * aing Eval Session Runner — subprocess manager for skill evaluation
 *
 * Spawns `claude -p` as a child process, captures NDJSON output,
 * provides timeout handling, cost estimation, and progress heartbeats.
 *
 * @module scripts/eval/session-runner
 */
import { execFileSync, spawn } from 'node:child_process';
import { createLogger } from '../core/logger.js';
const log = createLogger('eval-session-runner');
// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------
// Rough cost per 1M tokens (Sonnet-class pricing)
const COST_PER_1M_INPUT = 3.0;
const COST_PER_1M_OUTPUT = 15.0;
// Approximate tokens per character (rough heuristic)
const CHARS_PER_TOKEN = 4;
function estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}
function estimateCost(input, output) {
    const inputTokens = estimateTokens(input);
    const outputTokens = estimateTokens(output);
    const totalTokens = inputTokens + outputTokens;
    const cost = (inputTokens / 1_000_000) * COST_PER_1M_INPUT +
        (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT;
    return {
        tokens: { inputTokens, outputTokens, totalTokens },
        cost: Math.round(cost * 1000) / 1000,
    };
}
// ---------------------------------------------------------------------------
// NDJSON line parser
// ---------------------------------------------------------------------------
function extractText(content) {
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content)) {
        return content
            .filter((b) => b.type === 'text')
            .map((b) => String(b.text ?? ''))
            .join('\n');
    }
    return String(content ?? '');
}
function parseLine(line, messages, toolCalls) {
    let obj;
    try {
        obj = JSON.parse(line);
    }
    catch {
        return;
    }
    const now = Date.now();
    switch (obj.type) {
        case 'assistant': {
            const msg = obj.message;
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
                input: obj.input ?? {},
                timestamp: now,
            });
            break;
        }
        case 'tool_result': {
            const resultText = typeof obj.content === 'string'
                ? obj.content
                : JSON.stringify(obj.content);
            const matchName = String(obj.name ?? obj.tool_use_id ?? '');
            for (let i = toolCalls.length - 1; i >= 0; i--) {
                if (toolCalls[i].result === undefined &&
                    (!matchName || toolCalls[i].name === matchName)) {
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
            const delta = obj.delta;
            if (delta?.type === 'text_delta' && delta.text) {
                if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
                    messages[messages.length - 1].content += String(delta.text);
                }
                else {
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
export function runSkillSessionSync(skill, prompt, options = {}) {
    const { cwd = process.cwd(), timeout = 120_000, maxTurns = 5, env: extraEnv = {}, extraArgs = [], } = options;
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
    let exitCode = 0;
    let exitReason = 'completed';
    try {
        rawOutput = execFileSync('claude', args, {
            cwd,
            timeout,
            encoding: 'utf-8',
            env: { ...process.env, ...extraEnv },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    }
    catch (err) {
        const error = err;
        rawOutput = error.stdout ?? '';
        stderr = error.stderr ?? '';
        exitCode = error.status ?? 1;
        if (error.code === 'ETIMEDOUT' || String(error.message).includes('timed out')) {
            exitReason = 'timeout';
        }
        else {
            exitReason = 'error';
        }
    }
    const duration_ms = Date.now() - startTime;
    // Parse output
    const messages = [];
    const toolCalls = [];
    // Try JSON parse of the whole output first
    try {
        const parsed = JSON.parse(rawOutput);
        if (parsed.result) {
            messages.push({
                role: 'assistant',
                content: extractText(parsed.result),
                timestamp: startTime,
            });
        }
    }
    catch {
        // Try NDJSON line-by-line
        for (const line of rawOutput.split('\n')) {
            const trimmed = line.trim();
            if (trimmed)
                parseLine(trimmed, messages, toolCalls);
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
    }
    else {
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
export function runSkillSession(skill, prompt, options = {}) {
    const { cwd = process.cwd(), timeout = 120_000, maxTurns = 5, outputFormat = 'stream-json', env: extraEnv = {}, extraArgs = [], heartbeat = true, heartbeatInterval = 10_000, } = options;
    const fullPrompt = `/aing ${skill} ${prompt}`;
    const args = [
        '-p', fullPrompt,
        '--max-turns', String(maxTurns),
        '--output-format', outputFormat,
        ...extraArgs,
    ];
    const messages = [];
    const toolCalls = [];
    const chunks = [];
    const startTime = Date.now();
    return new Promise((resolve) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        let heartbeatTimer;
        let lastActivity = Date.now();
        const child = spawn('claude', args, {
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
                log.info(`Session [${skill}] heartbeat: ${elapsed}s elapsed, ${messages.length} msgs, ${toolCalls.length} tools, ${idle}s since last activity`);
            }, heartbeatInterval);
        }
        let stderrBuf = '';
        let remainder = '';
        child.stdout?.on('data', (data) => {
            const text = data.toString();
            chunks.push(text);
            lastActivity = Date.now();
            const lines = (remainder + text).split('\n');
            remainder = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed)
                    parseLine(trimmed, messages, toolCalls);
            }
        });
        child.stderr?.on('data', (data) => {
            stderrBuf += data.toString();
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (heartbeatTimer)
                clearInterval(heartbeatTimer);
            if (remainder.trim()) {
                parseLine(remainder.trim(), messages, toolCalls);
            }
            const duration_ms = Date.now() - startTime;
            const rawOutput = chunks.join('');
            const outputText = messages.map(m => m.content).join('\n');
            const { tokens, cost } = estimateCost(fullPrompt, outputText);
            let exitReason = code === 0 ? 'completed' : 'error';
            if (rawOutput.includes('max_turns') || rawOutput.includes('turn limit')) {
                exitReason = 'max_turns';
            }
            const success = code === 0 && exitReason === 'completed';
            log.info(`Session [${skill}] finished: ${exitReason} in ${duration_ms}ms, ` +
                `${messages.length} msgs, ${toolCalls.length} tools, ~$${cost}`);
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
            if (heartbeatTimer)
                clearInterval(heartbeatTimer);
            const duration_ms = Date.now() - startTime;
            const rawOutput = chunks.join('');
            const { tokens, cost } = estimateCost(fullPrompt, rawOutput);
            const exitReason = err.name === 'AbortError' ? 'timeout' : 'error';
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
/**
 * Run multiple skill sessions, optionally in parallel.
 */
export async function runSkillSessionBatch(sessions, batchOptions = {}) {
    const { concurrency = 1 } = batchOptions;
    const results = new Map();
    const startTime = Date.now();
    if (concurrency <= 1) {
        // Sequential execution
        for (const session of sessions) {
            const result = await runSkillSession(session.skill, session.prompt, session.options);
            results.set(session.skill, result);
        }
    }
    else {
        // Parallel with concurrency limit
        const queue = [...sessions];
        const running = [];
        while (queue.length > 0 || running.length > 0) {
            while (running.length < concurrency && queue.length > 0) {
                const session = queue.shift();
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
    log.info(`Batch complete: ${results.size} sessions in ${totalDuration_ms}ms, total ~$${Math.round(totalCost * 100) / 100}`);
    return { results, totalDuration_ms, totalCost };
}
//# sourceMappingURL=session-runner.js.map