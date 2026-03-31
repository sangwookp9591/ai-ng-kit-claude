/**
 * aing Adaptive Architect — Auto-design harnesses based on task analysis
 * Recommends architecture pattern, agents, model routing, and team size.
 * @module scripts/harness/adaptive-architect
 */

import { createLogger } from '../core/logger.js';
import { scoreComplexity, type ComplexitySignals } from '../routing/complexity-scorer.js';
import type {
  ArchitecturePattern,
  ExecutionMode,
  ArchitectureRecommendation,
  AgentRecommendation,
  HarnessBlueprint,
  DataFlowEdge,
} from './harness-types.js';

const log = createLogger('adaptive-architect');

// ─── Domain Keywords → Pattern Mapping ──────────────────────────

interface DomainProfile {
  pattern: ArchitecturePattern;
  executionMode: ExecutionMode;
  keywords: string[];
  agents: AgentTemplate[];
  description: string;
}

interface AgentTemplate {
  name: string;
  role: string;
  subagentType: string;
  model: string;
  skills: string[];
  required: boolean;
  minComplexity: number; // include when complexity >= this
}

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    pattern: 'fanout',
    executionMode: 'agent-team',
    keywords: ['리서치', 'research', '조사', '분석', 'analyze', 'survey', '탐색'],
    description: '병렬 조사 후 통합 보고서 생성',
    agents: [
      { name: 'primary-researcher', role: '핵심 자료 조사', subagentType: 'general-purpose', model: 'opus', skills: ['research'], required: true, minComplexity: 0 },
      { name: 'secondary-researcher', role: '보조 자료 조사', subagentType: 'general-purpose', model: 'opus', skills: ['research'], required: false, minComplexity: 4 },
      { name: 'background-researcher', role: '배경/경쟁 조사', subagentType: 'general-purpose', model: 'opus', skills: ['research'], required: false, minComplexity: 7 },
      { name: 'fact-checker', role: '사실 검증', subagentType: 'general-purpose', model: 'sonnet', skills: ['verify'], required: false, minComplexity: 8 },
    ],
  },
  {
    pattern: 'fanout',
    executionMode: 'agent-team',
    keywords: ['코드 리뷰', 'code review', '리뷰', 'review', 'PR', '풀리퀘', 'pull request'],
    description: '다관점 병렬 리뷰 후 통합 피드백',
    agents: [
      { name: 'security-reviewer', role: '보안 취약점 점검', subagentType: 'Explore', model: 'opus', skills: ['security-review'], required: true, minComplexity: 0 },
      { name: 'quality-reviewer', role: '코드 품질/패턴 리뷰', subagentType: 'Explore', model: 'opus', skills: ['code-review'], required: true, minComplexity: 0 },
      { name: 'performance-reviewer', role: '성능 영향 분석', subagentType: 'Explore', model: 'sonnet', skills: ['perf-review'], required: false, minComplexity: 5 },
      { name: 'test-reviewer', role: '테스트 커버리지 검증', subagentType: 'Explore', model: 'sonnet', skills: ['test-review'], required: false, minComplexity: 5 },
    ],
  },
  {
    pattern: 'pipeline',
    executionMode: 'agent-team',
    keywords: ['빌드', 'build', '개발', 'develop', '구현', 'implement', '만들어', '웹', 'web', '앱', 'app'],
    description: '설계 → 구현 → 테스트 → 검증 순차 파이프라인',
    agents: [
      { name: 'architect', role: '아키텍처 설계', subagentType: 'Plan', model: 'opus', skills: ['design'], required: true, minComplexity: 0 },
      { name: 'builder', role: '코드 구현', subagentType: 'general-purpose', model: 'opus', skills: ['implement'], required: true, minComplexity: 0 },
      { name: 'tester', role: '테스트 작성/실행', subagentType: 'general-purpose', model: 'sonnet', skills: ['test'], required: false, minComplexity: 4 },
      { name: 'qa-inspector', role: '통합 정합성 검증', subagentType: 'general-purpose', model: 'sonnet', skills: ['qa'], required: false, minComplexity: 7 },
    ],
  },
  {
    pattern: 'supervisor',
    executionMode: 'agent-team',
    keywords: ['마이그레이션', 'migration', '변환', 'convert', '리팩토링', 'refactor', '대규모', 'bulk'],
    description: '감독자가 파일/작업을 동적 분배',
    agents: [
      { name: 'supervisor', role: '파일 분석 + 배치 분배', subagentType: 'general-purpose', model: 'opus', skills: ['analyze', 'distribute'], required: true, minComplexity: 0 },
      { name: 'worker-1', role: '배치 A 실행', subagentType: 'general-purpose', model: 'sonnet', skills: ['migrate'], required: true, minComplexity: 0 },
      { name: 'worker-2', role: '배치 B 실행', subagentType: 'general-purpose', model: 'sonnet', skills: ['migrate'], required: false, minComplexity: 5 },
      { name: 'worker-3', role: '배치 C 실행', subagentType: 'general-purpose', model: 'sonnet', skills: ['migrate'], required: false, minComplexity: 8 },
    ],
  },
  {
    pattern: 'producer-reviewer',
    executionMode: 'sub-agent',
    keywords: ['생성', 'generate', '작성', 'write', '창작', 'create', '콘텐츠', 'content', '소설', '웹툰'],
    description: '생성 → 검증 → 재생성 루프',
    agents: [
      { name: 'creator', role: '콘텐츠 생성', subagentType: 'general-purpose', model: 'opus', skills: ['generate'], required: true, minComplexity: 0 },
      { name: 'reviewer', role: '품질 검증', subagentType: 'general-purpose', model: 'sonnet', skills: ['review'], required: true, minComplexity: 0 },
    ],
  },
  {
    pattern: 'expert-pool',
    executionMode: 'sub-agent',
    keywords: ['문의', 'support', '답변', 'answer', '분류', 'classify', '라우팅', 'routing'],
    description: '입력 유형에 따라 전문가 선택 호출',
    agents: [
      { name: 'router', role: '입력 분류 + 전문가 선택', subagentType: 'general-purpose', model: 'sonnet', skills: ['classify'], required: true, minComplexity: 0 },
      { name: 'expert-a', role: '도메인 A 전문가', subagentType: 'general-purpose', model: 'opus', skills: ['domain-a'], required: true, minComplexity: 0 },
      { name: 'expert-b', role: '도메인 B 전문가', subagentType: 'general-purpose', model: 'opus', skills: ['domain-b'], required: false, minComplexity: 4 },
    ],
  },
];

