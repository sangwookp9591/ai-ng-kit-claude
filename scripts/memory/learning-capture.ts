/**
 * aing Learning Capture (Innovation #2 — Cross-Session Learning)
 * Automatically captures success patterns from completed PDCA cycles.
 * @module scripts/memory/learning-capture
 */

import { addMemoryEntry, loadMemory, saveMemory } from './project-memory.js';
import { createLogger } from '../core/logger.js';
import { getConfig } from '../core/config.js';

const log = createLogger('learning-capture');

interface LearningParams {
  feature: string;
  evidence: Record<string, unknown>;
  iterations: number;
  patterns?: string[];
  mistakes?: string[];
}

/**
 * Capture learning from a completed PDCA Review stage.
 */
export function captureLearning({ feature, iterations, patterns, mistakes }: LearningParams, projectDir?: string): void {
  const maxPatterns = getConfig('learning.maxPatterns', 100) as number;

  // Capture success patterns
  if (patterns && patterns.length > 0) {
    for (const pattern of patterns) {
      addMemoryEntry('patterns', `[${feature}] ${pattern}`, projectDir);
    }
  }

  // Capture pitfalls
  if (mistakes && mistakes.length > 0) {
    for (const mistake of mistakes) {
      addMemoryEntry('pitfalls', `[${feature}] ${mistake}`, projectDir);
    }
  }

  // Capture meta-learning: iteration count as complexity signal
  if (iterations > 2) {
    addMemoryEntry('pitfalls',
      `[${feature}] Required ${iterations} iterations — consider breaking into smaller tasks`,
      projectDir
    );
  }

  // Trim old patterns if over limit
  const updated = loadMemory(projectDir);
  if (updated.patterns.length > maxPatterns) {
    updated.patterns = updated.patterns.slice(-maxPatterns);
  }
  if (updated.pitfalls.length > maxPatterns) {
    updated.pitfalls = updated.pitfalls.slice(-maxPatterns);
  }

  // Save trimmed memory
  saveMemory(updated, projectDir);

  log.info(`Learning captured for ${feature}`, {
    patterns: patterns?.length || 0,
    mistakes: mistakes?.length || 0,
    iterations
  });
}
