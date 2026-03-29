# gstack 전체 소스코드 심층 분석 보고서

**작성일**: 2026-03-29
**분석 범위**: 23개 영역 (A~W), 소스 레벨 분석
**분석 대상**: gstack v0.13.4.0 (~95K LOC, 1,411 commits)

---

## 1. 이미 흡수 완료 (Phase 1~3 + 심층보강)

| 영역 | gstack 원본 | aing 구현 | 상태 |
|------|------------|----------|------|
| Review Pipeline 4-tier | /plan-*-review | scripts/review/ (8 모듈) | ✓ 완료 |
| Ship Workflow 7-step | /ship | scripts/ship/ (4 모듈) | ✓ 완료 |
| Template Resolver | gen-skill-docs.ts + resolvers/ | scripts/build/resolvers/ (3 모듈) | ✓ 완료 |
| Telemetry 3-tier | gstack-telemetry-* | scripts/telemetry/ | ✓ 완료 |
| Browser Evidence | browse/ → evidence | scripts/review/browser-evidence.mjs | ✓ 완료 |
| ARIA Ref System | snapshot.ts | scripts/review/aria-refs.mjs | ✓ 완료 |
| LLM Judge | llm-judge.ts | scripts/evidence/llm-judge.mjs | ✓ 완료 |
| Scope Drift 3-way | review Step 1.5 | scripts/review/scope-drift.mjs | ✓ 완료 |
| 2-pass Review | CRITICAL + INFORMATIONAL | review-engine.mjs | ✓ 완료 |
| Pending Marker | telemetry crash recovery | telemetry-engine.mjs | ✓ 완료 |
| Boil the Lake | ETHOS.md | agents/sam,able.md | ✓ 완료 |
| Outside Voice | /codex subagent | outside-voice.mjs | ✓ 완료 |
| PDCA↔Review↔Ship | (gstack에 없음) | pdca-integration.mjs | ✓ 시너지 |

---

## 2. 미흡수 영역 — 새로 발견된 23개 영역 상세

### Area A: QA System (/qa, /qa-only)

**워크플로우:**
1. 브라우저 데몬 시작 (`$B goto <url>`)
2. 테스트 플랜 작성/수신
3. 실제 브라우저 인터랙션 (클릭, 입력, 네비게이션)
4. 스크린샷 촬영 + diff 비교
5. LLM judge가 결과 평가 (0-10)
6. 버그 증거 수집 (screenshot + console + network + repro steps)
7. 수정 루프 (/qa) or 보고서만 (/qa-only)

**Health Score 계산:** pass/fail ratio + severity weighting
**구조화된 보고서:** bug_id, severity, description, screenshot_path, repro_steps, console_errors

**aing 차이점:** aing의 qa-loop은 코드 레벨 테스트만. 브라우저 기반 QA 없음.
**흡수 가치: ★★★★★** — browser-evidence.mjs가 기반이지만 QA 오케스트레이터 스킬 필요.

---

### Area B: Office Hours (/office-hours)

**YC 스타일 진단 — 6가지 강제 질문:**
1. 누가 사용자인가? (구체적으로)
2. 그들의 문제가 정확히 뭔가?
3. 현재 어떻게 해결하고 있나?
4. 왜 기존 방법이 부족한가?
5. 이 변경이 정확히 어떻게 문제를 해결하나?
6. 성공을 어떻게 측정할 건가?

**디자인 문서 출력:** `~/.gstack/projects/{slug}/{user}-{branch}-design-{datetime}.md`
**하위 리뷰 피드:** design doc → plan-ceo-review → plan-eng-review → plan-design-review

**aing 차이점:** Able이 요구사항 분석을 하지만, 구조화된 6-question 프레임워크 없음.
**흡수 가치: ★★★★** — Able 에이전트에 Office Hours 프레임워크 추가.

---

### Area C: CSO (Security Audit)

