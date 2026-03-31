# aing v2.8.81 사용자 가이드

> 14명의 전문 에이전트가 당신의 코드를 함께 만듭니다.

---

## 목차

1. [시작하기](#1-시작하기)
2. [5가지 사용 패턴](#2-5가지-사용-패턴)
3. [개발 플로우 (전체)](#3-개발-플로우-전체)
4. [리뷰 가이드](#4-리뷰-가이드)
5. [Ship 가이드](#5-ship-가이드)
6. [보안 감사](#6-보안-감사)
7. [비개발자 모드](#7-비개발자-모드)
8. [에이전트 팀 소개](#8-에이전트-팀-소개)
9. [상황별 빠른 참조](#9-상황별-빠른-참조)
10. [팁과 주의사항](#10-팁과-주의사항)

---

## 1. 시작하기

### 설치

```
/plugin marketplace add sangwookp9591/ai-ng-kit-claude
/plugin install aing
```

### 첫 실행

```
/aing help
```

이것만으로 전체 커맨드 목록과 에이전트 팀을 확인할 수 있습니다.

### 프로젝트 초기화 (선택)

```
/aing init
```

프로젝트 구조를 분석하고 `.aing/` 런타임 디렉토리를 생성합니다.
기존 프로젝트에서도 init 없이 바로 사용 가능합니다.

---

## 2. 5가지 사용 패턴

당신의 상황에 맞는 패턴을 고르세요.

### Pattern A: "빨리 하나만 해줘" (가장 흔함)

```
/aing do "로그인 API에 rate limit 추가해줘"
```

aing이 의도를 분석해서 적절한 에이전트에게 자동 라우팅합니다.
간단한 작업은 Solo 모드 (에이전트 1명)로 빠르게 처리.

### Pattern B: "기능 하나를 처음부터 끝까지" (핵심)

```
/aing auto user-auth "JWT 인증 + 리프레시 토큰"
```

전체 파이프라인이 자동 실행됩니다:

```
1. Klay     코드베이스 스캔, 아키텍처 설계
2. Able     요구사항 분석, 태스크 분해
3. Jay      백엔드 구현 (TDD: RED-GREEN-REFACTOR)
   Jerry    DB 스키마 + 마이그레이션
   Milla    인증 미들웨어 + 보안
   Willji   로그인 UI 디자인
   Derek    프론트엔드 구현
4. Milla    보안 리뷰 (OWASP Top 10)
   Sam      코드 리뷰 + 증거 수집
5. Sam      최종 판정:
            [test] PASS (24/24)
            [build] PASS
            Verdict: ACHIEVED (9/10)
```

### Pattern C: "내가 코딩하고, 리뷰만 받을래"

```
# 코딩을 직접 한 후...
/aing review-pipeline
```

복잡도에 따라 자동으로 리뷰 깊이가 결정됩니다:
- 간단한 변경: Milla만 (보안 체크)
- 중간: Milla + Willji (보안 + 디자인)
- 복잡한 변경: 전체 4-tier (CEO + Eng + Design + Outside Voice)

### Pattern D: "팀을 직접 구성할래"

```
/aing team jay milla "결제 API 리팩토링"
```

원하는 에이전트를 직접 지정합니다.
plan → exec → verify → fix 루프가 자동 실행됩니다.

### Pattern E: "나는 개발자가 아닌데"

```
/aing wizard
```

Iron이 자연어를 코드로 변환합니다.
"쇼핑몰 만들어줘", "블로그에 댓글 기능 추가해줘" 같은 요청 가능.

---

## 3. 개발 플로우 (전체)

일반적인 기능 개발의 전체 흐름입니다.

```
┌─────────────────────────────────────────────────────────┐
│                    aing 개발 플로우                       │
│                                                          │
│  1. 계획       /aing plan "JWT 인증"                     │
│     ↓          Able이 요구사항 분석 + Klay이 아키텍처     │
│                                                          │
│  2. 구현       /aing auto user-auth "JWT 인증"           │
│     ↓          PDCA 사이클: plan → do → check → act      │
│                                                          │
│  3. 리뷰       /aing review-pipeline                     │
│     ↓          4-tier: Eng / CEO / Design / Outside      │
│                                                          │
│  4. Ship       /aing ship                                │
│     ↓          merge → test → version → changelog → PR   │
│                                                          │
│  5. 모니터     (deploy 후 수동 확인)                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.1 계획 단계

```
/aing plan "사용자 인증 시스템"
```

Able이 6가지 강제 질문으로 요구사항을 명확히 합니다:
1. 사라지면 화낼 사용자가 있나?
2. 지금은 어떻게 해결하나?
3. 가장 필요한 실제 사람은 누구?
4. 이번 주에 돈 낼 최소 버전은?
5. 도움 없이 사용하는 걸 봤나?
6. 3년 뒤에 더 필수적이 되나?

Klay이 코드베이스를 탐색하고 아키텍처를 설계합니다.
결과: `.aing/plans/` 에 계획 문서 저장.

### 3.2 구현 단계

```
/aing auto user-auth "JWT 인증 + 리프레시 토큰"
```

복잡도에 따라 팀이 자동 구성됩니다:

| 복잡도 | 팀 규모 | 예상 토큰 | 예시 |
|:------:|:-------:|:---------:|------|
| low (0-3) | Solo 1명 | ~15K | 버그 수정, 단일 파일 |
| mid (4-7) | Duo 2명 | ~18K | API 엔드포인트, 미들웨어 |
| mid+ | Squad 4명 | ~48K | 풀스택 기능 |
| high (8+) | Full 7명 | ~123K | 아키텍처 변경, 보안 |

PDCA 사이클이 자동으로 돌아갑니다:
- **Plan**: 계획 수립
- **Do**: 구현 (TDD 강제: 테스트 먼저 → 코드 → 리팩토링)
- **Check**: 검증 (matchRate < 90% → Act로 돌아감)
- **Act**: 수정
- **Review**: 최종 검증

### 3.3 리뷰 단계

```
/aing review-pipeline          # 복잡도 기반 자동
/aing review-pipeline eng      # Eng Review만
/aing review-pipeline full     # 전체 4-tier
```

**Eng Review** (항상 실행):
- Klay: 아키텍처, 의존성, 데이터 흐름
- Jay: 코드 품질, DRY, 에러 핸들링
- Milla: 보안 (OWASP Top 10, SQL injection, LLM boundary)

**CEO Review** (high complexity):
- Able: 스코프 적합성, 사용자 임팩트
- Sam: 전략적 방향, 비용 대비 가치

**Design Review** (UI 변경 시):
- Willji: AI Slop 10가지 안티패턴 체크
- Iron: 반응형, 접근성, 디자인 시스템 정합성

**Outside Voice** (high complexity):
- 독립적인 Claude subagent가 블라인드 스팟 감지

리뷰 결과는 Review Readiness Dashboard에 표시:

```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Status    | Required |
| Eng Review      |  1   | CLEAR     | YES      |
| CEO Review      |  1   | CLEAR     | no       |
| Design Review   |  0   | --        | no       |
| VERDICT: CLEARED                                                    |
+====================================================================+
```

### 3.4 Ship 단계

```
/aing ship
```

Dashboard가 CLEARED이고 Evidence가 PASS여야 실행됩니다.

7단계 자동 파이프라인:

| Step | 동작 |
|:----:|------|
| 1 | Pre-flight: dashboard CLEARED + evidence PASS 확인 |
| 2 | Base branch merge (conflict 감지 시 중단) |
| 3 | 테스트 실행 + failure triage |
| 4 | Pre-landing review (Milla: SQL, LLM boundary) |
| 5 | Version bump (major/minor/patch 자동) |
| 6 | CHANGELOG 생성 |
| 7 | Push + PR 생성 |

### 3.5 디버깅

```
/aing debug "로그인 시 500 에러"
```

4-phase 체계적 디버깅:
1. **Investigate**: 증상 수집, 재현 조건
2. **Analyze**: 데이터 수집, 가설 생성
3. **Hypothesize**: 검증 계획 수립
4. **Implement**: 수정 + 회귀 테스트

Iron Law: 근본 원인 없이 수정 없음.
3회 가설 실패 → 자동 에스컬레이션.

---

## 4. 리뷰 가이드

### 언제 어떤 리뷰를 쓰나?

| 변경 유형 | 추천 리뷰 | 커맨드 |
|----------|----------|--------|
| 버그 수정 (1-3 파일) | Eng only | `/aing review-pipeline eng` |
| API 추가 | Eng | `/aing review-pipeline eng` |
| UI 변경 | Eng + Design | `/aing review-pipeline` (자동) |
| 새 기능 (10+ 파일) | 전체 | `/aing review-pipeline full` |
| 아키텍처 변경 | 전체 + CSO | `/aing review-pipeline full` 후 `/aing review cso` |

### 리뷰에서 나오는 결과물

**2-pass 체크리스트**:

Pass 1 (CRITICAL, ship 차단):
- SQL injection, Race condition, LLM trust boundary
- Auth bypass, Data exposure, Enum completeness

Pass 2 (INFORMATIONAL, 개선 제안):
- Conditional side effects, Magic numbers, Dead code
- N+1 queries, Stale comments, Missing error handling

**Fix-First 분류**:
- AUTO-FIX: dead code, stale comments → 자동 수정
- ASK: 아키텍처 결정, 트레이드오프 → 사용자 선택

### Scope Drift 감지

리뷰 시 자동으로 3-way 비교:
- Intent (TODOS/PR에서 명시한 목표)
- Plan (계획 문서)
- Diff (실제 변경)

```
Scope Check: [DRIFT DETECTED]

Scope Creep (2 areas):
  ⚠ scripts/telemetry/
  ⚠ tests/helpers/

Missing Requirements (1):
  ✗ rate limit 구현
```

---

## 5. Ship 가이드

### Ship 전 체크리스트

```
/aing ship --dry-run    # 시뮬레이션 (실제 push 없음)
```

Ship이 자동으로 확인하는 것들:
- [ ] Review Dashboard: CLEARED
- [ ] Evidence Chain: PASS (test + build)
- [ ] PDCA stage: review 완료
- [ ] Feature branch에 있는지 (main 아님)
- [ ] Uncommitted changes 없음

### Version Bump 규칙

| 변경 유형 | Bump | 예시 |
|----------|------|------|
| Breaking API 변경 | major | 2.5.0 → 3.0.0 |
| 새 기능 추가 | minor | 2.5.0 → 2.6.0 |
| 버그 수정/개선 | patch | 2.5.0 → 2.5.1 |

### Ship 후

```
/aing retro 7d    # 지난 7일 회고
```

커밋 패턴, 세션 분석, hotspot 감지, focus score 제공.

---

## 6. 보안 감사

```
/aing review cso
```

Milla가 14-phase 보안 감사를 실행합니다:

```
Phase 0:  스택 감지
Phase 1:  Attack Surface 매핑
Phase 2:  Secrets 스캔 (git history)
Phase 3:  Dependency CVE 체크
Phase 4:  CI/CD 파이프라인 보안
Phase 5:  Infrastructure 감사
Phase 6:  Webhook/Integration 보안
Phase 7:  LLM 보안 (prompt injection)
Phase 8:  Skill Supply Chain
Phase 9:  OWASP Top 10 (A01-A10)
Phase 10: STRIDE Threat Model
Phase 11: Data Classification
Phase 12: FP Filtering
Phase 13: Findings Report
```

Severity:
- **CRITICAL**: 실제 exploitation 시나리오 필수
- **HIGH**: 입증된 임팩트 경로
- **MEDIUM**: 완화 요소 있는 잠재적 리스크

---

## 7. 비개발자 모드

```
/aing wizard
```

Iron이 자연어를 이해하고 코드로 변환합니다.

예시:
```
"블로그에 댓글 기능 추가해줘"
"메인 페이지 색상을 파란색으로 바꿔줘"
"회원가입 폼에 이메일 인증 추가해줘"
```

wizard는 내부적으로 적절한 에이전트를 자동 호출합니다.

---

## 8. 에이전트 팀 소개

### Leadership

| 이름 | 역할 | 언제 등장하나 |
|------|------|-------------|
| **Sam** | CTO, 최종 검증 | 모든 작업의 마지막 (verdict) |
| **Able** | PM, 기획 | 계획 수립, 요구사항 분석 |
| **Klay** | 아키텍트 | 코드베이스 탐색, 설계 리뷰 |

### Backend

| 이름 | 역할 | 언제 등장하나 |
|------|------|-------------|
| **Jay** | API 개발 | 백엔드 구현, TDD |
| **Jerry** | DB/인프라 | 스키마, 마이그레이션 |
| **Milla** | 보안 | 리뷰, CSO 감사 |
| **Jun** | 성능 | 프로파일링, 최적화 |

### Frontend

| 이름 | 역할 | 언제 등장하나 |
|------|------|-------------|
| **Derek** | 모바일/Flutter | 크로스플랫폼 |
| **Iron** | 프론트엔드 | UI 구현, wizard |
| **Rowan** | 모션/인터랙션 | 애니메이션, 로딩 상태 |

### Design & Specialty

| 이름 | 역할 | 언제 등장하나 |
|------|------|-------------|
| **Willji** | UI/UX 디자이너 | 디자인 리뷰, AI Slop 감지 |
| **Simon** | 코드 인텔리전스 | 죽은 코드 감지, LSP |

---

## 9. 상황별 빠른 참조

### "이 버그 좀 고쳐줘"
```
/aing debug "에러 설명"
```

### "이 코드 리뷰해줘"
```
/aing review-pipeline
```

### "테스트 짜줘"
```
/aing tdd start auth "JWT 인증 테스트"
```

### "성능이 느려"
```
/aing perf runtime
```

### "이 코드 구조를 파악하고 싶어"
```
/aing explore src/auth
```

### "리팩토링 하고 싶어"
```
/aing refactor src/services
```

### "죽은 코드 정리"
```
/aing lsp
```

### "편집 범위를 제한하고 싶어"
```
/aing freeze src/auth     # src/auth/ 만 편집 가능
/aing unfreeze            # 해제
```

### "지난 주 작업 돌아보기"
```
/aing retro 7d
```

### "진행 상황 확인"
```
/aing status
```

---

## 10. 팁과 주의사항

### DO

- `/aing auto`를 적극 사용하세요. 복잡도에 따라 팀 규모가 자동 조절됩니다.
- 리뷰 후 ship하세요. Review Dashboard CLEARED가 품질 게이트입니다.
- 한국어와 영어 모두 사용 가능합니다. 자동 감지됩니다.
- `/aing status`로 PDCA 진행 상황을 수시로 확인하세요.

### DON'T

- Sam의 verdict가 FAILED인데 ship하지 마세요.
- `git push --force`는 guardrail이 차단합니다.
- `.env` 파일 수정은 경고가 뜹니다. 의도적이면 승인하세요.
- 동시에 여러 PDCA 사이클을 돌리지 마세요 (하나씩 완료).

### 비용 절감 팁

- 간단한 작업: `/aing do` (Solo, ~15K 토큰)
- 리뷰만: `/aing review-pipeline eng` (Milla만)
- 전체 파이프라인은 복잡한 기능에만 사용

### 에러 복구

```
/aing rollback         # 마지막 체크포인트로 복구
```

Circuit breaker가 연속 실패를 감지하면 자동으로 백오프합니다.
3회 연속 실패 시 에스컬레이션됩니다.

---

## 부록: 전체 커맨드 목록

| 커맨드 | 설명 |
|--------|------|
| `/aing help` | 전체 도움말 |
| `/aing init` | 프로젝트 초기화 |
| `/aing do <task>` | 자동 라우팅 실행 |
| `/aing auto <feat> <task>` | 전체 파이프라인 |
| `/aing team [agents] <task>` | 팀 직접 구성 |
| `/aing wizard` | 비개발자 모드 |
| `/aing plan <task>` | 계획 수립 |
| `/aing explore <target>` | 코드베이스 탐색 |
| `/aing debug <issue>` | 체계적 디버깅 |
| `/aing review-pipeline [tier]` | 4-tier 리뷰 |
| `/aing review cso` | 14-phase 보안 감사 |
| `/aing ship` | 7단계 자동 Ship |
| `/aing tdd start <feat> <target>` | TDD 시작 |
| `/aing tdd check pass\|fail` | TDD 결과 기록 |
| `/aing test` | 테스트 실행 |
| `/aing qa-loop` | QA 사이클 |
| `/aing perf [type]` | 성능 분석 |
| `/aing refactor <scope>` | 구조적 리팩토링 |
| `/aing lsp` | 죽은 코드 감지 |
| `/aing task create <title>` | 태스크 생성 |
| `/aing task list` | 태스크 목록 |
| `/aing freeze <dir>` | 편집 범위 제한 |
| `/aing unfreeze` | 제한 해제 |
| `/aing retro [window]` | 엔지니어링 회고 |
| `/aing rollback` | 체크포인트 복구 |
| `/aing status` | 진행 상황 대시보드 |
| `/aing verify-evidence` | 증거 체인 검증 |
