---
name: auto
description: "Full pipeline auto-run. Named agents spawn as CC native team with colors."
triggers: ["auto", "pipeline", "full team"]
---

# /aing auto -- Full Pipeline with Native Team Colors

When the user runs `/aing auto <feature> <task>`, execute this EXACT sequence using Claude Code native team tools. Each agent gets a unique color automatically.

If a plan file path is provided (e.g., from `/aing plan` → auto transition), read the plan file and skip to Step 2. Use the plan's task decomposition directly for Step 3 instead of re-analyzing.

## Step 0: Context Reuse Detection

Before starting the pipeline, check for existing artifacts:

1. **Existing plan**: Check `.aing/plans/` for a plan matching the feature
   - If found: skip Phase 1 (Planning), load plan directly
   - Display: `📋 기존 계획 발견: {plan path} — 계획 단계 생략`

2. **Existing session**: Check `.aing/state/auto-session.json`
   - If active session found: offer resume (same as team resume)
   - Display resume prompt with completed phases

3. **No artifacts**: proceed with full 5-phase pipeline

## 5-Phase Pipeline

### Phase 1: Planning (skippable)
- Spawn Able for structured PLAN_DRAFT
- Apply complexity scoring
- If complexity >= mid: spawn Klay for architecture review
- Output: plan file + task checklist
- **Skip if**: existing plan found in Step 0

### Phase 2: Execution
- Create CC team based on complexity preset
- Spawn workers in parallel with `@{Name}❯` prefix
- Each worker reads the plan and executes assigned tasks
- Monitor with progress table
- Write handoff on completion

### Phase 3: QA Cycling (NEW)
- Run `/aing qa` with detected test command
- If tests pass: proceed to Phase 4
- If tests fail: Jay auto-fix cycle (max 5 rounds)
- Same error 3x → skip to Phase 4 with warning
- Output: QA report with cycle history

### Phase 4: Validation (NEW)
- Spawn parallel reviewers based on complexity:
  - **Always**: Milla (security review)
  - **Mid+**: Klay (quality review)
  - **High**: Jay (performance review)
- Each reviewer produces structured findings
- Critical security finding → BLOCKED (return to Phase 2)
- No Critical findings → proceed to Phase 5

### Phase 5: Completion
- Aggregate all phase results
- Generate completion report
- Persist learning to `.aing/reports/`
- End session
- Display final report

## Phase Transition Rules

| From | To | Condition |
|------|-----|-----------|
| Phase 1 | Phase 2 | Plan created (or skipped) |
| Phase 2 | Phase 3 | All execution tasks done |
| Phase 3 | Phase 4 | QA passes OR max cycles reached |
| Phase 4 | Phase 2 | Critical finding → fix and re-execute |
| Phase 4 | Phase 5 | No Critical findings |
| Phase 5 | END | Report generated |

Maximum Phase 4 → Phase 2 loops: 2 (prevent infinite validation cycles)

Track via session state:
```
// At Phase 4 → Phase 2 transition:
updateSession("auto", { validationLoopCount: (session.validationLoopCount || 0) + 1 })

// Before Phase 4 → Phase 2:
if (session.validationLoopCount >= 2) → proceed to Phase 5 with warning
```

---

## Step 1: Analyze and Select Team

Read the task description and estimate complexity:
- Count file references, domains (backend/frontend/db/design/security)
- Select team preset: Solo(1) / Duo(2) / Squad(4) / Full(7)

**Design Domain Detection**: 태스크에 아래 키워드가 포함되면 Design Preset을 사용:
- 한국어: "디자인", "UI", "화면", "페이지 디자인", "랜딩", "대시보드 디자인"
- English: "design", "landing page", "dashboard design", "stitch", "mockup"
- Design Preset이 선택되면 아래 "Design Presets" 섹션 참조

## Step 1.5: Persist Plan + Tasks (MANDATORY)

Before creating the CC team, **persist the plan to disk**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli/persist.mjs" plan \
  --feature "{feature}" \
  --goal "{task description}" \
  --steps "{agent1}: {role}|{agent2}: {role}|..."
```

This creates `.aing/plans/{date}-{feature}.md` and `.aing/tasks/task-{id}.json`.

**DO NOT SKIP.** Without this, no plan/task files are recorded in `.aing/`.

## Step 2: Create Team

```
TeamCreate({
  team_name: "<feature-slug>",
  description: "aing auto: <task>"
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
  aing: 에이전트 투입
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
  subagent_type: "aing:klay",
  description: "Klay: 아키텍처 탐색 + 구조 분석",
  team_name: "<feature-slug>",
  name: "klay",
  model: "opus",
  prompt: "... Klay's entrance + task + TDD rules ..."
})

