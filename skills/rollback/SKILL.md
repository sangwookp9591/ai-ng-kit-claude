---
name: rollback
description: "📌 Git 체크포인트 기반 롤백. 검증 실패 시 안전하게 복구."
triggers: ["rollback", "롤백", "되돌리기", "undo", "복구"]
---

# /swkit rollback — Git Checkpoint Rollback

## Usage
- `/swkit rollback` — 마지막 체크포인트로 롤백
- 비파괴적: 새 브랜치를 생성하고, 변경사항은 git stash에 보존

## How it works
1. 파이프라인 실행 전 자동 체크포인트 생성
2. Milla 리뷰에서 Critical 발견 시 롤백 제안
3. 롤백 시 새 브랜치 생성 (swkit-rollback-*)
4. 이전 변경사항은 stash에 보존

## Git Checkpoint System

### Creating Checkpoints

At each pipeline stage transition, create a git checkpoint:
```bash
git stash push -m "sw-kit-checkpoint-{stage}-{timestamp}" --include-untracked
git stash pop
git add -A
git commit -m "checkpoint({stage}): {feature} — {summary}"
```

Note: Only create checkpoints when the user has opted into auto-commit.
If not, use `git stash` as a lightweight checkpoint.

### Checkpoint Naming Convention
- `checkpoint(team-plan): auth-upgrade — plan created`
- `checkpoint(team-exec): auth-upgrade — 3 files implemented`
- `checkpoint(team-verify): auth-upgrade — review passed`

### Listing Checkpoints
```bash
git log --oneline --grep="checkpoint(" | head -10
```

### Rolling Back to a Checkpoint
```bash
# Find the checkpoint
git log --oneline --grep="checkpoint(team-exec)"

# Soft reset to that checkpoint (preserves files in staging)
git reset --soft {commit-hash}
```

## Selective Story Retry

When a pipeline stage fails, don't retry everything — retry only failed items:

### Step 1: Identify Failed Items
Read the session state to find which tasks/stories failed.
Note: `completeStage()` should include `failedTasks` array when status is 'failed':
```
// Complete stage with failure info
completeStage("team", "team-exec", {
  status: "failed",
  summary: "2 of 4 tasks failed",
  failedTasks: ["인증 미들웨어 추가", "DB 마이그레이션"]
})

// Read session
session = readSession("team")
failedTasks = session.stageResults["team-exec"].failedTasks || []

// Display
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit rollback: Selective Retry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Feature: {feature}
  Failed Stage: {stage}

  ✓ Task 1: API 엔드포인트 구현 — PASSED
  ✗ Task 2: 인증 미들웨어 추가 — FAILED
  ✓ Task 3: 테스트 작성 — PASSED
  ✗ Task 4: DB 마이그레이션 — FAILED

  Retry failed tasks only? (y/n)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Retry Failed Tasks Only
- Roll back files changed by failed tasks (using git diff per task)
- Re-spawn only the agents assigned to failed tasks
- Preserve completed task outputs
- Re-run verification on the fixed tasks only

### Step 3: Escalation
If selective retry fails twice:
- Offer full stage rollback to last checkpoint
- Suggest `/swkit debug` for root cause analysis
- Write escalation handoff with all attempts documented

## Rollback Safety

- Never rollback past user's manual commits
- Always show diff before executing rollback
- Create a "pre-rollback" checkpoint before rolling back
- Warn if rollback affects files modified by other stages

## Integration with Team Pipeline

When team-fix reaches max iterations:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit: Fix Loop Exhausted
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Fix attempts: 3/3
  Same error persists: {errorSig}

  Options:
  1. /swkit rollback — 마지막 체크포인트로 롤백
  2. /swkit debug — 과학적 디버깅으로 전환
  3. 수동 수정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
