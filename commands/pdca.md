---
name: pdca
description: PDCA 워크플로우 관리. start, status, next, reset 액션을 지원합니다.
---

# /pdca — PDCA Workflow Manager

## Actions

### `/pdca start <feature-name>`
새로운 PDCA 사이클을 시작합니다.
1. Plan 단계로 진입
2. `templates/plan.md` 기반 계획서 생성
3. `.sw-kit/state/pdca-status.json`에 상태 저장

### `/pdca status`
현재 PDCA 상태를 표시합니다.
- Active feature, current stage, iteration count
- Evidence chain summary
- Progress indicator

### `/pdca next`
다음 PDCA 단계로 진행합니다.
- 현재 단계의 수락 기준 확인
- 증거 수집 (test/build/lint 결과)
- 자동 단계 전환

### `/pdca reset <feature-name>`
PDCA 사이클을 초기화합니다.

## Stage Flow
```
plan → do → check → act (iterate if <90%) → review → completed
```
