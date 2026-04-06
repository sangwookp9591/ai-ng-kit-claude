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

  Features Delivered:
  - [{기능명}]: {사용자가 체감하는 행동 변화 한줄 설명}
  - [{기능명}]: {사용자가 체감하는 행동 변화 한줄 설명}

  How to Verify:
  - {검증 방법}: `{실행 커맨드}` 또는 {URL/경로} → 기대 결과: {무엇이 보여야 하는지}
  - {검증 방법}: `{실행 커맨드}` 또는 {URL/경로} → 기대 결과: {무엇이 보여야 하는지}

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
1. **Completion report를 stdout에 먼저 출력** (persist 실패해도 사용자가 결과를 볼 수 있도록)
2. SendMessage shutdown_request to each worker
3. **Shutdown timeout 10초** — 무응답 워커는 강제 진행
4. TeamDelete({ team_name: "<feature-slug>" })
5. **Persist report + learning** (best-effort — 실패해도 completion 차단하지 않음):
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" report --dir "$(pwd)" --feature "{feature}" --lessons "{lesson1}|{lesson2}"
```
6. This generates `.aing/reports/{date}-{feature}.md`

### Confidence Level

completion report에 Confidence를 표시합니다:
- **HIGH**: 모든 verify PASS + architect APPROVED + fix loop 0-1회
- **MED**: verify PASS + architect APPROVED + fix loop 2회 이상
- **LOW**: architect max attempts 소진 / token budget cancel / circuit breaker 발동 / INCOMPLETE task 존재

LOW인 경우 미해결 findings 목록을 report에 포함하고, User Confirm 스텝에서 해당 findings를 AskUserQuestion에 함께 표시하여 사용자가 명시적으로 승인/거부할 수 있도록 합니다.

## User Confirm (MANDATORY)

After Shutdown + Persist is complete, the orchestrator MUST request user confirmation.
**순서: 리포트 출력 → persist → AskUserQuestion (이 순서 변경 금지)**

AskUserQuestion format:
```
구현이 완료되었습니다. 아래 내용을 확인해주세요.

📦 구현된 기능:
{Features Delivered 목록 재표시}

🔍 확인 방법:
{How to Verify 목록 재표시}

{Confidence가 LOW인 경우 추가:}
⚠️ 미해결 항목:
{미해결 findings 목록 — architect max attempts 소진 / token budget cancel / circuit breaker 발동 항목}

선택해주세요:
1. ✅ 확인 완료 — 모든 기능이 정상 동작합니다
2. ❌ 수정 필요 — 아래 항목을 수정해주세요: {사용자 입력}
3. 🔄 재검토 요청 — 전체 재검증이 필요합니다
```

Response handling:
- 1 (확인 완료) → 작업 종료
- 2 (수정 필요) → 사용자 피드백 기반 재작업 후 다시 리포트
- 3 (재검토) → team-verify 재실행
