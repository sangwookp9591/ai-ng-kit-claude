# Worker Prompt Template & Completion Report

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

## Completion Report Format

After all tasks complete, ALWAYS display:

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

  Token Usage:
    plan:   ~{N}k tokens ({agent1} {N}k, {agent2} {N}k)
    exec:   ~{N}k tokens ({agent1} {N}k, {agent2} {N}k)
    total:  ~{N}k tokens

  Learning: saved to .aing/project-memory.json
  Report: .aing/reports/{date}-{feature}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This report is MANDATORY. Never skip it. Include every agent that participated.

## Shutdown + Persist (MANDATORY)

After displaying the completion report:
1. SendMessage shutdown_request to each worker
2. Wait for shutdown_response
3. TeamDelete({ team_name: "<feature-slug>" })
4. **Persist completion report and learning**:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" report --dir "$(pwd)" --feature "{feature}" --lessons "{lesson1}|{lesson2}"
```
5. This generates `.aing/reports/{date}-{feature}.md`
