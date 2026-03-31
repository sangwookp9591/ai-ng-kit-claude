/**
 * Unit tests for scripts/recovery/retry-engine.ts
 * Covers: retryWithBackoff, withRetry, getRetrySchedule
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../../scripts/core/logger.js', () => ({
    createLogger: vi.fn(() => ({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    })),
}));
vi.mock('../../../scripts/recovery/circuit-breaker.js', () => ({
    recordFailure: vi.fn(),
    isCircuitOpen: vi.fn(() => false),
    recordSuccess: vi.fn(),
}));
import { retryWithBackoff, withRetry, getRetrySchedule, } from '../../../scripts/recovery/retry-engine.js';
import { isCircuitOpen, recordFailure, recordSuccess } from '../../../scripts/recovery/circuit-breaker.js';
const mockIsCircuitOpen = vi.mocked(isCircuitOpen);
const mockRecordFailure = vi.mocked(recordFailure);
const mockRecordSuccess = vi.mocked(recordSuccess);
beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
});
// ── retryWithBackoff — success ───────────────────────────────────────────
describe('retryWithBackoff — success', () => {
    it('returns result on first attempt success', async () => {
        const fn = vi.fn().mockResolvedValue(42);
        const result = await retryWithBackoff(fn);
        expect(result.ok).toBe(true);
        expect(result.result).toBe(42);
        expect(result.attempts).toBe(1);
        expect(fn).toHaveBeenCalledTimes(1);
    });
    it('records success on circuit breaker when featureName is set', async () => {
        const fn = vi.fn().mockResolvedValue('ok');
        await retryWithBackoff(fn, { featureName: 'test-feature', projectDir: '/tmp/p' });
        expect(mockRecordSuccess).toHaveBeenCalledWith('test-feature', '/tmp/p');
    });
    it('does not record on circuit breaker when no featureName', async () => {
        const fn = vi.fn().mockResolvedValue('ok');
        await retryWithBackoff(fn);
        expect(mockRecordSuccess).not.toHaveBeenCalled();
    });
});
// ── retryWithBackoff — retries ───────────────────────────────────────────
describe('retryWithBackoff — retries', () => {
    it('retries on failure and succeeds on second attempt', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('fail-1'))
            .mockResolvedValue('success');
        const result = await retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 });
        expect(result.ok).toBe(true);
        expect(result.result).toBe('success');
        expect(result.attempts).toBe(2);
        expect(fn).toHaveBeenCalledTimes(2);
    });
    it('retries up to maxRetries and then fails', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('always-fail'));
        const result = await retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 });
        expect(result.ok).toBe(false);
        expect(result.attempts).toBe(3); // 1 initial + 2 retries
        expect(result.error).toBe('always-fail');
        expect(fn).toHaveBeenCalledTimes(3);
    });
    it('records failure on circuit breaker after exhausting retries', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('permanent-fail'));
        await retryWithBackoff(fn, {
            maxRetries: 1,
            baseDelayMs: 10,
            featureName: 'broken',
            projectDir: '/tmp/p',
        });
        expect(mockRecordFailure).toHaveBeenCalledWith('broken', 'permanent-fail', '/tmp/p');
    });
    it('with maxRetries=0 only tries once', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'));
        const result = await retryWithBackoff(fn, { maxRetries: 0, baseDelayMs: 10 });
        expect(result.ok).toBe(false);
        expect(result.attempts).toBe(1);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
// ── retryWithBackoff — circuit breaker ───────────────────────────────────
describe('retryWithBackoff — circuit breaker', () => {
    it('skips execution when circuit is open', async () => {
        mockIsCircuitOpen.mockReturnValue(true);
        const fn = vi.fn().mockResolvedValue('should not run');
        const result = await retryWithBackoff(fn, { featureName: 'broken-service' });
        expect(result.ok).toBe(false);
        expect(result.attempts).toBe(0);
        expect(result.error).toContain('Circuit breaker OPEN');
        expect(result.error).toContain('broken-service');
        expect(fn).not.toHaveBeenCalled();
    });
    it('proceeds when circuit is closed', async () => {
        mockIsCircuitOpen.mockReturnValue(false);
        const fn = vi.fn().mockResolvedValue('ok');
        const result = await retryWithBackoff(fn, { featureName: 'healthy-service' });
        expect(result.ok).toBe(true);
        expect(fn).toHaveBeenCalled();
    });
});
// ── getRetrySchedule ─────────────────────────────────────────────────────
describe('getRetrySchedule', () => {
    it('returns correct delay for attempt 1 with default base', () => {
        const schedule = getRetrySchedule(1);
        expect(schedule.delay).toBe(1000);
        expect(schedule.schedule).toBe('1: 1000ms');
    });
    it('returns exponential delays for 3 attempts', () => {
        const schedule = getRetrySchedule(3);
        expect(schedule.schedule).toBe('1: 1000ms → 2: 2000ms → 3: 4000ms');
        expect(schedule.delay).toBe(4000);
    });
    it('caps delay at 16000ms', () => {
        const schedule = getRetrySchedule(5);
        // 1000, 2000, 4000, 8000, 16000
        expect(schedule.delay).toBe(16000);
        expect(schedule.schedule).toContain('16000ms');
    });
    it('respects custom baseDelayMs', () => {
        const schedule = getRetrySchedule(2, 500);
        expect(schedule.schedule).toBe('1: 500ms → 2: 1000ms');
    });
    it('caps at 16000ms even with large base', () => {
        const schedule = getRetrySchedule(3, 10000);
        // 10000, 16000 (capped), 16000 (capped)
        expect(schedule.delay).toBe(16000);
    });
});
// ── withRetry ────────────────────────────────────────────────────────────
describe('withRetry', () => {
    it('wraps a function with retry behavior', async () => {
        const original = vi.fn().mockResolvedValue('result');
        const wrapped = withRetry(original, { maxRetries: 2, baseDelayMs: 10 });
        const result = await wrapped('arg1', 'arg2');
        expect(result.ok).toBe(true);
        expect(result.result).toBe('result');
        expect(original).toHaveBeenCalledWith('arg1', 'arg2');
    });
    it('wrapped function retries on failure', async () => {
        const original = vi.fn()
            .mockRejectedValueOnce(new Error('temp'))
            .mockResolvedValue('ok');
        const wrapped = withRetry(original, { maxRetries: 2, baseDelayMs: 10 });
        const result = await wrapped();
        expect(result.ok).toBe(true);
        expect(result.attempts).toBe(2);
    });
});
//# sourceMappingURL=retry-engine.test.js.map