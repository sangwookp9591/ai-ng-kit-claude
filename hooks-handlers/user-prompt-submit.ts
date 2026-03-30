/**
 * aing UserPromptSubmit Hook v1.6.0
 * Intent detection + Team size recommendation + Agent guidance
 * + Keyword routing + Active session injection + Plan existence detection.
 */
import { readStdinJSON } from '../scripts/core/stdin.js';
import { detectIntent } from '../scripts/i18n/intent-detector.js';
import { selectTeam, estimateTeamCost } from '../scripts/pipeline/team-orchestrator.js';
import { getActiveSession, sanitizeSessionField } from '../scripts/core/session-reader.js';
import { trackInjection, trimToTokenBudget } from '../scripts/core/context-budget.js';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Keyword -> Skill routing table
// ---------------------------------------------------------------------------

interface KeywordRoute {
  keywords: string[];
  skill: string;
  message: string;
}

const KEYWORD_ROUTES: KeywordRoute[] = [
  {
    keywords: ['debug', '디버그', '버그', 'bug', '에러', 'error', '오류', '안돼', '안됨', 'fix bug'],
    skill: 'debug',
    message: '[SKILL SUGGESTION: /aing debug] — Use the scientific debugging workflow.',
  },
  {
    keywords: ['qa', 'test loop', '테스트루프', '테스트 반복'],
    skill: 'qa-loop',
    message: '[SKILL SUGGESTION: /aing qa] — Start QA cycle (test->fix->repeat).',
  },
  {
    keywords: ['plan', '계획', '기획', '설계'],
    skill: 'plan-task',
    message: '[SKILL SUGGESTION: /aing plan] — Klay(Architect) will create a plan.',
  },
  {
    keywords: ['review', '리뷰', '코드리뷰', 'code review'],
    skill: 'review-code',
    message: '[SKILL SUGGESTION: /aing review] — Milla(Security) + Sam(CTO) review.',
  },
  {
    keywords: ['rollback', '롤백', 'undo', '되돌리기', 'revert'],
    skill: 'rollback',
    message: '[SKILL SUGGESTION: /aing rollback] — Rollback to last checkpoint.',
  },
];

// Keywords that indicate the user wants to execute / run something
const EXECUTION_KEYWORDS: string[] = [
  'run', 'execute', 'start', 'begin', 'do', 'implement', 'build',
  '실행', '시작', '구현', '빌드', '진행',
];

/**
 * Match prompt against keyword routes.
 * Returns all matching route messages (deduped).
 */
function detectKeywordRoutes(promptLower: string): string[] {
  const matches: string[] = [];
  for (const route of KEYWORD_ROUTES) {
    if (route.keywords.some((kw: string) => promptLower.includes(kw))) {
      matches.push(route.message);
    }
  }
  return matches;
}

/**
 * Find the most recent plan file in .aing/plans/.
 * Returns filename or null.
 */
function findLatestPlan(projectDir: string): string | null {
  const plansDir = join(projectDir, '.aing', 'plans');
  if (!existsSync(plansDir)) return null;
  try {
    const files = readdirSync(plansDir).filter((f: string) => f.endsWith('.md'));
    if (files.length === 0) return null;
    // Sort by name descending (date-prefixed filenames sort correctly)
    files.sort((a: string, b: string) => b.localeCompare(a));
    return files[0];
  } catch {
    return null;
  }
}

interface ParsedInput {
  prompt?: string;
  user_prompt?: string;
  content?: string;
  [key: string]: unknown;
}

interface Intent {
  agent?: string;
  pdcaStage?: string;
  isWizardMode: boolean;
  confidence: number;
}

interface TeamSelection {
  preset: string;
  team: {
    name: string;
    workers: Array<{
      name: string;
      role: string;
      model: string;
      agent: string;
    }>;
  };
}

interface TeamCost {
  estimated: string;
}

interface ActiveSession {
  active: boolean;
  mode?: string;
  feature?: string;
  currentStage?: string;
}

interface ComplexitySignals {
  fileCount: number;
  domainCount: number;
  hasSecurity: boolean;
  hasTests: boolean;
  hasArchChange: boolean;
  lineCount: number;
}

