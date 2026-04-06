# Stage 2: team-exec (= PDCA Do)

## Step 2-1: Create Team
```
TeamCreate({
  team_name: "<feature-slug>",
  description: "aing team: <task>"
})
```

## Step 2-2: Announce Agent Deployment

**MANDATORY**: 에이전트 투입 전 반드시 표시:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing team: 에이전트 투입
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Agent        Role              Model    Task
  ─────        ────              ─────    ────
  Jay          Backend / API     sonnet   API 엔드포인트 구현
  Iron         Web Frontend      sonnet   UI 컴포넌트 구현
  (verify 대기: Milla + Sam)

  Parallel Groups:
  [Group 1] Jay#1, Derek#2 — parallel
  [Group 2] Jay#3 — sequential (file overlap: src/api/auth.ts)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Stage-Aware Agent Selection

| Stage | Default Agents | Specialist Routing |
|-------|---------------|-------------------|
| team-plan | Able (plan), Klay (review) | + Milla for high-complexity gap analysis |
| team-exec | Jay (backend), Iron (web frontend) | + Jerry (DB), Willji (design), Rowan (mobile) based on task keywords |
| team-verify | Milla (security), Sam (CTO) | + Klay (quality) for mid+, + Jun (performance) for high |
| team-fix | Jay (primary fixer) | + debugger routing if same error 3x |

Keyword-based specialist routing for team-exec:
- "database", "schema", "migration" → include Jerry
- "UI", "component", "page", "design" → include Derek + Willji
- "API", "endpoint", "backend" → include Jay
- "auth", "security" → include Milla as advisor

team-verify uses the same complexity-based review scaling as `/aing review`:
- low: Milla only
- mid: Milla + Klay
- high: Milla + Klay + Jay (performance)

## Step 2-3: Task-Level Execution with Gate Review

**하네스 엔지니어링 원칙**: 각 task 완료마다 자동 review gate를 통과해야 다음 task로 진행합니다. "리뷰할까요?"라고 묻지 않습니다. **무조건 실행**합니다.

**실행 패턴: Task → TDD → Gate (build+test) → Next Task**

```
Task #1 exec → TDD 확인 → Gate (build+test) → PASS → Task #2 exec → ...
                                              → FAIL → 즉시 fix → re-gate → Task #2 exec → ...
```

### 파일 겹침 기반 병렬/순차 실행

team-plan에서 생성한 `parallelGroups`를 사용합니다:

1. **parallelGroups 읽기**: stage-plan에서 전달된 파일 겹침 분석 결과
2. **parallel 그룹**: 동시 실행 → 병렬 스폰
3. **sequential 그룹**: 선행 그룹 완료 + gate 통과 후 실행

```
예시:
parallelGroups: [
  { group: 1, tasks: [1, 3], mode: "parallel" },
  { group: 2, tasks: [2], mode: "sequential_after_1", reason: "file overlap" }
]

실행 순서:
  Task#1 + Task#3 동시 스폰 → 둘 다 GATE_PASS → Task#2 스폰
```

**parallelGroups 없는 경우** (legacy plan 또는 --plan 외부 파일):
기존 방식 — plan의 steps에서 의존 관계 파악하여 병렬/순차 결정.

### Worker Spawn

**MANDATORY: `description` 파라미터로 에이전트 가시성을 확보합니다.**

`description` 포맷: `"{Name}: {구체적 작업 요약}"` (3-5 단어)

```
Agent({
  subagent_type: "aing:{name}",
  description: "{Name}: {구체적 작업 요약}",
  team_name: "<feature-slug>",
  name: "{name}",
  model: "{agent's default model}",
  prompt: "... (auto/SKILL.md Worker Prompt Template 참조) ..."
})
```

