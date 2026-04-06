# Setup Phases — Detailed Steps

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
Sam(CTO/opus) Able(PM/sonnet) Klay(Architect/opus) Jay(Backend/sonnet) Jerry(DB/sonnet) Milla(Security/sonnet) Willji(Design/sonnet) Derek(Motion/sonnet) Rowan(Mobile/sonnet) Iron(Web Frontend/sonnet)

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

**IMPORTANT:** 마커 밖의 기존 내용은 절대 건드리지 않습니다.

### Report + Save Progress

```
aing CLAUDE.md 설정 완료
- 파일: {target path}
- 스코프: {LOCAL — 이 프로젝트만 | GLOBAL — 모든 프로젝트}
- 기존 내용: 보존됨
```

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/setup/setup-progress.js" save 1 <CONFIG_TARGET>
```

**Early Exit**: `--local` 또는 `--global` 플래그 시 Phase 1만 실행 후 중단.

---

## Phase 2: Status Line HUD 설정

AskUserQuestion: "Status Line HUD를 활성화하시겠습니까?"

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
  try { return existsSync(join(p, 'dist/scripts/hud/statusline.js')); } catch { return false; }
}) || candidates[0];

try {
  const result = execFileSync('node', [join(pluginRoot, 'dist/scripts/hud/statusline.js')], {
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

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/setup/setup-progress.js" save 2 <CONFIG_TARGET>
```

---

## Phase 3: 기본 실행 모드 선택

AskUserQuestion: "기본 실행 모드를 선택하세요:"

**Options:**
1. **auto (추천)** — Klay→Able→Jay+Derek→Milla→Sam 전체 파이프라인 자동 실행.
2. **pdca** — Plan→Do→Check→Act→Review 단계별 진행.
3. **wizard** — Iron 마술사가 모든 기술 결정을 쉽게 설명.

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/setup/setup-progress.js" save 3 <CONFIG_TARGET>
```

---

## Phase 4: 완료 + 웰컴

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/setup/setup-progress.js" complete "2.1.7" "<CONFIG_TARGET>" "<HUD_ENABLED>" "<DEFAULT_MODE>"
```

### Welcome Banner

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

gh CLI가 인증되어 있으면 star 여부 확인:
```bash
gh api user/starred/sangwookp9591/ai-ng-kit-claude &>/dev/null
```

아직 star 안 했으면 AskUserQuestion → "네!" → `gh api -X PUT /user/starred/sangwookp9591/ai-ng-kit-claude`
gh CLI 없으면 조용히 건너뜁니다.

---

## Session-Start 온보딩 연동

`session-start.mjs`와 연동:
1. `.aing/state/setup-complete.json` 또는 `~/.claude/.aing-config.json` 확인
2. **설정 안 됨:** "`/aing start`를 실행하세요" 메시지 추가
3. **설정 됨 + 이전 작업 있음:** resume 옵션 표시
4. **설정 됨 + 작업 없음:** 정상 harness rules 주입
