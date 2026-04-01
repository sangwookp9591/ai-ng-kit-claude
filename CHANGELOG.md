# Changelog

## [2.8.96] - 2026-04-01 — Session Hygiene + Code Quality

세션 간 stale data 유출 방지 + 코드 리뷰 기반 품질 강화.

### Fixed

- **session-start GC**: 완료된 team-session/plan-state/persistent-mode 자동 정리 (stale 세션 참조 방지)
- **progress-tracker**: 완료/만료(24h) feature를 session-start에서 주입 차단
- **notepad**: compaction 항목 중복 append → 동일 feature 덮어쓰기
- **deepMerge**: `__proto__`/`constructor`/`prototype` 키 스킵 (prototype pollution 방지)
- **intent-detector**: "reviewr" 오타 → "reviewer" (agent name mapping table)
- **scope-drift**: stop-word 필터로 false positive 방지 ("the", "add" 등)

### Changed

- **타입 중복 제거**: ProfileConfig/AgentsConfig를 config.ts에서 export, Worker를 team-orchestrator에서 re-export
- **checkTokenLimit 통합**: profile-resolver가 token-tracker의 checkSessionTokenLimit에 위임
- **config TTL 캐시**: loadConfig()에 5초 statSync TTL 추가 (매 호출 2x statSync → TTL 내 0회)
- **model-router**: unsafe `as Record` cast 제거, 타입 안전 접근

## [2.8.94] - 2026-04-01 — User Agent Profile + Plan-Task v2

사용자별 에이전트/비용 설정 시스템 + 적응적 계획 파이프라인.
토큰 사용량이 적은 사용자도 경량 프로필로 aing 활용 가능.

### Added

- **User Agent Profile** (`scripts/routing/profile-resolver.ts`): 사용자별 에이전트 범위 + 비용 한도 설정
  - `resolveProfile()`: config에서 프로필 해석 (카테고리 ON/OFF + allow/deny + costMode)
  - `filterWorkers()`: verifier-first pruning + sam protected + 0명 solo fallback
  - `isAgentAllowed()`: OR 시맨틱 (다중 카테고리 에이전트 지원)
  - `AGENT_CATEGORIES`: 21개 에이전트 → 6개 카테고리 단일 소스 매핑
  - CLI 프리셋: `aing config profile light|standard|full`
- **Config 3단 Merge** (`scripts/core/config.ts`): `.aing/config.json` > `aing.config.json` > DEFAULTS
  - mtime 기반 캐시 무효화, `ProfileConfig` 인터페이스
- **selectTeamWithProfile** (`scripts/pipeline/team-orchestrator.ts`): 기존 selectTeam() API 불변 래퍼
- **checkSessionTokenLimit** (`scripts/telemetry/token-tracker.ts`): 세션 토큰 한도 체크

### Changed

- **plan-task v2**: 적응적 모델 라우팅, Context-First Architecture
  - Phase 0.5 Explore(haiku, 30초) → context snapshot → 전 에이전트 주입
  - 복잡도별 모델 자동 결정 (low: haiku/sonnet, mid: sonnet/opus, high: opus)
  - 2단계 Complexity 재평가 (정적 + Ryan Constraint 기반 동적)
  - Tool Call Budget + Timeout (Critic: 5/10, Ryan: 5, Klay: 15)
  - Klay Missing Constraints 파이프라인 내 복구 (Phase 1 재실행 없음)
  - antithesis=0 → INVALID (rubber stamp 구조적 차단)
  - 수렴 감지 강화 (stagnation + cosmetic diff 감지)
- **getCostMode()**: 환경변수 외에 config profile.costMode도 읽기
- **user-prompt-submit hook**: selectTeam → selectTeamWithProfile 교체

### Fixed

- **intent-detector**: '만들어줘' wizard 패턴이 pdca_do '만들어'와 충돌 — wizard에서 제거
- **scope-drift**: threeWayComparison 첫 단어만 매칭 → any word 매칭
- **task-manager**: Date.now() 기반 taskId 중복 — counter 추가
- **team-orchestrator**: getTeamPresets 카운트 4→5 (ai-pipeline)

## [2.8.93] - 2026-04-01 — Token Tracker: Hook-Enforced Usage Tracking

PostToolUse hook에서 Agent 완료 시 `<usage>` 태그를 자동 파싱하여 토큰 사용량을 기록.
SKILL.md 프롬프트 의존 없이 코드 수준 강제.

### Added

- **token-tracker** (`scripts/telemetry/token-tracker.ts`): 에이전트별 + 단계별 토큰 추적
  - `logTokenUsage()`: `.aing/telemetry/token-usage.jsonl`에 JSONL append
  - `getTokenSummary()`: stage별/agent별 집계
  - `formatTokenReport()`: k 단위 사용자 표시 텍스트
- **PostToolUse hook 토큰 캡처** (`hooks-handlers/post-tool-use.ts`):
  - `detectStage()`: team-session.json에서 plan/exec/verify/fix 자동 감지
  - `<usage>` 태그 regex 파싱 → `logTokenUsage()` 자동 호출
- **SKILL.md Token Tracking 지시**: auto/team 스킬에 Completion Report Token Summary 포맷 추가

## [2.8.92] - 2026-04-01 — v3.0 Foundation: 6-Phase Implementation

AING-DR 합의 계획(Ryan→Able→Klay→Peter→Critic)으로 설계, Hybrid Parallel 3-iteration으로 실행.
6개 Phase 완료, 187 신규 테스트 추가 (전체 1,285 tests).

### Added

- **Project Rules Engine** (`scripts/rules/`): `.aing/rules/*.json` 프로젝트별 커스텀 리뷰 규칙
  - `rule-types.ts`: ProjectRule 인터페이스
  - `rule-loader.ts`: JSON schema 검증 + 파일 시스템 로더
  - `rule-engine.ts`: regex 패턴 매칭 엔진
- **QA 고도화** (`scripts/qa/`):
  - `perf-benchmark.ts`: threshold 기반 성능 regression 감지
  - `flaky-detector.ts`: 비결정적 테스트 실패 감지
- **Agent Intelligence** (`scripts/agent-intelligence/`):
  - `feedback-loop.ts`: 에이전트 성과 기록 + JSONL 피드백 루프
  - `specialization-scorer.ts`: 도메인 적합도 스코어링 (0-100)
- **Review 고도화** (`scripts/review/`):
  - `cross-file-analyzer.ts`: regex 기반 import graph + 순환 참조 감지 (depth limit 3)
  - `incremental-review.ts`: git diff 기반 변경 파일만 리뷰
- **Harness Architect** (`scripts/harness/`):
  - `pattern-transfer.ts`: cross-project 패턴 export/import
  - `harness-evolution.ts`: suggestEvolution() 자동 진화 제안
  - `harness-composer.ts`: autoCompose() task 기반 자동 구성
- **AING-DR 테스트** (103 tests):
  - `plan-task-pipeline.test.mjs`: 8단계 파이프라인 E2E (43 tests)
  - `plan-state-edge.test.mjs`: REVISE/ITERATE 루프, max iteration (34 tests)
  - `quality-gate.test.mjs`: evidence 80%, testability 90% threshold (26 tests)

### Changed

- `guardrail-engine.ts`: `GuardrailRule` interface export 추가
- `telemetry-engine.ts`: `TELEMETRY_DIR`, `USAGE_FILE` export 추가
- `review-checklist.ts`: `injectProjectRules()` 동적 카테고리 주입
- `review-engine.ts`: `mode` (full/incremental) + `crossFileEnabled` 옵션
- `qa-orchestrator.ts`: `perfBenchmark`, `flakyReport` 통합
- `adaptive-architect.ts`: `feedbackData` 파라미터 (specialization 기반 재정렬)

