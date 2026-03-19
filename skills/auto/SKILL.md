---
name: auto
description: "🚀 전체 파이프라인 자동 실행. 5명의 에이전트 팀이 순차 협업."
triggers: ["auto", "자동", "파이프라인", "pipeline", "자동 실행", "전체 실행"]
---

# /swkit auto — Full Pipeline Automation

## Usage
```
/swkit auto <feature> <task-description>
```

## Team Composition

`/swkit auto`를 실행하면 5명의 에이전트 팀이 자동으로 구성됩니다:

```
┌─────────────────────────────────────────────────┐
│  🏠 sw-kit Agent Team                          │
│                                                 │
│  Phase 1: 🔍 Scout     탐색     [haiku]        │
│     ↓                                           │
│  Phase 2: 📋 Archie    계획     [sonnet]       │
│     ↓        → .sw-kit/plans/ 생성              │
│     ↓        → Task 체크리스트 자동 생성         │
│     ↓                                           │
│  Phase 3: ⚡ Bolt      구현     [sonnet/opus]  │
│     ↓        → TDD 🔴→🟢→🔵 자동 적용          │
│     ↓        → Task 체크 ☐→☑ 자동 업데이트      │
│     ↓                                           │
│  Phase 4: 🛡️ Shield    리뷰     [sonnet]       │
│     ↓        → Critical 발견 시 → 📌 Rollback  │
│     ↓                                           │
│  Phase 5: ✅ Proof     검증     [haiku]        │
│            → Evidence Chain 수집                │
│            → PASS ✓ → 완료!                     │
│            → FAIL ✗ → Bolt로 되돌아가 수정      │
└─────────────────────────────────────────────────┘
```

## Team Members

| 순서 | 이름 | 역할 | 모델 | 성격 |
|:---:|------|------|------|------|
| 1 | 🔍 **Scout** | Explorer | haiku | 빠르고 정확한 정찰병 |
| 2 | 📋 **Archie** | Planner | sonnet | 꼼꼼한 설계사 |
| 3 | ⚡ **Bolt** | Executor | sonnet/opus | 번개처럼 빠른 개발자 |
| 4 | 🛡️ **Shield** | Reviewer | sonnet | 철벽 수비대장 |
| 5 | ✅ **Proof** | Verifier | haiku | 증거만 믿는 검증관 |
| 🪄 | **Iron** | Wizard | sonnet | (wizard 모드 전용) 마법사 |

## Auto Flow Detail

```
/swkit auto user-auth "JWT 인증 API 구현"

1. 🔍 Scout 출동
   → 프로젝트 구조 스캔
   → 기존 인증 코드 파악
   → Convention Extractor 실행

2. 📋 Archie 투입
   → .sw-kit/plans/2026-03-19-user-auth.md 생성
   → Task 체크리스트 자동 생성:
     ☐ 1. DB 스키마 설계
     ☐ 2. JWT 미들웨어 구현
     ☐ 3. 로그인 API 구현
     ☐ 4. 테스트 작성

3. ⚡ Bolt 실행 (TDD 모드)
   → 각 서브태스크마다:
     🔴 RED: 테스트 작성 + 실패 확인
     🟢 GREEN: 최소 구현 + 통과 확인
     🔵 REFACTOR: 정리 + 재확인
   → 완료 시 ☐→☑ 자동 체크
   → Checkpoint 자동 생성 (롤백 대비)

4. 🛡️ Shield 검토
   → 코드 리뷰 (버그, 보안, 품질)
   → Critical 발견 시 → Bolt에게 수정 요청
   → 또는 📌 Rollback 제안

5. ✅ Proof 최종 검증
   → Evidence Chain 수집:
     ├── [test] PASS (12/12)
     ├── [build] PASS
     ├── [lint] PASS (0 errors)
     └── Verdict: PASS ✓
   → .sw-kit/reports/ 완료 보고서 생성
   → 학습 기록 저장 (Cross-Session Learning)
```

## Failure Recovery

- **Bolt 구현 실패** → TDD GREEN에서 재시도 (최대 3회)
- **Shield Critical** → Rollback + Bolt 재실행
- **Proof FAIL** → PDCA Act 단계 → Bolt로 되돌아가 수정
- **반복 실패** → Circuit Breaker 발동 → 사용자에게 알림
