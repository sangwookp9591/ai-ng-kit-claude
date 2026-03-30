/**
 * aing Project Memory (Innovation #2 — Cross-Session Learning)
 * Persistent project knowledge that survives across sessions.
 * @module scripts/memory/project-memory
 */

import { readStateOrDefault, writeState } from '../core/state.js';
import { join } from 'node:path';

interface MemoryEntry {
  content: string | Record<string, unknown>;
  addedAt: string;
  confidence: number;
  source: 'user' | 'observed' | 'inferred';
  lastDecayed?: string;
}

interface ProjectMemory {
  techStack: Record<string, unknown>;
  conventions: Record<string, unknown>;
  patterns: MemoryEntry[];
  pitfalls: MemoryEntry[];
  decisions: MemoryEntry[];
}

interface AddMemoryOptions {
  confidence?: number;
  source?: 'user' | 'observed' | 'inferred';
}

interface DecayResult {
  decayed: number;
  removed: number;
}

function getMemoryPath(projectDir?: string): string {
  return join(projectDir || process.cwd(), '.aing', 'project-memory.json');
}

/**
 * Load project memory.
 */
export function loadMemory(projectDir?: string): ProjectMemory {
  return readStateOrDefault(getMemoryPath(projectDir), {
    techStack: {},
    conventions: {},
    patterns: [],
    pitfalls: [],
    decisions: []
  }) as ProjectMemory;
}

/**
 * Save project memory (atomic write).
 */
export function saveMemory(memory: ProjectMemory, projectDir?: string): unknown {
  return writeState(getMemoryPath(projectDir), memory);
}

/**
 * Add a note to a specific memory section.
 */
export function addMemoryEntry(
  section: keyof ProjectMemory,
  entry: string | Record<string, unknown>,
  projectDir?: string,
  { confidence = 5, source = 'observed' }: AddMemoryOptions = {}
): unknown {
  const memory = loadMemory(projectDir);

  if (Array.isArray(memory[section])) {
    (memory[section] as MemoryEntry[]).push({
      content: typeof entry === 'string' ? entry : entry,
      addedAt: new Date().toISOString(),
      confidence,
      source,
    });
  } else if (typeof memory[section] === 'object') {
    Object.assign(
      memory[section] as Record<string, unknown>,
      typeof entry === 'object' ? entry : { note: entry }
    );
  }

  return saveMemory(memory, projectDir);
}

/**
 * Apply confidence decay to memory entries.
 * observed/inferred: -1 per 30 days. user-stated: never decay.
 */
export function applyConfidenceDecay(projectDir?: string): DecayResult {
  const memory = loadMemory(projectDir);
  let decayed = 0, removed = 0;
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  for (const section of ['patterns', 'pitfalls'] as const) {
    if (!Array.isArray(memory[section])) continue;
    memory[section] = memory[section].filter((entry: MemoryEntry) => {
      // No confidence field = legacy entry, treat as confidence 5
      if (entry.confidence === undefined) entry.confidence = 5;
      if (entry.source === undefined) entry.source = 'observed';

      // User-stated entries never decay
      if (entry.source === 'user') return true;

      // Calculate decay
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
 */
export function getMemorySummary(projectDir?: string, minConfidence: number = 5): string {
  const memory = loadMemory(projectDir);
  const parts: string[] = [];

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
