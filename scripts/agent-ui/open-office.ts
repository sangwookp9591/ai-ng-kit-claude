#!/usr/bin/env node
/**
 * aing agent-ui: Open 3D Office with session context
 *
 * Passes current session info + active agents as URL query params
 * so the office view can connect to this Claude Code session.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const CLOUD_URL = 'https://office.sw-world.site';

interface AgentInfo {
  name: string;
  actions: number;
  status: string;
}

interface PipelineInfo {
  phase: string | null;
  task: string | null;
  progress: unknown | null;
}

interface AutoRunInfo {
  task: string | null;
  agents: unknown[];
  status: string;
}

interface AgentTraces {
  summary?: Record<string, { actions?: number; errors?: number }>;
}

interface PipelineState {
  phase?: string;
  currentPhase?: string;
  task?: string;
  currentTask?: string;
  progress?: unknown;
}

interface AutoRunState {
  task?: string;
  description?: string;
  agents?: unknown[];
  workers?: unknown[];
  status?: string;
}

function getProjectDir(): string {
  return process.env.PROJECT_DIR || process.cwd();
}

function getSessionId(): string | null {
  return process.env.SESSION_ID || process.env.CLAUDE_SESSION_ID || null;
}

function getActiveAgents(projectDir: string): AgentInfo[] {
  const tracePath = join(projectDir, '.aing', 'state', 'agent-traces.json');
  if (!existsSync(tracePath)) return [];

  try {
    const data: AgentTraces = JSON.parse(readFileSync(tracePath, 'utf-8'));
    if (!data.summary) return [];

    return Object.entries(data.summary).map(([name, stats]) => ({
      name,
      actions: stats.actions || 0,
      status: stats.errors! > 0 ? 'error' : 'active'
    }));
  } catch {
    return [];
  }
}

function getPipelineState(projectDir: string): PipelineInfo | null {
  const statePath = join(projectDir, '.aing', 'state', 'pipeline-state.json');
  if (!existsSync(statePath)) return null;

  try {
    const data: PipelineState = JSON.parse(readFileSync(statePath, 'utf-8'));
    return {
      phase: data.phase || data.currentPhase || null,
      task: data.task || data.currentTask || null,
      progress: data.progress || null
    };
  } catch {
    return null;
  }
}

function getAutoRunState(projectDir: string): AutoRunInfo | null {
  const stateDir = join(projectDir, '.aing', 'state');
  if (!existsSync(stateDir)) return null;

  try {
    const files = readdirSync(stateDir)
      .filter((f: string) => f.startsWith('auto-run-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const data: AutoRunState = JSON.parse(readFileSync(join(stateDir, files[0]), 'utf-8'));
    return {
      task: data.task || data.description || null,
      agents: data.agents || data.workers || [],
      status: data.status || 'unknown'
    };
  } catch {
    return null;
  }
}

// Build URL with session context
const projectDir: string = getProjectDir();
const projectName: string = projectDir.split('/').pop()!;
const sessionId: string | null = getSessionId();
const agents: AgentInfo[] = getActiveAgents(projectDir);
const pipeline: PipelineInfo | null = getPipelineState(projectDir);
const autoRun: AutoRunInfo | null = getAutoRunState(projectDir);

const params = new URLSearchParams();

// Session identity
if (sessionId) params.set('session', sessionId);
params.set('project', projectName);
params.set('user', process.env.SWKIT_AGENT_NAME || process.env.USER || 'unknown');
params.set('team', process.env.SWKIT_TEAM_ID || 'default');

// Active agents
if (agents.length > 0) {
  params.set('agents', JSON.stringify(agents));
}

// Pipeline state
if (pipeline) {
  params.set('pipeline', JSON.stringify(pipeline));
}

// Auto-run state
if (autoRun) {
  params.set('autorun', JSON.stringify(autoRun));
}

// Timestamp for freshness
params.set('ts', Date.now().toString());

const url = `${CLOUD_URL}?${params.toString()}`;

console.log(`Opening 3D Agent Office in browser...`);
console.log(`  Project: ${projectName}`);
console.log(`  Session: ${sessionId || '(auto)'}`);
console.log(`  Agents: ${agents.length > 0 ? agents.map((a) => a.name).join(', ') : '(none)'}`);
if (pipeline) console.log(`  Pipeline: ${pipeline.phase || 'idle'}`);
console.log('');

// Open browser (macOS)
execFileSync('open', [url]);
