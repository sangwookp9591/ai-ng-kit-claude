/**
 * sw-kit Model Router (Innovation #3 — Adaptive Routing)
 * Maps complexity levels to optimal model tiers.
 * @module scripts/routing/model-router
 */

import { getConfig } from '../core/config.mjs';
import { scoreComplexity } from './complexity-scorer.mjs';
import { createLogger } from '../core/logger.mjs';

const log = createLogger('model-router');

/**
 * Select optimal model for a task based on complexity.
 * @param {object} signals - Complexity signals (see complexity-scorer)
 * @returns {{ model: string, agent: string, complexity: object }}
 */
export function routeTask(signals) {
  const complexity = scoreComplexity(signals);
  const modelMap = getConfig('routing.modelMap', { low: 'haiku', mid: 'sonnet', high: 'opus' });
  const model = modelMap[complexity.level] || 'sonnet';

  log.info(`Routed task: complexity=${complexity.level} (score=${complexity.score}) → model=${model}`);

  return { model, complexity };
}

/**
 * Select agent type based on task intent and complexity.
 * @param {string} intent - Task intent (explore, plan, execute, review, verify)
 * @param {object} signals - Complexity signals
 * @returns {{ agent: string, model: string }}
 */
export function routeToAgent(intent, signals = {}) {
  const agentMap = {
    explore: 'explorer',
    plan: 'planner',
    execute: 'executor',
    review: 'reviewer',
    verify: 'verifier',
    wizard: 'wizard'
  };

  const agent = agentMap[intent] || 'executor';
  const { model } = routeTask(signals);

  // Override model for specific agents (explorer/verifier are always lightweight)
  const finalModel = ['explorer', 'verifier'].includes(agent) ? 'haiku' : model;

  return { agent, model: finalModel };
}
