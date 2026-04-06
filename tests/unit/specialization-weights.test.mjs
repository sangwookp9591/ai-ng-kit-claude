import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  scoreSpecialization,
  recommendAgent,
  normalizeWeights,
  loadWeightsStore,
  saveWeightsStore,
  getWeightsForDomain,
  updateWeightsFromFeedback,
} from '../../dist/scripts/agent-intelligence/specialization-scorer.js';

/** @returns {import('../../dist/scripts/agent-intelligence/feedback-loop.js').AgentPerformance} */
function makePerf(agent, { totalTasks = 0, completionRate = 0, avgReviewScore = 0, domains = {} } = {}) {
  return { agent, totalTasks, completionRate, avgReviewScore, domains };
}

const TMP_DIR = join(import.meta.dirname ?? '.', '__tmp_weights_test__');

describe('normalizeWeights', () => {
  it('정규화 — 합이 1.0이 된다', () => {
    const w = normalizeWeights({ completionRate: 0.4, avgReviewScore: 0.4, domainExperience: 0.2 });
    const sum = w.completionRate + w.avgReviewScore + w.domainExperience;
    assert.ok(Math.abs(sum - 1.0) < 1e-10, `sum should be 1.0, got ${sum}`);
  });

  it('음수 가중치 → Math.max(w, 0.01)로 클램핑 후 정규화', () => {
    const w = normalizeWeights({ completionRate: -0.5, avgReviewScore: 0.8, domainExperience: 0.2 });
    // After clamping: 0.01, 0.8, 0.2 → sum=1.01 → normalized
    assert.ok(w.completionRate > 0, `completionRate should be > 0, got ${w.completionRate}`);
    assert.ok(w.avgReviewScore > 0);
    assert.ok(w.domainExperience > 0);
    // The clamped value (0.01) stays small relative to others
    assert.ok(w.completionRate < w.avgReviewScore, 'negative-clamped weight should be smallest');
    const sum = w.completionRate + w.avgReviewScore + w.domainExperience;
    assert.ok(Math.abs(sum - 1.0) < 1e-10, `sum should be 1.0, got ${sum}`);
  });

  it('모든 가중치가 음수여도 합이 1.0', () => {
    const w = normalizeWeights({ completionRate: -1, avgReviewScore: -2, domainExperience: -3 });
    const sum = w.completionRate + w.avgReviewScore + w.domainExperience;
    assert.ok(Math.abs(sum - 1.0) < 1e-10);
    // All clamped to 0.01 → equal distribution
    assert.ok(Math.abs(w.completionRate - w.avgReviewScore) < 1e-10);
  });
});

describe('scoreSpecialization with adaptive weights', () => {
  it('기본 가중치로 기존 공식과 동일 결과', () => {
    const perf = makePerf('builder', {
      totalTasks: 10,
      completionRate: 80,
      avgReviewScore: 90,
      domains: { build: 5, general: 5 },
    });
    const spec = scoreSpecialization(perf, 'build');
    // domainExperience = 50, score = 80*0.4 + 90*0.4 + 50*0.2 = 78
    assert.strictEqual(spec.score, 78);
  });

  it('커스텀 가중치 적용 — domainExperience 중심', () => {
    const perf = makePerf('domain-expert', {
      totalTasks: 10,
      completionRate: 50,
      avgReviewScore: 50,
      domains: { build: 10 },
    });
    const weights = { completionRate: 0.1, avgReviewScore: 0.1, domainExperience: 0.8 };
    const spec = scoreSpecialization(perf, 'build', weights);
    // domainExperience = 100
    // score = 50*0.1 + 50*0.1 + 100*0.8 = 5 + 5 + 80 = 90
    assert.strictEqual(spec.score, 90);
  });

  it('점수 범위 [0, 100] 보장', () => {
    const perf = makePerf('max-agent', {
      totalTasks: 10,
      completionRate: 100,
      avgReviewScore: 100,
      domains: { build: 10 },
    });
    const spec = scoreSpecialization(perf, 'build');
    assert.ok(spec.score >= 0, `score should be >= 0, got ${spec.score}`);
    assert.ok(spec.score <= 100, `score should be <= 100, got ${spec.score}`);

    const specZero = scoreSpecialization(makePerf('zero-agent'), 'build');
    assert.ok(specZero.score >= 0, `score should be >= 0, got ${specZero.score}`);
    assert.ok(specZero.score <= 100, `score should be <= 100, got ${specZero.score}`);
  });

  it('totalTasks = 0 → cold-start, score = 0, confidence = 0', () => {
    const spec = scoreSpecialization(makePerf('new'), 'build');
    assert.strictEqual(spec.score, 0);
    assert.strictEqual(spec.confidence, 0);
  });
});

