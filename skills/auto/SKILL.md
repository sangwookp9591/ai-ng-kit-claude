---
name: auto
description: "Full pipeline auto-run. Named agents spawn as CC native team with colors."
triggers: ["auto", "pipeline", "full team"]
---

# /aing auto -- Full Pipeline with Native Team Colors

When the user runs `/aing auto <feature> <task>`, execute this EXACT sequence using Claude Code native team tools. Each agent gets a unique color automatically.

If a plan file path is provided (e.g., from `/aing plan` → auto transition), read the plan file and skip to Step 2. Use the plan's task decomposition directly for Step 3 instead of re-analyzing.

## Step 0: Context Reuse Detection

1. **Existing plan**: Check `.aing/plans/` for a plan matching the feature
   - If found: skip Phase 1, load plan directly. Display: `📋 기존 계획 발견: {plan path} — 계획 단계 생략`
2. **Existing session**: Check `.aing/state/auto-session.json`
   - If active session found: offer resume (same as team resume)
3. **No artifacts**: proceed with full 5-phase pipeline

## 5-Phase Pipeline

| Phase | What | Agents | Skip Condition |
|-------|------|--------|---------------|
| 1. Planning | Structured plan + complexity scoring | Able, Klay (if mid+) | Existing plan |
| 2. Execution | Parallel worker spawn | Based on preset | — |
| 3. QA Cycling | Test → fix loop (max 5) | Jay (auto-fix) | Tests pass |
| 4. Validation | Security + quality review | Milla, Klay (mid+), Jay (high) | — |
| 5. Completion | Report + persist | — | — |

### Phase Transition Rules

| From | To | Condition |
|------|-----|-----------|
| Phase 1 | Phase 2 | Plan created (or skipped) |
| Phase 2 | Phase 3 | All execution tasks done |
| Phase 3 | Phase 4 | QA passes OR max cycles reached |
| Phase 4 | Phase 2 | Critical finding → fix and re-execute (max 2 loops) |
| Phase 4 | Phase 5 | No Critical findings |
| Phase 5 | END | Report generated |

Track validation loops via session state: `validationLoopCount >= 2` → proceed to Phase 5 with warning.

---

## Step 1: Analyze and Select Team

Read the task description and estimate complexity:
- Count file references, domains (backend/frontend/db/design/security)
- Select team preset: Solo(1) / Duo(2) / Squad(4) / Full(7)

**Design Domain Detection**: 태스크에 아래 키워드가 포함되면 Design Preset을 사용:
- 한국어: "디자인", "UI", "화면", "페이지 디자인", "랜딩", "대시보드 디자인"
- English: "design", "landing page", "dashboard design", "stitch", "mockup"

→ Preset 상세 (Solo/Duo/Squad/Full/Design): `references/presets.md` 참조

## Step 1.5: Persist Plan + Tasks (MANDATORY)

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" plan \
  --dir "$(pwd)" \
  --feature "{feature}" \
  --goal "{task description}" \
  --steps "{agent1}: {role}|{agent2}: {role}|..."
```

Creates `.aing/plans/{date}-{feature}.md` and `.aing/tasks/task-{id}.json`. **DO NOT SKIP.**

## Step 2: Create Team

```
TeamCreate({ team_name: "<feature-slug>", description: "aing auto: <task>" })
```

## Step 3: Create Tasks and Assign

For each team member:
```
TaskCreate({ subject: "[Jay] Backend API", description: "<task details>" })
TaskUpdate({ taskId: "1", owner: "jay" })
```

## Step 4: Announce Agent Deployment

**MANDATORY**: Before spawning, display the agent deployment table:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing: 에이전트 투입
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Agent        Role              Model    Task
  ─────        ────              ─────    ────
  Jay          Backend / API     sonnet   엔드포인트 구현 (TDD)
  Derek        Frontend / Build  sonnet   UI 컴포넌트 구현

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Never skip this step. The user must see who is doing what before agents start working.

## Step 5: Spawn Workers (PARALLEL)

**MANDATORY: `description` 파라미터로 에이전트 가시성 확보.**

`description` 포맷: `"{Name}: {구체적 작업 요약}"` (3-5 단어)

```
Agent({
  subagent_type: "aing:{name}",
  description: "{Name}: {작업 요약}",
  team_name: "<feature-slug>",
  name: "{name}",
  model: "{model}",
  prompt: "... (references/worker-and-report.md Worker Prompt Template 참조)"
})
```

Each spawned agent prompt MUST include:
1. Entrance banner (from agents/*.md)
2. Specific task
3. TDD enforcement rules
4. Evidence collection requirement
5. SendMessage to "team-lead" on completion

→ Worker Prompt Template: `references/worker-and-report.md` 참조

## Step 6: Monitor with Live Progress

**On state transitions** (start, complete, fail, block):
```
┌──────────┬───────────────────────────┬───────────────────────┐
│   워커   │          태스크           │         상태          │
├──────────┼───────────────────────────┼───────────────────────┤
│ Jay      │ #1 Backend API            │ 🔄 실행 중            │
│ Derek    │ #2 Frontend UI            │ ✅ 완료               │
└──────────┴───────────────────────────┴───────────────────────┘
```

Status icons: 🔄 실행 중, ✅ 완료, ❌ 실패, ⏳ 대기 중. Between transitions, forward `@{Name}❯` messages as single lines.

## Token Tracking (MANDATORY per Agent)

Agent(subagent) 스폰 결과를 받으면, 결과의 `<usage>` 블록에서 수치를 추출하여 기록한다:
- total_tokens, tool_uses, duration_ms

기록 방법:
```bash
node -e "
const {logTokenUsage} = require('${CLAUDE_PLUGIN_ROOT}/dist/scripts/telemetry/token-tracker.js');
logTokenUsage({ts:new Date().toISOString(), agent:'{name}', stage:'{stage}', model:'{model}', totalTokens:{N}, toolUses:{N}, durationMs:{N}}, process.cwd());
"
```

Completion Report에 Token Summary 포함:
```
Token Usage:
  {stage}: ~{N}k tokens ({agent1} {N}k, {agent2} {N}k)
  total:   ~{N}k tokens
```

## Step 7-8: Completion + Shutdown

→ Report format + Shutdown + Persist: `references/worker-and-report.md` 참조

## Session State

```
writeSession({ feature, mode: "auto", currentStage: "phase-1" })   // start
completeStage("auto", "phase-N", { status, summary })               // transition
endSession("auto", "complete"|"failed")                              // end
```

Resume from any phase if session is interrupted.
