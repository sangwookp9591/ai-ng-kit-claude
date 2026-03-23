---
name: agent-ui
description: "에이전트 활동 모니터. 세션 내 에이전트 상태를 터미널 또는 3D 오피스에서 확인."
triggers: ["agent-ui", "3d office", "오피스", "시각화", "agent view", "에이전트 상태"]
---

# /swkit agent-ui — Agent Activity Monitor

에이전트 활동을 모니터링합니다. 기본 모드는 **설치 없이 즉시 동작**합니다.

## MANDATORY: 인자 파싱 후 즉시 실행

사용자 인자를 확인합니다:

- 인자 없음 → **기본 모드** (3D 오피스 브라우저 오픈)
- `--monitor` → **모니터 모드** (터미널 내 에이전트 활동 요약)
- `--status` → **Status 모드** (전체 진단)
- `--setup` → **3D Setup 모드** (3D 오피스 자동 설정)

---

### 기본 모드 (인자 없음) — 브라우저에서 3D 오피스 열기

**반드시 아래 Bash 커맨드를 실행하세요. 분석하거나 질문하지 마세요.**

```bash
OFFICE_DIR="$HOME/sw-world-agents-view"
if [ ! -d "$OFFICE_DIR" ]; then
  OFFICE_DIR="$(find $HOME/Project -maxdepth 2 -name 'sw-world-agents-view' -o -name 'swkit-office' 2>/dev/null | head -1)"
fi

if [ -n "$OFFICE_DIR" ] && [ -f "$OFFICE_DIR/bin/agent-ui.mjs" ]; then
  node "$OFFICE_DIR/bin/agent-ui.mjs"
else
  echo "로컬 설치 없음 — 클라우드 모드로 접속합니다."
  open "https://office.sw-world.site"
fi
```

---

### 모니터 모드 (`--monitor`) — 터미널 내 에이전트 활동

**반드시 아래 Bash 커맨드를 실행하세요.**

```bash
node --input-type=module -e "
import { formatTraceSummary } from '${CLAUDE_PLUGIN_ROOT}/scripts/trace/agent-trace.mjs';
const projectDir = process.env.PROJECT_DIR || process.cwd();

console.log('━━━ sw-kit Agent Monitor ━━━');
console.log('');
console.log('Available Agents:');
console.log('  Sam(CTO) Able(PM) Klay(Architect) Jay(Backend) Jerry(DB) Milla(Security) Willji(Design) Derek(Frontend) Rowan(Motion) Iron(Wizard)');
console.log('');
const trace = formatTraceSummary(projectDir);
console.log(trace);
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('Commands:');
console.log('  /swkit agent-ui            브라우저 3D 오피스');
console.log('  /swkit agent-ui --monitor  이 화면');
console.log('  /swkit agent-ui --status   전체 진단');
console.log('  /swkit auto <task>         에이전트 팀 실행');
"
```

---

### Status 모드 (`--status`)

내장 기능 + 3D 오피스 연결 상태를 진단합니다.

```bash
echo "━━━ sw-kit agent-ui Status ━━━"
echo ""
echo "[ 내장 기능 (설치 불필요) ]"
echo "  HUD Status Line: $(grep -q 'statusline.mjs\|swkit-hud' ~/.claude/settings.json 2>/dev/null && echo '✅ 활성' || echo '⚠️ 비활성 — /swkit start로 설정')"
echo "  Agent Trace: $(test -f .sw-kit/state/agent-traces.json && echo '✅ 기록 중' || echo '⚠️ 아직 기록 없음')"
echo "  Hook Matcher: $(grep -q 'Agent|Task' "${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json" 2>/dev/null && echo '✅ Agent/Task 감지' || echo '❌ Agent/Task 미감지')"
echo ""
echo "[ 3D 오피스 (선택사항) ]"
echo "  SWKIT_OFFICE_URL: ${SWKIT_OFFICE_URL:-미설정}"
echo "  SWKIT_TEAM_ID: ${SWKIT_TEAM_ID:-미설정}"
echo "  SWKIT_AGENT_NAME: ${SWKIT_AGENT_NAME:-$USER}"
OFFICE_DIR="$HOME/sw-world-agents-view"
if [ ! -d "$OFFICE_DIR" ]; then
  OFFICE_DIR="$(find $HOME/Project -maxdepth 2 -name 'sw-world-agents-view' 2>/dev/null | head -1)"
fi
if [ -d "$OFFICE_DIR" ]; then
  echo "  sw-world-agents-view: ✅ $OFFICE_DIR"
else
  echo "  sw-world-agents-view: 미설치 (3D 오피스에만 필요)"
fi
if grep -q "session-connect.mjs" ~/.claude/settings.json 2>/dev/null; then
  echo "  3D Hooks: ✅ 설치됨"
else
  echo "  3D Hooks: 미설치 (/swkit agent-ui --setup으로 설정)"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

---

### Setup 모드 (`--setup`)

3D 오피스 환경변수와 hooks를 자동으로 설정합니다.

**실행 전 사용자에게 3가지 정보를 질문:**
1. SWKIT_OFFICE_URL (기본값: https://office.sw-world.site)
2. SWKIT_TEAM_ID (기본값: default)
3. SWKIT_AGENT_NAME (기본값: $USER)

수집 후 `~/.claude/settings.json`에 자동으로 추가:

```jsonc
{
  "env": {
    "SWKIT_OFFICE_URL": "수집된 값",
    "SWKIT_TEAM_ID": "수집된 값",
    "SWKIT_AGENT_NAME": "수집된 값"
  },
  "hooks": {
    "SessionStart": [{
      "matcher": "startup",
      "hooks": [{
        "type": "command",
        "command": "node {OFFICE_DIR}/scripts/hooks/session-connect.mjs"
      }]
    }],
    "PreToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node {OFFICE_DIR}/scripts/hooks/tool-reporter.mjs"
      }]
    }],
    "PostToolUse": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node {OFFICE_DIR}/scripts/hooks/tool-done-reporter.mjs"
      }]
    }]
  }
}
```

`{OFFICE_DIR}`은 자동 탐색된 실제 경로로 치환합니다. 탐색 순서:
1. `$HOME/sw-world-agents-view`
2. `$HOME/Project/**/sw-world-agents-view`
3. 사용자에게 경로 직접 질문

---

## 트러블슈팅

| 문제 | 해결 |
|------|------|
| "기록된 트레이스가 없습니다" | 에이전트를 spawn한 적이 없으면 정상. `/swkit auto` 등으로 에이전트 실행 후 다시 확인. |
| Status Line에 에이전트가 안 보임 | `/swkit start`로 HUD 활성화 필요. 또는 `--status`로 진단. |
| 3D 오피스 연결 안 됨 | `--setup`으로 재설정하거나 `--status`로 진단. 클라우드 모드로 대체 가능. |
| Hook Matcher에 Agent/Task 미감지 | sw-kit 플러그인을 최신 버전으로 업데이트하세요. |

## 관련 프로젝트

- **sw-world-agents-view**: https://github.com/sangwookp9591/sw-world-agents-view
- **배포 URL**: https://office.sw-world.site
