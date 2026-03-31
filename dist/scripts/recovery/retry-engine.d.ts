/**
 * aing Retry Engine v1.3.0
 * Exponential backoff with jitter for automatic retries.
 * @module scripts/recovery/retry-engine
 */
interface RetryOptions {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    featureName?: string;
    projectDir?: string;
}
interface RetryResult<T> {
    ok: boolean;
    result?: T;
    attempts: number;
    error?: string;
}
interface RetrySchedule {
    delay: number;
    schedule: string;
}
/**
 * Execute a function with exponential backoff retry.
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<RetryResult<T>>;
/**
 * Create a retryable wrapper for a function.
 */
export declare function withRetry<T>(fn: (...args: unknown[]) => Promise<T>, options?: RetryOptions): (...args: unknown[]) => Promise<RetryResult<T>>;
/**
 * Calculate retry delay for display.
 */
export declare function getRetrySchedule(attempt: number, baseDelayMs?: number): RetrySchedule;
export {};
//# sourceMappingURL=retry-engine.d.ts.map