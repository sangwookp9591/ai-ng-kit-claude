---
name: land-and-deploy
description: |
  Land and deploy workflow. Merges the PR, waits for CI and deploy,
  verifies production health via canary checks. Takes over after
  /aing ship creates the PR. Use when asked to "land", "deploy",
  "merge and deploy", or "ship to production".
---

# /aing land-and-deploy — Full Deployment Pipeline

Orchestrator: `scripts/ship/land-orchestrator.ts`

## Flow

```
/aing ship (PR 생성)
    ↓
/aing land-and-deploy
    ├── Step 1: Pre-merge checks (PR approval, CI, conflicts)
    ├── Step 2: Merge (squash/merge/rebase + branch delete)
    ├── Step 3: Wait for deploy (platform detect → poll health)
    ├── Step 4: Canary (5회 health check, alert thresholds)
    └── Step 5: Report (evidence chain에 deploy 증거 기록)
```

## Prerequisites
- PR must exist (from `/aing ship`)
- `gh` CLI authenticated
- Deploy platform configured (Vercel, Fly.io, Render, Netlify, or GitHub Actions)

## Usage

```
/aing land-and-deploy PR#123 feature-name
/aing land-and-deploy PR#123 feature-name --canary-url https://app.example.com
/aing land-and-deploy PR#123 feature-name --dry-run
```

## Pipeline Steps

### Step 1: Pre-merge Checks
1. Verify PR approval: `gh pr view --json reviewDecision`
2. Verify CI status: `gh pr checks --json bucket`
3. Verify no merge conflicts (mergeable state)
4. If any check fails, report issues and STOP

### Step 2: Merge
1. Merge PR with strategy (default: squash): `gh pr merge --squash --delete-branch`
2. Checkout base branch and pull latest
3. Strategies: `--squash` (default), `--merge`, `--rebase`

### Step 3: Wait for Deploy
1. Auto-detect platform via `deploy-detect.ts`:
   - Fly.io: `fly.toml` → `https://{app}.fly.dev`
   - Render: `render.yaml` → `https://{name}.onrender.com`
   - Vercel: `.vercel/` → `vercel inspect`
   - Netlify: `netlify.toml`
   - GitHub Actions: `.github/workflows/`
2. Poll health endpoint every 10s (max 5 min timeout)
3. Or use provided `--canary-url` directly

### Step 4: Canary Checks
1. Run 5 health checks via `canary-monitor.ts`
2. Alert thresholds:
   - CRITICAL: 2 consecutive failures → page unreachable
   - HIGH: 2 consecutive → new console errors
   - MEDIUM: 3 consecutive → 2x performance degradation
3. Record canary evidence to evidence chain

### Step 5: Report
Generate deployment report with step-by-step status:

```
## Deployment Report

**PR:** #123
**Deploy URL:** https://app.example.com
**Status:** HEALTHY

### Pipeline Steps

| Step | Status | Duration |
|------|--------|----------|
| pre-merge-checks | PASS | 1.2s |
| merge | PASS | 3.4s |
| wait-for-deploy | PASS | 45.2s |
| canary | PASS | 12.1s |
```

## Rollback
If canary fails:
1. Alert user immediately with failure details
2. Suggest: `git revert HEAD && git push origin main`
3. Do NOT auto-rollback without explicit confirmation
4. Record failure evidence for post-mortem

## Integration with /aing ship

Full chain: `/aing ship` → PR created → (review + approval) → `/aing land-and-deploy` → production

Evidence chain tracks both stages:
- `ship`: test/review/version evidence
- `land-and-deploy`: merge/deploy/canary evidence
