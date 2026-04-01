/**
 * Unit tests for checkSessionTokenLimit (token-tracker.ts) — Step 5
 * TDD: null limit, below limit, above limit, existing function stability
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// Use a real temp directory to test actual file I/O
let tmpDir;
function setupTmpDir() {
    const dir = join(tmpdir(), `aing-token-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    return dir;
}
function writeTelemetry(dir, entries) {
    const telDir = join(dir, '.aing', 'telemetry');
    mkdirSync(telDir, { recursive: true });
    const content = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    writeFileSync(join(telDir, 'token-usage.jsonl'), content);
}
import { checkSessionTokenLimit, logTokenUsage, getTokenSummary, } from '../../../scripts/telemetry/token-tracker.js';
// ── checkSessionTokenLimit — null limit ──────────────────────────────────────
describe('checkSessionTokenLimit — null limit', () => {
    it('returns exceeded=false when limit is null', () => {
        const result = checkSessionTokenLimit(null);
        expect(result.exceeded).toBe(false);
        expect(result.usage).toBe(0);
        expect(result.limit).toBeNull();
    });
});
// ── checkSessionTokenLimit — below limit ─────────────────────────────────────
describe('checkSessionTokenLimit — below limit', () => {
    it('returns exceeded=false when no telemetry data exists', () => {
        tmpDir = setupTmpDir();
        const result = checkSessionTokenLimit(1000, tmpDir);
        expect(result.exceeded).toBe(false);
        expect(result.usage).toBe(0);
        expect(result.limit).toBe(1000);
    });
    it('returns exceeded=false when usage < limit', () => {
        tmpDir = setupTmpDir();
        writeTelemetry(tmpDir, [
            { ts: new Date().toISOString(), agent: 'jay', stage: 'exec', totalTokens: 500, toolUses: 1, durationMs: 100 },
        ]);
        const result = checkSessionTokenLimit(1000, tmpDir);
        expect(result.exceeded).toBe(false);
        expect(result.usage).toBe(500);
    });
});
// ── checkSessionTokenLimit — exceeded ────────────────────────────────────────
describe('checkSessionTokenLimit — exceeded', () => {
    it('returns exceeded=true when usage > limit', () => {
        tmpDir = setupTmpDir();
        writeTelemetry(tmpDir, [
            { ts: new Date().toISOString(), agent: 'jay', stage: 'exec', totalTokens: 1500, toolUses: 1, durationMs: 100 },
        ]);
        const result = checkSessionTokenLimit(1000, tmpDir);
        expect(result.exceeded).toBe(true);
        expect(result.usage).toBe(1500);
        expect(result.limit).toBe(1000);
    });
    it('returns exceeded=true when usage is exactly at limit', () => {
        tmpDir = setupTmpDir();
        writeTelemetry(tmpDir, [
            { ts: new Date().toISOString(), agent: 'jay', stage: 'exec', totalTokens: 1000, toolUses: 0, durationMs: 50 },
        ]);
        // usage == limit: checkTokenLimit uses >=, so checkSessionTokenLimit should too
        const result = checkSessionTokenLimit(1000, tmpDir);
        expect(result.exceeded).toBe(true);
    });
    it('aggregates tokens across multiple entries', () => {
        tmpDir = setupTmpDir();
        writeTelemetry(tmpDir, [
            { ts: new Date().toISOString(), agent: 'jay', stage: 'exec', totalTokens: 800, toolUses: 1, durationMs: 100 },
            { ts: new Date().toISOString(), agent: 'milla', stage: 'verify', totalTokens: 300, toolUses: 1, durationMs: 50 },
        ]);
        const result = checkSessionTokenLimit(1000, tmpDir);
        expect(result.exceeded).toBe(true);
        expect(result.usage).toBe(1100);
    });
});
// ── existing functions remain stable ─────────────────────────────────────────
describe('logTokenUsage and getTokenSummary stability', () => {
    it('logTokenUsage still works after checkSessionTokenLimit is added', () => {
        tmpDir = setupTmpDir();
        expect(() => logTokenUsage({
            ts: new Date().toISOString(),
            agent: 'jay',
            stage: 'exec',
            totalTokens: 100,
            toolUses: 1,
            durationMs: 100,
        }, tmpDir)).not.toThrow();
    });
    it('getTokenSummary still works after checkSessionTokenLimit is added', () => {
        tmpDir = setupTmpDir();
        const summary = getTokenSummary(tmpDir);
        expect(summary).toHaveProperty('total');
        expect(summary).toHaveProperty('byStage');
        expect(summary).toHaveProperty('byAgent');
    });
});
//# sourceMappingURL=token-tracker-limit.test.js.map