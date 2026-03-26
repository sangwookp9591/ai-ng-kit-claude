/**
 * aing Retry Engine v1.3.0
 * Exponential backoff with jitter for automatic retries.
 * @module scripts/recovery/retry-engine
 */

import { createLogger } from '../core/logger.mjs';
import { recordFailure, isCircuitOpen, recordSuccess } from './circuit-breaker.mjs';

const log = createLogger('retry');

/**
 * Execute a function with exponential backoff retry.
 * @param {Function} fn - Async function to execute
 * @param {object} [options]
 * @param {number} [options.maxRetries=3]
 * @param {number} [options.baseDelayMs=1000]
 * @param {number} [options.maxDelayMs=16000]
 * @param {string} [options.featureName] - For circuit breaker integration
 * @param {string} [options.projectDir]
 * @returns {Promise<{ ok: boolean, result?: any, attempts: number, error?: string }>}
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 16000,
    featureName,
    projectDir
  } = options;

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
      if (featureName) recordSuccess(featureName, projectDir);

      return { ok: true, result, attempts: attempt };
    } catch (err) {
      const isLastAttempt = attempt > maxRetries;

      if (isLastAttempt) {
        // Final failure — record in circuit breaker
        if (featureName) recordFailure(featureName, err.message, projectDir);

        log.error(`All retries exhausted for "${featureName || 'unknown'}"`, {
          attempts: attempt,
          error: err.message
        });

        return { ok: false, attempts: attempt, error: err.message };
      }

      // Calculate delay: baseDelay * 2^(attempt-1) + jitter
      const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = Math.random() * exponentialDelay * 0.1; // 10% jitter
      const delay = Math.round(exponentialDelay + jitter);

      log.warn(`Retry ${attempt}/${maxRetries} for "${featureName || 'unknown'}" in ${delay}ms`, {
        error: err.message
      });

      await sleep(delay);
    }
  }
}

/**
 * Create a retryable wrapper for a function.
 * @param {Function} fn
 * @param {object} options - Same as retryWithBackoff options
 * @returns {Function} Wrapped function with retry behavior
 */
export function withRetry(fn, options = {}) {
  return (...args) => retryWithBackoff(() => fn(...args), options);
}

/**
 * Calculate retry delay for display.
 * @param {number} attempt - Current attempt (1-based)
 * @param {number} [baseDelayMs=1000]
 * @returns {{ delay: number, schedule: string }}
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
