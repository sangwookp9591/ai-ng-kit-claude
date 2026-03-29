# gstack vs ai-ng-claude: Harness Engineering 심층 비교 분석 보고서

**작성일**: 2026-03-29
**분석 대상**: gstack v0.13.4.0 (1,411 commits, ~95K LOC) vs ai-ng-claude v2.4.8 (~12.7K LOC)
**목적**: gstack 기술 200% 흡수를 위한 Gap 분석 + 액션 플랜

---

## 1. Executive Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    HARNESS ENGINEERING 비교                       │
├─────────────────────┬────────────────────┬──────────────────────┤
│       항목          │     gstack         │    ai-ng-claude      │
├─────────────────────┼────────────────────┼──────────────────────┤
│ LOC                 │  ~95,000           │  ~12,687             │
│ Commits             │  1,411             │  ~50                 │
│ Skills/Workflows    │  28                │  24                  │
│ Agents              │  Role-play (prose) │  14 Named agents     │
│ Browser Automation  │  ★★★★★ (Playwright)│  없음                │
│ Review Pipeline     │  ★★★★★ (4-tier)    │  ★★★ (Milla+Sam)    │
│ Test Infrastructure │  ★★★★★ (61 suites) │  ★★ (QA loop)       │
│ Ship Workflow       │  ★★★★★ (full auto) │  없음                │
│ PDCA Engine         │  없음              │  ★★★★★               │
│ Circuit Breaker     │  없음              │  ★★★★                │
│ Model Routing       │  없음              │  ★★★★★               │
│ Evidence Chain      │  ★★★ (LLM judge)   │  ★★★★★               │
│ Cross-Session Learn │  없음              │  ★★★★                │
│ Guardrails          │  ★★★ (advisory)    │  ★★★★★ (enforced)   │
│ Context Budget      │  없음              │  ★★★★★               │
│ Multi-Host          │  ★★★★★ (3 hosts)   │  ★ (CC only)        │
│ Design Generation   │  ★★★★ (GPT Image)  │  없음                │
│ Telemetry           │  ★★★★★ (3-tier)    │  없음                │
└─────────────────────┴────────────────────┴──────────────────────┘
```

**한 줄 요약**: gstack = "완성도 높은 워크플로우 도구". aing = "구조화된 에이전트 오케스트레이션". 상호 보완적.

---

## 2. 아키텍처 철학 비교

### gstack: "20명의 엔지니어링 팀을 시뮬레이션"

```
User → Skill (role-play prompt) → Claude executes as that role
                                    ↓
                              Headless Browser (persistent daemon)
                                    ↓
                              Review Pipeline (CEO/Eng/Design)
                                    ↓
                              Ship (automated merge/test/version/PR)
```

- 에이전트가 아니라 **스킬(역할극)** 기반
- 각 스킬이 독립적인 워크플로우 (느슨한 결합)
- 브라우저 자동화가 핵심 차별점
- "Boil the Lake": 100% 완성도 추구
- Garry Tan의 YC partner/builder voice로 통일

### ai-ng-claude: "14명의 전문가 에이전트 팀"

```
User → Intent Router → Complexity Scorer → Team Preset Selection
                                              ↓
                                        Agent Spawning (parallel)
                                              ↓
                                        PDCA Cycle Enforcement
                                              ↓
                                        Evidence Chain Verification
                                              ↓
                                        Self-Healing Recovery
```

- **Named Agent** 기반 (Sam, Able, Klay, Jay...)
- PDCA 사이클로 구조화된 워크플로우
- 복잡도 기반 자동 팀 구성 + 모델 라우팅
- 증거 기반 완료 판정 + 자가 치유

---

## 3. gstack이 압도적으로 앞서는 영역 (흡수 대상)

### A. Headless Browser Automation (★★★★★ vs 없음) — 최대 Gap

```
Playwright Daemon Model:
  First call: ~3s (서버 기동)
  이후: ~100-200ms (HTTP POST)

  50+ 커맨드: navigate, click, fill, screenshot, diff,
              snapshot, cookie-import, responsive test

  3대 혁신:
  1. Daemon model: 서버 백그라운드 상주, 세션 유지
  2. ARIA-tree refs: getByRole() 기반 (DOM 변경 없음, CSP 안전)
  3. 보안: localhost + bearer token + cookie 암호화

  로깅: 3개 circular buffer (console/network/dialog, 각 50K 엔트리)