// ─── Task Analysis ──────────────────────────────────────────────

export function analyzeTask(
  taskDescription: string,
  signals: ComplexitySignals = {},
): ArchitectureRecommendation {
  const complexity = scoreComplexity(signals);
  const profile = matchDomain(taskDescription);
  const agents = selectAgents(profile, complexity.score);
  const teamSize = mapTeamSize(agents.length);
  const dataFlow = buildDataFlow(profile.pattern, agents);

  log.info('Task analyzed', {
    task: taskDescription.slice(0, 50),
    pattern: profile.pattern,
    complexity: complexity.score,
    agents: agents.length,
  });

  return {
    pattern: profile.pattern,
    executionMode: profile.executionMode,
    agents,
    teamSize,
    complexity: { score: complexity.score, level: complexity.level },
    reasoning: buildReasoning(profile, complexity, agents),
    dataFlow,
  };
}

function matchDomain(task: string): DomainProfile {
  const lower = task.toLowerCase();
  let bestMatch: DomainProfile | null = null;
  let bestScore = 0;

  for (const profile of DOMAIN_PROFILES) {
    let score = 0;
    for (const kw of profile.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = profile;
    }
  }

  // Default: pipeline for build tasks
  return bestMatch || DOMAIN_PROFILES[2];
}

function selectAgents(profile: DomainProfile, complexity: number): AgentRecommendation[] {
  return profile.agents
    .filter(t => t.required || complexity >= t.minComplexity)
    .map(t => ({
      name: t.name,
      role: t.role,
      subagentType: t.subagentType,
      model: t.model,
      skills: t.skills,
      required: t.required,
    }));
}

