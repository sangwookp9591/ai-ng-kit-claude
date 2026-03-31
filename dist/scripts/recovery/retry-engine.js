/**
 * aing Retry Engine v1.3.0
 * Exponential backoff with jitter for automatic retries.
 * @module scripts/recovery/retry-engine
 */
import { createLogger } from '../core/logger.js';
import { recordFailure, isCircuitOpen, recordSuccess } from './circuit-breaker.js';
const log = createLogger('retry');
/**
 * Execute a function with exponential backoff retry.
 */
export async function retryWithBackoff(fn, options = {}) {
    const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 16000, featureName, projectDir } = options;
    // Check circuit breaker first
    if (featureName && isCircuitOpen(featureName, projectDir)) {
        return {
            ok: false,
            attempts: 0,
            error: `Circuit breaker OPEN for "${featureName}". Skipping retry.`
        };
    }
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            const result = await fn();
            // Success — reset circuit breaker
            if (featureName)
                recordSuccess(featureName, projectDir);
            return { ok: true, result, attempts: attempt };
        }
        catch (err) {
            const errorMessage = err.message;
            const isLastAttempt = attempt > maxRetries;
            if (isLastAttempt) {
                // Final failure — record in circuit breaker
                if (featureName)
                    recordFailure(featureName, errorMessage, projectDir);
                log.error(`All retries exhausted for "${featureName || 'unknown'}"`, {
                    attempts: attempt,
                    error: errorMessage
                });
                return { ok: false, attempts: attempt, error: errorMessage };
            }
            // Calculate delay: baseDelay * 2^(attempt-1) + jitter
            const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
            const jitter = Math.random() * exponentialDelay * 0.1; // 10% jitter
            const delay = Math.round(exponentialDelay + jitter);
            log.warn(`Retry ${attempt}/${maxRetries} for "${featureName || 'unknown'}" in ${delay}ms`, {
                error: errorMessage
            });
            await sleep(delay);
        }
    }
    // TypeScript requires a return here even though the loop always returns
    return { ok: false, attempts: maxRetries + 1, error: 'Unexpected exit from retry loop' };
}
/**
 * Create a retryable wrapper for a function.
 */
export function withRetry(fn, options = {}) {
    return (...args) => retryWithBackoff(() => fn(...args), options);
}
/**
 * Calculate retry delay for display.
 */
export function getRetrySchedule(attempt, baseDelayMs = 1000) {
    const delays = [];
    for (let i = 1; i <= attempt; i++) {
        delays.push(Math.min(baseDelayMs * Math.pow(2, i - 1), 16000));
    }
    return {
        delay: delays[delays.length - 1],
        schedule: delays.map((d, i) => `${i + 1}: ${d}ms`).join(' → ')
    };
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
//# sourceMappingURL=retry-engine.js.map