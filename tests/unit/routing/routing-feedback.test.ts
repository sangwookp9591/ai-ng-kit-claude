/**
 * Unit tests for routing feedback loop
 * Covers: recordRouting atomic write, getSuccessRate (route/model/agent),
 *         adjustConfidence formula, cold-start protection, confidence range
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock state module ───────────────────────────────────────────────────────

const { mockUpdateState, mockReadState, mockCacheInvalidate } = vi.hoisted(() => ({
  mockUpdateState: vi.fn(),
  mockReadState: vi.fn(),
  mockCacheInvalidate: vi.fn(),
}));

vi.mock('../../../scripts/core/state.js', () => ({
  updateState: mockUpdateState,
  readState: mockReadState,
  cacheInvalidate: mockCacheInvalidate,
}));

vi.mock('../../../scripts/core/config.js', () => ({
  getConfig: vi.fn((_key: string, defaultVal: unknown) => defaultVal),
}));

import {
  recordRouting,
  getSuccessRate,
  adjustConfidence,
} from '../../../scripts/routing/routing-history.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHistory(entries: Array<{ route?: string; model?: string; agent?: string; outcome: 'success' | 'fail' }>) {
  return entries.map((e, i) => ({
    agent: e.agent ?? 'executor',
    model: e.model ?? 'sonnet',
    intent: 'test',
    complexity: {},
    outcome: e.outcome,
    route: e.route,
    ts: new Date(i * 1000).toISOString(),
  }));
}

// ─── recordRouting — atomic write ────────────────────────────────────────────

describe('recordRouting — atomic updateState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateState.mockReturnValue({ ok: true, data: [] });
  });

  it('updateState()를 사용하여 atomic write를 수행한다', () => {
    recordRouting({ agent: 'executor', model: 'sonnet', intent: 'fix bug', complexity: {}, outcome: 'success', route: 'debug' });
    expect(mockUpdateState).toHaveBeenCalledOnce();
    // readState/writeState 직접 호출이 없어야 함
    expect(mockReadState).not.toHaveBeenCalled();
  });

  it('mutator가 entry를 배열에 추가하고 retention 제한을 적용한다', () => {
    mockUpdateState.mockImplementation((_path, _default, mutator) => {
      const existing = makeHistory(Array.from({ length: 50 }, () => ({ outcome: 'success' as const })));
      const result = mutator(existing);
      return { ok: true, data: result };
    });

    recordRouting({ agent: 'executor', model: 'sonnet', intent: 'new task', complexity: {}, outcome: 'success', route: 'debug' });
    expect(mockUpdateState).toHaveBeenCalledOnce();
    // mutator가 호출되어 결과가 반환됨을 확인
    const [, , mutator] = mockUpdateState.mock.calls[0];
    const input = makeHistory(Array.from({ length: 50 }, () => ({ outcome: 'success' as const })));
    const output = mutator(input);
    // retention=50 → 기존 50 + 1 new = 51 → slice(-50) = 50
    expect(output).toHaveLength(50);
  });

  it('updateState 실패 시 ok=false를 반환한다', () => {
    mockUpdateState.mockReturnValue({ ok: false, error: 'lock timeout' });
    const result = recordRouting({ agent: 'executor', model: 'sonnet', intent: 'test', complexity: {}, outcome: 'fail', route: 'auto' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('lock timeout');
  });

  it('빈 배열로 시작할 때 첫 항목이 추가된다', () => {
    mockUpdateState.mockImplementation((_path, _default, mutator) => {
      const result = mutator([]);
      return { ok: true, data: result };
    });

    recordRouting({ agent: 'executor', model: 'sonnet', intent: 'task', complexity: {}, outcome: 'success', route: 'auto' });
    const [, , mutator] = mockUpdateState.mock.calls[0];
    const output = mutator([]);
    expect(output).toHaveLength(1);
    expect(output[0].outcome).toBe('success');
    expect(output[0].ts).toBeDefined();
  });
});

// ─── getSuccessRate — route 기준 ──────────────────────────────────────────────

describe('getSuccessRate — route 기준', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setHistory(entries: Array<{ route?: string; outcome: 'success' | 'fail' }>) {
    mockReadState.mockReturnValue({ ok: true, data: makeHistory(entries) });
  }

  it('성공률 100%: 모든 항목 success', () => {
    setHistory([
      { route: 'debug', outcome: 'success' },
      { route: 'debug', outcome: 'success' },
      { route: 'debug', outcome: 'success' },
    ]);
    const result = getSuccessRate('debug');
    expect(result.total).toBe(3);
    expect(result.success).toBe(3);
    expect(result.rate).toBe(1);
  });

  it('성공률 0%: 모든 항목 fail', () => {
    setHistory([
      { route: 'debug', outcome: 'fail' },
      { route: 'debug', outcome: 'fail' },
    ]);
    const result = getSuccessRate('debug');
    expect(result.total).toBe(2);
    expect(result.success).toBe(0);
    expect(result.rate).toBe(0);
  });

  it('성공률 50%: 절반 success', () => {
    setHistory([
      { route: 'auto', outcome: 'success' },
      { route: 'auto', outcome: 'fail' },
      { route: 'auto', outcome: 'success' },
      { route: 'auto', outcome: 'fail' },
    ]);
    const result = getSuccessRate('auto');
    expect(result.total).toBe(4);
    expect(result.success).toBe(2);
    expect(result.rate).toBe(0.5);
  });

  it('히스토리 없음: total=0, rate=0', () => {
    mockReadState.mockReturnValue({ ok: false, error: 'not found' });
    const result = getSuccessRate('unknown-route');
    expect(result.total).toBe(0);
    expect(result.rate).toBe(0);
  });

  it('다른 route 항목은 필터링됨', () => {
    setHistory([
      { route: 'debug', outcome: 'success' },
      { route: 'auto', outcome: 'fail' },
      { route: 'debug', outcome: 'success' },
    ]);
    const debugRate = getSuccessRate('debug');
    expect(debugRate.total).toBe(2);
    expect(debugRate.rate).toBe(1);

    const autoRate = getSuccessRate('auto');
    expect(autoRate.total).toBe(1);
    expect(autoRate.rate).toBe(0);
  });

  it('캐시 바이패스를 위해 cacheInvalidate를 호출한다', () => {
    mockReadState.mockReturnValue({ ok: true, data: [] });
    getSuccessRate('debug');
    expect(mockCacheInvalidate).toHaveBeenCalledOnce();
  });
});

// ─── getSuccessRate — model/agent 기준 ───────────────────────────────────────

describe('getSuccessRate — model/agent 기준', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('model 필터만 적용 (agent 없음)', () => {
    mockReadState.mockReturnValue({
      ok: true,
      data: makeHistory([
        { model: 'sonnet', agent: 'executor', outcome: 'success' },
        { model: 'haiku', agent: 'explore', outcome: 'fail' },
        { model: 'sonnet', agent: 'debugger', outcome: 'success' },
      ]),
    });
    const result = getSuccessRate('sonnet', 'executor');
    expect(result.total).toBe(1);
    expect(result.rate).toBe(1);
  });

  it('model + agent 모두 필터', () => {
    mockReadState.mockReturnValue({
      ok: true,
      data: makeHistory([
        { model: 'sonnet', agent: 'executor', outcome: 'success' },
        { model: 'sonnet', agent: 'debugger', outcome: 'fail' },
      ]),
    });
    const result = getSuccessRate('sonnet', 'executor');
    expect(result.total).toBe(1);
    expect(result.success).toBe(1);
  });
});

// ─── adjustConfidence — 공식 및 범위 검증 ────────────────────────────────────

describe('adjustConfidence — 공식 및 범위', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setRouteHistory(route: string, entries: Array<{ outcome: 'success' | 'fail' }>) {
    mockReadState.mockReturnValue({
      ok: true,
      data: makeHistory(entries.map(e => ({ route, outcome: e.outcome }))),
    });
  }

  // 콜드 스타트
  it('콜드 스타트(total < 5): base confidence 그대로 반환', () => {
    setRouteHistory('debug', [
      { outcome: 'success' },
      { outcome: 'success' },
    ]);
    expect(adjustConfidence(0.90, 'debug')).toBe(0.90);
  });

  it('콜드 스타트(total = 4): base confidence 그대로 반환', () => {
    setRouteHistory('auto', [
      { outcome: 'success' },
      { outcome: 'success' },
      { outcome: 'fail' },
      { outcome: 'fail' },
    ]);
    expect(adjustConfidence(0.80, 'auto')).toBe(0.80);
  });

  // rate = 0 (0% 성공률, total >= 5)
  it('rate=0%: base * 0.875 (하한)', () => {
    setRouteHistory('debug', Array.from({ length: 5 }, () => ({ outcome: 'fail' as const })));
    const base = 0.90;
    const result = adjustConfidence(base, 'debug');
    // formula: base * (1 + 0.25 * (0 - 0.5)) = base * 0.875
    expect(result).toBeCloseTo(base * 0.875, 5);
  });

  // rate = 50% (중립)
  it('rate=50%: base 그대로 (조정 없음)', () => {
    setRouteHistory('auto', [
      { outcome: 'success' },
      { outcome: 'fail' },
      { outcome: 'success' },
      { outcome: 'fail' },
      { outcome: 'success' },
      { outcome: 'fail' },
    ]);
    const base = 0.85;
    const result = adjustConfidence(base, 'auto');
    // formula: base * (1 + 0.25 * (0.5 - 0.5)) = base * 1.0
    expect(result).toBeCloseTo(base, 5);
  });

  // rate = 100% (100% 성공률)
  it('rate=100%: base * 1.125 (상한)', () => {
    setRouteHistory('debug', Array.from({ length: 6 }, () => ({ outcome: 'success' as const })));
    const base = 0.90;
    const result = adjustConfidence(base, 'debug');
    // formula: base * (1 + 0.25 * (1.0 - 0.5)) = base * 1.125
    expect(result).toBeCloseTo(base * 1.125, 5);
  });

  // 범위 검증: [0.875*base, 1.125*base]
  it('조정값이 [0.875*base, 1.125*base] 범위 내에 있음', () => {
    const base = 0.80;
    const rates = [0, 0.25, 0.5, 0.75, 1.0];

    rates.forEach(rate => {
      const successCount = Math.round(rate * 10);
      const entries = [
        ...Array.from({ length: successCount }, () => ({ outcome: 'success' as const })),
        ...Array.from({ length: 10 - successCount }, () => ({ outcome: 'fail' as const })),
      ];
      setRouteHistory('test-route', entries);

      const result = adjustConfidence(base, 'test-route');
      expect(result).toBeGreaterThanOrEqual(base * 0.875 - 1e-9);
      expect(result).toBeLessThanOrEqual(base * 1.125 + 1e-9);
    });
  });

  it('히스토리 없음(cold start): base 그대로 반환', () => {
    mockReadState.mockReturnValue({ ok: false, error: 'not found' });
    expect(adjustConfidence(0.75, 'unknown')).toBe(0.75);
  });
});