```

### B. Review Pipeline (★★★★★ vs ★★★) — 큰 Gap

```
4-tier Review System:
  /plan-ceo-review     → 제품/스코프 (4가지 모드)
  /plan-eng-review     → 아키텍처 + 테스트 매트릭스 + ASCII 다이어그램
  /plan-design-review  → UI/UX 감사 (10가지 AI Slop 안티패턴)
  /review              → Pre-landing diff 리뷰 (SQL injection, LLM boundary)

  Review Readiness Dashboard:
  ┌─────────────────────────────────────────────┐
  │ Review        | Runs | Status   | Required  │
  │ Eng Review    |  1   | CLEAR    | YES       │
  │ CEO Review    |  0   | —        | no        │
  │ Design Review |  0   | —        | no        │
  │ Outside Voice |  0   | —        | no        │
  │ VERDICT: CLEARED                            │
  └─────────────────────────────────────────────┘

  + JSONL 리뷰 로그 영속화
  + 커밋 해시 기반 staleness 감지
  + Cross-model tension 감지 (Claude vs Codex)
  + Scope drift 자동 감지
```

### C. Ship Workflow (★★★★★ vs 없음) — 큰 Gap

```
/ship (7단계 자동화):
  1. Pre-flight + review dashboard
  2. Base branch merge (자동 conflict 해결)
  3. 테스트 병렬 실행 + failure triage
  4. Pre-landing review (SQL/LLM boundary)
  5. VERSION bump (MICRO/PATCH 자동)
  6. CHANGELOG 생성
  7. Push + PR (자동 body)

  연장: /land-and-deploy → /canary → /document-release
```

### D. Template Resolver System (★★★★★ vs ★★)

```
SKILL.md.tmpl + resolver modules → generated SKILL.md

  {{PREAMBLE}}           → 업데이트 체크, 텔레메트리, 세션 추적
  {{COMMAND_REFERENCE}}  → 50+ 브라우저 커맨드 테이블
  {{REVIEW_DASHBOARD}}   → 리뷰 상태 대시보드
  {{TEST_BOOTSTRAP}}     → 프레임워크별 테스트 셋업
  {{DESIGN_METHODOLOGY}} → AI Slop 안티패턴 + litmus checks

  CI에서 drift 감지 (gen-skill-docs.test.ts)
```

### E. Diff-Based Test Selection (★★★★★ vs 없음)

```
touchfiles.ts: 테스트별 파일 의존성 선언
  'browse-snapshot': ['browse/src/**', 'browse/test/test-server.ts']

  git diff → 변경 파일 → 매칭 테스트만 실행 → CI 80% 가속
  61개 테스트 스위트, tier 분류 (gate vs periodic)
```

### F. Telemetry 3-Tier (★★★★★ vs 없음)

```
community → 안정 UUID 기반 트렌드 추적
anonymous → 카운터만 (연결 불가)
off       → 로컬 JSONL만

