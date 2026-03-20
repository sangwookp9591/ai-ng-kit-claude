---
name: auto
description: "Full pipeline auto-run. Named agents spawn as CC native team with colors."
triggers: ["auto", "pipeline", "full team"]
---

# /swkit auto -- Full Pipeline with Native Team Colors

When the user runs `/swkit auto <feature> <task>`, execute this EXACT sequence using Claude Code native team tools. Each agent gets a unique color automatically.

If a plan file path is provided (e.g., from `/swkit plan` → auto transition), read the plan file and skip to Step 2. Use the plan's task decomposition directly for Step 3 instead of re-analyzing.

## Step 1: Analyze and Select Team

Read the task description and estimate complexity:
- Count file references, domains (backend/frontend/db/design/security)
- Select team preset: Solo(1) / Duo(2) / Squad(4) / Full(7)

## Step 2: Create Team

```
TeamCreate({
  team_name: "<feature-slug>",
  description: "sw-kit auto: <task>"
})
```

## Step 3: Create Tasks and Assign

For each team member, create a task and pre-assign:

```
TaskCreate({ subject: "[Jay] Backend API", description: "<task details>" })
TaskUpdate({ taskId: "1", owner: "jay" })
```

## Step 4: Announce Agent Deployment

**MANDATORY**: Before spawning, display the agent deployment table to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit: 에이전트 투입
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Agent        Role              Model    Task
  ─────        ────              ─────    ────
  Klay         Architect         opus     아키텍처 탐색 + 구조 분석
  Jay          Backend / API     sonnet   엔드포인트 구현 (TDD)
  Milla        Security          sonnet   보안 리뷰 + 코드 품질
  Sam          CTO / Verify      haiku    증거 수집 + 최종 판정

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This table must show EVERY agent being spawned, their role, model, and specific task.
Never skip this step. The user must see who is doing what before agents start working.

## Step 5: Spawn Workers (PARALLEL)

Spawn ALL workers in parallel using Agent with team_name. **MANDATORY: `description` 파라미터로 에이전트 가시성을 확보합니다.**

`description` 포맷: `"{Name}: {구체적 작업 요약}"` (3-5 단어)

```
Agent({
  subagent_type: "sw-kit:klay",
  description: "Klay: 아키텍처 탐색 + 구조 분석",
  team_name: "<feature-slug>",
  name: "klay",
  model: "opus",
  prompt: "... Klay's entrance + task + TDD rules ..."
})

Agent({
  subagent_type: "sw-kit:jay",
  description: "Jay: Backend API 엔드포인트 구현",
  team_name: "<feature-slug>",
  name: "jay",
  model: "sonnet",
  prompt: "... Jay's entrance + task + TDD rules ..."
})
```

이렇게 하면 터미널에 자동으로 표시됩니다:
```
⏺ sw-kit:klay(Klay: 아키텍처 탐색 + 구조 분석) Opus
  ⎿  Done (9 tool uses · 83.6k tokens · 2m 10s)

⏺ sw-kit:jay(Jay: Backend API 엔드포인트 구현) Sonnet
  ⎿  Done (15 tool uses · 42.1k tokens · 3m 22s)
```