function mapTeamSize(agentCount: number): 'solo' | 'duo' | 'squad' | 'full' {
  if (agentCount <= 1) return 'solo';
  if (agentCount <= 2) return 'duo';
  if (agentCount <= 4) return 'squad';
  return 'full';
}

function buildDataFlow(pattern: ArchitecturePattern, agents: AgentRecommendation[]): DataFlowEdge[] {
  const edges: DataFlowEdge[] = [];
  const names = agents.map(a => a.name);

  switch (pattern) {
    case 'pipeline':
      for (let i = 0; i < names.length - 1; i++) {
        edges.push({
          source: names[i],
          target: names[i + 1],
          artifact: `_workspace/${String(i + 1).padStart(2, '0')}_${names[i]}_output.md`,
          phase: i + 1,
        });
      }
      break;

    case 'fanout':
      for (const name of names) {
        edges.push({
          source: 'input',
          target: name,
          artifact: 'task_description',
          phase: 1,
        });
        edges.push({
          source: name,
          target: 'integrator',
          artifact: `_workspace/${name}_result.md`,
          phase: 2,
        });
      }
      break;

    case 'supervisor':
      edges.push({ source: names[0], target: 'workers', artifact: 'batch_assignment', phase: 1 });
      for (const worker of names.slice(1)) {
        edges.push({ source: worker, target: names[0], artifact: `${worker}_report.md`, phase: 2 });
      }
      break;

    case 'producer-reviewer':
      if (names.length >= 2) {
        edges.push({ source: names[0], target: names[1], artifact: 'draft_output', phase: 1 });
        edges.push({ source: names[1], target: names[0], artifact: 'review_feedback', phase: 2 });
      }
      break;

    case 'expert-pool':
      if (names.length >= 2) {
        for (const expert of names.slice(1)) {
          edges.push({ source: names[0], target: expert, artifact: 'routed_query', phase: 1 });
        }
      }
      break;

    default:
      break;
  }

  return edges;
}

function buildReasoning(
  profile: DomainProfile,
  complexity: { score: number; level: string },
  agents: AgentRecommendation[],
): string {
  return [
    `패턴: ${profile.pattern} — ${profile.description}`,
    `복잡도: ${complexity.score}/15 (${complexity.level})`,
    `에이전트: ${agents.length}명 (필수 ${agents.filter(a => a.required).length}, 선택 ${agents.filter(a => !a.required).length})`,
    `실행 모드: ${profile.executionMode}`,
  ].join('\n');
}

// ─── Blueprint Generation ───────────────────────────────────────

export function generateBlueprint(
  rec: ArchitectureRecommendation,
  projectDir: string,
): HarnessBlueprint {
  const agentFiles = rec.agents.map(a => ({
    path: `${projectDir}/.claude/agents/${a.name}.md`,
    content: generateAgentFile(a, rec),
  }));

  const skillFiles = rec.agents
    .flatMap(a => a.skills)
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .map(s => ({
      path: `${projectDir}/.claude/skills/${s}/skill.md`,
      content: generateSkillStub(s),
    }));

  const orchestratorFile = {
    path: `${projectDir}/.claude/skills/${rec.pattern}-orchestrator/skill.md`,
    content: generateOrchestratorStub(rec),
  };

  return { recommendation: rec, agentFiles, skillFiles, orchestratorFile };
}

