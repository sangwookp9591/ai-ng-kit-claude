/**
 * sw-kit Project Memory (Innovation #2 — Cross-Session Learning)
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
  return join(projectDir || process.cwd(), '.sw-kit', 'project-memory.json');
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
 */
export function addMemoryEntry(section, entry, projectDir) {
  const memory = loadMemory(projectDir);

  if (Array.isArray(memory[section])) {
    memory[section].push({
      content: entry,
      addedAt: new Date().toISOString()
    });
  } else if (typeof memory[section] === 'object') {
    Object.assign(memory[section], typeof entry === 'object' ? entry : { note: entry });
  }

  return saveMemory(memory, projectDir);
}

/**
 * Get a summary of project memory for context injection.
 * @param {string} [projectDir]
 * @returns {string} Compact summary string
 */
export function getMemorySummary(projectDir) {
  const memory = loadMemory(projectDir);
  const parts = [];

  if (Object.keys(memory.techStack).length > 0) {
    parts.push(`Tech: ${Object.entries(memory.techStack).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  if (memory.patterns.length > 0) {
    parts.push(`Patterns: ${memory.patterns.slice(-3).map(p => p.content).join('; ')}`);
  }
  if (memory.pitfalls.length > 0) {
    parts.push(`Pitfalls: ${memory.pitfalls.slice(-3).map(p => p.content).join('; ')}`);
  }

  return parts.join(' | ') || '';
}
