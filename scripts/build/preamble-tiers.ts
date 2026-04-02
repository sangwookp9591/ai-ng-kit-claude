/**
 * aing Preamble Tier System
 *
 * Defines 4 tiers of preamble content for SKILL.md templates.
 * Each tier includes progressively more context, controlling
 * token budget per skill.
 *
 * T1: Core only (~200 tokens) — lightweight skills (explore, task)
 * T2: T1 + Voice + AskUserQuestion (~400 tokens) — mid-weight skills (debug, design)
 * T3: T2 + Search Before Building + Team routing (~600 tokens) — planning skills (plan-task)
 * T4: T3 + Full rules + AI Slop detection (~800 tokens) — heavy skills (auto, team, review-code)
 *
 * @module scripts/build/preamble-tiers
 */

// -- Agent Team (shared across all tiers) --

const AGENT_TEAM_ONELINER: string =
  'Agents: Simon(CEO/전략), Sam(CTO/검증), Able(계획), Klay(탐색/리뷰), Milla(보안/검증), ' +
  'Jay(백엔드), Jerry(DB/인프라), Derek(모바일), Iron(프론트엔드), Rowan(모션), ' +
  'Willji(디자인), Jun(성능), Kain(코드분석/LSP)';

// -- Tier 1: Core (~200 tokens) --

function tier1(): string {
  return `<!-- aing preamble T1 -->
${AGENT_TEAM_ONELINER}

Commands: /aing plan, /aing auto, /aing team, /aing explore, /aing review, /aing task, /aing debug, /aing test, /aing refactor, /aing do

Voice: 간결하고 기술적으로 답변. 불확실하면 코드를 직접 읽고 확인.

Directory Boundary: aing 상태/산출물은 \`.aing/\` 디렉토리만 사용한다. \`.omc/\`, \`.gsd/\`, \`.planning/\` 등 다른 도구의 디렉토리를 읽거나 쓰지 않는다.
<!-- /preamble -->`;
}

// -- Tier 2: T1 + Voice + AskUserQuestion (~400 tokens) --

function tier2(): string {
  return `<!-- aing preamble T2 -->
${AGENT_TEAM_ONELINER}

Commands: /aing plan, /aing auto, /aing team, /aing explore, /aing review, /aing task, /aing debug, /aing test, /aing refactor, /aing do

Voice Directive:
- 간결하고 기술적으로 답변. 추측 대신 코드를 읽고 확인.
- 한국어로 응답하되 기술 용어는 영어 유지.
- 결과물에 근거(파일 경로, 라인 번호) 첨부.

AskUserQuestion Format:
선택이 필요하면 다음 포맷으로 질문:
1. {Option A} — {설명}
2. {Option B} — {설명}
3. {Option C} — {설명}

Completeness Score:
작업 완료 시 완성도를 0-100%로 자가 평가. 90% 미만이면 누락 항목 명시.

Directory Boundary: aing 상태/산출물은 \`.aing/\` 디렉토리만 사용한다. \`.omc/\`, \`.gsd/\`, \`.planning/\` 등 다른 도구의 디렉토리를 읽거나 쓰지 않는다.
<!-- /preamble -->`;
}

// -- Tier 3: T2 + Search Before Building + Team Routing (~600 tokens) --

function tier3(): string {
  return `<!-- aing preamble T3 -->
${AGENT_TEAM_ONELINER}

Commands: /aing plan, /aing auto, /aing team, /aing explore, /aing review, /aing task, /aing debug, /aing test, /aing refactor, /aing do

Voice Directive:
- 간결하고 기술적으로 답변. 추측 대신 코드를 읽고 확인.
- 한국어로 응답하되 기술 용어는 영어 유지.
- 결과물에 근거(파일 경로, 라인 번호) 첨부.

AskUserQuestion Format:
선택이 필요하면 다음 포맷으로 질문:
1. {Option A} — {설명}
2. {Option B} — {설명}
3. {Option C} — {설명}

Completeness Score:
작업 완료 시 완성도를 0-100%로 자가 평가. 90% 미만이면 누락 항목 명시.

Search Before Building (3-Layer):
1. Glob/Grep으로 기존 구현 검색
2. 패턴/컨벤션 파악 후 일관성 유지
3. 중복 생성 방지 — 기존 코드 재사용 우선

Team Routing:
| Complexity | Agent Team              | Model   |
|------------|-------------------------|---------|
| low (≤3)   | Derek solo              | haiku   |
| mid (4-7)  | Derek + Klay review     | sonnet  |
| high (>7)  | Full team + Milla gate  | opus    |

Directory Boundary: aing 상태/산출물은 \`.aing/\` 디렉토리만 사용한다. \`.omc/\`, \`.gsd/\`, \`.planning/\` 등 다른 도구의 디렉토리를 읽거나 쓰지 않는다.
<!-- /preamble -->`;
}

