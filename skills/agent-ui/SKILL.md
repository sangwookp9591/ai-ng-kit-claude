---
name: agent-ui
description: "3D 에이전트 오피스 시각화. 현재 세션을 브라우저에서 실시간으로 확인."
triggers: ["agent-ui", "3d office", "오피스", "시각화", "agent view"]
---

# /swkit agent-ui — 3D Agent Office View

현재 Claude Code 세션을 sw-world-agents-view 3D 오피스에 연결합니다.

## MANDATORY: 즉시 실행

**이 스킬이 호출되면 반드시 아래 Bash 커맨드를 실행하세요. 탐색/분석하지 마세요.**

### 인자 파싱

사용자가 전달한 인자를 확인합니다:

- `--setup` → **Setup 모드** 실행
- `--status` → **Status 모드** 실행
- `--uninstall` → **Uninstall 모드** 실행
- 인자 없음 → **기본 모드** (브라우저 오픈)

---

### Setup 모드 (`--setup`)

Claude Code settings.json에 hooks를 자동 추가합니다.

**실행할 커맨드:**

```bash
# sw-world-agents-view 위치 확인
OFFICE_DIR="$HOME/sw-world-agents-view"
if [ ! -d "$OFFICE_DIR" ]; then
  OFFICE_DIR="$(find $HOME/Project -maxdepth 2 -name 'sw-world-agents-view' -o -name 'swkit-office' 2>/dev/null | head -1)"
fi

if [ -z "$OFFICE_DIR" ] || [ ! -f "$OFFICE_DIR/bin/agent-ui.mjs" ]; then
  echo "sw-world-agents-view를 찾을 수 없습니다."
  echo "설치: git clone https://github.com/sangwookp9591/sw-world-agents-view.git ~/sw-world-agents-view"
  echo "      cd ~/sw-world-agents-view && npm install"
else
  node "$OFFICE_DIR/bin/agent-ui.mjs" --setup
fi
```

만약 `bin/agent-ui.mjs`에 `--setup` 플래그가 아직 구현되지 않았다면, 수동으로 설정을 안내합니다:

사용자에게 3가지 정보를 물어본 후 `~/.claude/settings.json`에 다음을 추가하세요:

```jsonc
{
  "env": {
    "SWKIT_OFFICE_URL": "https://office.sw-world.site",  // 또는 사용자 입력
    "SWKIT_TEAM_ID": "사용자 입력",
    "SWKIT_AGENT_NAME": "사용자 입력 또는 $USER"
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
    }]
  }
}
```

`{OFFICE_DIR}`은 실제 경로로 치환하세요.

---

### 기본 모드 (인자 없음)

브라우저에서 3D 오피스를 열고 현재 세션을 등록합니다.

**실행할 커맨드:**

```bash
OFFICE_DIR="$HOME/sw-world-agents-view"
if [ ! -d "$OFFICE_DIR" ]; then
  OFFICE_DIR="$(find $HOME/Project -maxdepth 2 -name 'sw-world-agents-view' -o -name 'swkit-office' 2>/dev/null | head -1)"
fi

if [ -z "$OFFICE_DIR" ] || [ ! -f "$OFFICE_DIR/bin/agent-ui.mjs" ]; then
  echo "클라우드 모드로 접속합니다..."
  open "https://office.sw-world.site"
else
  node "$OFFICE_DIR/bin/agent-ui.mjs"
fi
```

---

### Status 모드 (`--status`)

현재 설정 상태를 확인합니다.

```bash
echo "=== swkit agent-ui 설정 상태 ==="
echo "SWKIT_OFFICE_URL: ${SWKIT_OFFICE_URL:-미설정}"
echo "SWKIT_TEAM_ID: ${SWKIT_TEAM_ID:-미설정}"
echo "SWKIT_AGENT_NAME: ${SWKIT_AGENT_NAME:-$USER}"
if grep -q "session-connect.mjs" ~/.claude/settings.json 2>/dev/null; then
  echo "Hooks: ✅ 설치됨"
else
  echo "Hooks: ❌ 미설치 (/swkit agent-ui --setup 실행 필요)"
fi
```

---

### Uninstall 모드 (`--uninstall`)

hooks를 제거합니다. 사용자에게 확인 후 `~/.claude/settings.json`에서 SWKIT 관련 env와 hooks 항목을 제거하세요.

---

## 관련 프로젝트

- **sw-world-agents-view**: https://github.com/sangwookp9591/sw-world-agents-view
- **배포 URL**: https://office.sw-world.site
