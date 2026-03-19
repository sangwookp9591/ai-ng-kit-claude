---
name: swkit
description: sw-kit 하네스 엔지니어링 워크플로우. PDCA, TDD, Task, Agent, Pipeline 전체 관리.
---

# /swkit — Harness Engineering Workflow

## PDCA Actions

### `/swkit start <feature-name>`
PDCA 사이클 시작. Plan 생성 + Task 체크리스트 자동 생성.

### `/swkit status`
현재 상태: PDCA 단계, TDD 페이즈, Task 진행률, 증거 체인.

### `/swkit next`
다음 PDCA 단계 진행. 증거 수집 후 자동 전환.

### `/swkit reset <feature-name>`
PDCA 사이클 초기화.

## TDD Actions

### `/swkit tdd start <feature> <test-target>`
TDD 사이클 시작. 🔴 RED → 🟢 GREEN → 🔵 REFACTOR.

### `/swkit tdd check <pass|fail>`
테스트 결과 기록. TDD 페이즈 자동 전환.

### `/swkit tdd status`
현재 TDD 페이즈 표시.

## Task Actions

### `/swkit task create <title> --subtasks "step1, step2, step3"`
Main Task + Sub Tasks 생성. 체크리스트로 추적.

### `/swkit task check <task-id> <subtask-seq>`
서브태스크 완료 체크. ☐ → ☑

### `/swkit task list`
전체 태스크 목록.

### `/swkit task show <task-id>`
태스크 상세 체크리스트 표시.

## Agent Actions

### `/swkit explore <target>`
🔍 Scout — 코드베이스 탐색.

### `/swkit plan <task>`
📋 Archie — 작업 계획 수립. .sw-kit/plans/ 에 저장.

### `/swkit execute <task>`
⚡ Bolt — 코드 구현.

### `/swkit review [scope]`
🛡️ Shield — 코드 리뷰.

### `/swkit verify [feature]`
✅ Proof — 증거 체인 검증.

### `/swkit wizard`
🪄 Iron — 비개발자 마술사 모드.

## Pipeline Actions

### `/swkit auto <feature> <task>`
🚀 전체 파이프라인 자동 실행: Scout→Archie→Bolt→Shield→Proof.

### `/swkit rollback`
📌 마지막 체크포인트로 롤백.

## Utility

### `/swkit learn [show|clear]`
🧠 교차 세션 학습 기록 관리.

### `/swkit help`
❓ 에이전트 팀, 5대 혁신, 커맨드 목록 표시.

## Flow
```
PDCA:  plan → do(TDD) → check → act → review
TDD:   🔴 RED → 🟢 GREEN → 🔵 REFACTOR (반복)
Task:  Main Task → [☐ Sub1] [☐ Sub2] [☐ Sub3] → ☑ Complete
```