**14-phase 보안 감사:**
- Phase 0: 스택 감지 (언어, 프레임워크, DB, 클라우드)
- Phase 1-2: Secrets archaeology (git history + .env)
- Phase 3: Dependency supply chain (CVE + install scripts)
- Phase 4: CI/CD pipeline security (pull_request_target, unpinned actions)
- Phase 5: Infrastructure (Docker, K8s, DB credentials)
- Phase 6: Integration security (webhooks, TLS, OAuth scopes)
- Phase 7: LLM Security (prompt injection, tool call validation)
- Phase 8: Skill Supply Chain (credential exfiltration, suspicious network)
- Phase 9: OWASP Top 10 Assessment
- Phase 10: STRIDE Threat Model
- Phase 11-14: Report, prioritization, verification

**Severity 체계:** CRITICAL (실제 exploitation 시나리오 필수), HIGH, MEDIUM
**FP 방지 규칙:** devDependency CVE는 최대 MEDIUM, 알려진 안전 패턴 제외

**aing 차이점:** Milla가 보안 리뷰를 하지만, 14-phase 구조화된 감사 없음.
**흡수 가치: ★★★★★** — Milla 에이전트에 CSO 프레임워크 통합.

---

### Area D: Design System (3개 스킬)

**AI Slop Blacklist (10가지):**
1. Purple/violet/indigo gradient backgrounds
2. 3-column feature grid (icon-in-circle + title + description)
3. Icons in colored circles
4. 모든 것 center 정렬
5. Uniform bubbly border-radius
6. Decorative blobs, wavy SVG dividers
7. Emoji as design elements
8. Colored left-border on cards
9. Generic hero copy ("Welcome to...", "Unlock the power of...")
10. Cookie-cutter section rhythm (hero→features→testimonials→pricing)

**OpenAI Hard Rejections (7가지):**
1. Generic SaaS card grid as first impression
2. Beautiful image with weak brand
3. Strong headline with no clear action
4. Busy imagery behind text
5. Sections repeating same mood statement
6. Carousel with no narrative purpose
7. App UI made of stacked cards

**Litmus Checks (7가지 YES/NO):**
1. Brand/product unmistakable in first screen?
2. One strong visual anchor present?
3. Page understandable by scanning headlines only?
4. Each section has one job?
5. Are cards actually necessary?
6. Does motion improve hierarchy?
7. Would design feel premium with all shadows removed?

**Design Score:** 0-10 (baseline → final, delta 추적)
**AI Slop Score:** 0-10 (detected anti-patterns count)

**aing 차이점:** Willji가 디자인 가이던스를 하지만, 정량적 점수 체계 없음.
**흡수 가치: ★★★★** — Willji에 AI Slop detection + design scoring 추가.

---

### Area E: Retrospective (/retro)

**워크플로우:**
1. 최근 N일간 git log 분석
2. 작업 패턴 감지 (집중 시간대, 커밋 빈도)
3. 코드 품질 메트릭 (파일당 수정 횟수, hotspot)
4. Cross-project mode: 여러 프로젝트 통합 분석
5. "What went well / What didn't / Action items" 템플릿

**aing 차이점:** 회고 기능 없음.
**흡수 가치: ★★★** — 나중에 추가 가능.

---

### Area F: Investigation (/investigate)

**4-phase 디버깅:**
1. **Investigate**: 증상 수집, 재현 조건, 영향 범위
2. **Analyze**: 데이터 수집 (로그, 메트릭, 코드), 가설 생성
3. **Hypothesize**: 가장 유력한 원인 선택, 검증 계획
4. **Implement**: 수정 + 검증 테스트

**Iron Law:** "근본 원인 없이 수정 없음"
**Evidence 수집:** 각 단계에서 증거 기록 (로그, 스크린샷, 코드 변경)

**aing 차이점:** aing의 /debug가 비슷하지만, 4-phase 강제 아님.
**흡수 가치: ★★★** — debug 스킬 강화에 활용.

