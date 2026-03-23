---
name: team
description: "사용자 지정 에이전트 팀 + staged pipeline (plan→exec→verify→fix 루프). PDCA 사이클 기반."
triggers: ["team", "팀", "팀 실행", "team run"]
---

# /swkit team — Staged Team Pipeline

사용자가 에이전트를 직접 지정하거나 자동 선택하여, verify→fix 루프가 있는 구조화된 팀 파이프라인을 실행합니다.

## Usage

```
/swkit team jay+derek+milla "사용자 인증 API 구현"
/swkit team "검색 기능 추가"              ← 에이전트 미지정 시 자동 선택
/swkit team --plan .sw-kit/plans/xxx.md   ← 기존 plan 파일로 team-plan 스킵
```

## Agent Selection

### Explicit Selection
`+` 로 에이전트를 지정합니다. verify 에이전트(Milla, Sam)는 항상 자동 포함됩니다.

```
/swkit team jay+derek "task"
→ Execution: Jay, Derek
→ Verify: Milla(sonnet) + Sam(haiku)  ← 항상 자동 포함
```

### Auto Selection
에이전트를 지정하지 않으면 complexity scoring으로 자동 선택합니다 (auto와 동일 기준).

| Complexity | Exec Agents | Verify Agents |
|-----------|-------------|---------------|
| Solo (≤2) | Jay | Milla + Sam |
| Duo (3-4) | Jay, Derek | Milla + Sam |
| Squad (5-6) | Able, Jay, Derek | Milla + Sam |
| Full (≥7) | Able, Klay, Jay, Jerry, Derek | Milla + Sam |

**NOTE**: Milla와 Sam은 exec 단계에 참여하지 않습니다. verify 단계에서만 투입됩니다.

## Staged Pipeline (PDCA 매핑)

```
team-plan   [Plan]   → Able(PM/sonnet) 계획 수립
team-exec   [Do]     → 사용자 지정 에이전트 병렬 실행
team-verify [Check]  → Milla(sonnet) + Sam(haiku) 검증
team-fix    [Act]    → 실패 태스크 담당자 재투입 (max 3회)
completion  [Review] → 보고서 + 학습 저장
```

---

## Stage 1: team-plan (= PDCA Plan)

**Skip 조건**: `--plan <path>` 제공 시 또는 `/swkit plan`에서 전환된 경우 이 단계를 건너뜁니다.

### 실행

Able 에이전트를 스폰합니다:

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
```

Able 에이전트가 수행:
1. 요구사항 분석 + 작업 분해
2. 에이전트별 태스크 할당
3. 구조화된 결과 반환 (feature, goal, steps, criteria, risks)

### Persist Plan + Tasks (MANDATORY)

Able 완료 후 **반드시 실행**:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli/persist.mjs" plan \
  --feature "{feature}" \
  --goal "{goal from Able}" \
  --steps "{step1}|{step2}|{step3}" \
  --criteria "{criterion1}|{criterion2}" \
  --risks "{risk1}|{risk2}"
```

### 출력 아티팩트
- Plan file: `.sw-kit/plans/{date}-{feature}.md` ← persist.mjs가 생성
- Task file: `.sw-kit/tasks/task-{id}.json` ← persist.mjs가 생성
- Tasks: TaskCreate로 CC 팀 태스크도 생성, owner 사전 할당

### 전환 조건 → team-exec
- Plan 파일 존재
- 모든 Tasks가 TaskCreate로 생성됨

---

## Stage 2: team-exec (= PDCA Do)

### Step 2-1: Create Team
```
TeamCreate({
  team_name: "<feature-slug>",
  description: "sw-kit team: <task>"
})
```

### Step 2-2: Announce Agent Deployment

