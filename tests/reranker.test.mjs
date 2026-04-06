/**
 * TDD: reranker.mjs + routeIntentRanked() 단위 테스트
 * Run: node --test tests/reranker.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { computeDenseScore, fuseScores, rerank } = await import('../dist/scripts/routing/reranker.js');
const { routeIntentRanked } = await import('../dist/scripts/routing/intent-router.js');

// ─────────────────────────────────────────────
// computeDenseScore
// ─────────────────────────────────────────────
describe('computeDenseScore', () => {
  it('quality 모드에서 cost penalty 없음', () => {
    const { denseScore, signals } = computeDenseScore('team', { costMode: 'quality' });
    assert.strictEqual(signals.costPenalty, 0);
    assert.ok(denseScore >= 0 && denseScore <= 1, `denseScore should be [0,1], got ${denseScore}`);
  });

  it('budget 모드에서 expensive route(team)에 cost penalty 적용', () => {
    const { signals: qualitySignals } = computeDenseScore('team', { costMode: 'quality' });
    const { signals: budgetSignals } = computeDenseScore('team', { costMode: 'budget' });
    assert.ok(budgetSignals.costPenalty > qualitySignals.costPenalty, 'budget should have higher penalty');
  });

  it('budget 모드에서 cheap route(tdd)에는 cost penalty 없음', () => {
    const { signals } = computeDenseScore('tdd', { costMode: 'budget' });
    assert.strictEqual(signals.costPenalty, 0);
  });

  it('cold-start(히스토리 < 5) → historyWeight = 0', () => {
    // No routing history file → cold start
    const { signals } = computeDenseScore('auto');
    assert.strictEqual(signals.historyWeight, 0);
  });

  it('denseScore는 항상 [0, 1] 범위', () => {
    const routes = ['auto', 'team', 'debug', 'plan', 'tdd', 'explore', 'perf', 'refactor', 'review-cso'];
    for (const route of routes) {
      for (const costMode of ['quality', 'balanced', 'budget']) {
        const { denseScore } = computeDenseScore(route, { costMode });
        assert.ok(denseScore >= 0 && denseScore <= 1, `${route}/${costMode}: denseScore=${denseScore}`);
      }
    }
  });
});

// ─────────────────────────────────────────────
// fuseScores
// ─────────────────────────────────────────────
describe('fuseScores', () => {
  it('alpha 기반 가중치 퓨전 — finalScore = alpha*sparse + (1-alpha)*dense', () => {
    // debug: alpha=0.7
    const result = fuseScores('debug', 0.9, 0.5);
    // 0.7*0.9 + 0.3*0.5 = 0.63 + 0.15 = 0.78
    assert.ok(Math.abs(result - 0.78) < 0.01, `expected ~0.78, got ${result}`);
  });

  it('auto: alpha=0.5 → sparse와 dense 동등 가중', () => {
    const result = fuseScores('auto', 0.8, 0.6);
    // 0.5*0.8 + 0.5*0.6 = 0.4 + 0.3 = 0.7
    assert.ok(Math.abs(result - 0.7) < 0.01, `expected ~0.7, got ${result}`);
  });

  it('알 수 없는 route → DEFAULT_ALPHA(0.5) 사용', () => {
    const result = fuseScores('unknown-route', 1.0, 0.0);
    assert.ok(Math.abs(result - 0.5) < 0.01);
  });
});

// ─────────────────────────────────────────────
// rerank
// ─────────────────────────────────────────────
describe('rerank', () => {
  it('후보를 finalScore 내림차순으로 정렬', () => {
    const candidates = [
      { route: 'auto', confidence: 0.6 },
      { route: 'debug', confidence: 0.9 },
      { route: 'plan-only', confidence: 0.5 },
    ];
    const ranked = rerank(candidates);
    assert.ok(ranked.length === 3);
    // finalScores should be descending
    for (let i = 1; i < ranked.length; i++) {
      assert.ok(ranked[i - 1].finalScore >= ranked[i].finalScore,
        `ranked[${i-1}].finalScore (${ranked[i-1].finalScore}) >= ranked[${i}].finalScore (${ranked[i].finalScore})`);
    }
  });

  it('빈 후보 → 빈 배열', () => {
    assert.deepStrictEqual(rerank([]), []);
  });

  it('RankedCandidate에 모든 필수 필드 포함', () => {
    const ranked = rerank([{ route: 'auto', confidence: 0.8 }]);
    const r = ranked[0];
    assert.ok('route' in r);
    assert.ok('sparseScore' in r);
    assert.ok('denseScore' in r);
    assert.ok('finalScore' in r);
    assert.ok('signals' in r);
    assert.ok('costPenalty' in r.signals);
    assert.ok('historySuccessRate' in r.signals);
    assert.ok('historyWeight' in r.signals);
  });
});

// ─────────────────────────────────────────────
// routeIntentRanked
// ─────────────────────────────────────────────
describe('routeIntentRanked', () => {
  it('빈 입력 → 단일 plan 결과', () => {
    const results = routeIntentRanked('');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].route, 'plan');
    assert.ok('finalScore' in results[0]);
  });

  it('null 입력 → 단일 plan 결과', () => {
    const results = routeIntentRanked(null);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].route, 'plan');
  });

  it('결과는 2개 이상의 후보를 포함', () => {
    const results = routeIntentRanked('src/auth.ts에 JWT 검증 추가해줘');
    assert.ok(results.length >= 2, `expected >= 2 candidates, got ${results.length}`);
  });

  it('finalScore 내림차순 정렬', () => {
    const results = routeIntentRanked('인증 시스템 버그 고쳐줘');
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].finalScore >= results[i].finalScore,
        `results[${i-1}].finalScore (${results[i-1].finalScore}) >= results[${i}].finalScore (${results[i].finalScore})`);
    }
  });

  it('1순위 결과의 route는 routeIntent()와 동일하거나 리랭킹으로 변경 가능', () => {
    // routeIntentRanked의 1순위가 반드시 routeIntent와 같지 않아도 됨 (리랭킹 목적)
    const results = routeIntentRanked('테스트 작성해줘');
    assert.ok(results.length >= 1);
    assert.ok('route' in results[0]);
    assert.ok('finalScore' in results[0]);
  });

  it('RankedIntentResult에 IntentResult 필드 + 리랭킹 필드 모두 포함', () => {
    const results = routeIntentRanked('코드 리뷰해줘');
    const r = results[0];
    // IntentResult fields
    assert.ok('route' in r);
    assert.ok('preset' in r);
    assert.ok('confidence' in r);
    assert.ok('reason' in r);
    assert.ok('originalInput' in r);
    // Reranking fields
    assert.ok('finalScore' in r);
    assert.ok('sparseScore' in r);
    assert.ok('denseScore' in r);
  });

  it('중복 route 없음', () => {
    const results = routeIntentRanked('성능 최적화 해줘');
    const routes = results.map(r => r.route);
    const unique = new Set(routes);
    assert.strictEqual(routes.length, unique.size, `duplicate routes found: ${routes}`);
  });

  it('originalInput은 원본 입력을 그대로 포함', () => {
    const input = '전체 시스템 리팩토링해줘';
    const results = routeIntentRanked(input);
    for (const r of results) {
      assert.strictEqual(r.originalInput, input);
    }
  });
});
