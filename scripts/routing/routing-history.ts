/**
 * aing Routing History (Innovation #3 — Adaptive Routing)
 * Tracks routing decisions and outcomes for future optimization.
 * @module scripts/routing/routing-history
 */

import { updateState, readState, cacheInvalidate } from '../core/state.js';
import { getConfig } from '../core/config.js';
import { join } from 'node:path';

interface RoutingEntry {
  agent: string;
  model: string;
  intent: string;
  complexity: object;
  outcome: 'success' | 'fail';
  route?: string;
}

interface TimestampedRoutingEntry extends RoutingEntry {
  ts: string;
}

interface SuccessRate {
  total: number;
  success: number;
  rate: number;
}

function getHistoryPath(projectDir?: string): string {
  return join(projectDir || process.cwd(), '.aing', 'routing-history.json');
}

/**
 * Record a routing decision and its outcome.
 * Uses atomic updateState() to prevent race conditions in multi-agent environments.
 */
export function recordRouting(entry: RoutingEntry, projectDir?: string): { ok: boolean; error?: string } {
  const historyPath = getHistoryPath(projectDir);
  const maxRetention = getConfig('routing.historyRetention', 50) as number;

  const result = updateState(
    historyPath,
    [],
    (data: unknown) => {
      const history = Array.isArray(data) ? (data as TimestampedRoutingEntry[]) : [];
      const newEntry: TimestampedRoutingEntry = { ...entry, ts: new Date().toISOString() };
      history.push(newEntry);
      return history.length > maxRetention ? history.slice(-maxRetention) : history;
    }
  );

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

/**
 * Get success rate for a model/agent combination.
 * @param model - 모델명으로 필터
 * @param agent - (optional) 에이전트명으로 추가 필터
 * @param projectDir - (optional) 프로젝트 디렉토리
 */
export function getSuccessRate(model: string, agent?: string, projectDir?: string): SuccessRate;

/**
 * Get success rate for a route.
 * @param route - 라우트명으로 필터
 * @param projectDir - (optional) 프로젝트 디렉토리
 */
export function getSuccessRate(route: string, projectDir?: string): SuccessRate;

export function getSuccessRate(
  modelOrRoute: string,
  agentOrProjectDir?: string,
  projectDir?: string
): SuccessRate {
  // 오버로드 해석: 두 번째 인자가 undefined이거나 절대경로/상대경로처럼 보이면 route 오버로드
  const isRouteOverload =
    agentOrProjectDir === undefined ||
    agentOrProjectDir === null ||
    agentOrProjectDir.startsWith('/') ||
    agentOrProjectDir.startsWith('.');

  let history: TimestampedRoutingEntry[];
  if (isRouteOverload) {
    // route 오버로드: (route, projectDir?)
    const dir = agentOrProjectDir as string | undefined;
    // 캐시 바이패스하여 최신 데이터 읽기
    const historyPath = getHistoryPath(dir);
    cacheInvalidate(historyPath);
    const raw = readState(historyPath);
    history = raw.ok && Array.isArray(raw.data) ? (raw.data as TimestampedRoutingEntry[]) : [];

    const filtered = history.filter(e => e.route === modelOrRoute);
    const total = filtered.length;
    const success = filtered.filter(e => e.outcome === 'success').length;
    return { total, success, rate: total > 0 ? success / total : 0 };
  } else {
    // model/agent 오버로드: (model, agent?, projectDir?)
    const agent = agentOrProjectDir as string;
    const dir = projectDir;
    const historyPath = getHistoryPath(dir);
    cacheInvalidate(historyPath);
    const raw = readState(historyPath);
    history = raw.ok && Array.isArray(raw.data) ? (raw.data as TimestampedRoutingEntry[]) : [];

    const filtered = history.filter(e =>
      e.model === modelOrRoute && (!agent || e.agent === agent)
    );
    const total = filtered.length;
    const success = filtered.filter(e => e.outcome === 'success').length;
    return { total, success, rate: total > 0 ? success / total : 0 };
  }
}

/**
 * 피드백 기반 confidence 동적 조정.
 *
 * 공식: base * (1 + 0.25 * (rate - 0.5))
 * 범위: [0.875 * base, 1.125 * base]
 *
 * 콜드 스타트 보호: total < 5이면 base 그대로 반환 (rate=0 페널티 방지)
 *
 * @param baseConfidence - 기본 confidence 값
 * @param route - 히스토리에서 조회할 라우트명
 * @param projectDir - (optional) 프로젝트 디렉토리
 */
export function adjustConfidence(baseConfidence: number, route: string, projectDir?: string): number {
  const { total, rate } = getSuccessRate(route, projectDir);

  // 콜드 스타트 보호: 데이터 부족 시 base 그대로
  if (total < 5) {
    return baseConfidence;
  }

  const adjusted = baseConfidence * (1 + 0.25 * (rate - 0.5));
  // 범위 클램핑: [0.875*base, 1.125*base]
  const min = 0.875 * baseConfidence;
  const max = 1.125 * baseConfidence;
  return Math.min(Math.max(adjusted, min), max);
}