function generateAgentFile(agent: AgentRecommendation, rec: ArchitectureRecommendation): string {
  const teamSection = rec.executionMode === 'agent-team'
    ? `\n## 팀 통신 프로토콜\n- 메시지 수신: [리더로부터 작업 지시]\n- 메시지 발신: [리더에게 완료 보고, 관련 팀원에게 발견 공유]\n- 작업 요청: [공유 작업 목록에서 자신의 전문 영역 작업 요청]\n`
    : '';

  return `---
name: ${agent.name}
description: "${agent.role}"
---

# ${agent.name} — ${agent.role}

당신은 ${agent.role} 전문가입니다.

## 핵심 역할
1. ${agent.role}
2. 결과물을 구조화된 형식으로 산출

## 작업 원칙
- 증거 기반 작업 — 모든 주장에 근거를 첨부
- 품질 우선 — 속도보다 정확성
- 명확한 산출물 — 다음 단계 에이전트가 바로 사용 가능한 형태

## 입력/출력 프로토콜
- 입력: [이전 단계 산출물 또는 사용자 요청]
- 출력: \`_workspace/${agent.name}_output.md\`
- 형식: 마크다운
${teamSection}
## 에러 핸들링
- 입력 부족 시 리더에게 추가 정보 요청
- 작업 실패 시 부분 결과라도 산출물로 저장

## 협업
- 관련 발견 시 다른 팀원에게 공유
- 리더의 피드백을 반영하여 산출물 수정
`;
}

function generateSkillStub(skillName: string): string {
  return `---
name: ${skillName}
description: "${skillName} 작업을 수행하는 스킬."
---

# ${skillName}

## 워크플로우
1. 입력 분석
2. 작업 수행
3. 결과 검증
4. 산출물 저장
`;
}

function generateOrchestratorStub(rec: ArchitectureRecommendation): string {
  const agentTable = rec.agents
    .map(a => `| ${a.name} | ${a.subagentType} | ${a.role} | ${a.model} |`)
    .join('\n');

  return `---
name: ${rec.pattern}-orchestrator
description: "${rec.pattern} 패턴으로 에이전트 팀을 조율하는 오케스트레이터."
---

# ${rec.pattern} Orchestrator

## 실행 모드: ${rec.executionMode}

## 에이전트 구성

| 팀원 | 타입 | 역할 | 모델 |
|------|------|------|------|
${agentTable}

## 워크플로우

${rec.pattern === 'fanout' ? `### Phase 1: 병렬 실행\n모든 에이전트가 독립적으로 작업 수행\n\n### Phase 2: 통합\n리더가 산출물을 수집하여 종합 보고서 생성` : ''}
${rec.pattern === 'pipeline' ? `### Phase 1~N: 순차 실행\n각 에이전트가 이전 에이전트의 산출물을 받아 작업 수행` : ''}
${rec.pattern === 'supervisor' ? `### Phase 1: 분석 + 분배\n감독자가 작업을 분석하고 워커에게 배치 할당\n\n### Phase 2: 실행\n워커들이 할당된 배치 처리` : ''}
${rec.pattern === 'producer-reviewer' ? `### Phase 1: 생성\ncreator가 산출물 생성\n\n### Phase 2: 검증\nreviewer가 검수 → PASS/FIX/REDO 판정` : ''}

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| 에이전트 1명 실패 | 1회 재시도 후 부분 결과 사용 |
| 과반 실패 | 사용자 확인 후 진행 |

## 테스트 시나리오

### 정상 흐름
1. 입력 분석 → 팀 구성 → 실행 → 통합 → 정리

### 에러 흐름
1. 실행 중 에이전트 실패 → 재시도 → 부분 결과로 진행
`;
}

// ─── Display ────────────────────────────────────────────────────

export function formatRecommendation(rec: ArchitectureRecommendation): string {
  const lines: string[] = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '  aing harness: 자동 설계 결과',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `  패턴: ${rec.pattern} (${rec.executionMode})`,
    `  복잡도: ${rec.complexity.score}/15 (${rec.complexity.level})`,
    `  팀 규모: ${rec.teamSize} (${rec.agents.length}명)`,
    '',
    '  Agent        Role              Model    Required',
    '  ─────        ────              ─────    ────────',
  ];

  for (const a of rec.agents) {
    const name = a.name.padEnd(13);
    const role = a.role.slice(0, 18).padEnd(18);
    const model = a.model.padEnd(9);
    lines.push(`  ${name}${role}${model}${a.required ? 'yes' : 'no'}`);
  }

  lines.push('');
  lines.push('  Data Flow:');
  for (const e of rec.dataFlow.slice(0, 6)) {
    lines.push(`    ${e.source} → ${e.target}: ${e.artifact}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return lines.join('\n');
}