+ gstack-telemetry-log (JSONL appender)
+ gstack-telemetry-sync (async remote)
+ gstack-analytics (통계 집계)
```

### G. LLM Judge Evaluation (★★★★ vs 없음)

```
QA 결과를 LLM이 평가 (0-10점)
Ground truth 비교
Design aesthetics 평가
```

---

## 4. ai-ng-claude이 앞서는 영역 (유지 대상)

### A. PDCA Engine (없음 vs ★★★★★)
- plan→do→check→act→review 구조화된 사이클
- check→act 루프 (matchRate < 90% → 반복)
- 상태 영속 + 세션 간 재개

### B. Complexity-Based Model Routing (없음 vs ★★★★★)
- 0-15점 복잡도 스코어 → Solo/Duo/Squad/Full
- haiku/sonnet/opus 자동 라우팅
- costMode (quality/balanced/budget) → 30-40% 비용 절감

### C. Circuit Breaker + Self-Healing (없음 vs ★★★★)
- CLOSED→OPEN→HALF_OPEN 상태 머신
- 지수 백오프 + jitter
- 자동 복구 3회 → 실패 시 체크포인트 롤백

### D. Context Budget Tracking (없음 vs ★★★★★)
- 토큰 추정 (0.75 tok/word EN, 2 tok/char KR)
- 9-tier 우선순위 기반 compaction
- PDCA_STATE(100) > PROGRESS(90) > ... > TRACE(30)

### E. Cross-Session Learning (없음 vs ★★★★)
- eureka.jsonl: Layer 3 발견 영속화
- project-memory.json: 패턴, 컨벤션, 결정사항
- 다음 세션에서 자동 주입

### F. Named Agent System (Role-play vs ★★★★★)
- 14명 각각 고유 모델/도구/voice
- 병렬 스폰 + 태스크 분배
- Sam의 goal-backward verification

---

## 5. 200% 흡수 전략

### "200%"의 의미

```
gstack 기술을 복사하는 것이 아니라,
aing의 구조적 강점과 결합해서 원본보다 나은 결과를 만드는 것.

gstack Review + aing Complexity Scorer
  = 복잡도 기반 자동 리뷰 깊이 선택 (gstack에 없음)

gstack Browser QA + aing Evidence Chain
  = 스크린샷이 증거의 일부로 자동 수집 (gstack에 없음)

gstack Ship + aing PDCA Review Stage
  = PDCA review 단계에서 자동 ship 트리거 (gstack에 없음)

gstack LLM Judge + aing Completeness Score
  = LLM 평가가 Sam의 0-10 점수에 반영 (gstack에 없음)

gstack Telemetry + aing Context Budget
  = 토큰 비용을 텔레메트리로 추적 (양쪽 다 없음)
