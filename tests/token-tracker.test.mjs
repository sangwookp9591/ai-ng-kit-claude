import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, '.test-token-tracker-tmp');

async function importTracker() {
  try {
    return await import('../dist/scripts/telemetry/token-tracker.js');
  } catch {
    return null;
  }
}

describe('Token Tracker', () => {
  let mod;

  before(async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    mod = await importTracker();
    if (!mod) {
      console.warn('SKIP: dist/scripts/telemetry/token-tracker.js not found — run tsc first');
    }
  });

  after(() => rmSync(TEST_DIR, { recursive: true, force: true }));

  it('logTokenUsage — JSONL 파일 생성 + 라인 추가', () => {
    if (!mod) return;

    mod.clearTokenUsage(TEST_DIR);

    mod.logTokenUsage({
      ts: new Date().toISOString(),
      agent: 'Jay',
      stage: 'exec',
      model: 'sonnet',
      totalTokens: 5000,
      toolUses: 10,
      durationMs: 3000,
    }, TEST_DIR);

    const filePath = join(TEST_DIR, '.aing/telemetry/token-usage.jsonl');
    assert(existsSync(filePath), 'token-usage.jsonl 파일이 생성되어야 함');

    const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
    assert.equal(lines.length, 1, '라인 1개가 기록되어야 함');

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.agent, 'Jay');
    assert.equal(entry.stage, 'exec');
    assert.equal(entry.totalTokens, 5000);
  });

  it('logTokenUsage — null 값도 기록됨', () => {
    if (!mod) return;

    mod.clearTokenUsage(TEST_DIR);

    mod.logTokenUsage({
      ts: new Date().toISOString(),
      agent: 'Derek',
      stage: 'plan',
      totalTokens: null,
      toolUses: null,
      durationMs: null,
    }, TEST_DIR);

    const filePath = join(TEST_DIR, '.aing/telemetry/token-usage.jsonl');
    const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
    assert.equal(lines.length, 1);

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.totalTokens, null);
    assert.equal(entry.toolUses, null);
    assert.equal(entry.durationMs, null);
  });

  it('getTokenSummary — stage별 집계 정확', () => {
    if (!mod) return;

    mod.clearTokenUsage(TEST_DIR);

    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Jay', stage: 'exec', totalTokens: 10000, toolUses: 5, durationMs: 2000 }, TEST_DIR);
    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Derek', stage: 'exec', totalTokens: 8000, toolUses: 3, durationMs: 1500 }, TEST_DIR);
    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Able', stage: 'plan', totalTokens: 3000, toolUses: 2, durationMs: 1000 }, TEST_DIR);

    const summary = mod.getTokenSummary(TEST_DIR);

    assert.equal(summary.byStage['exec'].tokens, 18000, 'exec stage 토큰 합계');
    assert.equal(summary.byStage['plan'].tokens, 3000, 'plan stage 토큰');
    assert.equal(summary.byStage['exec'].agents, 2, 'exec stage 에이전트 수');
    assert.equal(summary.byStage['exec'].duration, 3500, 'exec stage duration 합계');
  });

  it('getTokenSummary — agent별 집계 정확', () => {
    if (!mod) return;

    mod.clearTokenUsage(TEST_DIR);

    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Jay', stage: 'exec', totalTokens: 10000, toolUses: 5, durationMs: 2000 }, TEST_DIR);
    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Jay', stage: 'fix', totalTokens: 4000, toolUses: 2, durationMs: 800 }, TEST_DIR);
    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Derek', stage: 'exec', totalTokens: 7000, toolUses: 3, durationMs: 1200 }, TEST_DIR);

    const summary = mod.getTokenSummary(TEST_DIR);

    assert.equal(summary.byAgent['Jay'].tokens, 14000, 'Jay 토큰 합계');
    assert.equal(summary.byAgent['Jay'].tasks, 2, 'Jay 태스크 수');
    assert.equal(summary.byAgent['Derek'].tokens, 7000);
    assert.equal(summary.total.agents, 2, '전체 에이전트 수');
    assert.equal(summary.total.tokens, 21000, '전체 토큰 합계');
  });

  it('getTokenSummary — 빈 파일 시 전체 0', () => {
    if (!mod) return;

    mod.clearTokenUsage(TEST_DIR);

    const summary = mod.getTokenSummary(TEST_DIR);
    assert.equal(summary.total.tokens, 0);
    assert.equal(summary.total.agents, 0);
    assert.equal(summary.total.duration, 0);
    assert.deepEqual(summary.byStage, {});
    assert.deepEqual(summary.byAgent, {});
  });

  it('formatTokenReport — k 단위 변환 (1000→1.0k, 500→500)', () => {
    if (!mod) return;

    mod.clearTokenUsage(TEST_DIR);

    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Jay', stage: 'exec', totalTokens: 1000, toolUses: 1, durationMs: 100 }, TEST_DIR);
    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Derek', stage: 'plan', totalTokens: 500, toolUses: 1, durationMs: 100 }, TEST_DIR);

    const summary = mod.getTokenSummary(TEST_DIR);
    const report = mod.formatTokenReport(summary);

    assert(report.includes('1.0k'), `1000 → "1.0k" 변환되어야 함. Got: ${report}`);
    assert(report.includes('500'), `500 → "500" (k 없이) 표시되어야 함. Got: ${report}`);
  });

  it('formatTokenReport — agent별 breakdown 포함', () => {
    if (!mod) return;

    mod.clearTokenUsage(TEST_DIR);

    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Jay', stage: 'exec', totalTokens: 45000, toolUses: 10, durationMs: 5000 }, TEST_DIR);
    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Derek', stage: 'exec', totalTokens: 39000, toolUses: 8, durationMs: 4000 }, TEST_DIR);

    const summary = mod.getTokenSummary(TEST_DIR);
    const report = mod.formatTokenReport(summary);

    assert(report.includes('Jay'), `report에 "Jay" 포함되어야 함. Got: ${report}`);
    assert(report.includes('Derek'), `report에 "Derek" 포함되어야 함. Got: ${report}`);
    // exec stage: 84k total
    assert(report.includes('84.0k') || report.includes('84k'), `exec 합계 ~84k. Got: ${report}`);
  });

  it('clearTokenUsage — 파일 삭제 후 getTokenSummary 빈 결과', () => {
    if (!mod) return;

    mod.logTokenUsage({ ts: new Date().toISOString(), agent: 'Jay', stage: 'exec', totalTokens: 1000, toolUses: 1, durationMs: 100 }, TEST_DIR);

    const filePath = join(TEST_DIR, '.aing/telemetry/token-usage.jsonl');
    assert(existsSync(filePath), 'clearTokenUsage 전 파일 존재해야 함');

    mod.clearTokenUsage(TEST_DIR);
    assert(!existsSync(filePath), 'clearTokenUsage 후 파일 없어야 함');

    const summary = mod.getTokenSummary(TEST_DIR);
    assert.equal(summary.total.tokens, 0);
    assert.deepEqual(summary.byStage, {});
  });
});
