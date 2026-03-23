---
name: agent-ui
description: "3D 에이전트 오피스 시각화. 현재 세션을 브라우저에서 실시간으로 확인."
triggers: ["agent-ui", "3d office", "오피스", "시각화", "agent view"]
---

# /swkit agent-ui — 3D Agent Office View

현재 Claude Code 세션을 sw-world-agents-view 3D 오피스에 연결합니다.

## Usage

```
/swkit agent-ui              ← 브라우저에서 현재 세션 열기
/swkit agent-ui --setup      ← Claude Code hooks 자동 설정 (최초 1회)
/swkit agent-ui --status     ← 현재 설정 상태 확인
/swkit agent-ui --uninstall  ← hooks 제거
```

## What it does

### `agent-ui` (기본)
1. sw-world-agents-view 서버 연결 확인
2. 현재 세션을 자동 등록
3. 초대 코드 생성 (5분 유효)
4. 브라우저 자동 오픈 → 3D 오피스에 자기 캐릭터 표시
5. 초대 코드를 터미널에 표시 (팀원에게 공유)

### `agent-ui --setup` (최초 1회)
Claude Code settings.json에 hooks를 자동 추가합니다:
- **SessionStart hook**: 세션 시작 시 자동으로 3D 오피스에 등록
- **PreToolUse hook**: 도구 사용 시 실시간 이벤트 전송 (캐릭터 애니메이션 반영)
- 환경변수 설정: SWKIT_OFFICE_URL, SWKIT_TEAM_ID, SWKIT_AGENT_NAME

설정 후에는 `claude` 실행만 하면 자동으로 3D 오피스에 연결됩니다.

## Implementation

When the user runs `/swkit agent-ui`, execute:

```bash
node /path/to/sw-world-agents-view/bin/agent-ui.mjs
```

If sw-world-agents-view is not cloned locally, guide the user:

```
sw-world-agents-view가 필요합니다:

  git clone https://github.com/sangwookp9591/sw-world-agents-view.git ~/sw-world-agents-view
  cd ~/sw-world-agents-view && npm install

또는 클라우드 모드 (설치 불필요):

  SWKIT_OFFICE_URL=https://office.sw-world.site 로 설정하면
  로컬 서버 없이 클라우드 오피스에 직접 연결됩니다.
```

### Setup Flow

```bash
node ~/sw-world-agents-view/bin/agent-ui.mjs --setup
```

This will interactively configure:
1. Office URL (default: https://office.sw-world.site)
2. Team ID
3. Agent Name

And automatically add hooks to `~/.claude/settings.json`.

### Cloud Mode (no local install)

hooks만 설정하면 로컬 서버 없이 클라우드 오피스에 직접 연결:

```jsonc
// ~/.claude/settings.json
{
  "env": {
    "SWKIT_OFFICE_URL": "https://office.sw-world.site",
    "SWKIT_TEAM_ID": "your-team",
    "SWKIT_AGENT_NAME": "your-name"
  }
}
```

## 팀원 온보딩

팀장이 팀원에게 공유할 것:
1. 초대 코드 (5분 유효) 또는 룸 코드 (SWKIT-XXXX)
2. 설정 명령어: `/swkit agent-ui --setup`

팀원은:
1. `/swkit agent-ui --setup` 실행 → hooks 자동 설정
2. 이후 `claude` 실행만 하면 자동 연결
3. 브라우저에서 `office.sw-world.site` 접속 → 팀 전체 조망

## Related

- sw-world-agents-view: https://github.com/sangwookp9591/sw-world-agents-view
- 배포 URL: https://office.sw-world.site
