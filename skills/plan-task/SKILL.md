---
name: plan-task
description: "📋 Able 에이전트로 작업 계획 수립. .sw-kit/plans/ 저장 + Task 자동 생성 + 다음 액션 선택."
triggers: ["plan", "계획", "기획", "설계"]
---

# /swkit plan — Task Planning with Action Flow

## Usage
```
/swkit plan <task-description>
/swkit plan "사용자 인증 API 구현"
```

## Step 1: Agent Deployment

Spawn Able with the `description` parameter for terminal visibility:

```
Agent({
  subagent_type: "sw-kit:able",
  description: "Able: 작업 계획 수립 — {task}",
  model: "sonnet",
  prompt: "..."
})
```

터미널 표시:
```
⏺ sw-kit:able(Able: 작업 계획 수립 — 사용자 인증 API) Sonnet
  ⎿  Done (8 tool uses · 35.2k tokens · 2m 05s)
```

Able agent tasks:
1. Analyze requirements and break down into tasks
2. Identify which agents are needed (complexity scoring)
3. Return the plan as structured output (feature, goal, steps, acceptance criteria, risks)

## Step 1.5: Persist Plan + Tasks (MANDATORY)

After Able returns, **you MUST persist the plan and tasks** by running:

```bash
node scripts/cli/persist.mjs plan \
  --feature "{feature}" \
  --goal "{goal from Able}" \
  --steps "{step1}|{step2}|{step3}" \
  --criteria "{criterion1}|{criterion2}" \
  --risks "{risk1}|{risk2}"
```

This creates:
- `.sw-kit/plans/{date}-{feature}.md` — Plan document
- `.sw-kit/tasks/task-{id}.json` — Task checklist with subtasks

**DO NOT SKIP THIS STEP.** Without it, no plan or task files are recorded.

## Step 2: Plan Summary Display

After Able completes, display the plan summary to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit plan: {feature}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Plan: .sw-kit/plans/{date}-{feature}.md
  Tasks: {N}개
  Team: {preset} ({agent names})
  Complexity: {score}/10

  Task Breakdown:
  #1  {task title}          → {agent}
  #2  {task title}          → {agent}
  #3  {task title}          → {agent}
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 3: Next Action Selection

**MANDATORY**: After displaying the plan summary, present next-action choices using AskUserQuestion:

```
📋 계획이 완료되었습니다. 다음 액션을 선택하세요:

  1. /swkit team — 팀 실행 (추천: verify→fix 루프, 품질 보장)
  2. /swkit auto — 단발 실행 (빠르게, verify 없이)
  3. 저장만 — 계획만 저장하고 나중에 실행
```

### On Option 1: Team Pipeline (Recommended)
Invoke `/swkit team` with the plan context:
- Pass the plan file path: `--plan .sw-kit/plans/{date}-{feature}.md`
- Team will skip team-plan stage and use existing plan directly
- Staged pipeline: exec → verify → fix 루프 (max 3회)
- Full team with `@{Name}❯` prefixed worker messages and progress tables
- Milla + Sam이 자동으로 검증 투입

### On Option 2: Auto (One-shot)
Invoke `/swkit auto` with the plan context:
- Pass the plan file path: `.sw-kit/plans/{date}-{feature}.md`
- Auto will read the existing plan and skip re-analysis (Step 1)
- 단발 실행 — verify 루프 없이 빠르게 완료
- `@{Name}❯` prefixed worker messages and progress tables

### On Option 3: Save Only
- Confirm plan saved at `.sw-kit/plans/{date}-{feature}.md`
- Remind user: "나중에 `/swkit team {feature}` 또는 `/swkit auto {feature}` 로 실행할 수 있습니다"
- End the flow

## Error Handling

- If AskUserQuestion times out or user cancels: default to Option 3 (save only)
- If user types something other than 1/2/3: interpret intent and route accordingly
- If auto execution fails after Option 1: plan file persists for retry