---

### Area G: Canary/Deploy Monitoring

**포스트 배포 모니터링 루프:**
1. 프로덕션 URL 접속
2. 콘솔 에러 체크
3. 네트워크 에러 체크
4. 페이지 로드 시간 체크
5. 스크린샷 비교 (배포 전/후)
6. 일정 간격 반복 (루프)

**aing 차이점:** 배포 후 모니터링 없음.
**흡수 가치: ★★★★** — Ship + Deploy 파이프라인 확장.

---

### Area H: Benchmark (/benchmark)

**성능 회귀 감지:**
1. 기준선 설정 (Core Web Vitals)
2. 변경 후 측정
3. Delta 비교 (LCP, FID, CLS)
4. Resource budget 추적 (JS/CSS 크기)

**aing 차이점:** Jun이 성능 분석을 하지만, 브라우저 기반 자동 벤치마크 없음.
**흡수 가치: ★★★** — Jun + Browser 통합으로 구현 가능.

---

### Area I: Autoplan Pipeline

**자동 리뷰 체이닝:** CEO → Design → Eng (순차 실행)

**6가지 자동 결정 원칙:**
1. 완성도 선택 (한계비용 0이면 완전한 것)
2. Lake 끓이기 (<1일 CC, <5 파일이면 전부 수정)
3. 깔끔한 솔루션 선택
4. DRY 위반 거부
5. Explicit > clever
6. 행동 편향 (merge > 무한 리뷰)

**결정 분류:**
- Mechanical: 명백한 정답, 자동 결정
- Taste: 합리적 의견 차이 가능, 자동 결정하되 최종 게이트에 표시
- User Challenge: Claude + Codex 모두 사용자 의견에 반대 → 절대 자동 결정 안 함

**aing 차이점:** /aing auto가 비슷하지만, 6-principle 자동 결정 시스템 없음.
**흡수 가치: ★★★★★** — auto 스킬에 autoplan 패턴 통합.

---

### Area J: Codex Integration (Multi-AI)

**3가지 모드:**
1. **Review**: `codex review` (diff 기반, pass/fail gate)
2. **Challenge**: adversarial mode (코드 깨기 시도)
3. **Consult**: 자유 질문 (medium reasoning effort)

**Cross-Model 비교:**
```
Both found: [겹치는 발견]
Only Codex found: [Codex 고유]
Only Claude found: [Claude 고유]
Agreement rate: X%
```

**aing 차이점:** OMC의 MCP 라우팅이 비슷하지만, 구조화된 cross-model 비교 없음.
**흡수 가치: ★★★★** — Outside Voice에 cross-model 비교 로직 추가.

---

### Area K: Safety Skills (4개)

**careful:** rm -rf, DROP TABLE, git push --force 등 위험 명령 경고
- Safe exceptions: node_modules, .next, dist, build (삭제 허용)
- Hook: PreToolUse → permissionDecision: "ask"

**freeze:** 디렉토리 스코프 편집 제한
- trailing slash 경계 (src/ ≠ src-old/)
- Edit/Write만 차단, Read/Bash는 허용

**guard:** careful + freeze 결합

**unfreeze:** freeze 해제 (state 파일 삭제)

**aing 차이점:** aing의 guardrail-engine이 비슷하지만, freeze/unfreeze 디렉토리 스코핑 없음.
**흡수 가치: ★★★** — guardrail-engine에 freeze 패턴 추가.

---

### Area L: Cookie/Auth System

**쿠키 임포트:** 실제 Chrome DB에서 쿠키 복호화 → headless에 주입
- macOS Keychain 연동 (PBKDF2 + AES-128-CBC)
- Interactive picker UI (값 노출 없이 도메인만 표시)
- Read-only (원본 DB 수정 불가)

**Headed Chrome:** `/connect-chrome`으로 실제 Chrome 제어
- Side Panel extension으로 실시간 활동 피드

