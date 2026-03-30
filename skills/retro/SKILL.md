---
name: retro
description: |
  Weekly engineering retrospective. Analyzes commit history, work patterns,
  and code quality metrics. Produces structured retro with learnings.
  Use when asked to "run a retro", "what did we do this week", or
  "how are we doing".
---

# /aing retro — Engineering Retrospective

## Data Collection

### 1. Git History (last 7 days)
```bash
git log --since="7 days ago" --oneline --stat
git shortlog --since="7 days ago" -sn
git diff --stat HEAD~$(git rev-list --count --since="7 days ago" HEAD)
```

### 2. Metrics
- Commits: count, frequency, size distribution
- Files changed: which areas got the most attention
- Lines added vs removed: growing or shrinking?
- Test files: were tests added alongside features?

### 3. Patterns
- Time of day distribution (from commit timestamps)
- Commit message quality (conventional commits?)
- PR merge latency (if applicable)
- Revert count (stability signal)

## Retrospective Format

### What Went Well
- List 3-5 wins with evidence (commit hashes)
- Highlight patterns worth repeating

### What Could Improve
- List 3-5 areas with specific observations
- Link to commits or patterns that show the issue

### Action Items
- 1-3 concrete actions for next week
- Each action has an owner and a due date
- Measurable outcome (not "try harder")

### Metrics Dashboard
```
Commits this week:     [N]
Files changed:         [N]
Lines added:           [N]
Lines removed:         [N]
Test coverage delta:   [+/-N%]
Biggest file changed:  [path] ([N] changes)
```

## Output

Write retro to `.aing/reports/retro-{date}.md`
