---
name: investigate
description: |
  Systematic debugging with root cause analysis. Four phases: investigate,
  analyze, hypothesize, implement. Iron Law: no fix without evidence.
  Use when asked to "debug", "investigate", "find the bug", "why is this broken",
  or when encountering errors.
---

# /aing investigate — Systematic Debugging

## Iron Law
No fix without evidence. If you cannot reproduce it, you cannot fix it.

## 4-Phase Protocol

### Phase 1: Investigate
1. Read the error message completely — every word matters
2. Identify the exact file:line where the error occurs
3. Check git blame — when did this code last change?
4. Check git log — what changed recently in related files?
5. Reproduce the error with a minimal test case

### Phase 2: Analyze
1. Trace the call stack — every frame
2. Identify the data flow: what goes in, what comes out, where does it diverge?
3. Check types — is the runtime type what you expect?
4. Check nullability — is something undefined that shouldn't be?
5. Check timing — race conditions, async ordering, event sequences

### Phase 3: Hypothesize
1. Form exactly 1 hypothesis based on evidence
2. Predict what you would see if the hypothesis is correct
3. Design a test that would disprove the hypothesis
4. Run the test
5. If disproved, return to Phase 2 with new data

### Phase 4: Implement
1. Write the fix — minimal, targeted, no refactoring
2. Write a regression test that fails without the fix
3. Run the full test suite — no new failures
4. Verify the original error is gone
5. Document: what was wrong, why, how fixed

## Anti-patterns
- Guessing without evidence (shotgun debugging)
- Fixing symptoms instead of root cause
- Adding try/catch to suppress errors
- "It works on my machine" without reproduction
- Changing multiple things at once

## Evidence Collection
For each bug, collect:
- [ ] Error message (exact text)
- [ ] Stack trace (full)
- [ ] Steps to reproduce
- [ ] Expected vs actual behavior
- [ ] Root cause (file:line + explanation)
- [ ] Fix verification (test passes)
