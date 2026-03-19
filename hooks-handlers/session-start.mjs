/**
 * sw-kit SessionStart Hook Handler
 * Initializes session: loads memory, restores PDCA state, sets context budget.
 */

import { readStateOrDefault } from '../scripts/core/state.mjs';
import { loadConfig } from '../scripts/core/config.mjs';
import { createLogger } from '../scripts/core/logger.mjs';
import { resetBudget, trackInjection, trimToTokenBudget } from '../scripts/core/context-budget.mjs';
import { getProgressSummary } from '../scripts/guardrail/progress-tracker.mjs';
import { resetTrackers } from '../scripts/guardrail/safety-invariants.mjs';
import { join } from 'node:path';

const log = createLogger('session-start');

try {
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const config = loadConfig(projectDir);

  // Reset context budget and safety trackers for new session
  resetBudget();
  resetTrackers(projectDir);

  // Load PDCA state
  const pdcaState = readStateOrDefault(
    join(projectDir, '.sw-kit', 'state', 'pdca-status.json'),
    null
  );

  // Load project memory
  const memory = readStateOrDefault(
    join(projectDir, '.sw-kit', 'project-memory.json'),
    null
  );

  // Build context injection
  const contextParts = [];

  contextParts.push(`# sw-kit Harness Engineering Agent v0.1.0`);
  contextParts.push(`개발자에게는 최고의 도우미, 비개발자에게는 최고의 마술사.`);
  contextParts.push('');

  // PDCA status (if active)
  if (pdcaState && pdcaState.activeFeature) {
    const feat = pdcaState.features?.[pdcaState.activeFeature];
    if (feat) {
      contextParts.push(`## Active PDCA`);
      contextParts.push(`- Feature: ${pdcaState.activeFeature}`);
      contextParts.push(`- Stage: ${feat.currentStage || 'plan'}`);
      contextParts.push(`- Iteration: ${feat.iteration || 0}/${config.pdca.maxIterations}`);
      contextParts.push('');
    }
  }

  // Project memory summary (if exists)
  if (memory) {
    const sections = Object.keys(memory).filter(k => memory[k] && Object.keys(memory[k]).length > 0);
    if (sections.length > 0) {
      contextParts.push(`## Project Memory`);
      contextParts.push(`Loaded sections: ${sections.join(', ')}`);
      contextParts.push('');
    }
  }

  // Previous session progress
  const progress = getProgressSummary(projectDir);
  if (progress) {
    contextParts.push(`## Previous Session`);
    contextParts.push(progress);
    contextParts.push('');
  }

  // Available commands
  contextParts.push(`## Commands`);
  contextParts.push(`- /pdca [start|status|next|reset] — PDCA 워크플로우 관리`);
  contextParts.push(`- /kit [explore|plan|execute|review|verify] — 에이전트 직접 호출`);
  contextParts.push(`- /learn [show|clear] — 학습 기록 관리`);
  contextParts.push(`- /wizard — 가이디드 마술사 모드 (비개발자 지원)`);
  contextParts.push('');

  // 5 Innovations summary
  contextParts.push(`## Harness Engine`);
  contextParts.push(`Context Budget | Evidence Chain | Adaptive Routing | Cross-Session Learning | Self-Healing`);

  const context = contextParts.join('\n');
  const maxTokens = config.context.maxSessionStartTokens;
  const trimmed = trimToTokenBudget(context, maxTokens);

  trackInjection('session-start', trimmed);

  const response = {
    hookSpecificOutput: {
      additionalContext: trimmed
    }
  };

  process.stdout.write(JSON.stringify(response));
  log.info('Session started', { pdcaActive: !!pdcaState?.activeFeature, memoryLoaded: !!memory });

} catch (err) {
  log.error('Session start failed', { error: err.message });
  // Output empty response on failure — never crash the hook
  process.stdout.write(JSON.stringify({}));
}
