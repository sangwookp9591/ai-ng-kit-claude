/**
 * aing Learning Management CLI.
 * List, search, add, prune learnings.
 * @module scripts/cli/aing-learn
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const LEARNINGS_DIR: string = join(homedir(), '.aing', 'learnings');

interface LearningEntry {
  pattern?: string;
  context?: string;
  content?: string;
  confidence?: number;
  source?: string;
  ts?: string;
  [key: string]: unknown;
}

interface PruneResult {
  before: number;
  after: number;
  pruned: number;
}

interface LearningStats {
  total: number;
  bySource: Record<string, number>;
}

export function listLearnings(projectSlug: string): LearningEntry[] {
  const file = join(LEARNINGS_DIR, `${projectSlug}.jsonl`);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean).map((l: string): LearningEntry | null => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean) as LearningEntry[];
}

export function searchLearnings(projectSlug: string, query: string): LearningEntry[] {
  const q = query.toLowerCase();
  return listLearnings(projectSlug).filter((l: LearningEntry) =>
    (l.pattern || '').toLowerCase().includes(q) ||
    (l.context || '').toLowerCase().includes(q) ||
    (l.content || '').toLowerCase().includes(q)
  );
}

export function addLearning(projectSlug: string, entry: LearningEntry): LearningEntry {
  if (!existsSync(LEARNINGS_DIR)) mkdirSync(LEARNINGS_DIR, { recursive: true });
  const file = join(LEARNINGS_DIR, `${projectSlug}.jsonl`);
  const record: LearningEntry = {
    ...entry,
    confidence: entry.confidence || 7,
    source: entry.source || 'user',
    ts: new Date().toISOString(),
  };
  const existing = existsSync(file) ? readFileSync(file, 'utf-8') : '';
  writeFileSync(file, existing + JSON.stringify(record) + '\n');
  return record;
}

export function pruneLearnings(projectSlug: string, maxAgeDays: number = 30): PruneResult {
  const all = listLearnings(projectSlug);
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const kept = all.filter((l: LearningEntry): boolean => {
    if (l.source === 'user') return true;
    return new Date(l.ts!).getTime() > cutoff;
  });
  const file = join(LEARNINGS_DIR, `${projectSlug}.jsonl`);
  writeFileSync(file, kept.map((l: LearningEntry) => JSON.stringify(l)).join('\n') + (kept.length ? '\n' : ''));
  return { before: all.length, after: kept.length, pruned: all.length - kept.length };
}

export function getStats(projectSlug: string): LearningStats {
  const all = listLearnings(projectSlug);
  const bySource: Record<string, number> = {};
  for (const l of all) {
    const s = l.source || 'unknown';
    bySource[s] = (bySource[s] || 0) + 1;
  }
  return { total: all.length, bySource };
}
