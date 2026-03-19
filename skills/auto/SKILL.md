---
name: auto
description: "🚀 전체 파이프라인 자동 실행. 12명의 에이전트 팀이 협업."
triggers: ["auto", "자동", "파이프라인", "pipeline", "자동 실행", "전체 실행"]
---

# /swkit auto — Full Pipeline Automation

## Team Roster

```
┌──────────────────────────────────────────────────────┐
│  🏠 sw-kit Agent Team (12 members)                  │
│                                                      │
│  👑 CTO                                             │
│    👑 Sam        총괄 리더           [opus]          │
│                                                      │
│  🎯 기획                                            │
│    🎯 Able       PM / 기획           [sonnet]       │
│    📐 Klay       Architect / 설계    [opus]         │
│                                                      │
│  ⚙️ Backend                                         │
│    ⚙️ Jay        API 개발            [sonnet]       │
│    🗄️ Jerry      DB / 인프라         [sonnet]       │
│    🔒 Milla      보안 / 인증         [sonnet]       │
│                                                      │
│  🎨 Design                                          │
│    🎨 Willji     UI·UX 디자인        [sonnet]       │
│                                                      │
│  🖥️ Frontend                                        │
│    🖥️ Derek      화면 구현           [sonnet]       │
│    ✨ Rowan      인터랙션 / 애니메이션 [sonnet]      │
│                                                      │
│  🔧 Ops                                             │
│    🔍 Scout      코드베이스 탐색      [haiku]        │
│    ✅ Proof      증거 기반 검증       [haiku]        │
│                                                      │
│  🪄 Magic                                           │
│    🪄 Iron       비개발자 마법사      [sonnet]       │
└──────────────────────────────────────────────────────┘
```

## Pipeline Flow

```
/swkit auto user-auth "JWT 인증 시스템 구현"

Phase 1: 탐색
  🔍 Scout → 프로젝트 구조 스캔 + Convention 추출

Phase 2: 기획
  👑 Sam 총괄 하에:
  🎯 Able → 요구사항 정리 + 스펙 작성
  📐 Klay → 아키텍처 설계 + 기술 결정
  → .sw-kit/plans/ 생성 + Task 체크리스트 자동 생성

Phase 3: 구현 (TDD)
  ⚙️ Jay → API 엔드포인트 구현 (🔴→🟢→🔵)
  🗄️ Jerry → DB 스키마 + 마이그레이션
  🔒 Milla → JWT 인증 미들웨어 + 보안 검증
  🎨 Willji → 로그인/회원가입 UI 디자인
  🖥️ Derek → 프론트엔드 화면 구현
  ✨ Rowan → 폼 인터랙션 + 애니메이션
  → 각 서브태스크마다 TDD + ☐→☑ 자동 체크

Phase 4: 검증
  🔒 Milla → 보안 리뷰 (OWASP Top 10)
  👑 Sam → 전체 코드 리뷰
  ✅ Proof → Evidence Chain:
     ├── [test] PASS (24/24)
     ├── [build] PASS
     ├── [lint] PASS (0 errors)
     └── Verdict: PASS ✓

Phase 5: 완료
  → .sw-kit/reports/ 완료 보고서 생성
  → Cross-Session Learning 기록
  → 🎉 Done!
```

## Failure Recovery

- **구현 실패** → TDD GREEN에서 재시도 (최대 3회)
- **보안 Critical** → 📌 Rollback + 재구현
- **Proof FAIL** → PDCA Act → 해당 담당자에게 수정 요청
- **반복 실패** → Circuit Breaker → Sam에게 보고

## Wizard Mode (비개발자)

`/swkit wizard` 실행 시 🪄 Iron이 위 전체 파이프라인을 자동으로 실행하면서,
모든 기술 결정을 비개발자 언어로 번역합니다.