**aing 차이점:** 쿠키/인증 시스템 없음.
**흡수 가치: ★★** — MCP Playwright가 세션 관리 가능.

---

### Area M: Deploy Pipeline

**플랫폼 자동 감지:** Fly.io → Render → Vercel → Netlify → GitHub Actions → Manual
**CLAUDE.md에 배포 설정 저장:** platform, URL, workflow, health check
**land-and-deploy:** PR merge → CI → deploy → canary verify

**aing 차이점:** 배포 파이프라인 없음.
**흡수 가치: ★★★★** — Ship 확장으로 구현 가능.

---

### Area N: Document Release

**배포 후 문서 업데이트:**
- README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md, CHANGELOG, TODOS.md
- diff vs 문서 크로스 레퍼런스
- LLM judge 품질 평가 (clarity, completeness, actionability)

**aing 차이점:** 문서 자동 업데이트 없음.
**흡수 가치: ★★★** — Ship 후속 스텝으로 추가 가능.

---

### Area O: ETHOS.md (Philosophy)

**Golden Age 테제:** 1인 + AI = 20인 팀
**압축 비율:** Boilerplate 100x, Tests 50x, Feature 30x, Bug 20x, Architecture 5x, Research 3x
**Search Before Building 3-Layer:** Tried-and-true → New-and-popular → First-principles
**Eureka:** Layer 3에서 기존 방식이 틀린 이유를 발견하는 것

**aing 상태:** Boil the Lake 철학 흡수 완료 (sam.md, able.md).
**추가 흡수:** ETHOS.md 전체를 aing 프로젝트 문서로 적응.

---

### Area P: Testing Infrastructure

**session-runner.ts:** `claude -p` 서브프로세스 스폰, NDJSON 스트리밍
**eval-store.ts:** 결과 영속화 + 비교 (이전 실행 대비 회귀 감지)
**skill-parser.ts:** $B 명령어 추출 + command registry 검증
**llm-judge.ts:** claude-sonnet-4-6 기반 품질 평가 (clarity/completeness/actionability 1-5)
**e2e-helpers.ts:** diff-based 테스트 선택, tier 분류, browse shim

**aing 차이점:** 테스트 인프라가 없음 (qa-loop만 존재).
**흡수 가치: ★★★★★** — 전체 테스트 프레임워크 구축 필요.

---

### Area Q: CLI Utilities

**gstack-repo-mode:** 90일 git shortlog → solo(80%+) vs collaborative
**gstack-diff-scope:** Frontend/Backend/Prompts/Tests/Docs/Config 분류
**gstack-analytics:** skill-usage.jsonl 집계 → 바 차트 + 성공률
**gstack-config:** YAML key-value 저장소
**gstack-slug:** git remote → sanitized slug

**aing 차이점:** complexity-scorer가 비슷하지만, diff-scope 분류 없음.
**흡수 가치: ★★★** — routing/에 diff-scope 추가.

---

### Area R-W: Core Infrastructure

**gen-skill-docs.ts:** 29개 placeholder, host routing (claude/codex), CI freshness (byte-for-byte)
**Resolver 아키텍처:** async function → TemplateContext → string
**CLAUDE.md:** 프로젝트 컨벤션, 테스트 규칙, binary 관리 주의사항
**Setup:** 579줄, 3-host 지원 (claude/codex/kiro), symlink 생성
**CI:** 12 test suites, 40-way parallel, Docker cached image, PR comment 자동

**aing 차이점:**
- Placeholder 14개 (gstack 29개)
- CI 파이프라인 없음
- Multi-host 지원 없음

---

## 3. 흡수 우선순위 (추가 분)

### Tier 1: 즉시 가치 (★★★★★)

