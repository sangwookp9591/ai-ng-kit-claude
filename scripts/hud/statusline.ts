#!/usr/bin/env node
/**
 * aing Status Line v1.0.0
 *
 * Minimal HUD for Claude Code status line.
 * Shows blinking colored dots for active agents + context %.
 *
 * Stdin JSON from Claude Code:
 *   { transcript_path, cwd, model, context_window, workspace }
 */

import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

// -- ANSI Colors --
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';
const BRIGHT_RED = '\x1b[91m';
const BRIGHT_GREEN = '\x1b[92m';
const BRIGHT_YELLOW = '\x1b[93m';
const BRIGHT_BLUE = '\x1b[94m';
const BRIGHT_MAGENTA = '\x1b[95m';

interface AgentDef {
  label: string;
  role: string;
  color: string;
}

interface ActiveAgent extends AgentDef {
  name: string;
  status: 'running' | 'done';
  model: string;
  spawnId: string;
}

interface StdinData {
  transcript_path?: string;
  cwd?: string;
  model?: string;
  context_window?: {
    used_percentage?: number;
    context_window_size?: number;
    current_usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  workspace?: string;
}

interface PdcaInfo {
  feature: string;
  stage: string;
}

interface VersionCache {
  latest?: string;
  checkedAt?: number;
}

// -- Agent definitions with ANSI colors --
const AGENTS: Record<string, AgentDef> = {
  sam:    { label: 'Sam',    role: 'CTO',       color: BRIGHT_MAGENTA },
  able:   { label: 'Able',   role: 'PM',        color: BRIGHT_BLUE },
  klay:   { label: 'Klay',   role: 'Architect', color: YELLOW },
  jay:    { label: 'Jay',    role: 'Backend',   color: BRIGHT_GREEN },
  jerry:  { label: 'Jerry',  role: 'DB',        color: CYAN },
  milla:  { label: 'Milla',  role: 'Security',  color: BRIGHT_RED },
  willji: { label: 'Willji', role: 'Design',    color: MAGENTA },
  derek:  { label: 'Derek',  role: 'Mobile',    color: BRIGHT_YELLOW },
  rowan:  { label: 'Rowan',  role: 'Motion',    color: WHITE },
  wizard: { label: 'Iron',   role: 'Frontend',  color: BLUE },
  executor: { label: 'Exec', role: 'Impl',    color: GREEN },
  planner:  { label: 'Plan', role: 'Plan',    color: BLUE },
  reviewer: { label: 'Rev',  role: 'Review',  color: RED },
};

// -- Blinking dot — alternates on each call via time --
function blinkDot(color: string): string {
  const tick = Math.floor(Date.now() / 500);
  if (tick % 2 === 0) {
    return `${color}●${RESET}`;
  } else {
    return `${color}${DIM}○${RESET}`;
  }
}


// -- Read stdin synchronously --
function readStdin(): StdinData | null {
  if (process.stdin.isTTY) return null;
  try {
    const chunks: string[] = [];
    const buf = Buffer.alloc(65536);
    let bytesRead: number;
    while ((bytesRead = readSync(0, buf, 0, buf.length, null)) > 0) {
      chunks.push(buf.subarray(0, bytesRead).toString('utf8'));
    }
    const raw = chunks.join('');
    return raw.trim() ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// -- Parse transcript tail for active aing agents --
function parseActiveAgents(transcriptPath?: string): ActiveAgent[] {
  if (!transcriptPath || !existsSync(transcriptPath)) return [];

  try {
    const stat = statSync(transcriptPath);
    const TAIL_SIZE = 256 * 1024;
    const startPos = Math.max(0, stat.size - TAIL_SIZE);

    const fd = openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(Math.min(TAIL_SIZE, stat.size));
    readSync(fd, buf, 0, buf.length, startPos);
    closeSync(fd);

    const text = buf.toString('utf8');
    const lines = text.split('\n').filter(Boolean);

    // Track agents: spawn = running, result = done
    const agentSpawns = new Map<string, string>();  // tool_use_id -> agent name
    const agentsByName = new Map<string, ActiveAgent>(); // name -> agent info

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Detect aing agent spawn
        if (entry.type === 'tool_use') {
          const input = entry.content?.input || entry.tool_input || {};
          const toolName = entry.content?.name || entry.tool_name || '';
          const toolUseId = entry.content?.id || entry.tool_use_id || '';

          if ((toolName === 'Agent' || toolName === 'Task') &&
              typeof input.subagent_type === 'string' &&
              input.subagent_type.startsWith('aing:')) {
            const agentKey = input.subagent_type.replace('aing:', '');
            const name = input.name || agentKey;
            const info = AGENTS[agentKey] || AGENTS[name] || { label: name, role: agentKey, color: CYAN };

            agentSpawns.set(toolUseId, name);
            agentsByName.set(name, {
              ...info,
              name,
              status: 'running',
              model: input.model || 'sonnet',
              spawnId: toolUseId,
            });
          }
        }

        // Detect agent completion (tool_result matching a spawn)
        if (entry.type === 'tool_result') {
          const toolUseId = entry.content?.tool_use_id || entry.tool_use_id || '';
          const agentName = agentSpawns.get(toolUseId);
          if (agentName && agentsByName.has(agentName)) {
            agentsByName.get(agentName)!.status = 'done';
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    return Array.from(agentsByName.values()).filter((a) => a.status === 'running');
  } catch {
    return [];
  }
}

// -- Version check (cached, non-blocking) --
const CURRENT_VERSION: string | null = (() => {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
    return JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  } catch { return null; }
})();

function getUpdateInfo(cwd: string): string | null {
  const cacheDir = join(cwd, '.aing', 'state');
  const cachePath = join(cacheDir, 'version-check.json');
  const CHECK_INTERVAL = 3600_000; // 1 hour

  try {
    // Read cache
    if (existsSync(cachePath)) {
      const cache: VersionCache = JSON.parse(readFileSync(cachePath, 'utf8'));
      const age = Date.now() - (cache.checkedAt || 0);

      // If cache is fresh, return cached result
      if (age < CHECK_INTERVAL) {
        if (cache.latest && cache.latest !== CURRENT_VERSION && isNewer(cache.latest, CURRENT_VERSION)) {
          return cache.latest;
        }
        return null;
      }
    }

    // Cache is stale or missing — trigger background check (non-blocking)
    const script = `
      const https = require('https');
      const fs = require('fs');
      const url = 'https://raw.githubusercontent.com/sangwookp9591/ai-ng-kit-claude/main/package.json';
      https.get(url, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const v = JSON.parse(data).version;
            const out = JSON.stringify({ latest: v, checkedAt: Date.now() });
            fs.mkdirSync('${cacheDir.replace(/'/g, "\\'")}', { recursive: true });
            fs.writeFileSync('${cachePath.replace(/'/g, "\\'")}', out);
          } catch {}
        });
      }).on('error', () => {});
    `;
    const child = execFile('node', ['-e', script], { detached: true } as object, () => {});
    child.unref();
    child.stdout?.destroy();
    child.stderr?.destroy();

    // Return cached value if exists (stale but better than nothing)
    if (existsSync(cachePath)) {
      const cache: VersionCache = JSON.parse(readFileSync(cachePath, 'utf8'));
      if (cache.latest && cache.latest !== CURRENT_VERSION && isNewer(cache.latest, CURRENT_VERSION)) {
        return cache.latest;
      }
    }
  } catch {}
  return null;
}

function isNewer(latest: string, current: string | null): boolean {
  if (!latest || !current) return false;
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

// -- Context percentage --
function getContextPercent(stdin: StdinData | null): number {
  const pct = stdin?.context_window?.used_percentage;
  if (typeof pct === 'number' && !Number.isNaN(pct)) {
    return Math.min(100, Math.max(0, Math.round(pct)));
  }
  const size = stdin?.context_window?.context_window_size;
  if (!size || size <= 0) return 0;
  const usage = stdin?.context_window?.current_usage;
  const total = (usage?.input_tokens ?? 0) +
                (usage?.cache_creation_input_tokens ?? 0) +
                (usage?.cache_read_input_tokens ?? 0);
  return Math.min(100, Math.round((total / size) * 100));
}

// -- Context indicator with color --
function contextIndicator(pct: number): string {
  if (pct >= 85) return `${RED}${pct}%${RESET}`;
  if (pct >= 70) return `${YELLOW}${pct}%${RESET}`;
  return `${GREEN}${pct}%${RESET}`;
}

// -- Team health status line --
interface TeamHealthSnapshot {
  workers?: Array<{ status: string }>;
  healthScore?: number;
  staleCount?: number;
  activeCount?: number;
}

/**
 * Returns a one-line team health summary, e.g.:
 *   "Team: 3 active, 1 stale, 2 done (score: 75)"
 * Reads .aing/state/team-health.json synchronously (HUD runs sync).
 * Returns null if no team health data exists.
 */
export function getTeamStatusLine(cwd: string): string | null {
  try {
    const healthPath = join(cwd, '.aing', 'state', 'team-health.json');
    if (!existsSync(healthPath)) return null;

    const raw = readFileSync(healthPath, 'utf-8');
    const health: TeamHealthSnapshot = JSON.parse(raw);
    if (!health.workers || health.workers.length === 0) return null;

    const active = health.workers.filter(w => w.status === 'active').length;
    const stale = health.workers.filter(w => w.status === 'stale').length;
    const done = health.workers.filter(w => w.status === 'completed' || w.status === 'failed').length;
    const score = health.healthScore ?? 100;

    const scoreColor = score >= 75 ? GREEN : score >= 50 ? YELLOW : RED;
    const staleStr = stale > 0 ? `, ${YELLOW}${stale} stale${RESET}` : '';

    return `Team: ${active} active${staleStr}, ${DIM}${done} done${RESET} (${scoreColor}score: ${score}${RESET})`;
  } catch {
    return null;
  }
}

// -- PDCA stage --
function getPdcaStage(cwd: string): PdcaInfo | null {
  try {
    const statePath = join(cwd, '.aing', 'state', 'pdca-status.json');
    if (!existsSync(statePath)) return null;
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    if (!state?.activeFeature) return null;
    const feat = state.features?.[state.activeFeature];
    return feat ? { feature: state.activeFeature, stage: feat.currentStage || 'plan' } : null;
  } catch {
    return null;
  }
}

// -- Main --
function main(): void {
  const stdin = readStdin();
  if (!stdin) {
    console.log(`${BOLD}aing${RESET}`);
    return;
  }

  const cwd = stdin.cwd || process.cwd();
  const parts: string[] = [];

  // aing brand
  parts.push(`${BOLD}aing${RESET}`);

  // Active agents with blinking dots
  const agents = parseActiveAgents(stdin.transcript_path);
  if (agents.length > 0) {
    const agentParts = agents.map((a) => {
      const dot = blinkDot(a.color);
      return `${dot} ${a.color}${a.label}${RESET}${DIM}(${a.role})${RESET}`;
    });
    parts.push(agentParts.join(' '));
  }

  // Team health
  const teamLine = getTeamStatusLine(cwd);
  if (teamLine) {
    parts.push(teamLine);
  }

  // PDCA stage
  const pdca = getPdcaStage(cwd);
  if (pdca) {
    const icons: Record<string, string> = { plan: '📋', do: '⚡', check: '✅', act: '🔄' };
    const icon = icons[pdca.stage] || '📌';
    parts.push(`${icon}${DIM}${pdca.stage}${RESET}`);
  }

  // Update notification
  const latestVersion = getUpdateInfo(cwd);
  if (latestVersion) {
    parts.push(`${BRIGHT_YELLOW}⬆ v${latestVersion}${RESET}`);
  }

  // Context %
  const pct = getContextPercent(stdin);
  if (pct > 0) {
    parts.push(contextIndicator(pct));
  }

  // Output with non-breaking spaces for terminal alignment
  const output = parts.join(` ${DIM}│${RESET} `);
  console.log(output.replace(/ /g, '\u00A0'));
}

main();
