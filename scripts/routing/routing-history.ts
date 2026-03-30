/**
 * aing Routing History (Innovation #3 — Adaptive Routing)
 * Tracks routing decisions and outcomes for future optimization.
 * @module scripts/routing/routing-history
 */

import { readStateOrDefault, writeState } from '../core/state.js';
import { getConfig } from '../core/config.js';
import { join } from 'node:path';

interface RoutingEntry {
  agent: string;
  model: string;
  intent: string;
  complexity: object;
  outcome: 'success' | 'fail';
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
 */
export function recordRouting(entry: RoutingEntry, projectDir?: string): { ok: boolean; error?: string } {
  const historyPath = getHistoryPath(projectDir);
  const maxRetention = getConfig('routing.historyRetention', 50) as number;
  const history: TimestampedRoutingEntry[] = readStateOrDefault(historyPath, []) as TimestampedRoutingEntry[];

  history.push({ ...entry, ts: new Date().toISOString() });

  // Trim to retention limit
  const trimmed = history.length > maxRetention ? history.slice(-maxRetention) : history;

  return writeState(historyPath, trimmed);
}

/**
 * Get success rate for a model/agent combination.
 */
export function getSuccessRate(model: string, agent?: string, projectDir?: string): SuccessRate {
  const history: TimestampedRoutingEntry[] = readStateOrDefault(getHistoryPath(projectDir), []) as TimestampedRoutingEntry[];

  const filtered = history.filter(e =>
    e.model === model && (!agent || e.agent === agent)
  );

  const total = filtered.length;
  const success = filtered.filter(e => e.outcome === 'success').length;

  return { total, success, rate: total > 0 ? success / total : 0 };
}
