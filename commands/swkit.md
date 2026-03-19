---
name: swkit
description: sw-kit v1.4.0 하네스 엔지니어링 워크플로우. PDCA, TDD, Task, Agent, Pipeline 전체 관리.
---

# /swkit -- Harness Engineering Workflow v1.4.0

## PDCA

| Command | What it does |
|---------|-------------|
| `/swkit start <name>` | PDCA 사이클 시작. Plan + Task 체크리스트 자동 생성. |
| `/swkit status` | 대시보드 (PDCA + TDD + Task + Budget) |
| `/swkit next` | 다음 PDCA 단계 진행. 증거 수집 후 자동 전환. |
| `/swkit reset <name>` | PDCA 사이클 초기화. |

## TDD

| Command | What it does |
|---------|-------------|
| `/swkit tdd start <feat> <target>` | TDD 사이클 시작 (RED) |
| `/swkit tdd check <pass\|fail>` | 결과 기록 + 페이즈 전환 (RED-GREEN-REFACTOR) |
| `/swkit tdd status` | 현재 TDD 페이즈 |

## Task

| Command | What it does |
|---------|-------------|
| `/swkit task create <title>` | Main Task + Sub Tasks 체크리스트 생성 |
| `/swkit task check <id> <seq>` | 서브태스크 완료 체크 |
| `/swkit task list` | 전체 태스크 목록 |

## Agent (v1.4.0 Named Team)

| Command | Agent | Role |
|---------|-------|------|
| `/swkit explore <target>` | Klay | Architect -- 코드베이스 탐색 + 구조 분석 |
| `/swkit plan <task>` | Able + Klay | PM 기획 + 아키텍처 설계 |
| `/swkit execute <task>` | Jay + Derek | Backend API + Frontend 구현 (TDD 강제) |
| `/swkit review` | Milla | 보안 리뷰 + 코드 품질 점검 |
| `/swkit verify` | Sam | CTO 최종 검증 + 증거 체인 판정 |
| `/swkit wizard` | Iron | 비개발자 마술사 모드 |

## Pipeline

| Command | What it does |
|---------|-------------|
| `/swkit auto <feat> <task>` | 전체 파이프라인: Klay - Able - Jay/Derek - Milla - Sam |
| `/swkit rollback` | 마지막 체크포인트로 롤백 |

## Utility

| Command | What it does |
|---------|-------------|
| `/swkit learn show` | 교차 세션 학습 기록 |
| `/swkit help` | 에이전트 팀 + 커맨드 도움말 |

## Flow
```
PDCA:     plan -> do(TDD) -> check -> act -> review
TDD:      RED -> GREEN -> REFACTOR (repeat)
Pipeline: Klay -> Able -> Jay+Jerry+Milla+Willji+Derek+Rowan -> Milla -> Sam
Task:     Main Task -> [Sub1] [Sub2] [Sub3] -> Complete
```
