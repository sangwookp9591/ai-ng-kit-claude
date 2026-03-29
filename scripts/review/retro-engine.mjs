/**
 * aing Retrospective Engine
 * Absorbed from gstack's /retro 13-step retrospective.
 * Analyzes git history, work patterns, and code quality metrics.
 *
 * @module scripts/review/retro-engine
 */
import { execSync } from 'node:child_process';
import { createLogger } from '../core/logger.mjs';
import { readStateOrDefault, writeState } from '../core/state.mjs';
import { join } from 'node:path';

const log = createLogger('retro');

/**
 * Session detection: 45-minute gap threshold.
 */
const SESSION_GAP_MS = 45 * 60 * 1000;

/**
 * Gather git metrics for a time window.
 * @param {string} window - e.g. '7d', '14d', '30d'
 * @param {string} [projectDir]
 * @returns {object} Raw metrics
 */
export function gatherMetrics(window = '7d', projectDir) {
  const dir = projectDir || process.cwd();
  const since = `${parseInt(window)} days ago`;

  try {
    // Commits with stats
    const logRaw = execSync(
      `git log --since="${since}" --pretty=format:"%H|%s|%an|%ai" --shortstat`,
      { cwd: dir, encoding: 'utf-8', timeout: 10000 }
    ).trim();

    // Parse commits
    const commits = [];
    const lines = logRaw.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith(' ')) continue;
      const parts = line.split('|');
      if (parts.length >= 4) {
        commits.push({
          hash: parts[0]?.slice(0, 7),
          message: parts[1],
          author: parts[2],
          date: parts[3],
        });
      }
    }

    // Author stats
    let shortlog = '';
    try {
      shortlog = execSync(
        `git shortlog -sn --since="${since}" --no-merges`,
        { cwd: dir, encoding: 'utf-8', timeout: 10000 }
      ).trim();
    } catch {}

    const authors = shortlog.split('\n').filter(Boolean).map(line => {
      const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
      return match ? { commits: parseInt(match[1]), name: match[2] } : null;
    }).filter(Boolean);

    // File hotspots
    let hotspots = [];
    try {
      const hotspotRaw = execSync(
        `git log --since="${since}" --pretty=format: --name-only | sort | uniq -c | sort -rn | head -15`,
        { cwd: dir, encoding: 'utf-8', timeout: 10000 }
      ).trim();
      hotspots = hotspotRaw.split('\n').filter(Boolean).map(line => {
        const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
        return match ? { changes: parseInt(match[1]), file: match[2] } : null;
      }).filter(Boolean);
    } catch {}

    return {
      commits,
      authors,
      hotspots,
      totalCommits: commits.length,
      totalAuthors: authors.length,
      window,
    };
  } catch (err) {
    log.error(`Failed to gather metrics: ${err.message}`);
    return { commits: [], authors: [], hotspots: [], totalCommits: 0, totalAuthors: 0, window };
  }
}

/**
 * Detect work sessions from commit timestamps.
 * Sessions are separated by 45+ minute gaps.
 * @param {Array} commits - Array of { date: string }
 * @returns {Array<{ start: string, end: string, commits: number, durationMin: number, type: string }>}
 */
export function detectSessions(commits) {
  if (commits.length === 0) return [];

  const sorted = [...commits]
    .map(c => ({ ...c, ts: new Date(c.date).getTime() }))
    .sort((a, b) => a.ts - b.ts);

  const sessions = [];
  let sessionStart = sorted[0];
  let sessionCommits = 1;
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].ts - prev.ts;
    if (gap > SESSION_GAP_MS) {
      // End current session
      const durationMin = Math.round((prev.ts - sessionStart.ts) / 60000);
      sessions.push({
        start: sessionStart.date,
        end: prev.date,
        commits: sessionCommits,
        durationMin,
        type: durationMin >= 50 ? 'deep' : durationMin >= 20 ? 'medium' : 'micro',
      });
      sessionStart = sorted[i];
      sessionCommits = 0;
    }
    sessionCommits++;
    prev = sorted[i];
  }

  // Final session
  const durationMin = Math.round((prev.ts - sessionStart.ts) / 60000);
  sessions.push({
    start: sessionStart.date,
    end: prev.date,
    commits: sessionCommits,
    durationMin,
    type: durationMin >= 50 ? 'deep' : durationMin >= 20 ? 'medium' : 'micro',
  });

  return sessions;
}