## [2.8.91] - 2026-04-01 — Code-Enforced Direct Routing

`/aing do` 직접 라우팅 7개를 프롬프트 의존에서 코드 강제로 전환.
41개 스킬 전수 점검 완료 (참조 무결성, 트리거 충돌, 에이전트 등록 — 이상 0건).

### Changed

- **intent-router.ts**: Route 타입 4개 → 11개 확장 (`debug`, `review-pipeline`, `review-cso`, `explore`, `perf`, `refactor`, `tdd` 추가)
- **DIRECT_ROUTES 배열**: 7개 직접 라우팅을 코드 레벨 키워드 매칭으로 구현 — 일반 라우팅보다 최우선 적용
- 한국어 변형 커버리지 보강 (`느리` 등 활용형 추가)

### Fixed

- "느리지" 등 어간 변형이 `perf` 라우팅으로 연결되지 않던 문제 수정

## [2.8.9] - 2026-04-01 — AING-DR Consensus Planning Framework

plan-task를 AING-DR(6자 합의 계획 시스템)으로 전면 재설계.
omc ralplan 대비 설계 우위 11개 차원 확보, 실전 강건성 동등 이상 달성.

### Added

- **Ryan 에이전트** (`agents/ryan.md`): Deliberation Facilitator (opus)
  - Options 없이 Constraints/Preferences 도출 — Confirmation bias 구조적 차단
  - Constraints (불변, 위반 시 REJECT) vs Preferences (가변, 트레이드오프 가능) 분리
  - 코드베이스 Glob/Grep 기반 증거 수집, read-only
- **Peter 에이전트** (`agents/peter.md`): Synthesis Verifier (sonnet)
  - Steelman 반론 반영 검증 — ABSORBED / REBUTTED / ACKNOWLEDGED / IGNORED 4단계 분류
  - Delta Score: `(Resolved - New Issues) / Total Objections` — 2연속 정체 시 조기 종료
  - Confidence Level 판정: HIGH / MED / LOW (최종 ADR에 반영)
- **Critic 에이전트** (`agents/critic.md`): Deliberation Critic (opus)
  - 5-Phase Investigation Protocol: Pre-commitment → 9-Step Verification → Multi-perspective → Gap Analysis + Self-audit → Synthesis
  - Adaptive Harshness: THOROUGH → ADVERSARIAL 에스컬레이션 (CRITICAL 1개 또는 MAJOR 3개+)
  - Self-audit + Realist Check — 과잉 판정/과소 판정 모두 방지
  - Failure Modes 13항목 + Final Checklist 21항목 (omc Critic 수준 흡수)
- **Quality Standards (Hard Gates)**: 80%+ claims cite file/line, 90%+ criteria testable, 100% Constraints, 0 FRAGILE unaddressed, 0 IGNORED steelman
- **Phase 0: Pre-execution Gate**: 모호 요청 차단 — 구체적 앵커 없으면 스코핑 강제, `force:` bypass
- **State Management**: `.aing/state/plan-state.json` — phase 추적, lifecycle, 세션 복원, 5 Mandatory Rules, Critic의 State Integrity Check
- **Interactive mode** (`--interactive`): 2개 User Review Point (초안 확인 + 최종 승인), 5개 선택지
- **Living ADR**: Confidence Level + Drivers 변경 이력(Initial→Final) + Rejection Evidence(Constraint 기반) + Critic Assessment + Rollback Plan

### Changed

- **plan-task SKILL.md** 전면 재설계 (111줄 → 453줄)
  - 3자(Able/Klay/Milla) → 6자(Ryan/Able/Klay/Peter/Critic) 합의
  - RALPLAN-DR → AING-DR (Constraints/Preferences/Drivers/Options)
  - 7-Phase Pipeline + Consensus Loop (low 3회, mid-high 5회)
  - 복잡도별 DR 분화: Lite(low) / Standard(mid) / Deep(high+deliberate)
- **able.md**: sonnet → **opus** 업그레이드, AING-DR 출력 구조, Drivers 가변화, Rejection Evidence, Living ADR 생성
- **klay.md**: Plan Review Mode → **Steelman Deliberation** — 반론(antithesis), Tradeoff Tension, Constraint-Option Consistency, New Driver Proposal, Synthesis Path
- **milla.md**: Plan Review Mode **삭제** — 보안 전문가 본연의 역할로 복원. 심의 품질은 전용 Critic이 담당.

### Design Decisions (vs omc ralplan)

| AING-DR 고유 강점 | 설명 |
|---|---|
| Confirmation bias 차단 | Ryan이 Options 없이 원칙 확정 (Planner 단독 도출의 편향 제거) |
| Synthesis 검증 | Peter가 반론 반영을 항목별 정량 추적 (형식적 언급 방지) |
| 수렴 측정 | Delta Score로 무의미한 반복 감지 + 조기 종료 |
| Driver 가변화 | Klay가 새 Driver 제안, 변경 이력 Living ADR에 기록 |
| Rejection Evidence | 기각 옵션마다 Constraint/Driver 충돌 근거 필수 |
| 복잡도 분화 | low에서 과잉 의식 방지 (DR Lite), high에서 Pre-mortem + Rollback |
| Living ADR | Confidence + Driver 이력 + Critic 결과 + Steelman 대응 통합 |

## [2.8.87] - 2026-03-31 — Skill Progressive Disclosure Refactor

### Changed

- **5대 스킬 SKILL.md progressive disclosure 리팩토링** — 본문 68% 축소 (1,941줄 → 603줄)
  - `team` (542→157줄): 5 stage를 `references/stage-*.md`로 분리
  - `auto` (403→155줄): presets, worker prompt, report를 `references/`로 분리
  - `start` (350→88줄): 4 phase 상세를 `references/phase-details.md`로 분리
  - `debug` (331→92줄): agent prompts, templates, 보조 모드를 `references/`로 분리
  - `plan-task` (315→111줄): Able/Klay/Milla 프롬프트 템플릿을 `references/`로 분리
- **설계 원칙**: SKILL.md = "무엇을 어떤 순서로" (흐름+전환조건), references/ = "구체적으로 어떻게" (프롬프트+UI포맷)
- Sub-agent가 역할/기능을 더 정확히 이해하도록 핵심 정보 밀도 향상

## [2.8.86] - 2026-03-31 — AI Pipeline + Sub-Agent Context Fix + Test Suite Green

### Added

- **Jo 에이전트** (`agents/jo.md`): AI 구현 시니어 — 모델→코드→API 변환 전문가
  - Transformers.js / ONNX.js (browser), TFLite / CoreML (mobile), FastAPI / Node (server)
  - 전처리/후처리 파이프라인, 양자화 wrapper, TDD 필수
- **Hugg 에이전트** (`agents/hugg.md`): AI 모델 리서치 시니어 — HuggingFace 모델 탐색/비교/선정
  - 정량 비교 매트릭스 (accuracy/latency/size/license), Lightweight 우선 필터
  - TOP 3 선정 + Implementation Spec 작성
- **AI Pipeline 스킬** (`skills/ai-pipeline/SKILL.md`): 5-Phase 자동 파이프라인
  - DISCOVER → COMPARE → IMPLEMENT → API → TEST
- `ai-pipeline` 프리셋 (`team-orchestrator.ts`): hugg→jo→jay→milla 팀 구성
- `ai-research`, `ai-impl` 에이전트 티어 (`agent-tiers.ts`)

### Fixed

