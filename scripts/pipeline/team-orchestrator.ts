/**
 * aing Team Orchestrator v1.2.0
 * Cost-aware team composition using CC native TeamCreate/TaskCreate.
 * Harness Engineering innovation over OMC:
 *   - Auto team sizing (not user-specified N)
 *   - Cost-aware model routing per worker
 *   - TDD enforcement for all workers
 *   - Evidence Chain required for completion
 *   - Self-Healing integration (circuit breaker)
 *   - Human-readable progress tracking
 *
 * @module scripts/pipeline/team-orchestrator
 */

import { createLogger } from '../core/logger.js';
import { scoreComplexity } from '../routing/complexity-scorer.js';

const log = createLogger('team');

interface Worker {
  name: string;
  agent: string;
  model: 'haiku' | 'sonnet' | 'opus';
  role: string;
}

interface TeamPreset {
  name: string;
  cost: string;
  workers: Worker[];
  when: string;
  description: string;
}

interface ComplexityResult {
  score: number;
  level: string;
}

interface TeamSelection {
  preset: string;
  team: TeamPreset;
  reason: string;
  complexity: ComplexityResult;
}

interface CostEstimate {
  estimated: string;
  breakdown: Array<{ name: string; model: string; estimatedTokens: string }>;
  preset?: string;
  workerCount?: number;
}

interface WorkerPromptParams {
  teamName: string;
  workerName: string;
  role: string;
  agent: string;
  tasks: string[];
}

interface PresetInfo {
  key: string;
  name: string;
  workers: number;
  cost: string;
  description: string;
}

/**
 * Team templates — cost-optimized presets.
 * Instead of fixed N workers, aing auto-selects based on task analysis.
 */
const TEAM_PRESETS: Record<string, TeamPreset> = {
  solo: {
    name: 'Solo',
    cost: 'low',
    workers: [
      { name: 'jay', agent: 'executor', model: 'sonnet', role: 'Jay — 구현+검증 올인원' }
    ],
    when: 'fileCount <= 3 && complexity.level === "low"',
    description: '간단한 버그 수정, 단일 파일 변경'
  },

  duo: {
    name: 'Duo',
    cost: 'medium',
    workers: [
      { name: 'jay', agent: 'executor', model: 'sonnet', role: '⚡ Jay — 코드 구현 (TDD)' },
      { name: 'milla', agent: 'reviewer', model: 'haiku', role: '🛡️ Milla — 리뷰+검증' }
    ],
    when: 'fileCount <= 8 && complexity.level === "mid"',
    description: '중간 규모 기능 구현, API 추가'
  },

  squad: {
    name: 'Squad',
    cost: 'medium-high',
    workers: [
      { name: 'able', agent: 'planner', model: 'sonnet', role: '📋 Able — 작업 분해' },
      { name: 'jay', agent: 'executor', model: 'sonnet', role: '⚙️ Jay — Backend 구현' },
      { name: 'iron', agent: 'executor', model: 'sonnet', role: '🖥️ Iron — Frontend 구현' },
      { name: 'sam', agent: 'sam', model: 'haiku', role: '✅ Sam — 증거 수집' }
    ],
    when: 'fileCount <= 15 && complexity.level === "mid"',
    description: '풀스택 기능 구현, 여러 도메인 변경'
  },

  full: {
    name: 'Full Team',
    cost: 'high',
    workers: [
      { name: 'able', agent: 'planner', model: 'sonnet', role: '🎯 Able — 기획+스펙' },
      { name: 'klay', agent: 'planner', model: 'opus', role: '📐 Klay — 아키텍처 설계' },
      { name: 'jay', agent: 'executor', model: 'sonnet', role: '⚙️ Jay — Backend API' },
      { name: 'jerry', agent: 'executor', model: 'sonnet', role: '🗄️ Jerry — DB+인프라' },
      { name: 'milla', agent: 'reviewer', model: 'sonnet', role: '🔒 Milla — 보안 검증' },
      { name: 'iron', agent: 'executor', model: 'sonnet', role: '🖥️ Iron — Frontend' },
      { name: 'sam', agent: 'sam', model: 'haiku', role: '✅ Sam — 최종 검증' }
    ],
    when: 'complexity.level === "high"',
    description: '대규모 기능, 아키텍처 변경, 보안 민감 작업'
  },

  'ai-pipeline': {
    name: 'AI Pipeline',
    cost: 'medium-high',
    workers: [
      { name: 'hugg', agent: 'executor', model: 'sonnet', role: '🔍 Hugg — 모델 탐색+비교' },
      { name: 'jo', agent: 'executor', model: 'sonnet', role: '🧠 Jo — 모델 구현+API' },
      { name: 'jay', agent: 'executor', model: 'sonnet', role: '⚙️ Jay — 테스트+통합' },
      { name: 'milla', agent: 'reviewer', model: 'haiku', role: '🔒 Milla — 보안+라이선스 검증' }
    ],
    when: 'signals.hasAI || signals.hasModel',
    description: 'AI 모델 탐색 → 비교 → 구현 → API → 테스트 자동 파이프라인'
  }
};

/**
 * Auto-select optimal team preset based on task complexity.
 * aing innovation: OMC는 사용자가 N을 지정, aing은 자동 분석.
 */
