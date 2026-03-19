# Changelog

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
