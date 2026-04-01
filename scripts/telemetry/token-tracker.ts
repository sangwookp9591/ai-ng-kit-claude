/**
 * aing Token Tracker — Agent/Stage Token Usage Logging
 *
 * Tracks per-agent, per-stage token consumption across pipeline runs.
 * Designed for Completion Report inclusion.
 *
 * @module scripts/telemetry/token-tracker
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';

const log = createLogger('token-tracker');

export const TELEMETRY_DIR = '.aing/telemetry';
export const TOKEN_FILE = 'token-usage.jsonl';

export interface TokenUsageEntry {
  ts: string;
  agent: string;
  stage: string;       // 'plan' | 'exec' | 'verify' | 'fix' | 'other'
  model?: string;      // 'opus' | 'sonnet' | 'haiku'
  totalTokens: number | null;
  toolUses: number | null;
  durationMs: number | null;
}

export interface TokenSummary {
  byStage: Record<string, { tokens: number; agents: number; duration: number; agentTokens: Record<string, number> }>;
  byAgent: Record<string, { tokens: number; tasks: number; duration: number }>;
  total: { tokens: number; agents: number; duration: number };
}

/**
 * Append a token usage entry to the JSONL file.
 * Best-effort: never throws; logs warn on failure.
 */
export function logTokenUsage(entry: TokenUsageEntry, projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const telDir = join(dir, TELEMETRY_DIR);

  try {
    mkdirSync(telDir, { recursive: true });
    const filePath = join(telDir, TOKEN_FILE);
    appendFileSync(filePath, JSON.stringify(entry) + '\n');
    log.info(`Token: ${entry.agent}/${entry.stage} ${entry.totalTokens ?? 0} tokens`);
  } catch (err: unknown) {
    log.warn(`Token usage write failed: ${(err as Error).message}`);
  }
}

/**
 * Read and aggregate token usage from JSONL file.
 * null values are treated as 0.
 */
export function getTokenSummary(projectDir?: string): TokenSummary {
  const dir = projectDir || process.cwd();
  const filePath = join(dir, TELEMETRY_DIR, TOKEN_FILE);

  const empty: TokenSummary = {
    byStage: {},
    byAgent: {},
    total: { tokens: 0, agents: 0, duration: 0 },
  };

  if (!existsSync(filePath)) return empty;

  let entries: TokenUsageEntry[];
  try {
    const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
    entries = lines.map((line): TokenUsageEntry | null => {
      try { return JSON.parse(line) as TokenUsageEntry; }
      catch { return null; }
    }).filter((e): e is TokenUsageEntry => e !== null);
  } catch {
    return empty;
  }

  if (entries.length === 0) return empty;

  const byStage: Record<string, { tokens: number; agents: number; duration: number; agentTokens: Record<string, number> }> = {};
  const byAgent: Record<string, { tokens: number; tasks: number; duration: number }> = {};
  const agentSet = new Set<string>();
  let totalTokens = 0;
  let totalDuration = 0;

  for (const entry of entries) {
    const tokens = entry.totalTokens ?? 0;
    const duration = entry.durationMs ?? 0;
    const { agent, stage } = entry;

    // byStage
    if (!byStage[stage]) byStage[stage] = { tokens: 0, agents: 0, duration: 0, agentTokens: {} };
    byStage[stage].tokens += tokens;
    byStage[stage].duration += duration;
    byStage[stage].agentTokens[agent] = (byStage[stage].agentTokens[agent] ?? 0) + tokens;

    // byAgent
    if (!byAgent[agent]) byAgent[agent] = { tokens: 0, tasks: 0, duration: 0 };
    byAgent[agent].tokens += tokens;
    byAgent[agent].tasks += 1;
    byAgent[agent].duration += duration;

    agentSet.add(agent);
    totalTokens += tokens;
    totalDuration += duration;
  }

  // agents per stage = unique agent count in agentTokens
  for (const stage of Object.keys(byStage)) {
    byStage[stage].agents = Object.keys(byStage[stage].agentTokens).length;
  }

  return {
    byStage,
    byAgent,
    total: { tokens: totalTokens, agents: agentSet.size, duration: totalDuration },
  };
}

/**
 * Format token summary as human-readable text for Completion Reports.
 *
 * Example output:
 *   Token Usage:
 *     plan:   ~12.3k tokens (Ryan 8k, Able 4k)
 *     exec:   ~84.5k tokens (Jay 45k, Derek 39k)
 *     total:  ~96.8k tokens
 */
export function formatTokenReport(summary: TokenSummary): string {
  if (summary.total.tokens === 0 && Object.keys(summary.byStage).length === 0) {
    return 'Token Usage: no data';
  }

  function fmt(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  const lines: string[] = ['Token Usage:'];

  const stageOrder = ['plan', 'exec', 'verify', 'fix', 'other'];
  const stages = [
    ...stageOrder.filter(s => summary.byStage[s]),
    ...Object.keys(summary.byStage).filter(s => !stageOrder.includes(s)),
  ];

  for (const stage of stages) {
    const stageData = summary.byStage[stage];
    if (!stageData) continue;

    const label = stage.padEnd(6);

    // Build agent breakdown string: "Jay 45k, Derek 39k"
    const agentBreakdown = Object.entries(stageData.agentTokens)
      .sort((a, b) => b[1] - a[1])
      .map(([name, t]) => `${name} ${fmt(t)}`)
      .join(', ');

    const breakdown = agentBreakdown ? ` (${agentBreakdown})` : '';
    lines.push(`  ${label}  ~${fmt(stageData.tokens)} tokens${breakdown}`);
  }

  lines.push(`  total   ~${fmt(summary.total.tokens)} tokens`);
  return lines.join('\n');
}

/**
 * Delete the token usage file (for testing / reset).
 */
export function clearTokenUsage(projectDir?: string): void {
  const dir = projectDir || process.cwd();
  const filePath = join(dir, TELEMETRY_DIR, TOKEN_FILE);
  try {
    if (existsSync(filePath)) unlinkSync(filePath);
  } catch {
    // best effort
  }
}