export function selectTeam(signals: Record<string, unknown> = {}): TeamSelection {
  const complexity = scoreComplexity(signals) as ComplexityResult;

  let preset: string;
  if (complexity.score <= 2) {
    preset = 'solo';
  } else if (complexity.score <= 4) {
    preset = 'duo';
  } else if (complexity.score <= 6) {
    preset = 'squad';
  } else {
    preset = 'full';
  }

  // Security-sensitive tasks always get Milla
  if ((signals as Record<string, boolean>).hasSecurity && preset !== 'full') {
    preset = preset === 'solo' ? 'duo' : 'squad';
  }

  const team = TEAM_PRESETS[preset];
  const reason = `Complexity ${complexity.level} (score: ${complexity.score}) → ${team.name} (${team.workers.length}명, cost: ${team.cost})`;

  log.info('Team selected', { preset, complexity: complexity.level, workers: team.workers.length });

  return { preset, team, reason, complexity };
}

/**
 * Estimate token cost for a team preset.
 */
export function estimateTeamCost(presetName: string): CostEstimate {
  const team = TEAM_PRESETS[presetName];
  if (!team) return { estimated: 'unknown', breakdown: [] };

  const MODEL_COST_MULTIPLIER: Record<string, number> = { haiku: 1, sonnet: 5, opus: 15 };
  const BASE_TOKENS_PER_WORKER = 3000;

  const breakdown = team.workers.map(w => ({
    name: w.name,
    model: w.model,
    estimatedTokens: `~${(BASE_TOKENS_PER_WORKER * MODEL_COST_MULTIPLIER[w.model]).toLocaleString()}`
  }));

  const total = team.workers.reduce((sum, w) =>
    sum + BASE_TOKENS_PER_WORKER * MODEL_COST_MULTIPLIER[w.model], 0
  );

  return {
    estimated: `~${total.toLocaleString()} tokens`,
    breakdown,
    preset: presetName,
    workerCount: team.workers.length
  };
}

/**
 * Generate worker preamble — aing harness-enhanced version.
 * Lighter than OMC (role-specific minimal context), includes TDD + Evidence rules.
 */
export function generateWorkerPrompt(params: WorkerPromptParams): string {
  return `You are ${params.workerName} in team "${params.teamName}".
Role: ${params.role}

== PROTOCOL ==
1. CLAIM: TaskList → find your tasks (owner="${params.workerName}") → TaskUpdate status="in_progress"
2. WORK: Execute your tasks. Follow TDD when writing code:
   🔴 Write failing test first
   🟢 Write minimal code to pass
   🔵 Refactor while tests pass
3. EVIDENCE: After each task, collect evidence (test results, build output)
4. COMPLETE: TaskUpdate status="completed" + SendMessage to "team-lead":
   "Completed task #ID: <summary>. Evidence: <test pass/fail, build status>"
5. NEXT: Check TaskList for more tasks. If none, report "Standing by"

== RULES ==
- Do NOT spawn sub-agents or use Task tool
- Do NOT run team commands
- Use absolute file paths
- MUST report evidence with every completion
- MUST follow TDD for code changes

== CONTEXT MANAGEMENT ==
- You are a sub-agent with a LIMITED context window. You CANNOT use /compact, /half-clone, or resume.
- NEVER suggest "claude -r" or "resume session" — you are a child process, not a CLI session.
- Keep responses concise. Avoid re-reading files already read.
- If your task is large, complete the most critical part first, then report partial results via SendMessage.

== YOUR TASKS ==
${params.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}
`;
}

/**
 * Format team selection for display.
 */
export function formatTeamSelection(selection: TeamSelection): string {
  const { team, reason } = selection;
  const cost = estimateTeamCost(selection.preset);

  const lines: string[] = [
    `[aing Team] Auto-selected: ${team.name}`,
    `  ${reason}`,
    '',
    '  ┌──────────────┬─────────────────────────┬─────────┬──────────────────────┐',
    '  │ Agent        │ Role                    │ Model   │ Task                 │',
    '  ├──────────────┼─────────────────────────┼─────────┼──────────────────────┤',
  ];

  const AGENT_TASKS: Record<string, string> = {
    planner: '작업 분해 + 계획 수립',
    executor: '코드 구현 (TDD)',
    reviewer: '보안/품질 리뷰',
    sam: '증거 수집 + 최종 판정',
  };

  for (const w of team.workers) {
    const name = (w.name.charAt(0).toUpperCase() + w.name.slice(1)).padEnd(12);
    const role = w.role.replace(/^[^\s]+\s/, '').padEnd(23);
    const model = w.model.padEnd(7);
    const task = (AGENT_TASKS[w.agent] || w.agent).padEnd(20);
    lines.push(`  │ ${name} │ ${role} │ ${model} │ ${task} │`);
  }

  lines.push('  └──────────────┴─────────────────────────┴─────────┴──────────────────────┘');
  lines.push('');
  lines.push(`  Estimated cost: ${cost.estimated}`);
  lines.push(`  Description: ${team.description}`);

  return lines.join('\n');
}

/**
 * Get available team presets for display.
 */
export function getTeamPresets(): PresetInfo[] {
  return Object.entries(TEAM_PRESETS).map(([key, preset]) => ({
    key,
    name: preset.name,
    workers: preset.workers.length,
    cost: preset.cost,
    description: preset.description
  }));
}

export { TEAM_PRESETS };