Each spawned agent MUST include in their prompt:
1. Their entrance banner (from agents/*.md)
2. The specific task to complete
3. TDD enforcement rules
4. Evidence collection requirement
5. SendMessage to "team-lead" on completion

## Step 6: Monitor with Live Progress

Messages from teammates arrive automatically via SendMessage. The team-lead manages visibility:

**On every worker message:**
1. If the message lacks `@{Name}❯` prefix, prepend it using the sender's team identity
2. Forward the message to the user as: `@{Name}❯ {message content}`

**On state transitions** (worker starts task, completes task, fails, or gets blocked):
Display the progress table showing all workers' current status:

```
┌──────────┬───────────────────────────┬───────────────────────┐
│   워커   │          태스크           │         상태          │
├──────────┼───────────────────────────┼───────────────────────┤
│ Jay      │ #1 Backend API            │ 🔄 실행 중            │
├──────────┼───────────────────────────┼───────────────────────┤
│ Derek    │ #2 Frontend UI            │ ✅ 완료 → 셧다운 요청 │
├──────────┼───────────────────────────┼───────────────────────┤
│ Milla    │ #3 Security Review        │ ⏳ 대기 중            │
└──────────┴───────────────────────────┴───────────────────────┘
```

Status icons: 🔄 실행 중, ✅ 완료, ❌ 실패, ⏳ 대기 중

**Between state transitions:** Do NOT print the full table. Just forward the `@{Name}❯` message as a single line.

- Use TaskList to check progress periodically
- If a worker fails, reassign or retry

## Step 7: Completion Report

After all tasks complete, ALWAYS display the team activity report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit auto complete: {feature}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Team: {preset} ({N}명)

  Agent        Role              Status   Summary
  ─────        ────              ──────   ───────
  Klay         Architect         done     Scanned 42 files, 3 modules
  Able         PM / Planning     done     Created plan with 5 tasks
  Jay          Backend / API     done     3 endpoints, TDD 12/12 pass
  Derek        Frontend          done     2 pages, 4 components
  Milla        Security          done     0 critical, 2 minor
  Sam          CTO / Verify      PASS     Evidence chain: all green

  Evidence Chain:
  [test]  PASS (24/24)
  [build] PASS
  [lint]  PASS (0 errors)
  Verdict: PASS

  Files changed: 12
  Duration: ~8 min
  Learning: saved to .sw-kit/project-memory.json
  Report: .sw-kit/reports/{date}-{feature}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This report is MANDATORY. Never skip it. Include every agent that participated.

## Step 8: Shutdown

After displaying the completion report:
1. SendMessage shutdown_request to each worker
2. Wait for shutdown_response
3. TeamDelete({ team_name: "<feature-slug>" })
4. Save learning to project-memory
5. Generate .sw-kit/reports/{date}-{feature}.md

## Team Presets

### Solo (complexity <= 2)
```
Agent(name: "jay", subagent_type: "sw-kit:jay", description: "Jay: {task}", model: "sonnet")
```

### Duo (complexity 3-4)
```
Agent(name: "jay", subagent_type: "sw-kit:jay", description: "Jay: {task}", model: "sonnet")
Agent(name: "milla", subagent_type: "sw-kit:milla", description: "Milla: 보안 리뷰", model: "sonnet")
```

### Squad (complexity 5-6)
```
Agent(name: "able", subagent_type: "sw-kit:able", description: "Able: 요구사항 + 태스크 분해", model: "sonnet")
Agent(name: "jay", subagent_type: "sw-kit:jay", description: "Jay: {task}", model: "sonnet")
Agent(name: "derek", subagent_type: "sw-kit:derek", description: "Derek: {task}", model: "sonnet")
Agent(name: "sam", subagent_type: "sw-kit:sam", description: "Sam: 증거 수집 + 최종 판정", model: "haiku")
```

### Full (complexity >= 7)
```
Agent(name: "able", subagent_type: "sw-kit:able", description: "Able: 요구사항 + 태스크 분해", model: "sonnet")
Agent(name: "klay", subagent_type: "sw-kit:klay", description: "Klay: 아키텍처 탐색 + 구조 분석", model: "opus")
Agent(name: "jay", subagent_type: "sw-kit:jay", description: "Jay: {task}", model: "sonnet")
Agent(name: "jerry", subagent_type: "sw-kit:jerry", description: "Jerry: DB 스키마 + 마이그레이션", model: "sonnet")
Agent(name: "milla", subagent_type: "sw-kit:milla", description: "Milla: 보안 리뷰 + 코드 품질", model: "sonnet")
Agent(name: "derek", subagent_type: "sw-kit:derek", description: "Derek: {task}", model: "sonnet")
Agent(name: "sam", subagent_type: "sw-kit:sam", description: "Sam: 증거 수집 + 최종 판정", model: "haiku")
```

## Worker Prompt Template

Each worker gets this prompt structure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Name} {entrance message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are {Name} in team "{feature-slug}".
Role: {role description}

TASK: {specific task description}

COMMUNICATION FORMAT:
ALL SendMessage to "team-lead" MUST start with "@{Name}❯" prefix.
Examples:
  "@Jay❯ Task #1 시작: Backend API 엔드포인트 구현"
  "@Jay❯ TDD RED: 테스트 3개 작성 완료, 구현 시작"
  "@Jay❯ Task #1 완료: API 3개 구현, TDD 12/12 통과"
  "@Jay❯ BLOCKED: DB 스키마 변경 필요, Jerry 대기"

Report at these moments:
  - Task start: "@{Name}❯ Task #{id} 시작: {what}"
  - Milestone: "@{Name}❯ {progress update}"
  - Completion: "@{Name}❯ Task #{id} 완료: {summary}. Evidence: {results}"
  - Blocker: "@{Name}❯ BLOCKED: {reason}"

PROTOCOL:
1. TaskList -> find tasks with owner="{name}"
2. TaskUpdate status="in_progress"
3. SendMessage "@{Name}❯ Task #{id} 시작: {task summary}"
4. Work with TDD (Red->Green->Refactor)
5. Collect evidence (test/build results)
6. TaskUpdate status="completed"
7. SendMessage "@{Name}❯ Task #{id} 완료: {summary}. Evidence: {results}"

RULES:
- Do NOT spawn sub-agents
- Do NOT run team commands
- MUST follow TDD
- MUST report evidence
- MUST use "@{Name}❯" prefix on ALL messages
```

## Why Colors Work

Claude Code automatically assigns different colors to each team member when they're spawned via `Task(team_name, name)`. No manual color configuration needed. Each agent appears in terminal with their unique color alongside their name.
