# Changelog

## [2.2.3] - 2026-03-24

### Improved — Help 가이드 + Wizard 강화 + 죽은 코드 정리

#### /swkit help 개선
- Best Practices 가이드 추가 (6가지 시나리오별 추천 경로)
- 커맨드를 섹션별 그룹화 (Vibe Coding / Pipeline / Development / Quality / Utility)
- 신규 커맨드 반영 (do, debug, init, cost, agent-ui)

#### Iron wizard GSD 수준 강화
- intent-router 기반 자동 라우팅 통합 (인자 있음 → 자동 실행)
- 대화 모드 (인자 없음 → 질문 기반 문맥 수집 → 자동 실행)
- 에이전트 작업 중 비기술 번역 레이어

#### Dead Code Cleanup
- 미사용 스크립트 10개 삭제 (-1,503줄): dashboard, locale, convention-extractor, tdd-engine, agent-pipeline, handoff, auto-runner, rollback, model-router, debugger agent
- 버전 하드코딩 동기화: display.mjs, hooks.json (v1.3.0 → v2.2.3)

## [2.2.1] - 2026-03-24

### Added — GSD 벤치마킹 바이브코딩 진화 (Ralplan 합의)

#### 신규 스킬 4개
- **`/swkit do`**: 자연어 자동 라우팅 — intent-router.mjs가 입력 분석 → plan/auto/team/wizard 자동 선택
- **`/swkit debug`**: 과학적 디버깅 — 증상→가설→테스트→결론, `.sw-kit/debug/{slug}.md` 영구 상태
- **`/swkit init`**: 프로젝트 초기화 — 질문 기반 문맥 수집 → PROJECT.md + REQUIREMENTS.md + TECH-STACK.md
- **`/swkit cost`**: 비용/토큰 투명성 — 에이전트별 활동 기반 비용 추정 보고

#### 신규 에이전트
- **Debugger**: 과학적 디버깅 전문가 (가설-테스트-판정 프로토콜)

#### Goal-Backward Verification (목표-역방향 검증)
- **goal-checker.mjs**: 완료 ≠ 달성 구분 — ACHIEVED / COMPLETED_NOT_ACHIEVED / INCOMPLETE 3단계 판정
- **Sam 에이전트 강화**: Goal-Backward Verification Protocol 추가
- **verify-evidence 스킬 강화**: Step 4 Goal-Backward 단계 추가

#### State 위생
- **state-gc.mjs**: 좀비 feature 가비지 컬렉션 (7일 비활성 + 증거 없음 → 자동 아카이빙)
- **status-view.mjs**: `.sw-kit/STATUS.md` 자동 생성 (인간 가독성 상태 뷰)
- **session-start.mjs**: GC + STATUS.md 갱신 자동 실행

#### 템플릿 확장
- `templates/project.md`, `templates/requirements.md`, `templates/tech-stack.md`, `templates/debug.md`

#### 테스트
- 129개 신규 테스트 전부 통과 (intent-router 30, state-gc 7, status-view 10, goal-checker 10, init 58, cost-reporter 14)

## [2.2.0] - 2026-03-24

### Added — agent-ui 세션 자동 연결

#### open-office.mjs (신규)
- `agent-ui` 기본 모드에서 세션 컨텍스트를 URL 쿼리 파라미터로 전달
- `session`: Claude Code 세션 ID
- `project`: 현재 프로젝트명
- `user` / `team`: 사용자/팀 식별
- `agents`: 활성 에이전트 목록 (agent-traces.json 기반)
- `pipeline` / `autorun`: 파이프라인 및 auto-run 상태

#### agent-ui SKILL.md 업데이트
- 기본 모드: `open-office.mjs` 스크립트 호출로 변경 — 세션 정보 + 활성 에이전트 자동 연결

## [2.1.7] - 2026-03-23

### Improved — Agent-UI DX 개선 (Ralplan 합의 기반)

