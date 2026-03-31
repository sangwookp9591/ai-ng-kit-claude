# aing v3.0 Roadmap

**목표**: 하네스 엔지니어링의 완성 — 16 에이전트 팀이 자율적으로 계획, 구현, 검증, 배포하는 시스템
**기준일**: 2026-03-30
**현재 버전**: v2.8.81
**목표 버전**: v3.0.0

---

## 현황

```
                  v2.8           v3.0 (목표)
                  ────           ───────────
Total LOC         38,500+        45,000+
Test/Code Ratio   40%+           50%+
Skills            40             50+
Named Agents      16             16+
Modules           149+           180+
E2E Suites        10             20+
```

---

## Phase 1: Review System 고도화

**목표**: 코드 리뷰가 프로덕션 수준의 깊이를 가짐

### 1.1 Pre-Landing Review (완료 ✅)
- 18-category 체크리스트 (2-pass: CRITICAL + INFORMATIONAL)
- Fix-First 분류 (AUTO-FIX / ASK)
- Scope Drift 감지 (3-way 비교)

### 1.2 Review Pipeline (완료 ✅)
- 4-tier: Eng / CEO / Design / Outside Voice
- 복잡도 기반 자동 스케일링
- Review Readiness Dashboard

### 1.3 v3.0 목표
- [ ] Cross-file dependency analysis
- [ ] Incremental review (변경분만 재리뷰)
- [ ] Custom rule engine (프로젝트별 리뷰 규칙)

---

## Phase 2: Ship/Deploy Pipeline

**목표**: commit부터 production까지 완전 자동화

### 2.1 Ship Workflow (완료 ✅)
- 7-step: preflight → merge → test → review → version → changelog → PR
- Test triage + failure classification
- Version bump (major/minor/patch 자동)

### 2.2 Land & Deploy (완료 ✅)
- PR merge → CI 대기 → deploy 검증
- Canary monitoring (console error, performance regression)

### 2.3 v3.0 목표
- [ ] Rolling deploy support
- [ ] A/B test integration
- [ ] Automated rollback on canary failure

---

## Phase 3: QA & Testing

**목표**: 100% 자동화된 QA 파이프라인

### 3.1 현재 (완료 ✅)
- QA Loop (test → fix → retest, max 5회)
- Browser QA via MCP Playwright (60 commands)
- TDD 사이클 관리 (RED → GREEN → REFACTOR)
- Evidence Chain (6종 증거)

### 3.2 v3.0 목표
- [ ] Visual regression testing
- [ ] Performance benchmark suite
- [ ] Flaky test detection + quarantine
- [ ] Coverage tracking across sessions

---

## Phase 4: Agent Intelligence

**목표**: 에이전트가 더 똑똑하게

### 4.1 현재 (완료 ✅)
- Cross-session learning (eureka)
- Confidence decay (30일)
- Adaptive routing (complexity → model tier)
- Multi-AI consensus (3-voice voting)

### 4.2 v3.0 목표
- [ ] Agent memory (long-term context)
- [ ] Feedback loop (사용자 피드백 → 에이전트 개선)
- [ ] Agent specialization (프로젝트별 학습)

---

## Phase 5: Harness Architect

**목표**: 하네스가 하네스를 만든다

### 5.1 현재 (완료 ✅)
- 7개 서브커맨드 (design, check, find, sim, log, chain, fix)
- 9개 TypeScript 엔진 (2,523 LOC)
- 복잡도 기반 자동 팀 설계

### 5.2 v3.0 목표
- [ ] Template marketplace (커뮤니티 하네스 공유)
- [ ] Auto-evolution (성공률 기반 하네스 자동 개선)
- [ ] Cross-project pattern transfer

---

## 완료 기준

```
v3.0 릴리즈 조건:
  [ ] 50+ Skills
  [ ] 20+ E2E Suites
  [ ] Test/Code ratio 50%+
  [ ] 모든 Phase의 v3.0 목표 중 70% 이상 완료
  [ ] 프로덕션 프로젝트 3개 이상에서 검증
```

## 포지셔닝

```
aing: "16명의 전문 에이전트가 PDCA 사이클로 자율 협업하는 하네스 엔지니어링 시스템"

핵심 가치:
  1. 구조: 에이전트 팀 + PDCA + Evidence Chain
  2. 자율성: 계획 → 구현 → 검증 → 수정까지 자동
  3. 안전성: Guardrail + Circuit Breaker + Rollback
  4. 학습: Cross-session learning + Multi-AI consensus
  5. 확장: Harness Architect로 도메인별 팀 자동 설계
```