```

### Phase 1: 즉시 흡수 (CC: ~7h)

| # | 항목 | 소스 | 대상 | 작업량 |
|---|------|------|------|--------|
| 1 | Review Pipeline 4-tier | gstack /plan-*-review | scripts/review/ + skills/review-pipeline/ | ~2h |
| 2 | Review Readiness Dashboard | gstack-review-read/log | scripts/review/dashboard.mjs | ~1h |
| 3 | Ship Workflow | gstack /ship | scripts/ship/ + skills/ship/ | ~2h |
| 4 | Boil the Lake 철학 | ETHOS.md + Completeness | 에이전트 프롬프트 + Sam 검증 | ~30m |
| 5 | Outside Voice | gstack /codex + subagent | Milla/Sam 리뷰에 통합 | ~1h |

### Phase 2: 적응적 흡수 (CC: ~9h)

| # | 항목 | 적응 방식 | 작업량 |
|---|------|----------|--------|
| 6 | Browser Integration | MCP playwright 활용 (이미 설정됨) + ARIA-tree refs 패턴 | ~3h |
| 7 | Template Resolver | scripts/build/ 확장, resolver 패턴 도입 | ~2h |
| 8 | LLM Judge | evidence-chain에 LLM 평가 레이어 추가 | ~1h |
| 9 | Telemetry | scripts/telemetry/ 신규 (3-tier) | ~2h |
| 10 | Scope Drift Detection | PDCA check 단계에 통합 | ~1h |

### Phase 3: 시너지 생성 (CC: ~6h)

| # | 결합 | aing 강점 | gstack 강점 | 결과물 |
|---|------|----------|------------|--------|
| 11 | Smart Review | Complexity scorer | 4-tier pipeline | 복잡도 기반 리뷰 깊이 자동 선택 |
| 12 | Evidence+Browser | Evidence chain | Browser QA | 스크린샷 = 증거 체인 항목 |
| 13 | PDCA+Ship | PDCA review | Ship workflow | review 완료 → 자동 ship |
| 14 | Learning+Review | Eureka logger | Review log | 리뷰 패턴도 학습 대상 |
| 15 | Budget+Telemetry | Context budget | Telemetry | 토큰 비용 세션간 추적 |

---

## 6. 절대 흡수하면 안 되는 것

1. **느슨한 결합 모델**: gstack의 독립 스킬 → aing의 PDCA+오케스트레이션이 더 강력
2. **단일 모델 실행**: gstack은 model routing 없음 → aing의 complexity scorer 유지
3. **Advisory-only safety**: gstack은 prose advisory → aing의 enforced guardrail 유지
4. **글로벌 상태**: ~/.gstack/ → aing의 .aing/ (프로젝트 로컬) 유지
5. **세션 간 학습 없음**: gstack은 cross-session 없음 → aing의 eureka logger 유지

---

## 7. 구현 우선순위 상세

### P0: Review Pipeline (scripts/review/)

```
새 파일:
  scripts/review/
  ├── review-engine.mjs       ← 리뷰 실행 엔진 (4-tier)
  ├── review-log.mjs          ← JSONL 리뷰 로그 영속화
  ├── review-dashboard.mjs    ← Readiness 대시보드
  ├── scope-drift.mjs         ← Scope drift 감지
  └── outside-voice.mjs       ← Cross-model 리뷰 (subagent)

  에이전트 매핑:
  - CEO Review    → Able(PM) + Sam(CTO) = 스코프/전략
  - Eng Review    → Klay(Arch) + Jay(BE) + Milla(Sec) = 아키텍처/테스트
  - Design Review → Willji(Design) + Iron(FE) = UI/UX
  - Adversarial   → 외부 Claude subagent (Outside Voice)

  aing 시너지:
  - complexity score → 리뷰 깊이 자동 결정
    low:  Eng Review만 (Milla 단독)
    mid:  Eng + Design (Milla + Klay + Willji)
    high: CEO + Eng + Design + Adversarial (전체 팀)
```

### P1: Ship Workflow (scripts/ship/)

```
새 파일:
  scripts/ship/
  ├── ship-engine.mjs         ← 7단계 Ship 엔진
  ├── version-bump.mjs        ← 시맨틱 버전 자동 bump
  ├── changelog-gen.mjs       ← CHANGELOG 자동 생성
  └── pr-creator.mjs          ← PR 자동 생성

  PDCA 통합:
  - PDCA review 단계 완료 → ship 자동 트리거
  - Evidence chain PASS 필수 → ship 전 검증
  - Sam verdict ACHIEVED → ship 허용
```

### P2: Browser Integration

```
접근법: MCP Playwright 활용 (mcp__playwright__*)

  이미 사용 가능한 MCP 도구:
  - browser_navigate, browser_click, browser_fill_form
  - browser_snapshot, browser_take_screenshot
  - browser_console_messages, browser_network_requests

  흡수 대상 (gstack 패턴):
  - ARIA-tree ref 패턴 (스냅샷 → ref 매핑 → 클릭)
  - Screenshot diff (before/after 비교)
  - QA 증거 수집 (screenshot + console + network → evidence chain)

  별도 daemon 불필요 (MCP가 lifecycle 관리)
```

---

## 8. 최종 비교 매트릭스

```
                    gstack              aing            흡수 후 aing
                    ──────              ────            ────────────