describe('recommendAgent deterministic tie-breaking', () => {
  it('동점 시 confidence → agent name 순서로 결정론적 정렬', () => {
    const performances = [
      makePerf('zulu', { totalTasks: 10, completionRate: 80, avgReviewScore: 90, domains: { build: 5 } }),
      makePerf('alpha', { totalTasks: 10, completionRate: 80, avgReviewScore: 90, domains: { build: 5 } }),
      makePerf('mike', { totalTasks: 10, completionRate: 80, avgReviewScore: 90, domains: { build: 5 } }),
    ];
    const result = recommendAgent(performances, 'build');
    // Same score, same confidence → sorted by agent name ascending
    assert.strictEqual(result[0].agent, 'alpha');
    assert.strictEqual(result[1].agent, 'mike');
    assert.strictEqual(result[2].agent, 'zulu');
  });

  it('동점 + confidence 차이 → confidence 우선', () => {
    const performances = [
      makePerf('low-conf', { totalTasks: 5, completionRate: 80, avgReviewScore: 90, domains: { build: 3 } }),
      makePerf('high-conf', { totalTasks: 10, completionRate: 80, avgReviewScore: 90, domains: { build: 6 } }),
    ];
    // low-conf: domainExp=60 → 80*0.4+90*0.4+60*0.2 = 80
    // high-conf: domainExp=60 → 80*0.4+90*0.4+60*0.2 = 80
    // Same score → confidence: high-conf(100) > low-conf(50)
    const result = recommendAgent(performances, 'build');
    assert.strictEqual(result[0].agent, 'high-conf');
    assert.strictEqual(result[1].agent, 'low-conf');
  });
});

describe('weights persistence', () => {
  beforeEach(() => {
    mkdirSync(join(TMP_DIR, '.aing', 'state'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it('저장 후 로드하면 동일한 데이터', () => {
    const store = {
      version: 1,
      domains: {
        build: {
          domain: 'build',
          weights: { completionRate: 0.5, avgReviewScore: 0.3, domainExperience: 0.2 },
          updatedAt: new Date().toISOString(),
        },
      },
    };
    saveWeightsStore(TMP_DIR, store);
    const loaded = loadWeightsStore(TMP_DIR);
    assert.deepStrictEqual(loaded.domains.build.weights, store.domains.build.weights);
  });

  it('파일 없으면 빈 store 반환', () => {
    const emptyDir = join(TMP_DIR, 'empty');
    mkdirSync(emptyDir, { recursive: true });
    const store = loadWeightsStore(emptyDir);
    assert.deepStrictEqual(store, { version: 1, domains: {} });
  });

  it('30일 초과 시 기본값 리셋', () => {
    const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const store = {
      version: 1,
      domains: {
        build: {
          domain: 'build',
          weights: { completionRate: 0.8, avgReviewScore: 0.1, domainExperience: 0.1 },
          updatedAt: staleDate,
        },
      },
    };
    const w = getWeightsForDomain(store, 'build');
    assert.strictEqual(w.completionRate, 0.4);
    assert.strictEqual(w.avgReviewScore, 0.4);
    assert.strictEqual(w.domainExperience, 0.2);
  });

  it('30일 이내면 저장된 가중치 반환 (정규화 적용)', () => {
    const recentDate = new Date().toISOString();
    const store = {
      version: 1,
      domains: {
        build: {
          domain: 'build',
          weights: { completionRate: 0.6, avgReviewScore: 0.3, domainExperience: 0.1 },
          updatedAt: recentDate,
        },
      },
    };
    const w = getWeightsForDomain(store, 'build');
    const sum = w.completionRate + w.avgReviewScore + w.domainExperience;
    assert.ok(Math.abs(sum - 1.0) < 1e-10);
  });
});

describe('updateWeightsFromFeedback', () => {
  it('taskCount <= 10이면 업데이트하지 않음', () => {
    const store = { version: 1, domains: {} };
    const performances = [
      makePerf('a', { totalTasks: 5, completionRate: 80, avgReviewScore: 70, domains: { build: 5 } }),
      makePerf('b', { totalTasks: 3, completionRate: 60, avgReviewScore: 50, domains: { build: 3 } }),
    ];
    const updated = updateWeightsFromFeedback(store, 'build', performances);
    assert.deepStrictEqual(updated.domains, {});
  });

  it('충분한 데이터(>10 tasks, >=3 agents)면 가중치 업데이트', () => {
    const store = { version: 1, domains: {} };
    const performances = [
      makePerf('a', { totalTasks: 10, completionRate: 90, avgReviewScore: 80, domains: { build: 5 } }),
      makePerf('b', { totalTasks: 10, completionRate: 50, avgReviewScore: 90, domains: { build: 4 } }),
      makePerf('c', { totalTasks: 10, completionRate: 70, avgReviewScore: 60, domains: { build: 3 } }),
    ];
    const updated = updateWeightsFromFeedback(store, 'build', performances);
    assert.ok(updated.domains.build, 'build domain should exist');
    const w = updated.domains.build.weights;
    const sum = w.completionRate + w.avgReviewScore + w.domainExperience;
    assert.ok(Math.abs(sum - 1.0) < 1e-10, `sum should be 1.0, got ${sum}`);
    assert.ok(w.completionRate >= 0.01);
    assert.ok(w.avgReviewScore >= 0.01);
    assert.ok(w.domainExperience >= 0.01);
  });

  it('관련 에이전트 3개 미만이면 업데이트하지 않음', () => {
    const store = { version: 1, domains: {} };
    const performances = [
      makePerf('a', { totalTasks: 20, completionRate: 90, avgReviewScore: 80, domains: { build: 15 } }),
    ];
    const updated = updateWeightsFromFeedback(store, 'build', performances);
    assert.deepStrictEqual(updated.domains, {});
  });
});