#### Core: hooks.json matcher 확장
- **PreToolUse/PostToolUse matcher**: `Write|Edit|Bash` → `Write|Edit|Bash|Agent|Task` — 에이전트 spawn/complete 이벤트 감지 활성화

#### Agent Trace: 에이전트 이름 기록
- **post-tool-use.mjs**: Agent/Task 호출 시 `subagent_type`에서 에이전트 이름 추출하여 trace 기록
- **agent-trace.mjs**: `recordToolUse`가 `agent: 'session'` 대신 실제 에이전트 이름 + `spawn` action 기록

#### DX: 팀 배치 가시성 강화
- **user-prompt-submit.mjs**: 구분선(`━━━ sw-kit Team Deployment ━━━`) + Pipeline 요약 라인 추가

#### agent-ui SKILL.md 리팩터
- 기본 모드: `open https://office.sw-world.site` — 항상 클라우드 3D 오피스 브라우저 오픈
- `--monitor`: 터미널 내 에이전트 활동 요약 (formatTraceSummary 기반)
- `--status`: 내장 기능 + 3D 오피스 전체 진단
- `--setup`: **원커맨드 자동 설정** (`agent-ui-setup.mjs`) — 환경변수 + hook 자동 등록/해제
- 트러블슈팅 FAQ 추가

#### agent-ui-setup.mjs (신규)
- sw-world-agents-view 경로 자동 탐색
- `~/.claude/settings.json`에 환경변수 3개 + hook 3개 자동 등록
- 중복 hook 방지, `--uninstall`로 완전 해제
- 클라우드 URL(`office.sw-world.site`) 기본 고정

#### Pipeline 역할 파싱 수정
- `user-prompt-submit.mjs`: `Jay(—)` → `Jay(Backend)` — `—` 구분자 기반 역할 추출

#### Documentation
- `.sw-kit/docs/agent-ui-audit.md`: D1-D5 진단 보고서 (Ralplan 합의 산출물)

## [2.1.4] - 2026-03-23

### Fixed — 근본 원인 수정 + 감사 버그 수정

#### Critical Fixes
- **plan-manager.mjs**: ESM에서 `require('node:fs')` 사용 → `readdirSync` import로 교체. `listPlans()`/`getPlan()` 정상화
- **persist.mjs 경로**: 스킬에서 상대 경로 `scripts/cli/persist.mjs` → `"${CLAUDE_PLUGIN_ROOT}/scripts/cli/persist.mjs"` 절대 경로로 수정 (plan-task, auto, team)
- **display.mjs**: `C.red` 컬러 코드 누락 → `/swkit help` 런타임 크래시 수정
- **evidence-report.mjs**: `pdcaState.data` null 안전 접근 추가

#### Agent-UI Improvements
- **PostToolUse 훅 추가**: `tool_done` 이벤트 전송 → 3D 캐릭터가 active→idle 정상 복귀
- **session-connect.mjs**: 단계별 상태 출력 (서버 확인 → 등록 → URL/RC 상태)
- **agent-ui/SKILL.md**: `{OFFICE_DIR}` → `${OFFICE_DIR}` 문법 수정 + PostToolUse 훅 설정 추가
- **start/SKILL.md**: HUD 래퍼 `require('fs')` → ESM `import { existsSync }` 수정

#### New Commands (/ 자동완성)
- 14개 command 등록: auto, design, explore, help, plan, review, rollback, start, swkit, task, tdd, team, verify, wizard

#### Code Quality
- **task-manager.mjs**: 미사용 `existsSync`, `readdirSync` import 제거
- **버전 통일**: 하드코딩된 `v2.0.0` → `v2.1.4` (start/SKILL.md, session-start.mjs)

#### TDD (11/11 PASS)
- `tests/plan-task.test.mjs` 추가: Plan Manager 4, Task Manager 4, persist.mjs CLI 3

## [2.1.2] - 2026-03-23

### Added — Agent UI (3D Office Visualization)

sw-world-agents-view 연동 스킬 추가.

