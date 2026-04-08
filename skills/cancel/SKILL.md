---
name: cancel
description: "활성 모드 취소 + 상태 정리. persistent-mode, team, plan, tdd, pipeline 등 모든 활성 세션 종료."
triggers: ["cancel", "취소", "중단", "stop all"]
---

# /aing:cancel — 활성 모드 취소 + 상태 정리

활성화된 모든 모드를 graceful하게 종료하고 transient 상태를 정리합니다.

## Usage

```
/aing cancel          # 활성 모드 취소 + cleanup
/aing cancel --force  # 모든 상태 파일 초기화 (PROTECTED 제외)
```

## Step 1: 활성 모드 탐지

`${CLAUDE_PLUGIN_ROOT}/dist/scripts/core/state-introspection.js`의 `listActiveStates`를 사용하여 현재 활성 모드를 확인합니다.

```javascript
import { listActiveStates } from '${CLAUDE_PLUGIN_ROOT}/dist/scripts/core/state-introspection.js';
const activeStates = listActiveStates(projectDir);
```

활성 모드가 없으면 "취소할 활성 모드가 없습니다." 출력 후 종료.

## Step 2: Graceful 종료

각 활성 모드에 대해 `endSession(mode, 'cancelled')`을 호출합니다:

```javascript
import { endSession } from '${CLAUDE_PLUGIN_ROOT}/dist/scripts/core/session-state.js';
```

종료 대상 모드:
- `persistent-mode` → endSession('persistent-mode', 'cancelled')
- `team` → endSession('team', 'cancelled')
- `plan` → endSession('plan', 'cancelled')
- `tdd` → endSession('tdd', 'cancelled')
- `pipeline` → endSession('pipeline', 'cancelled')

`endSession`이 자동으로 `active: false`, `currentStage: null`, `endedAt`, `endReason: 'cancelled'`를 설정합니다.

## Step 3: Cleanup

종료 후 `runSessionCleanup(projectDir)`를 실행하여 stale lock, tmp, 오래된 handoff를 정리합니다:

```javascript
import { runSessionCleanup } from '${CLAUDE_PLUGIN_ROOT}/dist/scripts/core/session-cleanup.js';
const cleanupResult = runSessionCleanup(projectDir);
```

## Step 4: --force 모드

`--force` 플래그가 있으면 `clearState`로 모든 상태 파일을 초기화합니다:

```javascript
import { clearState } from '${CLAUDE_PLUGIN_ROOT}/dist/scripts/core/state-introspection.js';
// PROTECTED 파일은 force 없이 건너뜀
const result = clearState(projectDir, '*');
```

**주의:** `--force`로도 `pdca-status.json`, `cost-tracker.json` 등 PROTECTED 파일은 삭제되지 않습니다 (`force: true` 옵션을 명시적으로 전달해야 함).

## Step 5: 결과 출력

```
aing Cancel Report
---
취소된 모드: plan, team, persistent-mode
정리된 파일: 3개 (handoff-old.md, stale.lock, temp.tmp)
오류: 0개
---
```

## Protected Files (절대 자동 삭제 안 됨)

pdca-status.json, cost-tracker.json, tech-stack.json, agent-budget.json,
agent-trace.json, agent-traces.json, denial-audit.json, denial-learner-output.json,
invariants-tracker.json, progress-history.json, team-health.json, version-check.json, hud-setup-done
