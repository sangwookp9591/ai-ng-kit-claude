# Stage 5: completion (= PDCA Review)

## Completion Report

`auto/SKILL.md`의 리포트 포맷을 확장하여 verify/fix 루프 데이터를 포함합니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing team complete: {feature}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Team: {agents} ({N}명 exec + 2 verify)

  Agent        Role              Status   Summary
  ─────        ────              ──────   ───────
  Jay          Backend / API     done     3 endpoints, TDD 12/12 pass
  Derek        Frontend / Build  done     2 pages, 4 components
  Milla        Security          PASS     0 critical, 1 minor (fixed)
  Sam          CTO / Verify      PASS     Evidence chain: all green

  Pipeline:
  [plan]    DONE    Able — 4 tasks created
  [exec]    DONE    Jay, Derek — parallel execution
  [verify]  PASS    Milla + Sam (attempt 2/3)
  [fix]     1 round Jay fixed lint error

  Evidence Chain:
  [test]  PASS (24/24)
  [build] PASS
  [lint]  PASS (0 errors)
  Verdict: PASS

  Files changed: 12
  Duration: ~12 min
  Fix loops: 1

  Token Usage:
    plan:   ~{N}k tokens ({agent1} {N}k, {agent2} {N}k)
    exec:   ~{N}k tokens ({agent1} {N}k, {agent2} {N}k)
    total:  ~{N}k tokens

  Report: .aing/reports/{date}-{feature}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Shutdown + Persist (MANDATORY)
1. SendMessage shutdown_request to each worker
2. Wait for shutdown_response
3. TeamDelete({ team_name: "<feature-slug>" })
4. **Persist report + learning**:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" report --dir "$(pwd)" --feature "{feature}" --lessons "{lesson1}|{lesson2}"
```
5. This generates `.aing/reports/{date}-{feature}.md`