**MANDATORY**: 에이전트 투입 전 반드시 표시:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit team: 에이전트 투입
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Agent        Role              Model    Task
  ─────        ────              ─────    ────
  Jay          Backend / API     sonnet   API 엔드포인트 구현
  Derek        Frontend / Build  sonnet   UI 컴포넌트 구현
  (verify 대기: Milla + Sam)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2-3: Spawn Exec Workers (PARALLEL)

Worker Prompt Template은 `auto/SKILL.md`의 포맷을 따릅니다.

**MANDATORY: `description` 파라미터로 에이전트 가시성을 확보합니다.**

`description` 포맷: `"{Name}: {구체적 작업 요약}"` (3-5 단어)

```
Agent({
  subagent_type: "sw-kit:{name}",
  description: "{Name}: {구체적 작업 요약}",
  team_name: "<feature-slug>",
  name: "{name}",
  model: "{agent's default model}",
  prompt: "... (auto/SKILL.md Worker Prompt Template 참조) ..."
})
```

터미널 표시 예시:
```
⏺ sw-kit:jay(Jay: Backend API 엔드포인트 구현) Sonnet
  ⎿  Done (15 tool uses · 42.1k tokens · 3m 22s)
```

각 워커 프롬프트에 반드시 포함:
1. Entrance banner (agents/*.md에서)
2. 구체적 태스크
3. TDD 강제 규칙
4. 증거 수집 요구사항
5. `@{Name}❯` 프리픽스 커뮤니케이션 포맷
6. SendMessage to "team-lead" on completion

### Step 2-4: Monitor with Live Progress

`auto/SKILL.md` Step 6과 동일한 모니터링:

**워커 메시지 수신 시:**
1. `@{Name}❯` 프리픽스 없으면 자동 추가
2. 사용자에게 포워딩

**상태 전환 시** (시작, 완료, 실패, 블로커):
```
┌──────────┬───────────────────────────┬───────────────────────┐
│   워커   │          태스크           │         상태          │
├──────────┼───────────────────────────┼───────────────────────┤
│ Jay      │ #1 Backend API            │ 🔄 실행 중            │
├──────────┼───────────────────────────┼───────────────────────┤
│ Derek    │ #2 Frontend UI            │ ✅ 완료               │
└──────────┴───────────────────────────┴───────────────────────┘
```

### 전환 조건 → team-verify
- 모든 exec 워커의 TaskUpdate status가 `completed` 또는 `failed`

---

## Stage 3: team-verify (= PDCA Check)

### 실행

**IMPORTANT**: Sam은 team-verify에서 `model: "haiku"`로 스폰합니다 (agents/sam.md의 기본 opus를 오버라이드). verify-fix 루프의 비용 효율을 위한 의도적 선택입니다.

Milla와 Sam을 순차 또는 병렬로 스폰:

```
Agent({
  subagent_type: "sw-kit:milla",
  description: "Milla: 보안 리뷰 + 코드 품질 점검",
  team_name: "<feature-slug>",
  name: "milla",
  model: "sonnet",
  prompt: "보안 리뷰 + 코드 품질 점검. 모든 변경사항 검토."
})

Agent({
  subagent_type: "sw-kit:sam",
  description: "Sam: 증거 체인 검증 + 최종 판정",
  team_name: "<feature-slug>",
  name: "sam",
  model: "haiku",    ← opus 오버라이드
  prompt: "증거 체인 검증: test/build/lint 결과 수집 + 판정."
})
```

터미널 표시:
```
⏺ sw-kit:milla(Milla: 보안 리뷰 + 코드 품질 점검) Sonnet
⏺ sw-kit:sam(Sam: 증거 체인 검증 + 최종 판정) Haiku
```

### 검증 기준 (evidence-verification/SKILL.md 준수)
- [test] 테스트 통과 여부
- [build] 빌드 성공 여부
- [lint] 린트 에러 없음
- 누락된 증거는 PASS가 아닌 NOT_AVAILABLE

### Verdict
- **PASS**: 모든 증거 체인 통과 → `completion` 단계로
- **FAIL**: 실패 항목 + 구체적 사유 → `team-fix` 단계로

### 전환 조건
- PASS → completion
- FAIL → team-fix (fix 루프 카운트 < 3인 경우)
- FAIL + fix 루프 카운트 ≥ 3 → 강제 completion (FAIL verdict 포함)

---

## Stage 4: team-fix (= PDCA Act)

**Max 3회 반복**. 초과 시 FAIL verdict로 completion 진행.

### 실행

실패한 태스크의 원래 담당 에이전트를 **새 Task로** 재스폰합니다 (기존 task reset이 아닌 새로 생성):

실패한 에이전트를 재스폰합니다:

```
Agent({
  subagent_type: "sw-kit:{name}",
  description: "{Name}: Fix #{attempt} — {실패 사유 요약}",
  model: "{original model}",
  prompt: "... (아래 Retry Template 참조) ..."
})
```

터미널 표시:
```
⏺ sw-kit:jay(Jay: Fix #1 — lint 에러 수정) Sonnet
```

### Fix Worker Prompt (Retry Template)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Name} 재투입 — 수정 작업
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are {Name} in team "{feature-slug}".
This is retry #{attempt} of 3.

ORIGINAL TASK: {원래 태스크 설명}

VERIFICATION FAILURE:
{Milla/Sam의 검증 실패 출력 — 구체적 사유}

YOUR MISSION:
위 검증 실패를 수정하세요. 수정 후 테스트를 실행하여 통과를 확인하세요.

COMMUNICATION FORMAT:
"@{Name}❯ Fix #{attempt}: {what you fixed}. Evidence: {test results}"

PROTOCOL:
1. 실패 원인 분석
2. 코드 수정
3. 테스트 실행 (TDD)
4. 증거 수집
5. SendMessage "@{Name}❯ Fix #{attempt} 완료: {summary}. Evidence: {results}"
```

### 전환 조건
- Fix 완료 → team-verify (재검증)
- Fix 실패 + attempt < 3 → team-fix (재시도)
- Fix 실패 + attempt ≥ 3 → completion (FAIL)

---

## Stage 5: completion (= PDCA Review)

### Completion Report

`auto/SKILL.md`의 리포트 포맷을 확장하여 verify/fix 루프 데이터를 포함합니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit team complete: {feature}
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
  Report: .sw-kit/reports/{date}-{feature}.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Shutdown + Persist (MANDATORY)
1. SendMessage shutdown_request to each worker
2. Wait for shutdown_response
3. TeamDelete({ team_name: "<feature-slug>" })
4. **Persist report + learning**:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli/persist.mjs" report --feature "{feature}" --lessons "{lesson1}|{lesson2}"
```
5. This generates `.sw-kit/reports/{date}-{feature}.md`

---

## Shared Formats (auto/SKILL.md 참조)

다음 포맷들은 `auto/SKILL.md`와 공유합니다:
- **Worker Prompt Template**: `auto/SKILL.md` "Worker Prompt Template" 섹션
- **`@{Name}❯` Communication Format**: 동일 프리픽스 규칙
- **Progress Table**: 동일 상태 아이콘 (🔄 ✅ ❌ ⏳)
- **Deployment Table**: 동일 포맷
- **Completion Report**: auto 포맷 + Pipeline/Fix loops 확장

향후 auto는 `team --skip-verify`로 수렴할 예정입니다.

---

## vs /swkit auto

| 항목 | auto | team |
|------|------|------|
| 에이전트 선택 | complexity 기반 자동 | 사용자 지정 + 자동 |
| Pipeline | 단발 실행 | plan→exec→verify→fix 루프 |
| Verify | 없음 | Milla + Sam 검증 |
| Fix 루프 | 없음 (실패 시 retry 1회) | max 3회 |
| PDCA | 미매핑 | 명시적 매핑 |
| 추천 상황 | 빠른 단발 작업 | 품질 보장 필요한 작업 |