각 워커 프롬프트에 반드시 포함:
1. Entrance banner (agents/*.md에서)
2. 구체적 태스크
3. **VERSION CONTEXT** — `node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/context/version-detect.js" "$(pwd)"` 실행 후 결과를 프롬프트에 삽입
4. TDD 강제 규칙 (테스트 먼저 작성 → 실패 확인 → 구현 → 통과 확인)
5. 증거 수집 요구사항
6. `@{Name}❯` 프리픽스 커뮤니케이션 포맷
7. SendMessage to "team-lead" on completion
8. **할당된 파일 목록** — scope 초과 시 경고 기준

### 병렬 대기 시 능동 모니터링

병렬 워커를 spawn한 후 "기다리겠습니다"만 출력하고 멈추지 않는다:
- 하나가 완료될 때마다 즉시 결과를 처리하고 진행 상태를 다시 출력한다
- 남은 워커 목록 + 소요 시간을 표시한다
- 모든 워커가 완료되면 즉시 Gate Review로 진행한다

### Worker Timeout

각 워커에 **5분 timeout** 적용:
- 초과 시: 워커 결과를 수집 시도 → 부분 결과라도 사용
- 결과 없음: 해당 task를 INCOMPLETE 상태로 → 다음 task 진행 가능 여부 판단 (의존성 확인)
- INCOMPLETE task는 team-fix에서 재시도

## Step 2-4: Gate Review (Task 완료마다 자동 실행)

**MANDATORY — 묻지 않고 실행합니다.**

Gate review는 **build + test only** — 코드 품질/보안은 team-verify에서 수행합니다.

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: Task #{N} gate",
  model: "haiku",
  prompt: "[GATE REVIEW — BUILD + TEST ONLY]
Task #{N} '{task_title}' 완료 후 gate review입니다.

수행 (30초 이내):
1. 컴파일/타입 에러 확인 (build or tsc)
2. 관련 테스트 실행 및 통과 확인
3. test 파일 존재 여부 확인 (TDD 준수 검증)

수행하지 않음 (team-verify에서 처리):
- 코딩 스타일, 네이밍
- 보안 리뷰
- 코드 품질 평가

출력:
## Gate: Task #{N}
- Build: PASS/FAIL
- Tests: PASS/FAIL ({N}/{N})
- Test Files Exist: YES/NO
- Verdict: GATE_PASS / GATE_FAIL — {사유}

VERIFICATION COMMANDS (MANDATORY):
tsc, eslint 등은 성공 시 출력이 비어있습니다. 반드시 exit code로 판정하세요:
  Bash: npx tsc --noEmit 2>&1; echo "EXIT=$?"
  → EXIT=0 + 빈 출력 = PASS (에러 없음)
  → EXIT≠0 = FAIL
같은 명령을 2회 이상 재실행하지 마세요. EXIT=0이면 즉시 PASS 처리.

Rules:
- build + test 통과가 유일한 GATE_PASS 조건
- test 파일이 없으면 GATE_FAIL (TDD 미준수)
- 30초 timeout — 초과 시 GATE_FAIL (안전 기본값, verify에서 재확인)"
})
```

### Scope 초과 감지

Gate review에서 추가로 확인:
```
변경된 파일 (git diff --name-only) vs 할당된 파일 목록 비교
→ 할당 외 파일 변경 시: GATE_PASS + ⚠️ SCOPE_WARNING
→ 경고만 — 차단하지 않음. completion report에 기록.
```

### Gate 결과 처리

| Verdict | Action |
|---------|--------|
| GATE_PASS | 다음 task 진행 (또는 모든 task 완료 시 team-verify) |
| GATE_FAIL | 담당 에이전트 즉시 재스폰 → fix → re-gate (최대 2회) |

Gate fail fix:
```
Agent({
  subagent_type: "aing:{original_agent}",
  description: "{Name}: Gate fix — {failure reason}",
  model: "{original model}",
  prompt: "[GATE FIX]
Gate review에서 다음 이슈가 발견되었습니다:
{Milla's GATE_FAIL details}

즉시 수정하고 테스트를 다시 실행하세요.
수정 후 SendMessage로 완료를 알리세요."
})
```

## Step 2-5: Monitor with Live Progress

**상태 전환 시** (시작, 완료, gate 통과, gate 실패):
```
┌──────────┬───────────────────────────┬───────────────────────┐
│   워커   │          태스크           │         상태          │
├──────────┼───────────────────────────┼───────────────────────┤
│ Jay      │ #1 Backend API            │ ✅ done → 🔍 gate ✓   │
├──────────┼───────────────────────────┼───────────────────────┤
│ Derek    │ #2 Frontend UI            │ 🔄 실행 중            │
├──────────┼───────────────────────────┼───────────────────────┤
│ Jay      │ #3 Integration            │ ⏳ group 2 대기       │
└──────────┴───────────────────────────┴───────────────────────┘
```

## 전환 조건 → team-verify
- 모든 exec task가 `completed` + `GATE_PASS`
- gate fail이 2회 이상 반복되면 team-verify로 escalate (전체 검증)
- INCOMPLETE task가 있으면 team-verify에 미완료 목록 전달
