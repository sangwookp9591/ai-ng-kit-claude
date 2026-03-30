/**
 * aing Cost Reporter
 * 비용/토큰 사용량을 인간 친화적으로 보고합니다.
 * @module scripts/evidence/cost-reporter
 */

import { readStateOrDefault } from '../core/state.js';
import { join } from 'node:path';

interface ModelCost {
  input: number;
  output: number;
}

// Claude Code 모델별 예상 비용 (per 1M tokens, 2026 기준)
const MODEL_COSTS: Record<string, ModelCost> = {
  opus:   { input: 15,   output: 75   },
  sonnet: { input: 3,    output: 15   },
  haiku:  { input: 0.25, output: 1.25 }
};

// action당 평균 추정 토큰
const TOKENS_PER_ACTION = 2000;

export interface AgentStats {
  actions: number;
  reads: number;
  writes: number;
  errors: number;
  estimatedTokens: number;
}

export interface CostTotals {
  actions: number;
  estimatedTokens: number;
  estimatedCostUSD: number;
}

interface CostTrackerData {
  sessions: unknown[];
  total: Record<string, unknown>;
  tokensUsed: number;
  apiCalls: number;
  sessionStart?: string;
}

interface TraceAgentSummary {
  actions?: number;
  reads?: number;
  writes?: number;
  errors?: number;
}

interface TraceData {
  events: unknown[];
  summary: Record<string, TraceAgentSummary>;
}

export interface CostReport {
  timestamp: string;
  agents: Record<string, AgentStats>;
  totals: CostTotals;
  costTracker: CostTrackerData;
}

/**
 * 비용 보고서를 생성합니다.
 */
export function generateCostReport(projectDir?: string): CostReport {
  const dir = projectDir || process.cwd();
  const costPath  = join(dir, '.aing', 'state', 'cost-tracker.json');
  const tracePath = join(dir, '.aing', 'state', 'agent-traces.json');

  const costData  = readStateOrDefault(costPath,  { sessions: [], total: {}, tokensUsed: 0, apiCalls: 0 }) as CostTrackerData;
  const traceData = readStateOrDefault(tracePath, { events: [], summary: {} }) as TraceData;

  // 에이전트별 활동 기반 추정
  const agentStats: Record<string, AgentStats> = {};
  for (const [agent, stats] of Object.entries(traceData.summary || {})) {
    const actions = stats.actions || 0;
    agentStats[agent] = {
      actions,
      reads:  stats.reads  || 0,
      writes: stats.writes || 0,
      errors: stats.errors || 0,
      estimatedTokens: actions * TOKENS_PER_ACTION
    };
  }

  const totalActions         = Object.values(agentStats).reduce((s, a) => s + a.actions, 0);
  const totalEstimatedTokens = Object.values(agentStats).reduce((s, a) => s + a.estimatedTokens, 0);
  // sonnet output 단가 기준 (추정치)
  const estimatedCostUSD = (totalEstimatedTokens / 1_000_000) * MODEL_COSTS.sonnet.output;

  return {
    timestamp: new Date().toISOString(),
    agents: agentStats,
    totals: {
      actions: totalActions,
      estimatedTokens: totalEstimatedTokens,
      estimatedCostUSD
    },
    costTracker: costData
  };
}

/**
 * 보고서를 사람이 읽기 쉬운 문자열로 포맷합니다.
 */
export function formatCostReport(report: CostReport): string {
  const lines: string[] = [
    '━━━ aing Cost Report (Est.) ━━━',
    '',
    `Generated: ${new Date(report.timestamp).toLocaleString()}`
  ];

  // costTracker 세션 정보
  const tracker = report.costTracker;
  if (tracker.sessionStart) {
    const elapsed = Math.round((Date.now() - new Date(tracker.sessionStart).getTime()) / 60000);
    lines.push(`Session: ${elapsed}min elapsed`);
    if (tracker.apiCalls != null) {
      lines.push(`API Calls: ${tracker.apiCalls}`);
    }
  }

  lines.push('');

  // Agent breakdown
  if (Object.keys(report.agents).length > 0) {
    lines.push('Agent Activity:');
    for (const [agent, stats] of Object.entries(report.agents)) {
      const tokens = (stats.estimatedTokens / 1000).toFixed(1);
      lines.push(`  ${agent}: ${stats.actions} actions (~${tokens}k tokens est.)`);
    }
    lines.push('');
  }

  // Totals
  lines.push('Totals:');
  lines.push(`  Actions:    ${report.totals.actions}`);
  lines.push(`  Est. Tokens: ${(report.totals.estimatedTokens / 1000).toFixed(1)}k`);
  lines.push(`  Est. Cost:  $${report.totals.estimatedCostUSD.toFixed(4)}`);
  lines.push('');
  lines.push('* 비용은 추정치입니다. 정확한 사용량은 Anthropic Console에서 확인하세요.');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return lines.join('\n');
}

/**
 * Generate a compact cost summary for stop hook display (3 lines max).
 */
export function formatCompactSummary(projectDir?: string): string {
  const report = generateCostReport(projectDir);
  const t = report.totals;
  if (t.actions === 0) return 'Cost: no agent activity recorded';
  const tokens = (t.estimatedTokens / 1000).toFixed(1);
  const cost = t.estimatedCostUSD.toFixed(4);
  const agentCount = Object.keys(report.agents).length;
  return `Cost: ${agentCount} agents, ${t.actions} actions, ~${tokens}k tokens (~$${cost})`;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectDir = process.env.PROJECT_DIR || process.cwd();
  const report = generateCostReport(projectDir);
  console.log(formatCostReport(report));
}