| # | 항목 | 소스 | 예상 작업 |
|---|------|------|----------|
| 1 | CSO 14-phase 보안 감사 | Area C | Milla 프롬프트 확장 |
| 2 | Autoplan 6-principle 자동 결정 | Area I | auto 스킬 업데이트 |
| 3 | QA 브라우저 오케스트레이터 | Area A | qa-loop 스킬 확장 |
| 4 | AI Slop 10 + Design Scoring | Area D | Willji 프롬프트 확장 |
| 5 | Testing infrastructure 기반 | Area P | scripts/test/ 신규 |

### Tier 2: 높은 가치 (★★★★)

| # | 항목 | 소스 | 예상 작업 |
|---|------|------|----------|
| 6 | Office Hours 6-question | Area B | Able 프롬프트 확장 |
| 7 | Canary 모니터링 | Area G | Ship 확장 |
| 8 | Deploy 플랫폼 감지 | Area M | scripts/deploy/ 신규 |
| 9 | Cross-model 비교 로직 | Area J | outside-voice.mjs 확장 |
| 10 | Diff-scope 분류 | Area Q | routing/ 확장 |

### Tier 3: 보통 가치 (★★★)

| # | 항목 | 소스 | 예상 작업 |
|---|------|------|----------|
| 11 | Retro 회고 | Area E | 새 스킬 |
| 12 | Freeze/Unfreeze | Area K | guardrail 확장 |
| 13 | Document Release | Area N | Ship 후속 |
| 14 | Benchmark | Area H | Jun + Browser |
| 15 | Placeholder 29개 확장 | Area R | resolvers 추가 |

---

## 4. 전체 아키텍처 비교 다이어그램

```
gstack (Garry Tan)                     ai-ng-claude (aing)
════════════════                       ═══════════════════

28 Skills (role-play)                  14 Named Agents (parallel spawn)
  ↓                                      ↓
Playwright Daemon (50+ cmd)            MCP Playwright (browser_*)
  ↓                                      ↓
4-tier Review Pipeline                 4-tier Review + Complexity Routing
  ↓                                      ↓
Ship 7-step + land-deploy              Ship 7-step + PDCA Integration
  ↓                                      ↓
Telemetry 3-tier                       Telemetry 3-tier + Pending Marker
  ↓                                      ↓
61 E2E Tests + CI (40-parallel)        Context Budget + Cross-Session Learning
  ↓                                      ↓
gen-skill-docs (29 placeholders)       gen-skill-docs (14+ placeholders)
  ↓                                      ↓
3-host (Claude/Codex/Kiro)             1-host (Claude Code only)

gstack에만 있는 것:                    aing에만 있는 것:
  CSO 14-phase 보안 감사                 PDCA 5-stage 강제 사이클
  Autoplan 6-principle 자동 결정          Complexity-based model routing
  Design binary (GPT Image)             Circuit breaker + self-healing
  Office Hours 6-question               Eureka cross-session learning
  Canary post-deploy monitoring         Context budget + 9-tier compaction
  61 E2E test suites                    14 named agents (parallel)
  Headed Chrome + extension             Guardrail engine (enforced)
  Cookie import (Keychain)              Adaptive preamble (per-agent)
```

---

## 5. 결론

gstack의 95K LOC 중 핵심 패턴은 이미 흡수 완료 (~2,750 LOC).
추가 15개 영역 중 Tier 1 (5개)를 흡수하면 aing는 gstack의 워크플로우 완성도 +
고유 에이전트 구조화를 모두 갖추게 됨.

**현재 흡수율: ~70% (핵심 아키텍처 패턴)**
**Tier 1 추가 후: ~90%**
**Tier 2 추가 후: ~95%**
**남은 5%: gstack 고유 (Design binary, Headed Chrome, Cookie Keychain)**

---

## 6. 핵심 패턴 상세 (A-H 분석에서 추가 발견)

### QA Health Score 계산 공식 (Area A)

