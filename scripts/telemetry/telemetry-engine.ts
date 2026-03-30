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
import { appendFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';

const log = createLogger('telemetry');

const TELEMETRY_DIR = '.aing/telemetry';
const USAGE_FILE = 'skill-usage.jsonl';
const SESSION_FILE = 'sessions.jsonl';

const ROTATION_SIZE_BYTES = 1_048_576; // 1 MB
const ROTATION_AGE_MS = 30 * 24 * 60 * 60 * 1_000; // 30 days
const ROTATION_THROTTLE_MS = 60 * 60 * 1_000; // 1 hour

const _lastRotationCheck = new Map<string, number>();

function maybeRotate(filePath: string): void {
  const now = Date.now();
  const last = _lastRotationCheck.get(filePath) ?? 0;
  if (now - last < ROTATION_THROTTLE_MS) return;
  _lastRotationCheck.set(filePath, now);

  if (!existsSync(filePath)) return;

  try {
    const st = statSync(filePath);
    const shouldRotate = st.size >= ROTATION_SIZE_BYTES || (now - st.mtimeMs) >= ROTATION_AGE_MS;
    if (!shouldRotate) return;

    const backup = `${filePath}.old`;
    try { unlinkSync(backup); } catch { /* no prior backup */ }
    renameSync(filePath, backup);
  } catch {
    // Rotation is best-effort, never crash
  }
}

/**
 * Telemetry tiers.
 */
export const TELEMETRY_TIERS: Record<string, string> = {
  COMMUNITY: 'community',
  ANONYMOUS: 'anonymous',
  OFF: 'off',
};

interface SkillUsageEvent {
  skill: string;
  duration_s: number;
  outcome: string;
  complexityLevel?: string | null;
  tokensUsed?: number | null;
  teamPreset?: string | null;
}

interface UsageEntry {
  ts: string;
  skill: string;
  duration_s: number;
  outcome: string;
  complexity: string | null;
  tokens: number | null;
  team: string | null;
}

interface SessionEvent {
  type: 'start' | 'end';
  sessionId: string;
  totalTokens?: number;
  totalSteps?: number;
  totalFiles?: number;
  pdcaStage?: string;
}

interface SessionEntry {
  ts: string;
  type: string;
  sessionId: string;
  tokens: number | null;
  steps: number | null;
  files: number | null;
  pdca: string | null;
}

interface PendingMarker {
  ts: string;
  skill: string;
  sessionId: string;
  status: string;
}

interface SkillBreakdown {
  count: number;
  totalDuration: number;
  outcomes: Record<string, number>;
}

interface UsageSummary {
  totalSessions: number;
  totalDuration: number;
  totalTokens: number;
  avgDuration: number;
  skillBreakdown: Record<string, SkillBreakdown>;
}

/**
 * Log a skill usage event (always local, remote only if opted in).
 */
export function logSkillUsage(event: SkillUsageEvent, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const telDir = join(dir, TELEMETRY_DIR);
  mkdirSync(telDir, { recursive: true });

  const entry: UsageEntry = {
    ts: new Date().toISOString(),
    skill: event.skill,
    duration_s: event.duration_s || 0,
    outcome: event.outcome || 'unknown',
    complexity: event.complexityLevel || null,
    tokens: event.tokensUsed || null,
    team: event.teamPreset || null,
  };

  try {
    const usagePath = join(telDir, USAGE_FILE);
    maybeRotate(usagePath);
    appendFileSync(usagePath, JSON.stringify(entry) + '\n');
    log.info(`Telemetry: ${event.skill} -> ${event.outcome} (${event.duration_s}s)`);
  } catch (err: unknown) {
    // Telemetry is best-effort, never crash
    log.warn(`Telemetry write failed: ${(err as Error).message}`);
  }
}

/**
 * Log a session start/end event.
 */
export function logSession(event: SessionEvent, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const telDir = join(dir, TELEMETRY_DIR);
  mkdirSync(telDir, { recursive: true });

  const entry: SessionEntry = {
    ts: new Date().toISOString(),
    type: event.type,
    sessionId: event.sessionId,
    tokens: event.totalTokens || null,
    steps: event.totalSteps || null,
    files: event.totalFiles || null,
    pdca: event.pdcaStage || null,
  };

  try {
    const sessionPath = join(telDir, SESSION_FILE);
    maybeRotate(sessionPath);
    appendFileSync(sessionPath, JSON.stringify(entry) + '\n');
  } catch (err: unknown) {
    log.warn(`Session telemetry write failed: ${(err as Error).message}`);
  }
}

/**
 * Read skill usage analytics.
 */
export function readUsageLog(projectDir?: string, limit: number = 50): Record<string, unknown>[] {
  const dir = projectDir || process.cwd();
  const filePath = join(dir, TELEMETRY_DIR, USAGE_FILE);

  if (!existsSync(filePath)) return [];

  try {
    const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).map((line: string): Record<string, unknown> | null => {
      try { return JSON.parse(line); }
      catch { return null; }
    }).filter(Boolean) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

/**
 * Generate usage summary statistics.
 */
export function getUsageSummary(projectDir?: string): UsageSummary {
  const entries = readUsageLog(projectDir, 1000);

  if (entries.length === 0) {
    return { totalSessions: 0, totalDuration: 0, skillBreakdown: {}, avgDuration: 0, totalTokens: 0 };
  }

  const skillBreakdown: Record<string, SkillBreakdown> = {};
  let totalDuration = 0;
  let totalTokens = 0;

  for (const entry of entries) {
    totalDuration += (entry.duration_s as number) || 0;
    totalTokens += (entry.tokens as number) || 0;

    const skill = entry.skill as string;
    if (!skillBreakdown[skill]) {
      skillBreakdown[skill] = { count: 0, totalDuration: 0, outcomes: {} };
    }
    skillBreakdown[skill].count++;
    skillBreakdown[skill].totalDuration += (entry.duration_s as number) || 0;

    const outcome = (entry.outcome as string) || 'unknown';
    skillBreakdown[skill].outcomes[outcome] =
      (skillBreakdown[skill].outcomes[outcome] || 0) + 1;
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
 */
export function formatUsageSummary(summary: UsageSummary): string {
  if (summary.totalSessions === 0) return 'No telemetry data yet.';

  const lines: string[] = [
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
      : '--';
    lines.push(`  ${skill}: ${data.count}x (${successRate} success, avg ${Math.round(data.totalDuration / data.count)}s)`);
  }

  return lines.join('\n');
}

/**
 * Create a pending marker for crash recovery.
 */
export function createPendingMarker(sessionId: string, skill: string, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const telDir = join(dir, TELEMETRY_DIR);
  mkdirSync(telDir, { recursive: true });

  const marker: PendingMarker = {
    ts: new Date().toISOString(),
    skill,
    sessionId,
    status: 'pending',
  };

  try {
    const markerPath = join(telDir, `.pending-${sessionId}`);
    appendFileSync(markerPath, JSON.stringify(marker));
  } catch {
    // Best effort
  }
}

/**
 * Finalize pending marker (skill completed normally).
 */
export function finalizePendingMarker(sessionId: string, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const markerPath = join(dir, TELEMETRY_DIR, `.pending-${sessionId}`);

  try {
    if (existsSync(markerPath)) {
      unlinkSync(markerPath);
    }
  } catch {
    // Best effort
  }
}

/**
 * Recover any orphaned pending markers from crashed sessions.
 * Called at session start.
 */
export function recoverPendingMarkers(projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const telDir = join(dir, TELEMETRY_DIR);

  if (!existsSync(telDir)) return;

  try {
    const files = readdirSync(telDir).filter((f: string) => f.startsWith('.pending-'));

    for (const file of files) {
      const markerPath = join(telDir, file);
      try {
        const content = readFileSync(markerPath, 'utf-8');
        const marker: PendingMarker = JSON.parse(content);

        // Log the crashed session as 'unknown' outcome
        logSkillUsage({
          skill: marker.skill || 'unknown',
          duration_s: 0,
          outcome: 'unknown',
          complexityLevel: null,
          tokensUsed: null,
          teamPreset: null,
        }, projectDir);

        unlinkSync(markerPath);
      } catch {
        // Corrupt marker, just delete it
        try { unlinkSync(markerPath); } catch {}
      }
    }
  } catch {
    // Best effort recovery
  }
}
