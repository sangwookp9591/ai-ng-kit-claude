/**
 * aing Learning Management CLI.
 * List, search, add, prune learnings.
 * @module scripts/cli/aing-learn
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
const LEARNINGS_DIR = join(homedir(), '.aing', 'learnings');
export function listLearnings(projectSlug) {
    const file = join(LEARNINGS_DIR, `${projectSlug}.jsonl`);
    if (!existsSync(file))
        return [];
    return readFileSync(file, 'utf-8').trim().split('\n').filter(Boolean).map((l) => {
        try {
            return JSON.parse(l);
        }
        catch {
            return null;
        }
    }).filter(Boolean);
}
export function searchLearnings(projectSlug, query) {
    const q = query.toLowerCase();
    return listLearnings(projectSlug).filter((l) => (l.pattern || '').toLowerCase().includes(q) ||
        (l.context || '').toLowerCase().includes(q) ||
        (l.content || '').toLowerCase().includes(q));
}
export function addLearning(projectSlug, entry) {
    if (!existsSync(LEARNINGS_DIR))
        mkdirSync(LEARNINGS_DIR, { recursive: true });
    const file = join(LEARNINGS_DIR, `${projectSlug}.jsonl`);
    const record = {
        ...entry,
        confidence: entry.confidence || 7,
        source: entry.source || 'user',
        ts: new Date().toISOString(),
    };
    const existing = existsSync(file) ? readFileSync(file, 'utf-8') : '';
    writeFileSync(file, existing + JSON.stringify(record) + '\n');
    return record;
}
export function pruneLearnings(projectSlug, maxAgeDays = 30) {
    const all = listLearnings(projectSlug);
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    const kept = all.filter((l) => {
        if (l.source === 'user')
            return true;
        return new Date(l.ts).getTime() > cutoff;
    });
    const file = join(LEARNINGS_DIR, `${projectSlug}.jsonl`);
    writeFileSync(file, kept.map((l) => JSON.stringify(l)).join('\n') + (kept.length ? '\n' : ''));
    return { before: all.length, after: kept.length, pruned: all.length - kept.length };
}
export function getStats(projectSlug) {
    const all = listLearnings(projectSlug);
    const bySource = {};
    for (const l of all) {
        const s = l.source || 'unknown';
        bySource[s] = (bySource[s] || 0) + 1;
    }
    return { total: all.length, bySource };
}
//# sourceMappingURL=aing-learn.js.map