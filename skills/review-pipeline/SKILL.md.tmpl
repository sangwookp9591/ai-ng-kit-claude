---
name: review-pipeline
description: |
  review-pipeline — 4-Tier Review Pipeline
---

# /aing review-pipeline — 4-Tier Review Pipeline

> gstack 흡수: 4-tier 리뷰 파이프라인 + Review Readiness Dashboard
> 복잡도 기반 자동 리뷰 깊이 선택 (aing 시너지)

## 사용법

```
/aing review-pipeline              # 복잡도 기반 자동 선택
/aing review-pipeline eng          # Eng Review만
/aing review-pipeline ceo          # CEO Review만
/aing review-pipeline design       # Design Review만
/aing review-pipeline full         # 전체 4-tier
```

## Review Tiers

| Tier | 에이전트 | Focus | 필수 |
|------|---------|-------|------|
| Eng Review | Klay + Jay + Milla | 아키텍처, 코드 품질, 테스트, 보안 | YES |
| CEO Review | Able + Sam | 스코프, 전략, 사용자 임팩트 | no |
| Design Review | Willji + Iron | UI/UX, 접근성, 디자인 시스템 | no |
| Outside Voice | Subagent | 블라인드 스팟, 실현 가능성 | no |

## 복잡도 기반 자동 선택

```
low (0-3점):   Eng Review만 (Milla 단독)
mid (4-7점):   Eng + Design (hasUI일 때)
high (8-15점): CEO + Eng + Design + Outside Voice (전체)
```

## Workflow

### Step 1: Pre-flight
- 현재 브랜치, diff 확인
- 복잡도 스코어 계산
- 리뷰 티어 자동 선택

### Step 2: Eng Review (필수)
Klay(Architect) + Jay(Backend) + Milla(Security) 병렬 스폰:

1. **Architecture Review**: 시스템 설계, 의존성, 데이터 흐름
2. **Code Quality**: DRY, 에러 핸들링, 엣지 케이스
3. **Test Review**: 커버리지 다이어그램, 갭 분석
4. **Performance**: N+1 쿼리, 메모리, 캐싱
5. **Security**: OWASP Top 10, 인증/인가

각 이슈는 severity 레이팅: CRITICAL / HIGH / MEDIUM / LOW

### Step 3: CEO Review (high complexity)
Able(PM) + Sam(CTO):
- Scope drift 감지 (계획 vs 실제 diff)
- 제품 적합성 검증
- 전략적 방향 확인

### Step 4: Design Review (hasUI)
Willji(Design) + Iron(Frontend):
- AI Slop 안티패턴 10가지 체크
- 접근성 (WCAG 2.1 AA)
- 반응형 디자인
- 디자인 시스템 정합성

### Step 5: Outside Voice (high complexity)
Claude subagent with fresh context:
- 블라인드 스팟 감지
- Cross-model tension 분석
- 사용자에게 tension 포인트 제시 (User Sovereignty)

### Step 6: Dashboard
Review Readiness Dashboard 출력:
```
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Last Run            | Status    | Required |
| Eng Review      |  1   | 2026-03-29 22:00    | CLEAR     | YES      |
| CEO Review      |  0   | —                   | —         | no       |
| ...
| VERDICT: CLEARED — Eng Review passed                                |
+====================================================================+
```

### Step 7: Evidence 기록
리뷰 결과를 evidence chain에 추가:
- type: 'review'
- result: 'pass' | 'fail'
- source: 'eng-review' | 'ceo-review' | etc.

## Boil the Lake
AI가 한계비용을 0에 가깝게 만든다. 항상 완전한 리뷰를 추천.
Completeness: 10/10 = 전체 4-tier, 7/10 = Eng만, 3/10 = 스킵.
