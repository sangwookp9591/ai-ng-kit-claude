---
name: team
description: "사용자 지정 에이전트 팀 + staged pipeline (plan→exec→verify→fix 루프). PDCA 사이클 기반."
triggers: ["team", "팀", "팀 실행", "team run"]
---

# /aing team — Staged Team Pipeline

사용자가 에이전트를 직접 지정하거나 자동 선택하여, verify→fix 루프가 있는 구조화된 팀 파이프라인을 실행합니다.

## Usage

```
/aing team jay+derek+milla "사용자 인증 API 구현"
/aing team "검색 기능 추가"              ← 에이전트 미지정 시 자동 선택
/aing team --plan .aing/plans/xxx.md   ← 기존 plan 파일로 team-plan 스킵
```

## Step 0: Resume Detection

1. Check `.aing/state/team-session.json` for an active session
2. If found AND matches the requested feature:
   - Display resume prompt (feature, last stage, next stage)
   - If yes: skip completed stages, start from `nextStage`
   - If no: start fresh
3. If session file is corrupt or unreadable: start fresh
4. If no active session: proceed normally

## Session Lifecycle

파이프라인 시작/전환/종료 시 상태를 기록합니다:
- **시작**: `writeSession({ feature, mode: "team", currentStage: "team-plan", agents: {...} })`
- **전환**: `completeStage("team", "{stage}", { status, summary })` + `writeHandoff({...})`
- **종료**: `endSession("team", "complete"|"failed"|"cancelled")`

## Agent Selection

### Explicit Selection
`+` 로 에이전트를 지정합니다. verify 에이전트(Milla, Sam)는 항상 자동 포함됩니다.

```
/aing team jay+derek "task"
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

## Staged Pipeline (PDCA + Unbounded Persistence)

```
team-plan      [Plan]      → Able(PM) 계획 수립 + PRD 스토리 생성
team-exec      [Do]        → 사용자 지정 에이전트 병렬 실행
team-verify    [Check]     → Milla(sonnet) + Sam(haiku) 검증
team-architect [Architect] → Klay(opus) 아키텍트 이중 검증 (코드 강제)
team-fix       [Act]       → 실패 태스크 담당자 재투입 (unbounded — cancel만 종료)
completion     [Review]    → 보고서 + 학습 저장
```

**Unbounded Persistence**: fix 루프에 하드 제한 없음. stop hook이 세션 종료를 차단하며,
circuit breaker(20회/5분)만이 fail-safe로 존재. 명시적 cancel 또는 PRD 전체 완료 + architect 승인만 종료.

**코드 수준 강제** (프롬프트가 아닌 hook이 실행):
- `scripts/hooks/persistent-mode.ts` — iteration soft cap (+3 확장), circuit breaker
- `scripts/pipeline/story-tracker.ts` — PRD 스토리 acceptance criteria 추적
- `scripts/hooks/architect-verify.ts` — architect 검증 대기 강제
- `scripts/hooks/error-recovery.ts` — 동일 에러 5회+ 시 대안 접근 강제
- `hooks-handlers/stop.ts` — 위 모듈 통합, stop 차단

### Stage Transition Rules

| From | To | Condition |
|------|-----|-----------|
| team-plan | team-exec | Plan 파일 존재 + Tasks 생성됨 + PRD 생성됨 |
| team-exec | team-verify | 모든 exec task `completed` + `GATE_PASS` |
| team-verify | team-architect | PASS — Klay architect 이중 검증 |
| team-architect | completion | Architect APPROVED |
| team-architect | team-fix | Architect REJECTED (feedback 포함) |
| team-verify | team-fix | FAIL |
| team-fix | team-verify | Fix 완료 → 재검증 (unbounded) |
| *(any)* | completion | 명시적 cancel 또는 circuit breaker |

---

## Stage 1: team-plan

**Skip**: `--plan` 제공 시 건너뜀. Able이 요구사항 분석 + 작업 분해. persist.js로 plan/task 파일 생성.

→ 상세: `references/stage-plan.md` 참조

---

## Stage 2: team-exec

1. TeamCreate → 2. Deployment Table 표시 (MANDATORY) → 3. Task-Level Execution + Gate Review → 4. Monitor

**핵심 규칙**:
- 각 task 완료마다 Milla mini-review gate 자동 실행 (묻지 않음)
- 독립 task는 병렬, 의존 task는 순차+게이트
- Worker 프롬프트: entrance + task + TDD + 증거 수집 + `@{Name}❯` 포맷
- GATE_PASS → 다음 task, GATE_FAIL → 담당 에이전트 재스폰 (최대 2회)

→ 상세: `references/stage-exec.md` 참조

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

---

## Stage 3: team-verify

Milla(sonnet) + Sam(haiku) 병렬 스폰. QA Loop 통합.

**핵심 규칙**:
- "검증할까요?" 같은 질문 금지 — 자동 판정 + 자동 전환
- PASS → team-architect, FAIL → team-fix

→ 상세: `references/stage-verify.md` 참조

---

## Stage 3.5: team-architect (이중 검증)

Milla/Sam PASS 후, Klay(opus)가 아키텍트 관점에서 독립 검증.
**코드 강제**: `architect-verify.ts`가 상태 추적, stop hook이 승인 전까지 종료 차단.

- APPROVED → completion
- REJECTED → feedback와 함께 team-fix로 복귀 (architect feedback를 fix agent에 전달)
- Max 3 attempts → 소진 시 최선 버전으로 완료

→ 상세: `references/stage-verify.md` 참조

---

## Stage 4: team-fix (Unbounded)

**제한 없음** — cancel만 종료. stop hook이 세션 종료를 차단.

**핵심 규칙**:
- 이전 handoff 읽어서 실패 컨텍스트 전달 (같은 실수 반복 방지)
- **error-recovery.ts**: 동일 에러 5회+ 시 대안 접근 강제 (코드 수준)
- 동일 에러 지속 시 `/aing debug` 자동 제안

→ 상세: `references/stage-fix.md` 참조

---

## Stage 5: completion

Completion Report + Shutdown + Persist.

→ 상세: `references/stage-completion.md` 참조

---

## Shared Formats (auto/SKILL.md 참조)

다음 포맷들은 `auto/SKILL.md`와 공유합니다:
- **Worker Prompt Template**: `auto/SKILL.md` "Worker Prompt Template" 섹션
- **`@{Name}❯` Communication Format**: 동일 프리픽스 규칙
- **Progress Table**: 동일 상태 아이콘 (🔄 ✅ ❌ ⏳)
- **Completion Report**: auto 포맷 + Pipeline/Fix loops 확장

향후 auto는 `team --skip-verify`로 수렴할 예정입니다.

## vs /aing auto

| 항목 | auto | team |
|------|------|------|
| 에이전트 선택 | complexity 기반 자동 | 사용자 지정 + 자동 |
| Pipeline | 단발 실행 | plan→exec→verify→fix 루프 |
| Verify | 없음 | Milla + Sam 검증 |
| Fix 루프 | 없음 (실패 시 retry 1회) | max 3회 |
| PDCA | 미매핑 | 명시적 매핑 |
| 추천 상황 | 빠른 단발 작업 | 품질 보장 필요한 작업 |
