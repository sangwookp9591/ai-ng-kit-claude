---
name: careful
description: |
  Safety mode with destructive command warnings and directory-scoped edits.
  Warns before rm -rf, DROP TABLE, force-push, git reset --hard, kubectl delete.
  Use when working on production systems or sensitive code.
---

# /aing careful — Safety Mode

## Protected Operations

### Blocked (always, no override)
- `rm -rf /` or `rm -rf ~`
- `chmod 777` on system directories
- `DROP DATABASE` without explicit confirmation

### Warned (proceed with confirmation)
- `rm -rf` on any directory
- `git push --force` (suggest --force-with-lease)
- `git reset --hard`
- `DROP TABLE`
- `TRUNCATE TABLE`
- `kubectl delete namespace`
- `.env` file modifications

## How It Works
The guardrail engine (`scripts/guardrail/guardrail-engine.ts`) checks every Bash and file operation via the PreToolUse hook. Violations are categorized as `block` or `warn`.

## Configuration
Safety invariants in `scripts/guardrail/safety-invariants.ts`:
- maxSteps: 50 per session
- maxFileChanges: 20 per session
- maxSessionMinutes: 120
- forbiddenPaths: configurable
- maxConsecutiveErrors: 5
