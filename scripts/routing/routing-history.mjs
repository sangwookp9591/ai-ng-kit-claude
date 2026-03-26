/**
 * aing Routing History (Innovation #3 — Adaptive Routing)
 * Tracks routing decisions and outcomes for future optimization.
 * @module scripts/routing/routing-history
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { getConfig } from '../core/config.mjs';
import { join } from 'node:path';

function getHistoryPath(projectDir) {
  return join(projectDir || process.cwd(), '.aing', 'routing-history.json');
}

/**
 * Record a routing decision and its outcome.
 * @param {{ agent: string, model: string, intent: string, complexity: object, outcome: 'success'|'fail' }} entry
 * @param {string} [projectDir]
 */
export function recordRouting(entry, projectDir) {
  const historyPath = getHistoryPath(projectDir);
  const maxRetention = getConfig('routing.historyRetention', 50);
  const history = readStateOrDefault(historyPath, []);

  history.push({ ...entry, ts: new Date().toISOString() });

  // Trim to retention limit
  const trimmed = history.length > maxRetention ? history.slice(-maxRetention) : history;

  return writeState(historyPath, trimmed);
}

/**
 * Get success rate for a model/agent combination.
 * @param {string} model
 * @param {string} [agent]
 * @param {string} [projectDir]
 * @returns {{ total: number, success: number, rate: number }}
 */
export function getSuccessRate(model, agent, projectDir) {
  const history = readStateOrDefault(getHistoryPath(projectDir), []);

  const filtered = history.filter(e =>
    e.model === model && (!agent || e.agent === agent)
  );

  const total = filtered.length;
  const success = filtered.filter(e => e.outcome === 'success').length;

  return { total, success, rate: total > 0 ? success / total : 0 };
}
