---
name: start
description: "aing 초기 셋업 위자드. 스코프 선택, HUD 설정, 실행 모드 구성을 인터랙티브로 진행."
triggers: ["start", "setup", "초기설정", "셋업", "setup aing", "aing setup"]
metadata:
  filePattern: []
  bashPattern: []
---

# /aing start — Interactive Setup Wizard

aing 첫 실행 또는 재설정 시 인터랙티브 셋업을 진행합니다.
omc의 4-Phase 위자드를 벤치마킹한 구조입니다.

**When this skill is invoked, immediately execute the workflow below. Do not only restate or summarize these instructions back to the user.**

## Flag Parsing

Check for flags in the user's invocation:
- `--help` → Show Help Text and stop
- `--local` → Phase 1 only (target=local), then stop
- `--global` → Phase 1 only (target=global), then stop
- `--force` → Skip Pre-Setup Check, run full setup (Phase 1 → 2 → 3 → 4)
- No flags → Run Pre-Setup Check, then full setup if needed

## Help Text

When user runs with `--help`, display this and stop:

```
aing Setup - Harness Engineering Agent 초기 설정

USAGE:
  /aing start              초기 셋업 위자드 (또는 이미 설정된 경우 업데이트)
  /aing start --local      이 프로젝트만 설정 (.claude/CLAUDE.md)
  /aing start --global     전체 프로젝트 설정 (~/.claude/CLAUDE.md)
  /aing start --force      전체 위자드 강제 재실행
  /aing start --help       이 도움말

MODES:
  초기 셋업 (플래그 없음)
    - 인터랙티브 위자드
    - CLAUDE.md 설정 (local/global)
    - Status Line HUD 설정
    - 기본 실행 모드 선택
    - 이미 설정된 경우 빠른 업데이트 옵션

  로컬 설정 (--local)
    - .claude/CLAUDE.md에 aing 섹션 추가
    - 이 프로젝트에서만 aing 활성화

  글로벌 설정 (--global)
    - ~/.claude/CLAUDE.md에 aing 섹션 추가
    - 모든 Claude Code 세션에서 aing 활성화

EXAMPLES:
  /aing start              # 처음 설정
  /aing start --local      # 이 프로젝트만
  /aing start --global     # 전체 프로젝트
  /aing start --force      # 설정 재실행
```

## Pre-Setup Check: Already Configured?

**CRITICAL**: Check if setup has already been completed before doing anything.

Run this command to check:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup/setup-progress.mjs" check
```

### If Already Configured (and no --force flag)

If `completed: true` is returned AND the user did NOT pass `--force`, `--local`, or `--global`:

Use AskUserQuestion:

**Question:** "aing이 이미 설정되어 있습니다. 무엇을 하시겠습니까?"

**Options:**
1. **CLAUDE.md만 업데이트** — 최신 harness rules 반영
2. **전체 셋업 다시** — Phase 1~4 재실행
3. **취소** — 변경 없음

**Option 1 선택 시:** Phase 1만 실행 (기존 configTarget 사용), 이후 중단.
**Option 2 선택 시:** Resume Detection으로 진행.
**Option 3 선택 시:** 종료.

### Force Flag Override

`--force` 플래그 시 이 체크를 건너뛰고 바로 셋업 시작.

## Resume Detection

Phase 실행 전에 이전 세션 상태 확인:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup/setup-progress.mjs" resume
```

"fresh"가 아니면 AskUserQuestion:

**Question:** "이전 셋업 세션이 발견되었습니다. 이어서 진행하시겠습니까?"

**Options:**
1. **이어서 (Step N부터)** — 중단된 곳에서 재개
2. **처음부터** — 상태 초기화 후 새로 시작

Option 2 선택 시:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup/setup-progress.mjs" clear
```

---

## Phase 1: 스코프 선택 + CLAUDE.md 설치

### Determine Configuration Target

`--local` → `CONFIG_TARGET=local`
`--global` → `CONFIG_TARGET=global`

플래그 없으면 AskUserQuestion:

**Question:** "aing을 어디에 설정하시겠습니까?"

**Options:**
1. **이 프로젝트만 (Local)** — `.claude/CLAUDE.md`에 설정. 이 프로젝트에서만 aing 활성화.
2. **모든 프로젝트 (Global)** — `~/.claude/CLAUDE.md`에 설정. 전체 Claude Code 세션에서 aing 활성화.

### Install CLAUDE.md

선택한 타겟 경로의 CLAUDE.md에 aing 섹션을 추가합니다.

**타겟 파일 결정:**
- `local` → `{projectDir}/.claude/CLAUDE.md`
- `global` → `~/.claude/CLAUDE.md`

**설치 절차:**

1. 타겟 디렉토리 생성 (없으면)
2. 기존 CLAUDE.md가 있으면 읽기
3. `<!-- SWKIT:START -->` ~ `<!-- SWKIT:END -->` 마커가 이미 있으면 그 사이만 교체
4. 마커가 없으면 파일 끝에 추가

**삽입할 내용:**
```markdown
<!-- SWKIT:START -->
# aing Harness Engineering Agent v2.0.0

aing이 활성화되어 있습니다. 세션 시작 시 자동으로 harness rules가 주입됩니다.

## Agent Team
Sam(CTO/opus) Able(PM/sonnet) Klay(Architect/opus) Jay(Backend/sonnet) Jerry(DB/sonnet) Milla(Security/sonnet) Willji(Design/sonnet) Derek(Frontend/sonnet) Rowan(Motion/sonnet) Iron(Wizard/sonnet)

## Quick Start
- `/aing auto <feature> <task>` — 전체 파이프라인 자동 실행
- `/aing start <name>` — PDCA 사이클 시작
- `/aing wizard` — 비개발자 마술사 모드
- `/aing help` — 전체 도움말

