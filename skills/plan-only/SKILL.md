---
name: plan-only
description: "빠른 계획. 에이전트 없이 오케스트레이터가 직접 플랜 작성 → persist. 합의 루프 없음."
triggers: ["plan-only", "빠른계획", "quick plan"]
---

# /aing:plan-only — 에이전트 없는 경량 플래닝

에이전트 호출 0회. 오케스트레이터(당신)가 직접 플랜을 작성하고 persist한다.
plan-task의 AING-DR 합의 파이프라인이 과잉일 때 사용.

## plan-task와의 차이

| | plan-task | plan-only |
|---|----------|-----------|
| 에이전트 | Ryan→Able→Klay→Noa→Critic (5+) | **0개** |
| 소요 시간 | 5~20분 | **1~3분** |
| 합의 루프 | ITERATE 시 재설계 | **없음** |
| 적합한 경우 | 아키텍처 결정, 고위험 변경 | 기능 추가, 버그픽스, 리팩토링 |
| 산출물 | Living ADR + FINAL_PLAN JSON | PLAN.md + task JSON |

## Usage

```
/aing:plan-only <task-description>
/aing:plan-only "사용자 프로필 API 추가"
/aing:plan-only "로그인 버그 수정"
```

## Step 1: 코드베이스 탐색 (직접 수행)

에이전트를 호출하지 않는다. 오케스트레이터가 직접:

1. Glob/Grep으로 관련 파일 탐색 (최대 10회)
2. 핵심 파일 Read (최대 5개)
3. 기존 패턴/컨벤션 파악

## Step 2: 플랜 작성 (직접 수행)

탐색 결과를 바탕으로 다음 포맷의 플랜을 **직접** 작성한다:

```markdown
# Plan: {feature}

## Goal
{1~2문장}

## Existing Patterns
- {file:line} — {패턴 설명, 재사용 여부}

## Steps
1. {step} — files: {paths}, agent: {name}
2. {step} — files: {paths}, agent: {name}

## Acceptance Criteria
- [ ] {testable criterion}
- [ ] {testable criterion}

## Risks
- {risk}: {mitigation}
```

**규칙:**
- 모든 Step에 파일 경로 명시
- 모든 Step에 담당 에이전트 명시 (Jay, Derek, Iron 등)
- Acceptance Criteria는 두 개발자가 동일하게 판정 가능해야 함
- 3개 이하의 Step이면 리스크 섹션 생략 가능

## Step 3: Persist

```bash
printf '%s' '{PLAN_JSON}' | node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" plan --stdin --dir "$(pwd)"
```

PLAN_JSON 포맷:
```json
{
  "feature": "...",
  "goal": "...",
  "steps": ["..."],
  "acceptanceCriteria": ["..."],
  "risks": ["..."],
  "complexityScore": 0,
  "complexityLevel": "low"
}
```

`--dir "$(pwd)"` 필수. `printf '%s'` 사용.
Creates: `.aing/plans/{date}-{feature}.md` + `.aing/tasks/task-{id}.json`

## Step 4: 요약 표시 + 다음 액션

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing plan-only: {feature}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Plan: .aing/plans/{date}-{feature}.md
  Steps: {N}개
  Agent 호출: 0회
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

AskUserQuestion:
1. **/aing:auto** — 바로 실행
2. **/aing:team** — 팀 실행 (verify→fix 루프)
3. **/aing:task** — Steps를 체크리스트로 변환 (수동 추적용)
4. **저장만** — 나중에 실행

### Option 3 선택 시: Task 체크리스트 생성

플랜의 Steps를 `/aing:task create`로 변환한다:

```bash
# 플랜의 Steps를 쉼표 구분 서브태스크로 변환
/aing:task create "{feature}" --subtasks "{step1}, {step2}, {step3}"
```

생성 후 체크리스트를 표시하고 종료. 사용자가 나중에 `/aing:task check`로 진행 추적.