try {
  const parsed: ParsedInput = await readStdinJSON();
  const prompt: string = parsed.prompt || parsed.user_prompt || parsed.content || '';

  if (!prompt) { process.stdout.write('{}'); process.exit(0); }

  const intent: Intent = detectIntent(prompt);
  const parts: string[] = [];
  const projectDir: string = process.env.PROJECT_DIR || process.cwd();
  const lower: string = prompt.toLowerCase();

  // --- Keyword routing suggestions ---
  const keywordMatches: string[] = detectKeywordRoutes(lower);
  for (const msg of keywordMatches) {
    parts.push(msg);
  }

  // --- Active session injection ---
  const session: ActiveSession = getActiveSession(projectDir);
  if (session.active) {
    parts.push(`[ACTIVE SESSION: ${sanitizeSessionField(session.mode!)} — ${sanitizeSessionField(session.feature!)} at stage ${sanitizeSessionField(session.currentStage!)}]`);
  } else {
    // --- Plan exists but no active session ---
    const wantsExecution: boolean = EXECUTION_KEYWORDS.some((kw: string) => lower.includes(kw));
    if (wantsExecution) {
      const planFile = findLatestPlan(projectDir);
      if (planFile) {
        parts.push(`[PLAN EXISTS: .aing/plans/${planFile} — execute with /aing team or /aing auto]`);
      }
    }
  }

  if (parts.length > 0) {
    parts.push(''); // blank separator before team table
  }

  // Estimate task complexity from prompt signals
  const signals: ComplexitySignals = {
    fileCount: Math.max((prompt.match(/\.(tsx?|jsx?|py|java|go|rs|vue|svelte)/gi) || []).length, 1),
    domainCount: new Set([
      /backend|api|server|백엔드|서버|엔드포인트/i.test(prompt) ? 'be' : null,
      /frontend|ui|page|component|프론트|화면|페이지|컴포넌트|\.tsx|\.jsx/i.test(prompt) ? 'fe' : null,
      /db|database|schema|migration|데이터베이스|스키마|마이그레이션/i.test(prompt) ? 'db' : null,
      /design|css|style|디자인|스타일|레이아웃|figma/i.test(prompt) ? 'design' : null,
      /auth|security|login|인증|보안|로그인|jwt|token/i.test(prompt) ? 'security' : null,
      /test|tdd|검증|테스트/i.test(prompt) ? 'test' : null,
    ].filter(Boolean) as string[]).size,
    hasSecurity: /auth|security|login|token|jwt|password|encrypt|인증|보안|로그인/i.test(prompt),
    hasTests: /test|tdd|spec|jest|vitest|테스트|검증/i.test(prompt),
    hasArchChange: /architect|refactor|migration|restructure|아키텍처|리팩토링|마이그레이션/i.test(prompt),
    lineCount: prompt.length > 200 ? 200 : prompt.length > 100 ? 80 : prompt.length > 50 ? 30 : 10,
  };

  const team: TeamSelection = selectTeam(signals as unknown as Record<string, unknown>);
  const cost: TeamCost = estimateTeamCost(team.preset);

  // Always show team recommendation with agent deployment table
  parts.push(`━━━ aing Team Deployment ━━━`);
  parts.push(`${team.team.name} (${team.team.workers.length} members, ${cost.estimated})`);
  parts.push('');
  parts.push('  Agent        Role                    Model    Task');
  parts.push('  ─────        ────                    ─────    ────');
  for (const w of team.team.workers) {
    const name = w.name.charAt(0).toUpperCase() + w.name.slice(1);
    const padName = name.padEnd(12);
    const padRole = w.role.replace(/^[^\s]+\s/, '').padEnd(23); // strip emoji prefix
    const padModel = w.model.padEnd(8);
    const taskHint: Record<string, string> = {
      planner: 'Task decomposition + planning',
      executor: 'Code implementation (TDD)',
      reviewer: 'Security/quality review',
      sam: 'Evidence collection + final verdict',
    };
    const task = taskHint[w.agent] || w.agent;
    parts.push(`  ${padName} ${padRole} ${padModel} ${task}`);
  }
  parts.push('');

  // Pipeline summary — one-line routing preview
  const pipelineStr: string = team.team.workers.map((w) => {
    const name = w.name.charAt(0).toUpperCase() + w.name.slice(1);
    const shortRole = w.role.includes('—') ? w.role.split('—')[1].trim().split(/\s+/)[0] : w.role.split(' ').pop();
    return `${name}(${shortRole})`;
  }).join(' -> ');
  parts.push(`  Pipeline: ${pipelineStr}`);
  parts.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Intent-specific guidance
  if (intent.isWizardMode) {
    parts.push('Iron(Wizard) wizard mode — step-by-step Q&A progress.');
  } else if (intent.pdcaStage === 'plan') {
    parts.push('Klay(Architect) explores code -> Able(PM) creates plan -> saved to .aing/plans/ -> run "/aing auto" to execute.');
  } else if (intent.pdcaStage === 'do') {
    parts.push(`${pipelineStr} deployed for TDD-based implementation.`);
  } else if (intent.pdcaStage === 'check') {
    parts.push('Milla(Security) security review + Sam(CTO) evidence chain verification.');
  }

  const maxPromptTokens = 800; // max tokens for UserPromptSubmit
  const raw: string = parts.join('\n');
  const trimmed: string = trimToTokenBudget(raw, maxPromptTokens);
  trackInjection('user-prompt-submit', trimmed);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { additionalContext: trimmed }
  }));
} catch (err: unknown) {
  process.stderr.write(`[aing:user-prompt] ${(err as Error).message}\n`);
  process.stdout.write('{}');
}