| Category | Weight | 100점 기준 | 감점 |
|----------|--------|-----------|------|
| Console | 15% | 0 errors | 1-3: -30, 4-10: -60, 10+: -90 |
| Links | 10% | 0 broken | 각 -15 |
| Visual | 10% | 0 issues | CRITICAL: -25, HIGH: -15, MED: -8, LOW: -3 |
| Functional | 20% | 0 issues | 동일 감점 |
| UX | 15% | 0 issues | 동일 감점 |
| Performance | 10% | 0 issues | 동일 감점 |
| Content | 5% | 0 issues | 동일 감점 |
| Accessibility | 15% | 0 issues | 동일 감점 |

### Office Hours 6 Forcing Questions (Area B)

1. **Demand Reality**: "사라지면 화낼 사람이 있나?" (관심 ≠ 수요)
2. **Status Quo**: "지금은 어떻게 해결하나? 비용은?"
3. **Desperate Specificity**: "가장 필요한 실제 사람 이름은? 직함? 승진/해고 조건?"
4. **Narrowest Wedge**: "이번 주에 돈 낼 최소 버전은?"
5. **Observation & Surprise**: "도움 없이 사용하는 걸 봤나? 뭐가 놀라웠나?"
6. **Future-Fit**: "3년 뒤 세상이 바뀌면, 이 제품이 더 필수적이 되나?"

### CSO 14-Phase 보안 감사 (Area C)

```
Phase 0:  스택 감지 (언어, 프레임워크, DB, 클라우드)
Phase 1:  Attack Surface Census (엔드포인트, 인증 경계)
Phase 2:  Secrets Archaeology (AKIA, sk-, ghp_, xoxb-)
Phase 3:  Dependency Supply Chain (CVE + install scripts)
Phase 4:  CI/CD Security (pull_request_target, unpinned actions)
Phase 5:  Infrastructure (Docker root, DB creds in config)
Phase 6:  Webhooks & Integrations (서명 검증, TLS)
Phase 7:  LLM Security (prompt injection, tool validation)
Phase 8:  Skill Supply Chain (credential exfiltration)
Phase 9:  OWASP Top 10 (A01~A10 각각 타겟 분석)
Phase 10: STRIDE Threat Model (Spoofing~Elevation)
Phase 11: Data Classification
Phase 12: FP Filtering + Active Verification
Phase 13: Findings Report + Trend Tracking
Phase 14: Remediation Prioritization
```

### Design Audit 80-Item Checklist (Area D)

10개 카테고리, ~80개 체크 항목:
- Visual Hierarchy (8), Typography (15), Color & Contrast (10)
- Spacing & Layout (12), Interaction States (10), Responsive (8)
- Motion & Animation (6), Content & Microcopy (8), AI Slop (10)
- Performance as Design (6)

### Retro 13-Step 계산 (Area E)

Session 감지: 45분 갭 기준, Deep(50m+)/Medium(20-50m)/Micro(<20m)
Hotspot: 파일당 수정 횟수, 5+ = churn hotspot
Focus Score: 단일 최다 수정 디렉토리 비율
Ship of the Week: 최대 LOC PR 자동 식별
Week-over-Week: commits, LOC, test ratio, fix ratio 추세

### Investigation Iron Law (Area F)

"근본 원인 없이 수정 없음"
3회 가설 실패 → STOP → 아키텍처 의문 제기
5+ 파일 수정 → blast radius 확인 필수

### Canary 모니터링 루프 (Area G)

60초 간격, 2회 연속 이상 시만 알림 (transient blip 무시)
CRITICAL: 페이지 로드 실패
HIGH: 새로운 console error
MEDIUM: 성능 2x 저하
LOW: 새로운 404

### Benchmark 회귀 임계값 (Area H)

Timing: >50% 증가 OR >500ms = REGRESSION, >20% = WARNING
Bundle: >25% = REGRESSION, >10% = WARNING
Request count: >30% = WARNING
성능 등급: A(전체 PASS) ~ F(전체 FAIL)
