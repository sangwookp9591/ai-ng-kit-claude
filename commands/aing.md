---
name: aing
description: aing v2.0.0 하네스 엔지니어링 워크플로우. PDCA, TDD, Task, Agent, Pipeline 전체 관리.
---

# /aing -- Harness Engineering Workflow v2.0.0

## PDCA

| Command | What it does |
|---------|-------------|
| `/aing start <name>` | PDCA 사이클 시작. Plan + Task 체크리스트 자동 생성. |
| `/aing status` | 대시보드 (PDCA + TDD + Task + Budget) |
| `/aing next` | 다음 PDCA 단계 진행. 증거 수집 후 자동 전환. |
| `/aing reset <name>` | PDCA 사이클 초기화. |

## TDD

| Command | What it does |
|---------|-------------|
| `/aing tdd start <feat> <target>` | TDD 사이클 시작 (RED) |
| `/aing tdd check <pass\|fail>` | 결과 기록 + 페이즈 전환 (RED-GREEN-REFACTOR) |
| `/aing tdd status` | 현재 TDD 페이즈 |

## Task

| Command | What it does |
|---------|-------------|
| `/aing task create <title>` | Main Task + Sub Tasks 체크리스트 생성 |
| `/aing task check <id> <seq>` | 서브태스크 완료 체크 |
| `/aing task list` | 전체 태스크 목록 |

## Agent (v1.4.0 Named Team)

| Command | Agent | Role |
|---------|-------|------|
| `/aing explore <target>` | Klay | Architect -- 코드베이스 탐색 + 구조 분석 |
| `/aing plan <task>` | Able + Klay | PM 기획 + 아키텍처 설계 → 다음 액션 선택 (team/auto/저장) |
| `/aing execute <task>` | Jay + Derek | Backend API + Frontend 구현 (TDD 강제) |
| `/aing review` | Milla | 보안 리뷰 + 코드 품질 점검 |
| `/aing verify` | Sam | CTO 최종 검증 + 증거 체인 판정 |
| `/aing wizard` | Iron | 비개발자 마술사 모드 |

## Pipeline

| Command | What it does |
|---------|-------------|
| `/aing team [agents] <task>` | staged pipeline: plan→exec→verify→fix 루프 (품질 보장) |
| `/aing auto <feat> <task>` | 단발 파이프라인: 자동 프리셋, verify 없이 빠르게 |
| `/aing rollback` | 마지막 체크포인트로 롤백 |

## Utility

| Command | What it does |
|---------|-------------|
| `/aing learn show` | 교차 세션 학습 기록 |
| `/aing help` | 에이전트 팀 + 커맨드 도움말 |

## Flow
```
PDCA:     plan -> do(TDD) -> check -> act -> review
TDD:      RED -> GREEN -> REFACTOR (repeat)
Plan:     Able(계획) -> 다음 액션? -> team(추천) | auto(단발) | 저장
Team:     team-plan(Able) -> team-exec(@{Name}❯ 병렬) -> team-verify(Milla+Sam) -> team-fix(max 3) -> Complete
Auto:     TeamCreate -> @{Name}❯ 워커 병렬 스폰 -> 진행 테이블 -> Completion Report
Task:     Main Task -> [Sub1] [Sub2] [Sub3] -> Complete
```