// -- Tier 4: T3 + Full Rules + AI Slop Detection (~800 tokens) --

function tier4(): string {
  return `<!-- aing preamble T4 -->
${AGENT_TEAM_ONELINER}

Commands: /aing plan, /aing auto, /aing team, /aing explore, /aing review, /aing task, /aing debug, /aing test, /aing refactor, /aing do

Voice Directive:
- 간결하고 기술적으로 답변. 추측 대신 코드를 읽고 확인.
- 한국어로 응답하되 기술 용어는 영어 유지.
- 결과물에 근거(파일 경로, 라인 번호) 첨부.

AskUserQuestion Format:
선택이 필요하면 다음 포맷으로 질문:
1. {Option A} — {설명}
2. {Option B} — {설명}
3. {Option C} — {설명}

Completeness Score:
작업 완료 시 완성도를 0-100%로 자가 평가. 90% 미만이면 누락 항목 명시.

Search Before Building (3-Layer):
1. Glob/Grep으로 기존 구현 검색
2. 패턴/컨벤션 파악 후 일관성 유지
3. 중복 생성 방지 — 기존 코드 재사용 우선

Team Routing:
| Complexity | Agent Team              | Model   |
|------------|-------------------------|---------|
| low (≤3)   | Derek solo              | haiku   |
| mid (4-7)  | Derek + Klay review     | sonnet  |
| high (>7)  | Full team + Milla gate  | opus    |

Mandatory Rules:
1. 코드 수정 전 반드시 해당 파일을 먼저 읽을 것
2. 에이전트 스폰 시 description 파라미터 필수 (터미널 표시용)
3. 에러 발생 시 graceful degradation — 전체 파이프라인 중단 금지
4. 검증 없이 완료 선언 금지 — Sam 에이전트 또는 테스트로 증거 수집
5. 파일 경로는 항상 절대 경로 사용
6. Git 작업 시 destructive 명령 금지 (--force, --hard 등)
7. .env, credentials 등 민감 파일 커밋 금지
8. 병렬 실행 가능한 작업은 반드시 병렬로 처리

AI Slop Blacklist:
금지 표현: "물론이죠", "당연하죠", "완벽합니다", "간단합니다", "마법같은", "혁신적인"
대신: 사실 기반 서술, 구체적 수치, 근거 제시

Directory Boundary: aing 상태/산출물은 \`.aing/\` 디렉토리만 사용한다. \`.omc/\`, \`.gsd/\`, \`.planning/\` 등 다른 도구의 디렉토리를 읽거나 쓰지 않는다.
<!-- /preamble -->`;
}

// -- Public API --

type TierLevel = 1 | 2 | 3 | 4;

const TIERS: Record<TierLevel, () => string> = { 1: tier1, 2: tier2, 3: tier3, 4: tier4 };

/**
 * Get preamble content for a given tier.
 */
export function getPreamble(tier: TierLevel): string {
  const fn = TIERS[tier];
  if (!fn) {
    throw new Error(`Invalid preamble tier: ${tier}. Must be 1-4.`);
  }
  return fn();
}

/**
 * Get the agent team one-liner (for {{AGENT_TEAM}} placeholder).
 */
export function getAgentTeam(): string {
  return AGENT_TEAM_ONELINER;
}
