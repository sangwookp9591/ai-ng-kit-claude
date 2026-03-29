/**
 * aing Telemetry Engine — Session Analytics
 * 200% Synergy: gstack Telemetry + aing Context Budget
 *
 * 3-tier privacy model (absorbed from gstack):
 *   - community: stable device ID for trend tracking
 *   - anonymous: counter only, no ID
 *   - off: local JSONL only, nothing sent
 *
 * Integration with aing Context Budget:
 *   - Tracks token usage per session
 *   - Correlates cost with complexity score
 *   - Persists for cross-session cost analysis
 *
 * @module scripts/telemetry/telemetry-engine
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.mjs';

const log = createLogger('telemetry');

const TELEMETRY_DIR = '.aing/telemetry';
const USAGE_FILE = 'skill-usage.jsonl';
const SESSION_FILE = 'sessions.jsonl';

/**
 * Telemetry tiers.
 */
export const TELEMETRY_TIERS = {
  COMMUNITY: 'community',
  ANONYMOUS: 'anonymous',
  OFF: 'off',
};

/**
 * Log a skill usage event (always local, remote only if opted in).
 *
 * @param {object} event
 * @param {string} event.skill - Skill name
 * @param {number} event.duration_s - Duration in seconds
 * @param {string} event.outcome - 'success' | 'error' | 'abort'
 * @param {string} [event.complexityLevel] - 'low' | 'mid' | 'high'
 * @param {number} [event.tokensUsed] - Estimated tokens consumed
 * @param {string} [event.teamPreset] - 'solo' | 'duo' | 'squad' | 'full'
 * @param {string} [projectDir]
 */
export function logSkillUsage(event, projectDir) {
  const dir = projectDir || process.cwd();
  const telDir = join(dir, TELEMETRY_DIR);
  mkdirSync(telDir, { recursive: true });

  const entry = {
    ts: new Date().toISOString(),
    skill: event.skill,
    duration_s: event.duration_s || 0,
    outcome: event.outcome || 'unknown',
    complexity: event.complexityLevel || null,
    tokens: event.tokensUsed || null,
    team: event.teamPreset || null,
  };

  try {
    appendFileSync(join(telDir, USAGE_FILE), JSON.stringify(entry) + '\n');
    log.info(`Telemetry: ${event.skill} → ${event.outcome} (${event.duration_s}s)`);
  } catch (err) {
    // Telemetry is best-effort, never crash
    log.warn(`Telemetry write failed: ${err.message}`);
  }
}

/**
 * Log a session start/end event.
 *
 * @param {object} event
 * @param {string} event.type - 'start' | 'end'
 * @param {string} event.sessionId
 * @param {number} [event.totalTokens]
 * @param {number} [event.totalSteps]
 * @param {number} [event.totalFiles]
 * @param {string} [event.pdcaStage]
 * @param {string} [projectDir]
 */
export function logSession(event, projectDir) {
  const dir = projectDir || process.cwd();
  const telDir = join(dir, TELEMETRY_DIR);
  mkdirSync(telDir, { recursive: true });

  const entry = {
    ts: new Date().toISOString(),
    type: event.type,
    sessionId: event.sessionId,
    tokens: event.totalTokens || null,
    steps: event.totalSteps || null,
    files: event.totalFiles || null,
    pdca: event.pdcaStage || null,
  };

  try {
    appendFileSync(join(telDir, SESSION_FILE), JSON.stringify(entry) + '\n');
  } catch (err) {
    log.warn(`Session telemetry write failed: ${err.message}`);
  }
}

/**
 * Read skill usage analytics.
 *
 * @param {string} [projectDir]
 * @param {number} [limit=50] - Max entries to return
 * @returns {Array<object>}
 */
export function readUsageLog(projectDir, limit = 50) {
  const dir = projectDir || process.cwd();
  const filePath = join(dir, TELEMETRY_DIR, USAGE_FILE);

  if (!existsSync(filePath)) return [];

  try {
    const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map(line => {
      try { return JSON.parse(line); }
      catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Generate usage summary statistics.
 *
 * @param {string} [projectDir]
 * @returns {object} Summary stats
 */
export function getUsageSummary(projectDir) {
  const entries = readUsageLog(projectDir, 1000);

  if (entries.length === 0) {
    return { totalSessions: 0, totalDuration: 0, skillBreakdown: {}, avgDuration: 0 };
  }

  const skillBreakdown = {};
  let totalDuration = 0;
  let totalTokens = 0;

  for (const entry of entries) {
    totalDuration += entry.duration_s || 0;
    totalTokens += entry.tokens || 0;

    if (!skillBreakdown[entry.skill]) {
      skillBreakdown[entry.skill] = { count: 0, totalDuration: 0, outcomes: {} };
    }
    skillBreakdown[entry.skill].count++;
    skillBreakdown[entry.skill].totalDuration += entry.duration_s || 0;

    const outcome = entry.outcome || 'unknown';
    skillBreakdown[entry.skill].outcomes[outcome] =
      (skillBreakdown[entry.skill].outcomes[outcome] || 0) + 1;
  }

  return {
    totalSessions: entries.length,
    totalDuration,
    totalTokens,
    avgDuration: Math.round(totalDuration / entries.length),
    skillBreakdown,
  };
}

/**
 * Format usage summary for display.
 *
 * @param {object} summary - Output of getUsageSummary()
 * @returns {string}
 */
export function formatUsageSummary(summary) {
  if (summary.totalSessions === 0) return 'No telemetry data yet.';

  const lines = [
    'aing Usage Summary:',
    `  Sessions: ${summary.totalSessions}`,
    `  Total time: ${Math.round(summary.totalDuration / 60)}m`,
    `  Avg per session: ${summary.avgDuration}s`,
    `  Est. tokens: ~${summary.totalTokens.toLocaleString()}`,
    '',
    'Skill breakdown:',
  ];

  const sorted = Object.entries(summary.skillBreakdown)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [skill, data] of sorted.slice(0, 10)) {
    const successRate = data.outcomes.success
      ? Math.round((data.outcomes.success / data.count) * 100) + '%'
      : '—';
    lines.push(`  ${skill}: ${data.count}x (${successRate} success, avg ${Math.round(data.totalDuration / data.count)}s)`);
  }

  return lines.join('\n');
}