#### New Skill
- **agent-ui** — 3D 에이전트 오피스 시각화. `/swkit agent-ui`로 현재 세션을 브라우저에서 실시간 확인. `--setup`으로 Claude Code hooks 자동 설정, `--status`로 상태 확인, `--uninstall`로 제거.

#### Integration
- sw-world-agents-view (https://github.com/sangwookp9591/sw-world-agents-view) 연동
- SessionStart hook: 세션 시작 시 3D 오피스 자동 등록
- PreToolUse hook: 도구 사용 시 캐릭터 애니메이션 실시간 반영
- 초대 코드 시스템: 팀원 온보딩
- 룸 시스템: 프로젝트별 협업 공간
- 배포: https://office.sw-world.site

## [2.1.1] - 2026-03-23

### Added — Design Pipeline (Stitch Integration)

Google Labs stitch-skills를 sw-kit에 통합. 7개 원본 skill을 5개로 재구성.

#### New Skills (5)
- **design** — Willji 전용. UI 디자인 생성/편집, 프롬프트 강화, Stitch MCP 연동. Sub-commands: generate, enhance, edit
- **design-system** — Willji 전용. Stitch 프로젝트 분석 → DESIGN.md 합성, 디자인 토큰 관리
- **design-loop** — Willji + Derek. 자율 멀티페이지 빌드 루프 (baton system)
- **design-to-code** — Derek 전용. Stitch HTML → React 컴포넌트 변환, AST 검증, shadcn/ui 통합, TDD 강제
- **design-video** — Rowan 전용. Remotion 워크스루 영상 생성

#### Agent Enhancements (3)
- **Willji** — Stitch MCP 디자인 생성/편집, 디자인 시스템 합성, prompt enhancement 역할 추가
- **Derek** — Stitch → React 변환, shadcn/ui 통합, AST 검증, 디자인 토큰 매핑 역할 추가
- **Rowan** — Remotion 워크스루 영상 생성 역할 추가

#### Evidence Chain Extensions
- `design` 타입 — Stitch 디자인 생성/편집 결과
- `visual-qa` 타입 — 시각 검증 결과 (Chrome DevTools MCP, 선택적)
- `component-ast` 타입 — AST 기반 코드 검증 결과

#### Auto Pipeline Extensions
- Design Domain Detection — 디자인 키워드 감지 시 자동 Design Preset 선택
- Design Solo / Design Duo / Design Squad 팀 프리셋 3종 추가

#### Key Properties
- Stitch MCP 미설치 시 graceful degradation (에러 없이 fallback 안내)
- 기존 13개 skill + 10개 agent에 breaking change 없음
- 디자인 산출물: `.sw-kit/designs/`, 영상 산출물: `.sw-kit/videos/`
- Origin: google-labs-code/stitch-skills (Apache-2.0)

## [2.0.1] - 2026-03-20

### Fixed — 21 Bug Fixes + Test Infrastructure

#### Critical (4)
- **`context-budget.mjs`** — `getBudgetStatus()` shallow copy로 내부 상태 오염 → deep copy로 수정
- **`evidence-report.mjs`** — `await import()` in non-async + `writeState`로 마크다운 저장 → `writeFileSync` 직접 사용
- **`context-compaction.mjs`** — `await import('node:fs')` in non-async → top-level import로 이동
- **`circuit-breaker.mjs`** — read-modify-write race condition → `updateState` atomic 업데이트

#### High (7)
- **`project-memory.mjs`** — `EMPTY_MEMORY` shallow copy로 모듈 전역 오염 → 매번 새 객체 생성
- **`learning-capture.mjs`** — 트리밍 후 `saveMemory()` 누락으로 100개 초과 패턴 무한 증가 → save 추가
- **`config.mjs`** — 캐시된 config 외부 수정 가능 → `Object.freeze` + projectDir별 캐시 키
- **`evidence-chain.mjs`** — `e.result` undefined 시 `.toUpperCase()` 크래시 → fallback 처리
- **`safety-invariants.mjs`** — read-modify-write race condition → `updateState` atomic 업데이트
- **`agent-trace.mjs`** — read-modify-write race condition → `updateState` atomic 업데이트
- **`safety-invariants.mjs`** — HOME 경로 확장 시 `~` 중간 매칭 오류 → `startsWith('~/')` + `os.homedir()` fallback

#### Medium (6)
- **`config.mjs`** — `_configCache`가 projectDir 무시 → `_cachedDir` 추가, 변경 시 캐시 무효화
- **`evidence-collector-lite.mjs`** — 빌드 실패 판정 거짓양성 ("Error handling" → fail) → 정규식 `\berror[s]?\b` + `0 error` 제외
- **`pdca-engine.mjs`** — check에서 matchRate 없이 호출 시 act→do 무한루프 → matchRate 없으면 review로 직행
- **`pdca-engine.mjs`** — matchRate >= threshold 시 act→do 루프 → review로 직행하도록 수정
- **`logger.mjs`** — `process.cwd()` 하드코딩 → `SW_KIT_PROJECT_DIR` 환경변수 지원
- **`cost-ceiling.mjs`** — `loadLimits`가 projectDir을 `getConfig`에 전달 안 함 (문서화)

#### Low (4)
- 상위 CRITICAL/HIGH 수정에 의해 자동 해결 (L1~L4)

### Added
- **`scripts/core/state.mjs`** — `updateState()` atomic read-modify-write 헬퍼 (retry-on-conflict 패턴)
- **`scripts/cli/persist.mjs`** — CLI 엔트리포인트 (plan/task/report 파일 영속화)
- **`tests/innovations.test.mjs`** — 76개 테스트 (Node.js `node:test` 기반)
  - Innovation #1~#5, PDCA, Cost Ceiling, State Manager, Regression 검증

### Changed
- **`skills/plan-task/SKILL.md`** — Step 1.5: `persist.mjs plan` 호출 필수화
- **`skills/auto/SKILL.md`** — Step 1.5: `persist.mjs plan` + Step 8: `persist.mjs report` 필수화
- **`skills/team/SKILL.md`** — Stage 1: `persist.mjs plan` + Stage 5: `persist.mjs report` 필수화

### Test
- **76/76 ALL PASS** (215ms, zero external dependencies)

## [2.0.0] - 2026-03-20

### Added
- **Agent Visibility (omc-style)** — 모든 Agent 스폰 시 `description` 파라미터 필수
  - 터미널에 `⏺ sw-kit:jay(Jay: Backend API 구현) Sonnet` 자동 표시
  - 완료 시 `Done (N tool uses · Nk tokens · Nm Ns)` 자동 표시
  - `Task()` → `Agent()` 호출 패턴으로 통일

### Changed
- **`skills/auto/SKILL.md`** — 모든 프리셋(Solo/Duo/Squad/Full) Agent 호출에 description 추가
- **`skills/team/SKILL.md`** — team-plan, team-exec, team-verify, team-fix 전체 description 추가
- **`skills/explore/SKILL.md`** — Klay Agent 가시성 적용
- **`skills/plan-task/SKILL.md`** — Able Agent 가시성 적용
- **`skills/review-code/SKILL.md`** — Milla Agent 가시성 적용
- **`skills/verify-evidence/SKILL.md`** — Sam Agent 가시성 적용
- **`hooks-handlers/session-start.mjs`** — Rule 2를 description 기반 가시성으로 업데이트

## [1.9.0] - 2026-03-20

### Added
- **`/swkit team [agents] "task"`** — staged pipeline with verify→fix loop
  - 4-stage PDCA-mapped pipeline: team-plan → team-exec → team-verify → team-fix
  - User-specified agents (`jay+derek+milla`) or auto-select via complexity scoring
  - Milla(Security) + Sam(CTO) always auto-included for verification
  - Fix stage with retry prompt (failure context + max 3 iterations)
  - Completion report with pipeline/fix-loop data

### Enhanced
- **`/swkit auto`** — `@{Name}❯` worker visibility
  - Worker Prompt Template with COMMUNICATION FORMAT section
  - Progress table on state transitions (not every message)
  - Team-lead defensive prefix attribution
  - Plan file handoff support (skip re-analysis)
- **`/swkit plan`** — next-action flow after planning
  - Option 1: `/swkit team` (recommended, verify loop)
  - Option 2: `/swkit auto` (one-shot, fast)
  - Option 3: save only

## [1.8.2] - 2026-03-19

### Added
- **`/swkit start` Interactive Setup Wizard** — omc 벤치마킹 4-Phase 셋업
  - Phase 1: 스코프 선택 (Local — 이 프로젝트만 / Global — 모든 프로젝트)
  - Phase 2: Status Line HUD 활성화 여부
  - Phase 3: 기본 실행 모드 선택 (auto / pdca / wizard)
  - Phase 4: 웰컴 + GitHub star 옵션
  - `--local`, `--global`, `--force`, `--help` 플래그 지원
  - 중단 시 resume 가능 (24h 만료)
- **`scripts/setup/setup-progress.mjs`** — 셋업 진행 상태 관리
  - save/resume/clear/complete/check CLI + ESM 모듈 이중 인터페이스
  - `~/.claude/.swkit-config.json`에 영구 설정 완료 마커 저장
  - `.sw-kit/state/setup-state.json`에 임시 진행 상태 (24h 자동 만료)
- **First Run Detection** — session-start에서 셋업 미완료 자동 감지
  - 미설정: "`/swkit start`를 실행하세요" 안내
  - 설정 완료: `Setup: global | HUD: on | Mode: auto` 컴팩트 표시
  - 이전 PDCA 작업 존재: "Resume Available" 온보딩 표시

### Changed
- `hooks-handlers/session-start.mjs` → v1.9.0: `isSetupComplete()` 연동, 온보딩 플로우 추가
- HUD 인라인 프롬프트 제거 → `/swkit start` 위자드에서 통합 처리
- `skills/start/SKILL.md`: 신규 스킬 (triggers: start, setup, 초기설정, 셋업)

## [1.8.1] - 2026-03-19

### Added
- **Status Line HUD** — 터미널 하단에 활성 에이전트를 깜빡이는 컬러 점으로 실시간 표시
  - `scripts/hud/statusline.mjs`: ANSI 컬러 깜빡이는 점 + 에이전트명(역할) + 컨텍스트% + PDCA 상태
  - `~/.claude/hud/swkit-hud.mjs`: 래퍼 스크립트 (dev/cache/marketplace 경로 자동 탐색)
  - 에이전트별 고유 색상: Sam(보라), Able(파랑), Klay(노랑), Jay(초록), Jerry(시안), Milla(빨강), Derek(밝은노랑), Rowan(흰색), Willji(마젠타), Iron(파랑)
  - 시간 기반 ●/○ 토글로 깜빡이는 효과
- **초기 설치 시 Status Line 설정 프롬프트** — 첫 세션에서 HUD 활성화 여부 안내
- **Agent Deployment Announcement** — 에이전트 투입 시 누가(이름) + 뭘(역할) + 어떻게(작업) 명시적 표출
  - `session-start.mjs`: Rule 2에 Agent Deployment Announcement 추가 (single/multi 에이전트 모두)
  - `user-prompt-submit.mjs`: 팀 추천 시 Agent/Role/Model/Task 테이블 표시
  - `team-orchestrator.mjs`: `formatTeamSelection()` 테이블 형식으로 개선
  - `auto-runner.mjs`: `formatAutoRun()` spawn-workers 단계에 에이전트별 투입 라인 추가
  - `skills/auto/SKILL.md`: Step 4 "Announce Agent Deployment" 단계 신설 (총 8 Step)
  - `skills/explore/SKILL.md`: Agent Deployment 공지 섹션 추가
  - `skills/plan-task/SKILL.md`: Agent Deployment 공지 섹션 추가
  - `skills/review-code/SKILL.md`: Agent Deployment 공지 섹션 추가

## [1.3.2] - 2026-03-19

### Fixed
- **All hooks synced to bkit `readFileSync(0)` pattern** -- no more async stdin, eliminates UserPromptSubmit hook errors
- **pre-tool-use.mjs, post-tool-use.mjs, stop-failure.mjs** rewritten with sync stdin

### Changed
- **README.md** -- full rewrite with SVG agent icons (no emoji), v1.3.2 aligned
- 12 custom SVG icons in `images/` used in agent team table
- Command table shows agent icons inline
- `.omc/` removed from repo, added to `.gitignore`
- Version bumped across plugin.json, marketplace.json, package.json

### Added
- **12 SVG agent icons** -- sam (star), able (crosshair), klay (triangle), jay (sun-gear), jerry (cylinder-db), milla (lock), willji (pen-nib), derek (monitor), rowan (bolt), scout (magnifier), proof (check-circle), iron (wand)

## [1.3.1] - 2026-03-19

### Fixed
- **UserPromptSubmit hook error** -- robust JSON parsing, fallback field names (prompt/user_prompt/content)
- **PostToolUse hook error** -- missing `projectDir` variable declaration
- **.omc/ removed from repo** -- added to .gitignore

### Changed
- Version strings updated to v1.3.x across all files (hooks.json, session-start, display, plugin.json, marketplace.json)
- Session-start command list updated to `/swkit` unified commands (auto, tdd, task, wizard, help)
- Display command list expanded: auto, tdd, task, rollback, team agents (Able+Klay, Jay+Derek, Milla+Shield)

### Added
- **12 custom SVG icons** (images/) -- emoji-free agent identity
  - sam.svg (star), able.svg (crosshair), klay.svg (triangle), jay.svg (sun-gear)
  - jerry.svg (cylinder-db), milla.svg (lock), willji.svg (pen-nib), derek.svg (monitor)
  - rowan.svg (bolt), scout.svg (magnifier), proof.svg (check-circle), iron.svg (wand)

### Test
- 33/33 ALL GREEN

## [1.3.0] - 2026-03-19

### Added — Level 5 Harness Engineering (100%)
- **Auto Runner** — `/swkit auto` 전체 파이프라인 실행 계획 생성
  - TeamCreate→TaskCreate→Task(spawn) CC 네이티브 도구 시퀀스 자동 생성
  - 5 phases: create-team → create-tasks → spawn-workers → monitor → shutdown
- **Retry Engine** — exponential backoff (1s→2s→4s) + jitter + circuit breaker 연동
- **Handoff Manager** — 단계 전환 시 .sw-kit/handoffs/ 자동 생성
  - Decided/Rejected/Risks/Files/Remaining 구조
- **Dashboard** — 실시간 상태 표시 (compact + full)
  - PDCA 단계, TDD 페이즈, Task 진행, 예산, 서킷 브레이커 통합
- Team preset 경계 조정 (solo≤2, duo≤4, squad≤6, full≥7)

### Performance
- 33/33 tests ALL GREEN
- Hook import chain: **5ms**
- Harness 4-Axis: **100/100** (Level 5 완전 달성)

## [1.2.0] - 2026-03-19

### Added
- **Cost-Aware Team Orchestrator** — 작업 복잡도 자동 분석 → 최적 팀 구성
  - 4개 프리셋: Solo(1명/~15K), Duo(2명/~18K), Squad(4명/~48K), Full(7명/~123K)
  - 보안 작업 자동 감지 → Milla 자동 포함
  - 워커 프롬프트에 TDD + Evidence Chain 강제
  - 토큰 비용 추정 기능
- **12명 에이전트 팀** — 역할별 전문 에이전트
  - 👑 Sam (CTO), 🎯 Able (PM), 📐 Klay (Architect)
  - ⚙️ Jay (API), 🗄️ Jerry (DB), 🔒 Milla (Security)
  - 🎨 Willji (UI/UX), 🖥️ Derek (Frontend), ✨ Rowan (Interaction)
  - 🔍 Scout (Explorer), ✅ Proof (Verifier), 🪄 Iron (Wizard)

### Performance
- Hook import chain: **5ms** (5,000ms budget의 0.1%)
- Config cold start: **36ms**
- Test suite: **30/30 ALL GREEN**
- Harness 4-Axis: **90.5/100**

## [1.1.0] - 2026-03-19

### Added
- **TDD Engine** — Red→Green→Refactor 사이클 강제
  - 테스트 작성 → 실패 확인 → 최소 구현 → 리팩토링
  - PDCA Check 단계와 통합
- **Task Manager** — Main Task → Sub Tasks 계층 체크리스트
  - `createTask()`, `checkSubtask()`, `formatTaskChecklist()`
  - ☐/☑ 체크리스트 추적, 자동 완료 판정
- **Plan Manager** — .sw-kit/plans/ 문서 자동 생성
  - Plan 문서 + Task 체크리스트 동시 생성
- **9개 스킬 자동완성** — /sw-kit: 입력 시 11개 스킬 표시
  - tdd, task, auto, rollback, explore, plan-task, review-code, verify-evidence, wizard-mode

## [1.0.0] - 2026-03-19

### Added
- **Multi-Agent Pipeline** — Scout→Archie→Bolt→Shield→Proof 자동 체인
  - 5단계 순차 파이프라인 with 상태 관리
  - Pipeline 상태 표시 + Progress Tracker 연동
- **Rollback System** — Git 체크포인트 기반 롤백
  - `execFileSync` 사용 (shell injection 방지)
  - 비파괴적 롤백: 새 브랜치 생성 + stash 보존

### Test Suite
- 21/21 → 27/27 → **30/30 ALL GREEN**

## [0.5.0] - 2026-03-19

### Added
- **Cost Ceiling** — 토큰/API/세션 시간 예산 관리
  - 80% 경고 임계값, 세션별 추적
- **Convention Extractor** — 코드베이스 규칙 자동 감지
  - JS/TS/Java/Python/Go/Flutter 프로젝트 지원
  - 언어, 프레임워크, 모듈 시스템, 패키지 매니저, 린터, 테스트 프레임워크

## [0.4.0] - 2026-03-19

### Added
- **Progress Tracker** — sw-kit-progress.md 생성, 세션 간 연속성
- **Agent Trace** — 에이전트별 실행 트레이스 기록/분석
- **Context Compaction** — 우선순위 기반 지능형 컨텍스트 보존
  - PDCA State > Progress > Safety > Evidence > Memory 우선순위

## [0.3.0] - 2026-03-19

### Added
- **Guardrail Engine** — 7개 선언적 규칙 (rm -rf, force-push, .env 보호 등)
- **Safety Invariants** — 5종 하드 리밋 (maxSteps, maxFileChanges, forbiddenPaths 등)
- **Dry-Run Mode** — 변경사항 대기열 + 미리보기 + 승인/거부
- PreToolUse 훅이 Bash+Write+Edit 가드레일 체크

## [0.2.0] - 2026-03-19

### Added
- `/swkit help` — 컬러풀한 에이전트 팀 시각화
- `scripts/core/display.mjs` — ANSI 컬러 터미널 UI
- Agent 이름: Scout, Archie, Bolt, Shield, Proof, Iron

## [0.1.0] - 2026-03-19

### Added — Initial Release
- **PDCA-Lite 5-Stage** (Plan→Do→Check→Act→Review)
- **5 Innovations**: Context Budget, Cross-Session Learning, Adaptive Routing, Evidence Chain, Self-Healing
- **6 Agents**: Explorer, Planner, Executor, Reviewer, Verifier, Wizard
- **7 Hook Handlers**: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, Stop, StopFailure
- **Multilingual** intent detection (한국어/English)
- **Atomic State** — temp+rename 패턴
- **4 Document Templates** — plan, review, completion, ADR
- Zero external dependencies
