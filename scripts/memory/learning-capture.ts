/**
 * aing Learning Capture (Innovation #2 — Cross-Session Learning)
 * Automatically captures success patterns from completed PDCA cycles.
 * @module scripts/memory/learning-capture
 */

import { addMemoryEntry, loadMemory, saveMemory } from './project-memory.js';
import { createLogger } from '../core/logger.js';
import { getConfig } from '../core/config.js';

const MAX_PITFALLS = 100;

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
  if (updated.pitfalls.length > MAX_PITFALLS) {
    updated.pitfalls = updated.pitfalls.slice(-MAX_PITFALLS);
  }

  // Save trimmed memory
  saveMemory(updated, projectDir);

  log.info(`Learning captured for ${feature}`, {
    patterns: patterns?.length || 0,
    mistakes: mistakes?.length || 0,
    iterations
  });
}

interface PassiveParams {
  trigger: 'guardrail-denial' | 'error-recovery' | 'session-end';
  content: string;
  context?: string;
}

/**
 * Lightweight passive learning capture — fires outside PDCA cycles.
 * Uses source='passive' and initial confidence=0.7 (deduplication by content).
 */
export function capturePassive({ trigger, content, context }: PassiveParams, projectDir?: string): void {
  const memory = loadMemory(projectDir);
  const label = context ? `[${context}] ${content}` : content;

  // Dedup: skip if identical content already exists in pitfalls
  const alreadyExists = memory.pitfalls.some(
    (p) => typeof p.content === 'string' && p.content === label
  );
  if (alreadyExists) return;

  addMemoryEntry('pitfalls', label, projectDir, { confidence: 7, source: 'passive' });

  // Trim pitfalls to MAX_PITFALLS cap
  const updated = loadMemory(projectDir);
  if (updated.pitfalls.length > MAX_PITFALLS) {
    updated.pitfalls = updated.pitfalls.slice(-MAX_PITFALLS);
    saveMemory(updated, projectDir);
  }

  log.info(`Passive learning captured`, { trigger, content: label });
}