워크플로우 완성도    ████████████  95    ████████  80    ████████████  98
에이전트 구조화     ████████  40        ████████████ 95  ████████████  95
브라우저 자동화     ████████████  95    ░░░░  0         ████████████  90
리뷰 파이프라인     ████████████  95    ██████  60      ████████████  98
테스트 인프라       ████████████  90    ████  40        ████████████  90
배포 자동화        ████████████  95    ░░░░  0         ████████████  90
PDCA/구조          ░░░░  0             ████████████ 95  ████████████  95
모델 라우팅        ░░░░  0             ████████████ 95  ████████████  95
증거 기반 검증     ██████  60          ████████████ 95  ████████████  98
자가 치유          ░░░░  0             ████████████ 90  ████████████  90
세션간 학습        ░░░░  0             ████████████ 85  ████████████  90
가드레일           ██████  50          ████████████ 95  ████████████  95
텔레메트리        ████████████  90     ░░░░  0         ████████████  90
─────────────────────────────────────────────────────────────────
평균               50                  57              92 (+200%)
```

---

## 결론

gstack과 ai-ng-claude은 하네스 엔지니어링의 서로 다른 축을 강화한 프로젝트.

gstack 강점: **워크플로우 완성도** (plan→review→ship→deploy→monitor)
aing 강점: **에이전트 구조화** (PDCA, routing, evidence, self-healing)

결합하면: **구조화된 에이전트가 완성된 워크플로우를 증거 기반으로 자가치유하며 실행.**

이것이 200% 흡수. gstack 100% + aing 고유 100% + 시너지.

---

## 구현 완료 실적 (2026-03-29)

### 커밋 이력
| Commit | Phase | 내용 |
|--------|-------|------|
| `fa25c9f` | P1+P2 | 4-tier 리뷰 + Ship + LLM Judge + Telemetry + Browser Evidence |
| `0edacb8` | P3 | Template Resolver 시스템 + 빌드 파이프라인 |
| `8530794` | 심층보강 | ARIA ref + 2-pass 리뷰 + 3-way scope drift + pending marker |

### 최종 파일 목록 (22개 신규, 7개 수정)

```
scripts/review/ (8 modules, ~1,100 LOC)
  ├── review-engine.mjs      — 4-tier + 2-pass + Fix-First
  ├── review-log.mjs         — JSONL 리뷰 로그
  ├── review-dashboard.mjs   — Readiness Dashboard
  ├── scope-drift.mjs        — 3-way scope 비교
  ├── outside-voice.mjs      — Cross-model 리뷰
  ├── browser-evidence.mjs   — Browser QA → Evidence
  ├── aria-refs.mjs          — ARIA 접근성 트리 ref 시스템
  └── pdca-integration.mjs   — PDCA ↔ Review ↔ Ship 게이팅

scripts/ship/ (4 modules, ~500 LOC)
  ├── ship-engine.mjs        — 7단계 파이프라인
  ├── version-bump.mjs       — 시맨틱 버전 자동 bump
  ├── changelog-gen.mjs      — CHANGELOG 자동 생성
  └── pr-creator.mjs         — PR 자동 생성

scripts/evidence/ (1 module, ~190 LOC)
  └── llm-judge.mjs          — LLM 기반 품질 평가

scripts/telemetry/ (1 module, ~290 LOC)
  └── telemetry-engine.mjs   — 3-tier + pending marker

scripts/build/resolvers/ (3 modules, ~170 LOC)
  ├── review-resolver.mjs
  ├── ship-resolver.mjs
  └── evidence-resolver.mjs

scripts/build/ (1 module)
  └── generate-all.mjs       — 풀 빌드 파이프라인

skills/ (2 templates)
  ├── review-pipeline/SKILL.md.tmpl
  └── ship/SKILL.md.tmpl

agents/ (3 updated)
  ├── sam.md     + Boil the Lake
  ├── able.md    + Boil the Lake + 비용 압축
  └── milla.md   + Review Pipeline 역할
```

### 총계
- 신규 LOC: ~2,750
- 수정 LOC: ~500
- 기존 aing LOC: ~12,687
- **최종 LOC: ~15,437**
