/**
 * Unit tests for scripts/pdca/pdca-engine.ts
 * Covers: startPdca, advancePdca, getPdcaStatus, completePdca, resetPdca, getScalingProfile
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

let pdcaStore: Record<string, unknown> = {};

vi.mock('../../../scripts/core/state.js', () => ({
  readState: vi.fn((path: string) => {
    if (pdcaStore[path]) return { ok: true, data: pdcaStore[path] };
    return { ok: false, error: 'File not found' };
  }),
  readStateOrDefault: vi.fn((path: string, defaultVal: unknown) => {
    return pdcaStore[path] ?? JSON.parse(JSON.stringify(defaultVal));
  }),
  writeState: vi.fn((path: string, data: unknown) => {
    pdcaStore[path] = JSON.parse(JSON.stringify(data));
    return { ok: true };
  }),
}));

vi.mock('../../../scripts/core/config.js', () => ({
  loadConfig: vi.fn(() => ({})),
  getConfig: vi.fn((path: string, fallback: unknown) => {
    if (path === 'pdca.matchRateThreshold') return 90;
    if (path === 'pdca.maxIterations') return 5;
    return fallback;
  }),
  resetConfigCache: vi.fn(),
}));

vi.mock('../../../scripts/core/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  })),
}));

vi.mock('../../../scripts/core/norch-bridge.js', () => ({
  norchPdcaChange: vi.fn(),
}));

import {
  startPdca,
  advancePdca,
  getPdcaStatus,
  completePdca,
  resetPdca,
  getScalingProfile,
  STAGES,
  STAGE_DESCRIPTIONS,
} from '../../../scripts/pdca/pdca-engine.js';

const STATE_PATH = '/tmp/pdca-test/.aing/state/pdca-status.json';

beforeEach(() => {
  vi.clearAllMocks();
  pdcaStore = {};
});

// ── STAGES & STAGE_DESCRIPTIONS ──────────────────────────────────────────

describe('STAGES & STAGE_DESCRIPTIONS', () => {
  it('has 5 stages', () => {
    expect(STAGES).toEqual(['plan', 'do', 'check', 'act', 'review']);
  });

  it('each stage has ko, en descriptions and next pointer', () => {
    for (const stage of STAGES) {
      const desc = STAGE_DESCRIPTIONS[stage];
      expect(desc.ko.length).toBeGreaterThan(0);
      expect(desc.en.length).toBeGreaterThan(0);
    }
  });

  it('plan -> do -> check -> act -> review -> null', () => {
    expect(STAGE_DESCRIPTIONS['plan'].next).toBe('do');
    expect(STAGE_DESCRIPTIONS['do'].next).toBe('check');
    expect(STAGE_DESCRIPTIONS['check'].next).toBe('act');
    expect(STAGE_DESCRIPTIONS['act'].next).toBe('review');
    expect(STAGE_DESCRIPTIONS['review'].next).toBeNull();
  });
});

// ── startPdca ────────────────────────────────────────────────────────────

describe('startPdca', () => {
  it('creates new feature at plan stage', () => {
    const result = startPdca('login', undefined, '/tmp/pdca-test');

    expect(result.ok).toBe(true);
    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string; iteration: number }>;
    expect(features['login'].currentStage).toBe('plan');
    expect(features['login'].iteration).toBe(0);
  });

  it('sets activeFeature', () => {
    startPdca('auth', undefined, '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    expect(state.activeFeature).toBe('auth');
  });

  it('fails when feature already exists', () => {
    startPdca('dup', undefined, '/tmp/pdca-test');
    const result = startPdca('dup', undefined, '/tmp/pdca-test');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('applies scaling profile when complexityScore provided', () => {
    startPdca('complex', 8, '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { scalingProfile: { level: string }; maxIterations: number }>;
    expect(features['complex'].scalingProfile.level).toBe('high');
    expect(features['complex'].maxIterations).toBe(3);
  });

  it('handles backward compat (string as projectDir)', () => {
    const result = startPdca('bc-test', '/tmp/pdca-test' as unknown as number);
    expect(result.ok).toBe(true);
  });

  it('records history entry', () => {
    startPdca('hist', undefined, '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { history: Array<{ stage: string; action: string }> }>;
    expect(features['hist'].history).toHaveLength(1);
    expect(features['hist'].history[0].stage).toBe('plan');
    expect(features['hist'].history[0].action).toBe('started');
  });
});

// ── advancePdca — normal flow ────────────────────────────────────────────

describe('advancePdca — normal flow', () => {
  beforeEach(() => {
    startPdca('flow', undefined, '/tmp/pdca-test');
  });

  it('advances plan → do', () => {
    const result = advancePdca('flow', undefined, '/tmp/pdca-test');
    expect(result.ok).toBe(true);

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string }>;
    expect(features['flow'].currentStage).toBe('do');
  });

  it('advances do → check', () => {
    advancePdca('flow', undefined, '/tmp/pdca-test'); // plan→do
    advancePdca('flow', undefined, '/tmp/pdca-test'); // do→check

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string }>;
    expect(features['flow'].currentStage).toBe('check');
  });

  it('fails for unknown feature', () => {
    const result = advancePdca('nonexistent', undefined, '/tmp/pdca-test');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
  });
});

// ── advancePdca — check stage iteration ──────────────────────────────────

describe('advancePdca — check stage iteration', () => {
  beforeEach(() => {
    startPdca('iter', undefined, '/tmp/pdca-test');
    advancePdca('iter', undefined, '/tmp/pdca-test'); // plan→do
    advancePdca('iter', undefined, '/tmp/pdca-test'); // do→check
  });

  it('iterates back to act when matchRate < threshold', () => {
    advancePdca('iter', { matchRate: 50 }, '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string; iteration: number }>;
    expect(features['iter'].currentStage).toBe('act');
    expect(features['iter'].iteration).toBe(1);
  });

  it('advances to review when matchRate >= threshold (90)', () => {
    advancePdca('iter', { matchRate: 95 }, '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string }>;
    expect(features['iter'].currentStage).toBe('review');
  });

  it('advances to review when matchRate is undefined (pass assumed)', () => {
    advancePdca('iter', undefined, '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string }>;
    expect(features['iter'].currentStage).toBe('review');
  });

  it('act loops back to do', () => {
    advancePdca('iter', { matchRate: 50 }, '/tmp/pdca-test'); // check→act (iterate)
    advancePdca('iter', undefined, '/tmp/pdca-test'); // act→do

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string }>;
    expect(features['iter'].currentStage).toBe('do');
  });

  it('stops iterating at max iterations and goes to review', () => {
    // Set max iterations to 1 via scaling profile
    startPdca('maxiter', 2, '/tmp/pdca-test'); // low complexity → maxIterations=1
    advancePdca('maxiter', undefined, '/tmp/pdca-test'); // plan→do
    advancePdca('maxiter', undefined, '/tmp/pdca-test'); // do→check

    // First iteration
    advancePdca('maxiter', { matchRate: 50 }, '/tmp/pdca-test'); // check→act (iter 1)
    advancePdca('maxiter', undefined, '/tmp/pdca-test'); // act→do
    advancePdca('maxiter', undefined, '/tmp/pdca-test'); // do→check

    // At max iterations, should go to review even with low matchRate
    advancePdca('maxiter', { matchRate: 50 }, '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string }>;
    expect(features['maxiter'].currentStage).toBe('review');
  });
});

// ── advancePdca — final stage ────────────────────────────────────────────

describe('advancePdca — final stage', () => {
  it('fails when already at review (no next)', () => {
    startPdca('final', undefined, '/tmp/pdca-test');
    advancePdca('final', undefined, '/tmp/pdca-test'); // plan→do
    advancePdca('final', undefined, '/tmp/pdca-test'); // do→check
    advancePdca('final', undefined, '/tmp/pdca-test'); // check→review (matchRate undefined)

    const result = advancePdca('final', undefined, '/tmp/pdca-test');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('final stage');
  });
});

// ── getPdcaStatus ────────────────────────────────────────────────────────

describe('getPdcaStatus', () => {
  it('returns null when no state exists', () => {
    expect(getPdcaStatus('nonexistent', '/tmp/pdca-test')).toBeNull();
  });

  it('returns feature status when specified', () => {
    startPdca('status-test', undefined, '/tmp/pdca-test');

    const status = getPdcaStatus('status-test', '/tmp/pdca-test') as unknown as Record<string, unknown>;
    expect(status).not.toBeNull();
    expect(status.currentStage).toBe('plan');
  });

  it('returns full state when no feature specified', () => {
    startPdca('a', undefined, '/tmp/pdca-test');
    startPdca('b', undefined, '/tmp/pdca-test');

    const state = getPdcaStatus(undefined, '/tmp/pdca-test') as unknown as Record<string, unknown>;
    expect(state).not.toBeNull();
    expect(state.features).toBeDefined();
  });
});

// ── completePdca ─────────────────────────────────────────────────────────

describe('completePdca', () => {
  it('marks feature as completed', () => {
    startPdca('done', undefined, '/tmp/pdca-test');
    const result = completePdca('done', '/tmp/pdca-test');

    expect(result.ok).toBe(true);
    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { currentStage: string; completedAt: string }>;
    expect(features['done'].currentStage).toBe('completed');
    expect(features['done'].completedAt).toBeDefined();
  });

  it('clears activeFeature', () => {
    startPdca('active', undefined, '/tmp/pdca-test');
    completePdca('active', '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    expect(state.activeFeature).toBeNull();
  });

  it('fails for unknown feature', () => {
    startPdca('x', undefined, '/tmp/pdca-test');
    const result = completePdca('nonexistent', '/tmp/pdca-test');
    expect(result.ok).toBe(false);
  });

  it('records completed history entry', () => {
    startPdca('hist-done', undefined, '/tmp/pdca-test');
    completePdca('hist-done', '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, { history: Array<{ stage: string; action: string }> }>;
    const last = features['hist-done'].history.at(-1)!;
    expect(last.stage).toBe('completed');
    expect(last.action).toBe('finished');
  });
});

// ── resetPdca ────────────────────────────────────────────────────────────

describe('resetPdca', () => {
  it('removes feature from state', () => {
    startPdca('remove-me', undefined, '/tmp/pdca-test');
    const result = resetPdca('remove-me', '/tmp/pdca-test');

    expect(result.ok).toBe(true);
    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    const features = state.features as Record<string, unknown>;
    expect(features['remove-me']).toBeUndefined();
  });

  it('clears activeFeature if it matches', () => {
    startPdca('active-reset', undefined, '/tmp/pdca-test');
    resetPdca('active-reset', '/tmp/pdca-test');

    const state = pdcaStore[STATE_PATH] as Record<string, unknown>;
    expect(state.activeFeature).toBeNull();
  });
});

// ── getScalingProfile ────────────────────────────────────────────────────

describe('getScalingProfile', () => {
  it('returns low profile for score <= 3', () => {
    const profile = getScalingProfile(2);
    expect(profile.level).toBe('low');
    expect(profile.maxIterations).toBe(1);
    expect(profile.reviewTier).toBe('milla-only');
    expect(profile.reviewers).toEqual(['milla']);
    expect(profile.evidenceRequired).toEqual(['test']);
  });

  it('returns mid profile for score 4-7', () => {
    const profile = getScalingProfile(5);
    expect(profile.level).toBe('mid');
    expect(profile.maxIterations).toBe(2);
    expect(profile.reviewTier).toBe('eng-design');
    expect(profile.reviewers).toContain('milla');
    expect(profile.reviewers).toContain('willji');
    expect(profile.evidenceRequired).toContain('test');
    expect(profile.evidenceRequired).toContain('build');
  });

  it('returns high profile for score >= 8', () => {
    const profile = getScalingProfile(10);
    expect(profile.level).toBe('high');
    expect(profile.maxIterations).toBe(3);
    expect(profile.reviewTier).toBe('full-pipeline');
    expect(profile.reviewers).toHaveLength(4);
    expect(profile.evidenceRequired).toContain('security');
  });

  it('boundary: score=3 is low', () => {
    expect(getScalingProfile(3).level).toBe('low');
  });

  it('boundary: score=7 is mid', () => {
    expect(getScalingProfile(7).level).toBe('mid');
  });

  it('boundary: score=8 is high', () => {
    expect(getScalingProfile(8).level).toBe('high');
  });
});
