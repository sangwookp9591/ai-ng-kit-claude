/**
 * aing Project Memory (Innovation #2 — Cross-Session Learning)
 * Persistent project knowledge that survives across sessions.
 * @module scripts/memory/project-memory
 */

import { readStateOrDefault, writeState } from '../core/state.mjs';
import { createLogger } from '../core/logger.mjs';
import { join } from 'node:path';

const log = createLogger('project-memory');

const EMPTY_MEMORY = {
  techStack: {},
  conventions: {},
  patterns: [],
  pitfalls: [],
  decisions: []
};

function getMemoryPath(projectDir) {
  return join(projectDir || process.cwd(), '.aing', 'project-memory.json');
}

/**
 * Load project memory.
 * @param {string} [projectDir]
 * @returns {object} Memory object with sections
 */
export function loadMemory(projectDir) {
  return readStateOrDefault(getMemoryPath(projectDir), {
    techStack: {},
    conventions: {},
    patterns: [],
    pitfalls: [],
    decisions: []
  });
}

/**
 * Save project memory (atomic write).
 * @param {object} memory
 * @param {string} [projectDir]
 */
export function saveMemory(memory, projectDir) {
  return writeState(getMemoryPath(projectDir), memory);
}

/**
 * Add a note to a specific memory section.
 * @param {string} section - One of: techStack, conventions, patterns, pitfalls, decisions
 * @param {string|object} entry
 * @param {string} [projectDir]
 * @param {object} [options]
 * @param {number} [options.confidence=5]
 * @param {string} [options.source='observed'] - 'user' | 'observed' | 'inferred'
 */
export function addMemoryEntry(section, entry, projectDir, { confidence = 5, source = 'observed' } = {}) {
  const memory = loadMemory(projectDir);

  if (Array.isArray(memory[section])) {
    memory[section].push({
      content: typeof entry === 'string' ? entry : entry,
      addedAt: new Date().toISOString(),
      confidence,
      source,  // 'user' | 'observed' | 'inferred'
    });
  } else if (typeof memory[section] === 'object') {
    Object.assign(memory[section], typeof entry === 'object' ? entry : { note: entry });
  }

  return saveMemory(memory, projectDir);
}

/**
 * Apply confidence decay to memory entries.
 * observed/inferred: -1 per 30 days. user-stated: never decay.
 * @param {string} [projectDir]
 * @returns {{ decayed: number, removed: number }}
 */
export function applyConfidenceDecay(projectDir) {
  const memory = loadMemory(projectDir);
  let decayed = 0, removed = 0;
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  for (const section of ['patterns', 'pitfalls']) {
    if (!Array.isArray(memory[section])) continue;
    memory[section] = memory[section].filter(entry => {
      // No confidence field = legacy entry, treat as confidence 5
      if (entry.confidence === undefined) entry.confidence = 5;
      if (entry.source === undefined) entry.source = 'observed';

      // User-stated entries never decay
      if (entry.source === 'user') return true;

      // Calculate decay
      const addedAt = new Date(entry.addedAt || entry.lastDecayed || now).getTime();
      const lastDecay = new Date(entry.lastDecayed || entry.addedAt || now).getTime();
      const daysSinceDecay = (now - lastDecay) / THIRTY_DAYS;

      if (daysSinceDecay >= 1) {
        const decayAmount = Math.floor(daysSinceDecay);
        entry.confidence = Math.max(0, entry.confidence - decayAmount);
        entry.lastDecayed = new Date().toISOString();
        decayed++;
      }

      // Remove entries with 0 confidence
      if (entry.confidence <= 0) { removed++; return false; }
      return true;
    });
  }

  if (decayed > 0 || removed > 0) saveMemory(memory, projectDir);
  return { decayed, removed };
}

/**
 * Get a summary of project memory for context injection.
 * @param {string} [projectDir]
 * @returns {string} Compact summary string
 */
export function getMemorySummary(projectDir, minConfidence = 5) {
  const memory = loadMemory(projectDir);
  const parts = [];

  if (Object.keys(memory.techStack).length > 0) {
    parts.push(`Tech: ${Object.entries(memory.techStack).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  const highConfPatterns = (memory.patterns || []).filter(p => (p.confidence || 5) >= minConfidence);
  if (highConfPatterns.length > 0) {
    parts.push(`Patterns: ${highConfPatterns.slice(-3).map(p => p.content).join('; ')}`);
  }
  const highConfPitfalls = (memory.pitfalls || []).filter(p => (p.confidence || 5) >= minConfidence);
  if (highConfPitfalls.length > 0) {
    parts.push(`Pitfalls: ${highConfPitfalls.slice(-3).map(p => p.content).join('; ')}`);
  }

  return parts.join(' | ') || '';
}
