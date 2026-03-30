/**
 * aing 3-Tier Notepad System
 * Priority (permanent), Working (7-day TTL), Manual (permanent, user-managed).
 * @module scripts/memory/notepad
 */

import { readStateOrDefault, writeState } from '../core/state.js';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

export interface NotepadEntry {
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notepad {
  priority: NotepadEntry[];  // permanent, survives compaction
  working: NotepadEntry[];   // 7-day TTL, auto-pruned
  manual: NotepadEntry[];    // permanent, user-managed
}

const PRIORITY_MAX_CHARS = 500;
const PRIORITY_MAX_ENTRIES = 10;
const WORKING_TTL_DAYS = 7;
const WORKING_TTL_MS = WORKING_TTL_DAYS * 24 * 60 * 60 * 1000;

function getNotepadPath(projectDir?: string): string {
  return join(projectDir || process.cwd(), '.aing', 'notepad.json');
}

function emptyNotepad(): Notepad {
  return { priority: [], working: [], manual: [] };
}

function isExpired(entry: NotepadEntry): boolean {
  return Date.now() - new Date(entry.createdAt).getTime() > WORKING_TTL_MS;
}

/**
 * Read notepad from disk. Returns empty tiers if file is missing or corrupt.
 */
export async function readNotepad(projectDir?: string): Promise<Notepad> {
  const raw = readStateOrDefault(getNotepadPath(projectDir), emptyNotepad()) as Notepad;
  return {
    priority: Array.isArray(raw.priority) ? raw.priority : [],
    working: Array.isArray(raw.working) ? raw.working : [],
    manual: Array.isArray(raw.manual) ? raw.manual : [],
  };
}

/**
 * Ensure the .aing directory exists before writing.
 */
function ensureDir(projectDir?: string): void {
  mkdirSync(dirname(getNotepadPath(projectDir)), { recursive: true });
}

/**
 * Write priority note. Max 500 chars per entry, max 10 entries (oldest dropped).
 */
export async function writePriority(content: string, projectDir?: string): Promise<void> {
  if (content.length > PRIORITY_MAX_CHARS) {
    throw new Error(`Priority note exceeds ${PRIORITY_MAX_CHARS} character limit (got ${content.length})`);
  }
  ensureDir(projectDir);
  const notepad = await readNotepad(projectDir);
  const now = new Date().toISOString();
  notepad.priority.push({ content, createdAt: now, updatedAt: now });
  if (notepad.priority.length > PRIORITY_MAX_ENTRIES) {
    notepad.priority = notepad.priority.slice(-PRIORITY_MAX_ENTRIES);
  }
  const result = writeState(getNotepadPath(projectDir), notepad);
  if (!result.ok) throw new Error(`writePriority failed: ${result.error}`);
}

/**
 * Write working note. Timestamped. Auto-prunes entries older than 7 days on read.
 */
export async function writeWorking(content: string, projectDir?: string): Promise<void> {
  ensureDir(projectDir);
  const notepad = await readNotepad(projectDir);
  // Prune expired on write too
  notepad.working = notepad.working.filter(e => !isExpired(e));
  const now = new Date().toISOString();
  notepad.working.push({ content, createdAt: now, updatedAt: now });
  const result = writeState(getNotepadPath(projectDir), notepad);
  if (!result.ok) throw new Error(`writeWorking failed: ${result.error}`);
}

/**
 * Write manual note. Permanent, no auto-prune.
 */
export async function writeManual(content: string, projectDir?: string): Promise<void> {
  ensureDir(projectDir);
  const notepad = await readNotepad(projectDir);
  const now = new Date().toISOString();
  notepad.manual.push({ content, createdAt: now, updatedAt: now });
  const result = writeState(getNotepadPath(projectDir), notepad);
  if (!result.ok) throw new Error(`writeManual failed: ${result.error}`);
}

/**
 * Remove working entries older than 7 days. Returns count removed.
 */
export async function pruneWorking(projectDir?: string): Promise<number> {
  ensureDir(projectDir);
  const notepad = await readNotepad(projectDir);
  const before = notepad.working.length;
  notepad.working = notepad.working.filter(e => !isExpired(e));
  const removed = before - notepad.working.length;
  if (removed > 0) {
    const result = writeState(getNotepadPath(projectDir), notepad);
    if (!result.ok) throw new Error(`pruneWorking failed: ${result.error}`);
  }
  return removed;
}

/**
 * Returns formatted summary of all tiers for context injection.
 */
export async function getNotepadSummary(projectDir?: string): Promise<string> {
  const notepad = await readNotepad(projectDir);
  const parts: string[] = [];

  const activePriority = notepad.priority;
  if (activePriority.length > 0) {
    parts.push(`Priority Notes (${activePriority.length}):\n${activePriority.map(e => `  - ${e.content}`).join('\n')}`);
  }

  const activeWorking = notepad.working.filter(e => !isExpired(e));
  if (activeWorking.length > 0) {
    parts.push(`Working Notes (${activeWorking.length}):\n${activeWorking.map(e => `  - [${e.createdAt.slice(0, 10)}] ${e.content}`).join('\n')}`);
  }

  if (notepad.manual.length > 0) {
    parts.push(`Manual Notes (${notepad.manual.length}):\n${notepad.manual.map(e => `  - ${e.content}`).join('\n')}`);
  }

  return parts.join('\n\n');
}
