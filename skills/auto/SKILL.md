---
name: auto
description: "Full pipeline auto-run. Named agents spawn as CC native team with colors."
triggers: ["auto", "pipeline", "full team"]
---

# /swkit auto -- Full Pipeline with Native Team Colors

When the user runs `/swkit auto <feature> <task>`, execute this EXACT sequence using Claude Code native team tools. Each agent gets a unique color automatically.

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

## Step 4: Spawn Workers (PARALLEL)

Spawn ALL workers in parallel using Task with team_name:

```
Task({
  subagent_type: "sw-kit:klay",
  team_name: "<feature-slug>",
  name: "klay",
  model: "opus",
  prompt: "... Klay's entrance + task + TDD rules ..."
})

Task({
  subagent_type: "sw-kit:jay",
  team_name: "<feature-slug>",
  name: "jay",
  model: "sonnet",
  prompt: "... Jay's entrance + task + TDD rules ..."
})
```

Each spawned agent MUST include in their prompt:
1. Their entrance banner (from agents/*.md)
2. The specific task to complete
3. TDD enforcement rules
4. Evidence collection requirement
5. SendMessage to "team-lead" on completion

## Step 5: Monitor

- Messages from teammates arrive automatically
- Use TaskList to check progress
- If a worker fails, reassign or retry

## Step 6: Shutdown

After all tasks complete:
1. SendMessage shutdown_request to each worker
2. Wait for shutdown_response
3. TeamDelete({ team_name: "<feature-slug>" })

## Team Presets

### Solo (complexity <= 2)
```
Task(name: "jay", subagent_type: "sw-kit:jay", model: "sonnet")
```

### Duo (complexity 3-4)
```
Task(name: "jay", subagent_type: "sw-kit:jay", model: "sonnet")
Task(name: "milla", subagent_type: "sw-kit:milla", model: "sonnet")
```

### Squad (complexity 5-6)
```
Task(name: "able", subagent_type: "sw-kit:able", model: "sonnet")
Task(name: "jay", subagent_type: "sw-kit:jay", model: "sonnet")
Task(name: "derek", subagent_type: "sw-kit:derek", model: "sonnet")
Task(name: "sam", subagent_type: "sw-kit:sam", model: "haiku")
```

### Full (complexity >= 7)
```
Task(name: "able", subagent_type: "sw-kit:able", model: "sonnet")
Task(name: "klay", subagent_type: "sw-kit:klay", model: "opus")
Task(name: "jay", subagent_type: "sw-kit:jay", model: "sonnet")
Task(name: "jerry", subagent_type: "sw-kit:jerry", model: "sonnet")
Task(name: "milla", subagent_type: "sw-kit:milla", model: "sonnet")
Task(name: "derek", subagent_type: "sw-kit:derek", model: "sonnet")
Task(name: "sam", subagent_type: "sw-kit:sam", model: "haiku")
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

PROTOCOL:
1. TaskList -> find tasks with owner="{name}"
2. TaskUpdate status="in_progress"
3. Work with TDD (Red->Green->Refactor)
4. Collect evidence (test/build results)
5. TaskUpdate status="completed"
6. SendMessage to "team-lead": "Completed: {summary}. Evidence: {results}"

RULES:
- Do NOT spawn sub-agents
- Do NOT run team commands
- MUST follow TDD
- MUST report evidence
```

## Why Colors Work

Claude Code automatically assigns different colors to each team member when they're spawned via `Task(team_name, name)`. No manual color configuration needed. Each agent appears in terminal with their unique color alongside their name.