Agent({
  subagent_type: "aing:jay",
  description: "Jay: Backend API 엔드포인트 구현",
  team_name: "<feature-slug>",
  name: "jay",
  model: "sonnet",
  prompt: "... Jay's entrance + task + TDD rules ..."
})
```

이렇게 하면 터미널에 자동으로 표시됩니다:
```
⏺ aing:klay(Klay: 아키텍처 탐색 + 구조 분석) Opus
  ⎿  Done (9 tool uses · 83.6k tokens · 2m 10s)

⏺ aing:jay(Jay: Backend API 엔드포인트 구현) Sonnet
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
  aing auto complete: {feature}
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
  Learning: saved to .aing/project-memory.json
  Report: .aing/reports/{date}-{feature}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This report is MANDATORY. Never skip it. Include every agent that participated.

## Step 8: Shutdown + Persist (MANDATORY)

After displaying the completion report:
1. SendMessage shutdown_request to each worker
2. Wait for shutdown_response
3. TeamDelete({ team_name: "<feature-slug>" })
4. **Persist completion report and learning**:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli/persist.mjs" report --feature "{feature}" --lessons "{lesson1}|{lesson2}"
```
5. This generates `.aing/reports/{date}-{feature}.md`

## Team Presets

### Solo (complexity <= 2)
```
Agent(name: "jay", subagent_type: "aing:jay", description: "Jay: {task}", model: "sonnet")
```

### Duo (complexity 3-4)
```
Agent(name: "jay", subagent_type: "aing:jay", description: "Jay: {task}", model: "sonnet")
Agent(name: "milla", subagent_type: "aing:milla", description: "Milla: 보안 리뷰", model: "sonnet")
```

### Squad (complexity 5-6)
```
Agent(name: "able", subagent_type: "aing:able", description: "Able: 요구사항 + 태스크 분해", model: "sonnet")
Agent(name: "jay", subagent_type: "aing:jay", description: "Jay: {task}", model: "sonnet")
Agent(name: "derek", subagent_type: "aing:derek", description: "Derek: {task}", model: "sonnet")
Agent(name: "sam", subagent_type: "aing:sam", description: "Sam: 증거 수집 + 최종 판정", model: "haiku")
```

### Full (complexity >= 7)
```
Agent(name: "able", subagent_type: "aing:able", description: "Able: 요구사항 + 태스크 분해", model: "sonnet")
Agent(name: "klay", subagent_type: "aing:klay", description: "Klay: 아키텍처 탐색 + 구조 분석", model: "opus")
Agent(name: "jay", subagent_type: "aing:jay", description: "Jay: {task}", model: "sonnet")
Agent(name: "jerry", subagent_type: "aing:jerry", description: "Jerry: DB 스키마 + 마이그레이션", model: "sonnet")
Agent(name: "milla", subagent_type: "aing:milla", description: "Milla: 보안 리뷰 + 코드 품질", model: "sonnet")
Agent(name: "derek", subagent_type: "aing:derek", description: "Derek: {task}", model: "sonnet")
Agent(name: "sam", subagent_type: "aing:sam", description: "Sam: 증거 수집 + 최종 판정", model: "haiku")
```

## Design Presets

디자인 도메인이 감지되면 아래 preset을 사용합니다.

### Design Solo (디자인 생성만)
```
Agent(name: "willji", subagent_type: "aing:willji", description: "Willji: UI 디자인 생성", model: "sonnet")
```

### Design Duo (디자인 → 코드)
```
Agent(name: "willji", subagent_type: "aing:willji", description: "Willji: UI 디자인 생성", model: "sonnet")
Agent(name: "derek", subagent_type: "aing:derek", description: "Derek: 디자인 → React 변환", model: "sonnet")
```

### Design Squad (디자인 → 코드 → 모션 → 검증)
```
Agent(name: "willji", subagent_type: "aing:willji", description: "Willji: UI 디자인 생성", model: "sonnet")
Agent(name: "derek", subagent_type: "aing:derek", description: "Derek: 디자인 → React 변환", model: "sonnet")
Agent(name: "rowan", subagent_type: "aing:rowan", description: "Rowan: 인터랙션 + 모션", model: "sonnet")
Agent(name: "sam", subagent_type: "aing:sam", description: "Sam: 증거 수집 + 최종 판정", model: "haiku")
```

Design Preset 선택 기준:
| Preset | 조건 |
|--------|------|
| Design Solo | 디자인 생성/편집만 요청 |
| Design Duo | 디자인 + 코드 변환 요청 |
| Design Squad | 디자인 + 코드 + 모션/영상 또는 복잡한 멀티페이지 |

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

## Session State

Auto pipeline uses session-state for resume capability:

```
// At pipeline start
writeSession({ feature, mode: "auto", currentStage: "phase-1" })

// At each phase transition
completeStage("auto", "phase-N", { status, summary })
writeHandoff({ feature, stage: "auto-phase-N", ... })

// At pipeline end
endSession("auto", "complete"|"failed")
```

Resume from any phase if session is interrupted.