- **Sub-Agent Context Overflow**: sub-agent가 context 꽉 차면 잘못된 resume 안내하던 문제
  - `subagent-start.ts` hook에 context 관리 규칙 자동 주입
  - `generateWorkerPrompt()`에 CONTEXT MANAGEMENT 섹션 추가
  - Stop hook에서 200K 하드코딩된 check-context.sh 제거
- **테스트 10개 전부 수정** (1098 pass, 0 fail):
  - confidence-decay, intent-router CLI, review-checklist, safety-e2e, ship-e2e, skill-validation
- **SKILL.md.tmpl frontmatter 누락** (review-pipeline, ship)

## [2.8.82] - 2026-03-31 — Independent: remove all external references

### Changed

- **프로젝트 독립화:** 모든 외부 프레임워크 참조 제거, aing 독자 브랜딩 확립
- docs/WHY-AING.md, ROADMAP-v3.md 전면 리라이트 (독자 가치 제안)
- README.md 비교표 → 독자 스펙 테이블
- agents/*.md, scripts/*.ts, skills/*.md, CHANGELOG.md에서 외부 참조 정리
- dist/ 재빌드 반영

## [2.8.81] - 2026-03-31 — Fix: dist/ included in git for plugin cache

### Fixed

- **dist/ git 포함:** `.gitignore`에서 `dist/` 제거, 빌드 결과물을 git에 커밋하여 플러그인 캐시(git clone) 호환성 확보
- 플러그인 설치 후 `npm install && npm run build` 불필요

## [2.8.8] - 2026-03-31 — Fix: .mjs script path resolution

### Fixed

- **스킬 스크립트 경로 수정:** 모든 스킬의 `scripts/*.mjs` 참조를 `dist/scripts/*.js`로 변경
  - 원인: `tsc` 빌드가 `dist/`로 출력하지만 스킬 파일들이 소스 경로의 `.mjs`를 참조
  - 영향: `stop.js`, `intent-router.mjs`, `persist.mjs`, `setup-progress.mjs` 등 MODULE_NOT_FOUND 에러
  - 수정 파일: `do`, `auto`, `team`, `plan-task`, `debug`, `start`, `agent-ui`, `verify-evidence` SKILL.md
  - hooks.json은 이미 `dist/hooks-handlers/*.js`를 올바르게 참조 (변경 없음)

### Changed

- **버전 동기화:** `package.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` 3곳 모두 `2.8.8`로 통일
- **docs 업데이트:** `docs/USER-GUIDE.md` 버전 헤더 `v2.5.0` → `v2.8.8`

## [2.8.7] - 2026-03-31 — Harness Architect: 7-Feature Meta-Skill

### Added

**`/aing harness` — 하네스 설계 메타 스킬 (40번째 스킬)**
- ZIVO/harness 프로젝트를 분석·흡수하여 aing 네이티브 스킬로 재구성
- 6-Phase 워크플로우 (도메인 분석 → 팀 설계 → 에이전트 정의 → 스킬 생성 → 오케스트레이션 → 검증)
- 6개 reference 문서 포팅 (agent-design-patterns, orchestrator-template, skill-writing-guide, skill-testing-guide, team-examples, qa-agent-guide)

**7개 서브커맨드 + 9개 TypeScript 엔진 (2,523 LOC)**

| 서브커맨드 | 엔진 | 기능 |
|-----------|------|------|
| `/aing harness "task"` | `adaptive-architect.ts` (413 LOC) | 복잡도 기반 자동 설계 — 6개 도메인 프로파일, 패턴/에이전트/모델 자동 추천 |
| `/aing harness check` | `validate-harness.ts` (272 LOC) | 구조/연결/품질/팀크기 4축 자동 검증 — 순환의존성·고립에이전트·dead link 탐지 |
| `/aing harness find` | `harness-gallery.ts` (251 LOC) | 패턴 DB + 추천 — 5개 빌트인 패턴, 사용자 패턴 자동 등록, 성공률 기반 정렬 |
| `/aing harness sim` | `harness-simulator.ts` (271 LOC) | 데이터 흐름 시뮬레이션 — Phase별 입출력 추적, 파일명 불일치·에러 시나리오 탐지 |
| `/aing harness log` | `harness-evolution.ts` (236 LOC) | 버전 관리 + A/B 비교 — 스냅샷, 메트릭 기록, 개선/퇴보 판정 |
| `/aing harness chain` | `harness-composer.ts` (204 LOC) | 멀티 하네스 파이프라인 — `"a → b → c"` 조합, 실행 계획 생성 |
| `/aing harness fix` | `harness-debugger.ts` (292 LOC) | 런타임 진단 — 멈춘 에이전트·누락 산출물·단절 데이터 흐름 탐지 + 수정 제안 |

**Foundation 모듈**
- `harness-types.ts` (219 LOC): 전체 harness 모듈 공유 타입 — 17개 인터페이스
- `harness-parser.ts` (365 LOC): 에이전트/스킬 마크다운 파서 — frontmatter, 섹션 추출, 데이터 흐름 추출, 패턴 자동 감지

**기존 모듈 재사용**
- `complexity-scorer` → Adaptive Architect 팀 규모 산정
- `model-router` → 에이전트별 모델 라우팅
- `state.ts` → 갤러리/이력 상태 저장
- `logger.ts` → 전 모듈 구조화 로깅
- `path-utils.ts` → 파일명 안전화

### Tests
- 44개 통합 테스트 전체 통과 (7개 기능 × 3~9개 테스트 케이스)
- TypeScript 컴파일 에러 0개

### Stats
- Skills: 39 → **40** (+1)
- TS LOC: 36K → **~38.5K** (+2,523)
- Harness modules: 0 → **9**
- Innovation count: 24 → **25** (Harness Architect)

## [2.8.6] - 2026-03-30 — Stop Hook Schema Fix + Build Pipeline

### Fixed
- **Stop hook JSON validation error**: `stop.ts` and `stop-failure.ts` used `hookSpecificOutput.additionalContext` which is not supported by Stop hook schema. Changed to `stopReason` top-level field.
- **Build pipeline**: Added `tests/e2e/browse/**` to tsconfig exclude to unblock compilation (browse dist artifacts not present in plugin cache).
- **dist/ generation**: Ran `npm install --legacy-peer-deps` + `npx tsc` to generate missing `dist/hooks-handlers/*.js` files.

## [2.8.3] - 2026-03-30 — Production Browse + Eval E2E + Ship Full Chain + Teacher Engine

### Added

**Teacher Engine — Learn by Building**
- `/aing teacher <task>`: Socratic teaching mode that breaks down tasks into concepts.
- teacher-engine.ts: Concept extraction (ast-grep) + step-by-step teaching plan generator.
- knowledge-tracker.ts: User progress persistence across sessions.
- Interactive Q&A: Agent asks questions to verify user understanding before implementation.

**ai-ng-landing Migration & Integration**
- Full migration of landing page components and review logic into ai-ng-claude.
- pre-landing-reviewer.ts: Diff-based security & quality checklist for landing/web projects.
- Enhanced `intent-router.js` with 'landing page' and 'dashboard' specialized routing.

**Browse Production Server (142 → 1,706 LOC)**
- server.ts: BrowseServer class with session management, 30-min idle cleanup
- Bearer token auth on all routes, /health + /activity + /sessions endpoints
- Auto-restart on browser crash (3 attempts with exponential backoff)
- Graceful shutdown (SIGTERM/SIGINT → cleanup state file)
- activity.ts: EventEmitter pub/sub with circular buffer (100 events)
- buffers.ts: FlushableBuffer with 1s async disk flush (50K entries x 3 channels)
- start-server.ts: Stale PID detection, random port selection (10000-60000)

**Eval E2E Infrastructure**
- session-runner.ts: claude -p subprocess manager with NDJSON streaming + heartbeat
- eval-store.ts: persistent eval results with atomic writes + regression comparison
- touchfiles.ts: git diff-based eval selection (20 default eval mappings)
- 10 E2E skill test suites (131 tests): auto, review, ship, debug, explore, tdd, team, qa-loop, browse, lsp

**Ship → Deploy Full Chain**
- land-orchestrator.ts: PR check → merge → deploy wait → canary (4 steps)
- land-and-deploy SKILL.md updated with orchestrator reference
- Full chain: /aing ship (7 steps) → /aing land-and-deploy (4 steps) = 11 steps

**ETHOS.md — Builder Philosophy**
- 8 principles: No Evidence No Done, PDCA는 방향, 에이전트는 역할, 자가 치유, Cross-Session Learning, Hook은 눈, Zero Dependencies, 사용자가 결정

**Quality**
- playwright 1.58.2 (latest) + chromium installed
- circuit-breaker mkdirSync bug fix
- kain agent → lsp skill 연결 (미참조 해소)
- vitest config: unit tests only (e2e/teaching 분리)
- .mjs test import 경로 수정 (234 imports → dist/)

### Performance
- Tests: 210+ → **1,712 pass** (vitest 422 + E2E 131 + eval 331 + .mjs 719)
- Test files: 65 → **84**
- TS LOC: 29K → **36K** (+24%)
- Browse server: 142 → **1,706 LOC**
- Eval infra: 0 → **1,035 LOC** (session-runner + store + touchfiles)
- TypeScript errors: **0**
- Logic test failures: **0** (5 pre-existing assertion only)

## [2.8.2] - 2026-03-30 — Quality & Infra Hardening

### Added

**Code Quality 대폭 강화**
- TypeScript strict 완전 활성화: `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters` true
- vitest 도입 + 7개 core 모듈 유닛 테스트 (130 cases)
- ESLint v10 + typescript-eslint + Prettier 설정

**State Management 고도화**
- state.ts: 5초 TTL Read Cache (200 entry LRU) + advisory file lock (PID 검증, 500ms timeout)
- telemetry-engine.ts: JSONL 로그 로테이션 (1MB/30일, 1회/시간 throttle)
- notepad.ts: 3-tier 노트패드 (priority 영구 / working 7일 / manual 영구)

**Hook System 확장 (7 → 9 이벤트, 12+ 기능)**
- SubagentStart/SubagentStop hook: 에이전트 생명주기 추적 + agent-trace.json 기록
- Persistent Mode: stop hook 연동, 활성 모드 감지 시 중단 방지 메시지
- Preemptive Compaction: 토큰 80% 초과 시 자동 경고 + compaction 카운트 추적
- Learner Hook: command/filePattern/errorFix 3가지 패턴 자동 학습
- session-start: priority notepad 자동 주입 + persistent mode 복원

**Orchestration 강화**
- team-heartbeat.ts: worker 생존 모니터링 + health score 산출
- phase-gate.ts: exec→verify→fix 전환 검증 (blocker/warning 구조)
- subagent hooks → heartbeat 자동 연동 (start→register, stop→markDone)
- HUD statusline: 팀 상태 실시간 표시

**AST 구조적 코드 검색**
- @ast-grep/napi 통합: `astGrepSearch` + `astGrepReplace`
- 지원 언어: TypeScript, JavaScript, TSX, CSS, HTML
- Kain 에이전트의 dead code 탐지 정확도 향상

### Changed
- tsconfig.json: noImplicitAny/noUnusedLocals/noUnusedParameters 활성화 → 97개 타입 에러 수정
- stop.ts: persistent mode 감지 로직 통합
- pre-compact.ts: notepad working 자동 저장 + budget 경고
- post-tool-use.ts: learnable pattern 감지 추가
- session-start.ts: priority notepad + persistent mode 주입

### Performance
- 테스트: **~210+ cases** (130 vitest + 56 legacy + 22 heartbeat/gate)
- 테스트 커버리지: 11 → **~25 files** (2.3x 증가)
- State read 성능: file I/O → **5s TTL 캐시** (반복 읽기 ~100x 향상)
- Runtime deps: 0 → **1** (@ast-grep/napi)
- Hook 이벤트: 7 → **9** (SubagentStart/Stop 추가)

### vs OMC 비교 (코드 기반 분석)
- **aing 8.05/10 vs OMC 8.78/10** (갭 1.68 → 0.73, **56% 축소**)
- Orchestration 영역 **역전** (aing 8.5 > OMC 8.4)
- Code Quality 5.5 → **8.0**, State 6.5 → **8.3**, Hook 6.5 → **8.2**

## [2.8.1] - 2026-03-30 — Teacher + Design System + Skill Ecosystem

### Added

**Teacher Agent (소크라틱 교육 시스템)**
- Teacher agent: 질문 기반 교육 에이전트 — 답을 주지 않고 질문으로 이끔
- knowledge-tracker.ts: 학습자 지식 수준 추적 + 난이도 자동 조절
- teacher-engine.ts: 소크라틱 대화 흐름 관리 + 힌트 시스템

**Design System (신규)**
- design-engine.ts: 디자인 토큰 생성 (색상/간격/타이포/반경/그림자)
- design-compare.ts: 다중 변형 비교 + 순위 매기기 + 마크다운 출력
- design-iterate.ts: 피드백 기반 디자인 반복 개선 + auto-fix
- design-gallery.ts: 갤러리 뷰 (정렬/필터/HTML 프리뷰)
- design-evolve.ts: 진화적 디자인 최적화 (세대별 변이 → 선택 → 진화)
- CSS custom properties + Tailwind config 자동 출력
- 프로젝트 타입별 컴포넌트 인벤토리 (dashboard/saas/ecommerce/landing)

**Browse System 강화 (36→60 commands)**
- url-validation.ts: URL 보안 검증 (javascript:/data: 차단)
- cookie-import-browser.ts: 실제 Chrome/Edge/Brave/Arc 쿠키 가져오기
- connect-chrome.ts: headed Chrome 연결 + 디버깅 포트
- 신규 커맨드: dialog-accept, dialog-dismiss, dialog, eval, useragent, cookie-import, frame, state save/load, connect, disconnect, focus, handoff, resume, watch, inbox, restart

**Skill Ecosystem 확장 (5→39 skills)**
- investigate: 4-phase 과학적 디버깅 (증거 없이 고치지 않음)
- office-hours: YC 스타일 6가지 강제 질문
- retro: 주간 엔지니어링 회고 + git 분석
- benchmark: 성능 회귀 감지 + 예산 시스템
- freeze / unfreeze: 디렉토리 범위 편집 보호
- land-and-deploy: PR merge → CI → 배포 → 카나리 전체 파이프라인
- design-consultation: 제품 이해 → 디자인 시스템 제안
- design-review: 시각 QA (AI slop 10 + litmus 7 + hard rejection 7)
- cso-audit: 14단계 보안 감사 스킬
- careful: 위험 명령 경고 + 안전 모드

**Eval & Test 인프라 (32→56 test files, 333+ new tests)**
- eval-framework.test: 스킬 품질 평가 (AI slop 감지, 구조 검증)
- agent-eval.test: 에이전트 정의 품질 검증 (frontmatter, 팀 커버리지)
- integration-eval.test: 모듈 통합 테스트 (35+ dist 모듈 검증)
- browse tests: commands, url-validation, buffers, snapshot (68 tests)
- guardrail-rules.test: 위험 명령 패턴 + 프롬프트 인젝션 감지
- agent-definitions.test: 16 에이전트 frontmatter 일관성 (101 tests)

### Changed
- hooks.json: 기존 .mjs → .ts 마이그레이션 (TypeScript 전환)
- package.json: TypeScript 6.0 + Node.js 22+ 엔진 요구

### Performance
- 총 소스 LOC: 21,558 (scripts 17,914 + browse 2,566 + hooks 907)
- 테스트: 56 files / 9,539 LOC / 333+ new tests all passing
- Browse commands: 60
- Skills: 39
- Named agents: 16
- Design system: 1,078 LOC (5 modules)
- Runtime dependencies: 0 (zero)

## [2.8.0] - 2026-03-30 — Multi-AI Consensus + PDCA Auto-Scaling

### Added
- Multi-AI Consensus Engine: 3-voice voting (Claude + Codex + Gemini) with cli-bridge factory
- PDCA Auto-Scaling: complexity score (0-15) → automatic iteration limits and review tiers
- Confidence Decay Learning: entries decay over 30 days, user-stated entries never decay
- Agent Cost Dashboard: automatic cost summary in session-end hook
- MCP Browse QA Orchestrator: browser testing via Playwright MCP + evidence chain integration
- Prompt Injection Guard: 7 regex patterns + XML trust boundary wrapping
- CLI tools: aing-learn (JSONL learning management), aing-bench (benchmark runner)
- Test infrastructure: LLM judge (7 criteria), touchfiles (diff-based selection), eval store

### Changed
- Intent router: 13 failures fixed, simplified to 4 routes (auto/plan/team/wizard)
- outside-voice.mjs: now integrates with multi-AI consensus engine
- project-memory.mjs: schema extended with confidence/source/lastDecayed fields
- pdca-engine.mjs: startPdca accepts complexityScore for auto-scaling

### Performance
- 446+ tests (from 380), 118 suites
- Zero new runtime dependencies (MCP Playwright is built into Claude Code)

## [2.7.0] - 2026-03-30

### Added — Review + Ship + QA 완전 구현

**에이전트 팀 (14명 → 15명)**
- Simon: Code Intelligence → CEO / Product Strategy 역할 전환 (opus)
- Kain: 신규 — Code Intelligence / Static Analysis (sonnet)

**Review Pipeline (11 modules)**
- review-checklist.mjs: 18-category 코드 리뷰 (6 CRITICAL + 12 INFORMATIONAL)
- pre-landing-reviewer.mjs: diff 기반 체크리스트 자동 실행 (ship step 4)
- ceo-reviewer.mjs: 6-question Office Hours + scope decision
- eng-reviewer.mjs: 5-section 아키텍처/품질/테스트/보안/성능
- design-reviewer.mjs: AI Slop 10 + Litmus 7 + 10-dimension scoring
- review-dashboard.mjs: Review Readiness Dashboard + staleness 감지
- scope-drift.mjs: 3-way 비교 (intent vs plan vs diff)
- outside-voice.mjs: Cross-model adversarial review
- cso-audit.mjs: 14-phase OWASP + STRIDE 보안 감사
- aria-refs.mjs: ARIA 접근성 트리 ref 시스템
- browser-evidence.mjs: MCP Playwright → Evidence Chain 통합

**Ship Workflow (7 modules)**
- ship-orchestrator.mjs: 7단계 실제 git 실행 파이프라인
- preflight-check.mjs: 4가지 사전 검증 (branch/clean/review/sync)
- test-triage.mjs: pre-existing vs branch-new failure 분류
- version-bump.mjs: 시맨틱 버전 자동 bump
- changelog-gen.mjs: Conventional commit → CHANGELOG 생성
- pr-creator.mjs: gh CLI PR 자동 생성
- canary-monitor.mjs: 배포 후 헬스 체크 루프

**QA Engine (2 modules)**
- qa-orchestrator.mjs: health score + fix loop (max 5) + error 중복 감지
- regression-detector.mjs: baseline 대비 회귀 감지

**Evidence & Scoring**
- llm-judge.mjs: 7-criteria LLM 품질 평가 (0-10)
- qa-health-score.mjs: 8-category 가중 건강 점수 (A-F)
- design-scoring.mjs: AI Slop 10 + Hard Rejection 7 + Litmus 7
- benchmark-engine.mjs: 성능 회귀 감지 (50%/500ms 임계값)
- completeness-scorer.mjs: 목표-역방향 검증 (0-10)

**Pipeline & Autoplan**
- autoplan-engine.mjs: 6-principle 자동 결정 (mechanical/taste/user-challenge)
- retro-engine.mjs: 13-step 회고 (45m 세션 감지, focus score)

**Safety & Guardrails**
- careful-checklist.mjs: 8 위험 패턴 감지 + safe exception
- mutation-guard.mjs: 파일 변이 감사 추적
- freeze-engine.mjs: 디렉토리 스코프 편집 제한

**Telemetry**
- telemetry-engine.mjs: 3-tier (community/anonymous/off) + pending marker 크래시 복구
- session-start/stop 훅 연동 (자동 수집)

**CLI Utilities (4 modules)**
- aing-config.mjs: dot-notation 설정 관리
- aing-diff-scope.mjs: 6-category 변경 범위 감지
- aing-analytics.mjs: 사용 통계 대시보드
- aing-doctor.mjs: 설치 상태 진단

**Build System**
- gen-skill-docs.mjs: 20개 placeholder resolver
- resolvers/: review, ship, evidence, qa 4개 리졸버
- generate-all.mjs: 풀 빌드 파이프라인 (--check, --force)
- touchfiles.mjs: diff-based 스킬 의존성 매핑

**Intent Router 강화**
- 11-route 자연어 직접 라우팅 (debug, review, perf, explore, tdd, cso, refactor)
- 행동 키워드 감지 ("추가해"/"만들어" → auto)
- case-insensitive 매칭

**Documentation**
- docs/USER-GUIDE.md: 전체 사용자 가이드 (5 patterns, 9 상황, FAQ)
- docs/ROADMAP-v3.md: v3.0 로드맵 (7 Phase, ~14K LOC)
- ARCHITECTURE.md: 모듈 구조, 보안 모델, 에이전트 팀
- CONTRIBUTING.md: 셋업, 테스트, 컨벤션 가이드

**CI Pipelines (3 workflows)**
- .github/workflows/skill-docs.yml: 스킬 freshness CI
- .github/workflows/tests.yml: 유닛+통합 테스트 CI
- .github/workflows/evals.yml: E2E eval (manual dispatch)

**Skills (2 신규)**
- skills/review-pipeline/: 4-tier 리뷰 파이프라인
- skills/ship/: 7-step 자동 Ship

**Tests: 123/123 ALL PASS**
- 22 test files, 53 suites
- E2E: ship, qa, review-pipeline, browser, safety
- Unit: review-modules, browser-modules, review-checklist, skill-validation

### Changed
- Simon: Code Intelligence → CEO / Product Strategy (opus)
- README.md: 5 Usage Patterns + 초보자 가이드 + FAQ + Quick Reference
- agents/sam.md: + Boil the Lake 철학
- agents/able.md: + Boil the Lake + Office Hours 6-question
- agents/milla.md: + Review Pipeline + CSO 14-phase
- agents/willji.md: + AI Slop Detection + Litmus Checks
- review-engine.mjs: CEO Review 에이전트 able+sam → simon+able

### Fixed
- scope-drift.mjs: glob regex 이스케이프 버그 (. 매칭 오류)
- changelog-gen.mjs: pipe(|) 포함 커밋 메시지 파싱 오류
- deploy-detect.mjs: ESM에서 require() 사용 (ReferenceError)
- review-log.mjs: 멀티 에이전트 경쟁 조건 (atomic write)
- review-checklist.mjs: severity sort에서 || → ?? (falsy 0 버그)

## [2.4.8] - 2026-03-27

### Added — GitHub Issue 자동 처리 파이프라인

- `.github/workflows/issue-handler.yml` 추가
- `aing-auto` 라벨이 붙은 이슈를 Claude Code CLI로 자동 분석/수정
- 수정 완료 시 PR 자동 생성 + 이슈에 코멘트
- GitHub Actions command injection 방지 (env 변수만 사용)

## [2.4.7] - 2026-03-27

### Added — norch SendMessage 연동 + 배포 품질 개선

- hooks matcher에 `SendMessage` 추가 — 팀 내 `@agent` 통신이 norch에 활동으로 표시
- pre-tool-use / post-tool-use에 SendMessage 이벤트 처리 로직 추가

### Changed

- `agents/wizard.md` → `agents/iron.md`로 리네임 (name 필드와 파일명 일치)
- `.gitignore` 정리 — `.aing/` 전체를 blanket ignore (런타임 파일 69개 git 트래킹 제거)
- `session-start.mjs` 내부 버전 문자열 `v2.1.7` → `v2.4.7`

## [2.4.6] - 2026-03-26

### Changed — 매니페스트 버전 범프

- 3곳 매니페스트 버전 2.4.6 통일

## [2.4.5] - 2026-03-26

### Fixed — norch-bridge 에이전트 라이프사이클 이벤트 수정

- agent-spawn / agent-done 이벤트가 norch에 정상 전달되도록 수정

## [2.4.4] - 2026-03-26

### Added — norch-bridge 내장

- 에이전트 활동 시각화를 위한 norch-bridge 자동 연동
- Unix socket `/tmp/norch.sock`으로 fire-and-forget 이벤트 전송
- norch 미설치 시 zero overhead

## [2.4.3] - 2026-03-26

### Changed — 매니페스트 description 업데이트

- `package.json`, `plugin.json`, `marketplace.json` description에 v2.4.x 신규 기능 반영
- 에이전트 14명, Flutter 스킬, Gate Review 등 최신 스펙 반영

## [2.4.2] - 2026-03-26

### Fixed — persist.mjs `--dir` 누락으로 .aing/tasks 미생성 버그

- `persist.mjs` 호출 시 `--dir "$(pwd)"` 미전달로 cwd가 플러그인 디렉토리일 때 `.aing/tasks/`가 사용자 프로젝트가 아닌 엉뚱한 위치에 생성되는 버그 수정
- 영향 스킬 4개 모두 수정: `plan-task`, `auto`, `team`, `debug`

## [2.4.1] - 2026-03-26

### Changed — 에이전트 역할 재편 + Flutter 스킬 + 리브랜딩 잔여 정리

#### 에이전트 역할 스왑: Derek ↔ Iron
- **Derek**: Frontend / Build → **Mobile / Flutter** 시니어로 역할 전환
  - Flutter/iOS/AOS 크로스플랫폼 앱 설계 및 구현 전담
  - 레이어드 아키텍처 (UI → Logic → Data) 원칙 적용
  - Animation Strategy 섹션 추가 (Implicit/Explicit/Hero/Physics-Based)
- **Iron (구 Wizard)**: Wizard → **Frontend / Build**로 역할 전환
  - 기존 Derek의 프론트엔드 역할 승계 (React, shadcn/ui, 컴포넌트 구현)
  - 비개발자 마술사 컨셉 → 실전 프론트엔드 엔지니어로 전환

#### 신규 스킬 2개
- `/aing flutter-animation`: Flutter 애니메이션 구현 가이드 (Implicit/Explicit/Hero/Physics-Based)
- `/aing flutter-architecture`: Flutter 앱 아키텍처 설계 (레이어드 구조, 상태 관리, 프로젝트 구조화)

#### Display / HUD / Pipeline 반영
- `display.mjs`: Derek role `Frontend` → `Mobile/Flutter`, Iron role `Wizard` → `Frontend/Build`
- `display.mjs`: 팀 그룹 — Frontend팀 `[iron, rowan]`, Mobile팀 `[derek]`
- `statusline.mjs`: Derek `Frontend` → `Mobile`, Wizard `Wizard` → `Frontend`
- `team-orchestrator.mjs`: mid/high 프리셋 Frontend 실행자 `derek` → `iron`

#### 리브랜딩 잔여 정리
- `.gitignore`: `.sw-kit/` 경로 → `.aing/`으로 통일
- `banner.svg`: `sw` → `ai`, `sw-kit` → `aing`, `HARNESS ENGINEERING AGENT` → `AI-NG ENGINEERING AGENT`

## [2.4.0] - 2026-03-26

### Added — 신규 에이전트 2개 + 스킬 4개 + Team Gate Review

#### 신규 에이전트
- **Jun** (sonnet): Performance / Optimization — 런타임 핫스팟, 번들 사이즈, 쿼리/메모리 분석
- **Simon** (sonnet): Code Intelligence / Dead Code — LSP/AST 기반 미사용 export/함수/파일 탐지

#### 신규 스킬 4개
- `/aing refactor`: 구조적 리팩토링 — Klay(영향 분석) → Jay/Derek(실행) → Milla(검증), 자동 체크포인트
- `/aing test`: 테스트 실행/커버리지 분석/누락 테스트 생성 — run/cover/gen 3모드
- `/aing perf`: 성능 프로파일링 — Jun(분석) + Klay(구조), bundle/runtime/query 3모드
- `/aing lsp`: 죽은 코드 탐지 — Simon(LSP/AST/Grep 3단계), `--fix`로 자동 제거

#### Team Pipeline 강화: Task-Level Gate Review
- 각 task 완료마다 Milla(haiku) 자동 gate review 실행 (build/tests/security 체크)
- `GATE_PASS` → 다음 task / `GATE_FAIL` → 즉시 fix → re-gate (최대 2회)
- **"리뷰할까요?" 질문 금지** — 하네스 엔지니어링 원칙: 파이프라인이 자동 판정·전환
- team-verify의 performance reviewer를 Jay → Jun으로 전환

### Removed
- `commands/` 디렉토리 전체 삭제 (legacy delegation 래퍼 14개) — `/aing:*` prefix 스킬만 사용

### Fixed
- `perf/SKILL.md`: 에이전트 이름 불일치 (Jay → Jun) 4곳 수정
- `lsp/SKILL.md`: 에이전트 이름 불일치 (Klay → Simon) 2곳 수정
- `team/SKILL.md`: performance reviewer 참조 Jay → Jun 수정
- `test/SKILL.md`: 트리거 `"테스트"` 충돌 → `"테스트 실행"`으로 구체화 (tdd 스킬과 분리)
- `refactor/SKILL.md`: 트리거 `"정리"` → `"구조 정리"`로 구체화 (lsp 스킬과 분리)
- `agents/simon.md`: 도구/규칙 불일치 해소 (read-only 전용 명시)

## [2.3.3] - 2026-03-26

### Added — Statusline 업데이트 알림 + 랜딩 페이지 최신화

#### Statusline 업데이트 알림
- GitHub에서 최신 버전을 확인하여 statusline에 `⬆ vX.Y.Z` 표시
- 1시간 간격 캐시 + non-blocking 백그라운드 체크 (성능 영향 없음)
- `.aing/state/version-check.json`에 캐시 저장

#### 랜딩 페이지 최신화
- 버전 2.2.3 → 2.3.3, GitHub URL `ai-ng-kit-claude`로 수정
- 삭제된 `/aing cost` 커맨드 제거
- 신규 스킬 반영: `figma-read`, `progress-check`, `design`, `qa-loop`, `plan-task`, `review-code`
- Modes에 `figma→code`, `qa-loop` 추가

## [2.3.2] - 2026-03-26

### Changed — 프로젝트 리브랜딩: sw-kit → aing (ai-ng-kit)

#### 전체 리네이밍 (129개 파일)
- **프로젝트명**: `sw-kit` → `aing`
- **패키지명**: `sw-kit-claude` → `ai-ng-kit`
- **스킬 prefix**: `sw-kit:` → `aing:` (모든 에이전트 호출)
- **슬래시 커맨드**: `/swkit` → `/aing`
- **작업 디렉토리**: `.sw-kit/` → `.aing/`
- **로깅 prefix**: `[sw-kit:*]` → `[aing:*]`
- **Git remote**: `sangwookp9591/sw-kit-claude` → `sangwookp9591/ai-ng-kit-claude`
- **커맨드 파일**: `commands/swkit.md` → `commands/aing.md`

#### 테스트 개선
- `intent-router.test.mjs`: 하드코딩 절대 경로 → `import.meta.url` 기반 상대 경로로 변경

## [2.3.1] - 2026-03-25

### Improved — 코드 품질 강화 + 스킬 정리 + Figma/Progress 에이전트 추가

#### 코드 리뷰 이슈 5건 수정
- **DRY 추출**: `getActiveSession()` → `scripts/core/session-reader.mjs`, `sanitizeFeature()` → `scripts/core/path-utils.mjs` 공통 모듈화
- **API contract 통합**: `stop.mjs` 자체 `writeHandoff` 제거, `handoff-manager.mjs` import로 통합
- **Regex bug**: `handoff-manager.mjs` stage 파싱 — `.+?` → `.+` (greedy) 변경으로 `team-plan` 등 `-` 포함 stage명 정상 파싱
- **Prompt injection 방어**: `sanitizeSessionField()` 추가 (200자 제한 + 제어문자 제거) — LLM 컨텍스트 주입 방어
- **Hot path 최적화**: `stop.mjs`에서 pdcaState 사전 읽기 전달로 중복 I/O 제거

#### 비활성/중복 스킬 8개 삭제 (-1,094줄)
- `evidence-verification` (verify-evidence와 중복), `pdca-workflow` (auto/team에 내장)
- `wizard-mode` (do에 흡수), `cost` (정확도 부족)
- `design-video`, `design-loop`, `design-system`, `design-to-code` (Stitch MCP 의존)

#### 신규 에이전트 2개
- **figma-reader** (opus): Figma MCP로 파일 분석 → 기획 문서(figma-spec.md) 자동 생성. get_metadata/get_design_context/get_screenshot 활용, MCP fallback 패턴 포함
- **progress-checker** (opus): 기획 문서 vs 코드베이스 구현 진행도 비교. 4가지 비교 전략(파일/라우트/컴포넌트/테스트), AskUserQuestion으로 프로젝트 경로 질문

#### 신규 스킬 2개
- `/aing figma-read <url>`: Figma → 기획 문서 추출 (5섹션: 화면/플로우/컴포넌트/인터랙션/구현매핑힌트)
- `/aing progress-check`: 기획 vs 코드 진행도 비교 (Figma 없이 수동 기획서도 지원)

#### 기타
- `agents/willji.md`: figma-spec.md 존재 시 우선 참조 조건 추가
- `skills/do/SKILL.md`: wizard-mode 참조 제거
- `skills/team/SKILL.md`: evidence-verification → verify-evidence 참조 수정
- `package.json` keywords: agent-ui/3d-office → multi-agent

## [2.3.0] - 2026-03-25

### Major — OMC 패리티 대규모 업그레이드 (10개 영역)

Ralplan 합의 기획으로 설계, 3-Wave 병렬 실행으로 구현. 45개 테스트 + 엣지케이스 24건 해결.

#### Plan 모드 강화 (Ralplan 수준)
- Able → Klay(아키텍처 리뷰) → Milla(갭 분석, high 복잡도만) 다중 관점 합의 루프
- PLAN_DRAFT / REVIEW_FEEDBACK / CRITIC_FEEDBACK / FINAL_PLAN 4개 에이전트 간 통신 포맷 정의
- `persist.mjs` JSON stdin 모드 (`--stdin`) — pipe delimiter 문제 완전 해소
- `createPlan()` 확장: options, reviewNotes, complexityScore, complexityLevel 필드

#### 신규 모듈 4개 (테스트 포함)
- **model-router.mjs**: 복잡도 기반 adaptive model routing + cost mode (quality/balanced/budget) + risk escalation
- **handoff-manager.mjs**: stage 간 의사결정 보존 + resume context + path traversal 방어
- **session-state.mjs**: session/stage 수준 상태 관리 + pipeline resume 기능
- **qa-loop SKILL.md**: test→fix→retest 자동 사이클 (max 5회) + 동일 에러 감지 자동 중단

#### 기존 모듈 업그레이드
- **review-code**: Milla(보안) + Klay(품질, mid+) + Jay(성능, high) 병렬 리뷰
- **debug**: 가설→증거→반증 4단계 과학적 디버깅 (Klay 탐색 → Jay 수정 → Milla 검증)
- **team**: Resume Detection + Session Lifecycle + Stage-Aware Specialist Routing + QA Loop 통합 + Handoff 기반 Fix
- **auto**: 5단계 파이프라인 (Planning→Execution→QA→Validation→Completion) + context reuse + validationLoopCount 추적
- **rollback**: Git Checkpoint System + Selective Story Retry + Rollback Safety 가드
- **hooks**: 키워드→스킬 자동 라우팅 + 활성 세션 컨텍스트 주입 + stop 시 handoff 보존

#### 에이전트 강화
- **able.md**: PLAN_DRAFT 구조화 출력 + 대안 탐색(2+) + Feedback Integration + Meta complexity signals
- **klay.md**: Plan Review Mode (REVIEW_FEEDBACK 포맷, 최소 1개 대안/리스크 필수)
- **milla.md**: Plan Critic Mode (CRITIC_FEEDBACK 포맷, Gap Analysis + Criteria Audit, high only)

#### 보안 수정
- Path Traversal 방어: `sanitizeFeature()` 적용 (handoff-manager, plan-manager)
- model-router null 방어: `safeSignals` + `costMode` fallback
- session-state updateSession 반환값 오류 수정
- persist.mjs getArg `--` 플래그 값 거부
- handoff 파일명 collision 방어: `randomBytes(3)` 접미사

## [2.2.3] - 2026-03-24

### Improved — Help 가이드 + Wizard 강화 + 죽은 코드 정리

#### /aing help 개선
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
- **`/aing do`**: 자연어 자동 라우팅 — intent-router.mjs가 입력 분석 → plan/auto/team/wizard 자동 선택
- **`/aing debug`**: 과학적 디버깅 — 증상→가설→테스트→결론, `.aing/debug/{slug}.md` 영구 상태
- **`/aing init`**: 프로젝트 초기화 — 질문 기반 문맥 수집 → PROJECT.md + REQUIREMENTS.md + TECH-STACK.md
- **`/aing cost`**: 비용/토큰 투명성 — 에이전트별 활동 기반 비용 추정 보고

#### 신규 에이전트
- **Debugger**: 과학적 디버깅 전문가 (가설-테스트-판정 프로토콜)

#### Goal-Backward Verification (목표-역방향 검증)
- **goal-checker.mjs**: 완료 ≠ 달성 구분 — ACHIEVED / COMPLETED_NOT_ACHIEVED / INCOMPLETE 3단계 판정
- **Sam 에이전트 강화**: Goal-Backward Verification Protocol 추가
- **verify-evidence 스킬 강화**: Step 4 Goal-Backward 단계 추가

#### State 위생
- **state-gc.mjs**: 좀비 feature 가비지 컬렉션 (7일 비활성 + 증거 없음 → 자동 아카이빙)
- **status-view.mjs**: `.aing/STATUS.md` 자동 생성 (인간 가독성 상태 뷰)
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
- **user-prompt-submit.mjs**: 구분선(`━━━ aing Team Deployment ━━━`) + Pipeline 요약 라인 추가

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
- `.aing/docs/agent-ui-audit.md`: D1-D5 진단 보고서 (Ralplan 합의 산출물)

## [2.1.4] - 2026-03-23

### Fixed — 근본 원인 수정 + 감사 버그 수정

#### Critical Fixes
- **plan-manager.mjs**: ESM에서 `require('node:fs')` 사용 → `readdirSync` import로 교체. `listPlans()`/`getPlan()` 정상화
- **persist.mjs 경로**: 스킬에서 상대 경로 `scripts/cli/persist.mjs` → `"${CLAUDE_PLUGIN_ROOT}/scripts/cli/persist.mjs"` 절대 경로로 수정 (plan-task, auto, team)
- **display.mjs**: `C.red` 컬러 코드 누락 → `/aing help` 런타임 크래시 수정
- **evidence-report.mjs**: `pdcaState.data` null 안전 접근 추가

#### Agent-UI Improvements
- **PostToolUse 훅 추가**: `tool_done` 이벤트 전송 → 3D 캐릭터가 active→idle 정상 복귀
- **session-connect.mjs**: 단계별 상태 출력 (서버 확인 → 등록 → URL/RC 상태)
- **agent-ui/SKILL.md**: `{OFFICE_DIR}` → `${OFFICE_DIR}` 문법 수정 + PostToolUse 훅 설정 추가
- **start/SKILL.md**: HUD 래퍼 `require('fs')` → ESM `import { existsSync }` 수정

#### New Commands (/ 자동완성)
- 14개 command 등록: auto, design, explore, help, plan, review, rollback, start, aing, task, tdd, team, verify, wizard

#### Code Quality
- **task-manager.mjs**: 미사용 `existsSync`, `readdirSync` import 제거
- **버전 통일**: 하드코딩된 `v2.0.0` → `v2.1.4` (start/SKILL.md, session-start.mjs)

#### TDD (11/11 PASS)
- `tests/plan-task.test.mjs` 추가: Plan Manager 4, Task Manager 4, persist.mjs CLI 3

## [2.1.2] - 2026-03-23

### Added — Agent UI (3D Office Visualization)

sw-world-agents-view 연동 스킬 추가.

#### New Skill
- **agent-ui** — 3D 에이전트 오피스 시각화. `/aing agent-ui`로 현재 세션을 브라우저에서 실시간 확인. `--setup`으로 Claude Code hooks 자동 설정, `--status`로 상태 확인, `--uninstall`로 제거.

#### Integration
- sw-world-agents-view (https://github.com/sangwookp9591/sw-world-agents-view) 연동
- SessionStart hook: 세션 시작 시 3D 오피스 자동 등록
- PreToolUse hook: 도구 사용 시 캐릭터 애니메이션 실시간 반영
- 초대 코드 시스템: 팀원 온보딩
- 룸 시스템: 프로젝트별 협업 공간
- 배포: https://office.sw-world.site

## [2.1.1] - 2026-03-23

### Added — Design Pipeline (Stitch Integration)

Google Labs stitch-skills를 aing에 통합. 7개 원본 skill을 5개로 재구성.

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
- 디자인 산출물: `.aing/designs/`, 영상 산출물: `.aing/videos/`
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
  - 터미널에 `⏺ aing:jay(Jay: Backend API 구현) Sonnet` 자동 표시
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
- **`/aing team [agents] "task"`** — staged pipeline with verify→fix loop
  - 4-stage PDCA-mapped pipeline: team-plan → team-exec → team-verify → team-fix
  - User-specified agents (`jay+derek+milla`) or auto-select via complexity scoring
  - Milla(Security) + Sam(CTO) always auto-included for verification
  - Fix stage with retry prompt (failure context + max 3 iterations)
  - Completion report with pipeline/fix-loop data

### Enhanced
- **`/aing auto`** — `@{Name}❯` worker visibility
  - Worker Prompt Template with COMMUNICATION FORMAT section
  - Progress table on state transitions (not every message)
  - Team-lead defensive prefix attribution
  - Plan file handoff support (skip re-analysis)
- **`/aing plan`** — next-action flow after planning
  - Option 1: `/aing team` (recommended, verify loop)
  - Option 2: `/aing auto` (one-shot, fast)
  - Option 3: save only

## [1.8.2] - 2026-03-19

### Added
- **`/aing start` Interactive Setup Wizard** — omc 벤치마킹 4-Phase 셋업
  - Phase 1: 스코프 선택 (Local — 이 프로젝트만 / Global — 모든 프로젝트)
  - Phase 2: Status Line HUD 활성화 여부
  - Phase 3: 기본 실행 모드 선택 (auto / pdca / wizard)
  - Phase 4: 웰컴 + GitHub star 옵션
  - `--local`, `--global`, `--force`, `--help` 플래그 지원
  - 중단 시 resume 가능 (24h 만료)
- **`scripts/setup/setup-progress.mjs`** — 셋업 진행 상태 관리
  - save/resume/clear/complete/check CLI + ESM 모듈 이중 인터페이스
  - `~/.claude/.aing-config.json`에 영구 설정 완료 마커 저장
  - `.aing/state/setup-state.json`에 임시 진행 상태 (24h 자동 만료)
- **First Run Detection** — session-start에서 셋업 미완료 자동 감지
  - 미설정: "`/aing start`를 실행하세요" 안내
  - 설정 완료: `Setup: global | HUD: on | Mode: auto` 컴팩트 표시
  - 이전 PDCA 작업 존재: "Resume Available" 온보딩 표시

### Changed
- `hooks-handlers/session-start.mjs` → v1.9.0: `isSetupComplete()` 연동, 온보딩 플로우 추가
- HUD 인라인 프롬프트 제거 → `/aing start` 위자드에서 통합 처리
- `skills/start/SKILL.md`: 신규 스킬 (triggers: start, setup, 초기설정, 셋업)

## [1.8.1] - 2026-03-19

### Added
- **Status Line HUD** — 터미널 하단에 활성 에이전트를 깜빡이는 컬러 점으로 실시간 표시
  - `scripts/hud/statusline.mjs`: ANSI 컬러 깜빡이는 점 + 에이전트명(역할) + 컨텍스트% + PDCA 상태
  - `~/.claude/hud/aing-hud.mjs`: 래퍼 스크립트 (dev/cache/marketplace 경로 자동 탐색)
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
- Session-start command list updated to `/aing` unified commands (auto, tdd, task, wizard, help)
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
- **Auto Runner** — `/aing auto` 전체 파이프라인 실행 계획 생성
  - TeamCreate→TaskCreate→Task(spawn) CC 네이티브 도구 시퀀스 자동 생성
  - 5 phases: create-team → create-tasks → spawn-workers → monitor → shutdown
- **Retry Engine** — exponential backoff (1s→2s→4s) + jitter + circuit breaker 연동
- **Handoff Manager** — 단계 전환 시 .aing/handoffs/ 자동 생성
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
- **Plan Manager** — .aing/plans/ 문서 자동 생성
  - Plan 문서 + Task 체크리스트 동시 생성
- **9개 스킬 자동완성** — /aing: 입력 시 11개 스킬 표시
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
- **Progress Tracker** — aing-progress.md 생성, 세션 간 연속성
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
- `/aing help` — 컬러풀한 에이전트 팀 시각화
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