/**
 * Classify commits by conventional type.
 * @param {Array} commits
 * @returns {object} { feat: N, fix: N, refactor: N, test: N, chore: N, docs: N, other: N }
 */
export function classifyCommits(commits) {
  const types = { feat: 0, fix: 0, refactor: 0, test: 0, chore: 0, docs: 0, style: 0, ci: 0, other: 0 };
  for (const c of commits) {
    const match = c.message?.match(/^(\w+)/);
    const type = match?.[1]?.toLowerCase();
    if (type && types[type] !== undefined) {
      types[type]++;
    } else {
      types.other++;
    }
  }
  return types;
}

/**
 * Calculate focus score: % of commits in most-changed top-level directory.
 * @param {Array} hotspots
 * @returns {{ score: number, focusDir: string }}
 */
export function calculateFocusScore(hotspots) {
  if (hotspots.length === 0) return { score: 0, focusDir: 'none' };

  const dirCounts = {};
  for (const h of hotspots) {
    const topDir = h.file.split('/')[0] || h.file;
    dirCounts[topDir] = (dirCounts[topDir] || 0) + h.changes;
  }

  const sorted = Object.entries(dirCounts).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  const top = sorted[0];

  return {
    score: total > 0 ? Math.round((top[1] / total) * 100) : 0,
    focusDir: top?.[0] || 'none',
  };
}

/**
 * Generate full retrospective report.
 * @param {string} window
 * @param {string} [projectDir]
 * @returns {string} Formatted report
 */
export function generateRetro(window = '7d', projectDir) {
  const metrics = gatherMetrics(window, projectDir);
  const sessions = detectSessions(metrics.commits);
  const commitTypes = classifyCommits(metrics.commits);
  const focus = calculateFocusScore(metrics.hotspots);

  const deep = sessions.filter(s => s.type === 'deep').length;
  const medium = sessions.filter(s => s.type === 'medium').length;
  const micro = sessions.filter(s => s.type === 'micro').length;
  const totalSessionMin = sessions.reduce((s, sess) => s + sess.durationMin, 0);
  const fixRatio = metrics.totalCommits > 0
    ? Math.round((commitTypes.fix / metrics.totalCommits) * 100) : 0;

  const lines = [
    `# Retrospective (${window})`,
    '',
    '## Summary',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Commits | ${metrics.totalCommits} |`,
    `| Contributors | ${metrics.totalAuthors} |`,
    `| Sessions | ${sessions.length} (${deep} deep, ${medium} medium, ${micro} micro) |`,
    `| Active time | ${totalSessionMin}min |`,
    `| Focus score | ${focus.score}% (${focus.focusDir}) |`,
    `| Fix ratio | ${fixRatio}% |`,
    '',
    '## Commit Types',
  ];

  for (const [type, count] of Object.entries(commitTypes).filter(([, c]) => c > 0)) {
    const bar = '█'.repeat(Math.min(20, count));
    lines.push(`  ${type.padEnd(10)} ${bar} ${count}`);
  }

  if (fixRatio > 50) {
    lines.push('', '⚠ Fix ratio > 50%: "ship fast, fix fast" pattern. May indicate review gaps.');
  }

  lines.push('', '## Hotspots (most changed files)');
  for (const h of metrics.hotspots.slice(0, 10)) {
    const churn = h.changes >= 5 ? ' ⚠ CHURN' : '';
    lines.push(`  ${String(h.changes).padStart(3)}x  ${h.file}${churn}`);
  }

  lines.push('', '## Contributors');
  for (const a of metrics.authors) {
    lines.push(`  ${a.name}: ${a.commits} commits`);
  }

  lines.push('', '## Sessions');
  for (const s of sessions.slice(0, 10)) {
    lines.push(`  [${s.type.padEnd(6)}] ${s.durationMin}min, ${s.commits} commits (${s.start.slice(0, 16)})`);
  }

  return lines.join('\n');
}

/**
 * Save retro snapshot for trend tracking.
 * @param {object} metrics
 * @param {string} [projectDir]
 */
export function saveRetroSnapshot(metrics, projectDir) {
  const dir = projectDir || process.cwd();
  const date = new Date().toISOString().slice(0, 10);
  const retroDir = join(dir, '.aing', 'retros');
  const path = join(retroDir, `${date}.json`);

  writeState(path, {
    date,
    window: metrics.window,
    totalCommits: metrics.totalCommits,
    totalAuthors: metrics.totalAuthors,
    savedAt: new Date().toISOString(),
  });
}