## Rules
- 모든 코드 구현은 TDD (RED → GREEN → REFACTOR)
- 에이전트 투입 시 반드시 배치 테이블 표시
- 완료 시 증거(test/build/lint) 필수
<!-- SWKIT:END -->
```

**IMPORTANT:** 마커 밖의 기존 내용은 절대 건드리지 않습니다. 기존 내용이 omc 등 다른 플러그인 설정을 포함할 수 있습니다.

### Report Success

```
aing CLAUDE.md 설정 완료
- 파일: {target path}
- 스코프: {LOCAL — 이 프로젝트만 | GLOBAL — 모든 프로젝트}
- 기존 내용: 보존됨
```

### Save Progress

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup/setup-progress.mjs" save 1 <CONFIG_TARGET>
```

### Early Exit for Flag Mode

`--local` 또는 `--global` 플래그 사용 시:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup/setup-progress.mjs" clear
```
Phase 2로 진행하지 않고 **여기서 중단**.

---

## Phase 2: Status Line HUD 설정

AskUserQuestion:

**Question:** "Status Line HUD를 활성화하시겠습니까? 터미널 하단에 활성 에이전트가 컬러 점으로 실시간 표시됩니다. (예: ● Jay(Backend) ● Milla(Security))"

**Options:**
1. **예** — Status Line 활성화
2. **아니오** — 나중에 설정

### "예" 선택 시:

1. `~/.claude/settings.json`을 읽고 `statusLine` 설정:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node $HOME/.claude/hud/aing-hud.mjs"
  }
}
```

**IMPORTANT:** settings.json의 다른 설정은 보존합니다. `statusLine` 키만 추가/교체합니다.

2. `~/.claude/hud/aing-hud.mjs` 래퍼가 없으면 생성:

```javascript
#!/usr/bin/env node
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';

const home = homedir();
const candidates = [
  process.env.CLAUDE_PLUGIN_ROOT,
  join(home, '.claude/plugins/cache/aing-marketplace/aing'),
].filter(Boolean);

let pluginRoot = candidates.find(p => {
  try { return existsSync(join(p, 'scripts/hud/statusline.mjs')); } catch { return false; }
}) || candidates[0];

try {
  const result = execFileSync('node', [join(pluginRoot, 'scripts/hud/statusline.mjs')], {
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot },
    timeout: 3000
  });
  process.stdout.write(result);
} catch {
  process.stdout.write('aing');
}
```

`HUD_ENABLED=true` 기록.

### "아니오" 선택 시:

`HUD_ENABLED=false` 기록. 나중에 `/aing start --force`로 재설정 가능.

### Save Progress

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup/setup-progress.mjs" save 2 <CONFIG_TARGET>
```

---

## Phase 3: 기본 실행 모드 선택

AskUserQuestion:

**Question:** "기본 실행 모드를 선택하세요:"

**Options:**
1. **auto (추천)** — `/aing auto`가 기본. Klay→Able→Jay+Derek→Milla→Sam 전체 파이프라인 자동 실행.
2. **pdca** — `/aing start <name>`이 기본. Plan→Do→Check→Act→Review 단계별 진행.
3. **wizard** — `/aing wizard`가 기본. Iron 마술사가 모든 기술 결정을 쉽게 설명.

선택 결과를 `DEFAULT_MODE`에 저장.

### Save Progress

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup/setup-progress.mjs" save 3 <CONFIG_TARGET>
```

---

## Phase 4: 완료 + 웰컴

### Mark Completion

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup/setup-progress.mjs" complete "2.1.7" "<CONFIG_TARGET>" "<HUD_ENABLED>" "<DEFAULT_MODE>"
```

### Show Welcome

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing v2.1.7 셋업 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  스코프:     {local → 이 프로젝트만 | global → 모든 프로젝트}
  HUD:        {활성화 | 비활성화}
  기본 모드:  {auto | pdca | wizard}

  Agent Team Ready:
  ─────────────────────────────────────
  * Sam(CTO)    @ Able(PM)      ^ Klay(Arch)
  ~ Jay(BE)     # Jerry(DB)     + Milla(Sec)
  %% Willji(UI)  [] Derek(FE)    ** Rowan(Motion)
  ~* Iron(Wizard)

  시작하려면:
  ─────────────────────────────────────
  /aing auto <feature> <task>  전체 자동 파이프라인
  /aing start <name>           PDCA 사이클 시작
  /aing wizard                 마술사 모드
  /aing help                   전체 도움말
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### GitHub Star (Optional)

gh CLI가 인증되어 있으면:

```bash
gh api user/starred/sangwookp9591/ai-ng-kit &>/dev/null
```

아직 star 안 했으면 AskUserQuestion:

**Question:** "aing이 마음에 드셨다면 GitHub star로 응원해주시겠습니까?"

**Options:**
1. **네!** → `gh api -X PUT /user/starred/sangwookp9591/ai-ng-kit`
2. **나중에** → 건너뜀

gh CLI 없으면 조용히 건너뜁니다. star 실패해도 셋업은 완료됩니다.

---

## Session-Start 온보딩 연동

이 스킬은 `session-start.mjs`와 연동됩니다.

**session-start에서의 동작:**

1. `.aing/state/setup-complete.json` 또는 `~/.claude/.aing-config.json` 확인
2. **설정 안 됨:** "aing이 아직 설정되지 않았습니다. `/aing start`를 실행하세요." 메시지 추가
3. **설정 됨 + 이전 PDCA 작업 있음:** 이전 작업 resume 옵션 표시
4. **설정 됨 + 작업 없음:** 정상 harness rules 주입
