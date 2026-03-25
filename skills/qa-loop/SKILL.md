---
name: qa-loop
description: "QA 자동 루프. test->fix->retest 사이클 (max 5회). 동일 에러 감지 시 자동 중단."
triggers: ["qa", "qa-loop", "테스트루프", "test loop"]
---

# /swkit qa — Automated QA Loop

## Usage
```
/swkit qa [test-command]
/swkit qa "npm test"
/swkit qa "node --test tests/"
```

## Overview

Automated test-fix-retest cycle that:
1. Runs the test suite
2. If failures found, spawns Jay to fix them
3. Re-runs tests to verify the fix
4. Repeats until all pass OR max cycles reached OR same error detected 3x

## Configuration

- **Max Cycles**: 5 (prevents infinite loops)
- **Same Error Threshold**: 3 (if same error appears 3 times, stop and report)
- **Test Command**: User-specified or auto-detected from package.json

## Step 1: Test Command Detection

If no test command specified:
1. Read `package.json` → check `scripts.test`
2. Check for common test files: `tests/`, `__tests__/`, `*.test.*`
3. Detect test runner: `node:test`, `jest`, `vitest`, `mocha`
4. Fallback: ask user

## Step 2: QA Cycle

```
cycle = 0
errorHistory = []

WHILE cycle < 5:
  cycle += 1

  // 2a: Run tests
  result = Bash({ command: testCommand, timeout: 120000 })

  IF result.exitCode === 0:
    BREAK → Step 3 (Success)

  // 2b: Extract error signature
  errorSig = extractErrorSignature(result.stderr + result.stdout)

  // 2c: Same error detection
  IF errorHistory.filter(e => e === errorSig).length >= 2:
    BREAK → Step 4 (Same Error Stuck)

  errorHistory.push(errorSig)

  // 2d: Spawn Jay to fix
  Agent({
    subagent_type: "sw-kit:jay",
    description: "Jay: QA fix cycle {cycle} — {errorSig}",
    model: "sonnet",
    prompt: "테스트 실패를 수정하세요.

=== TEST OUTPUT ===
{result.stdout + result.stderr}

=== ERROR SIGNATURE ===
{errorSig}

=== PREVIOUS ATTEMPTS ===
{errorHistory summary}

Rules:
- 실패한 테스트만 수정 (통과하는 테스트 건드리지 마세요)
- 테스트 자체를 삭제하거나 skip하지 마세요
- 구현 코드를 수정하여 테스트가 통과하도록 하세요
- 수정 후 어떤 파일을 어떻게 바꿨는지 보고하세요"
  })
```

## Step 3: Success Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit QA: ALL PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Cycles: {cycle}/{max}
  Fixes Applied: {N}
  Test Command: {command}

  Cycle History:
  #1  {N} failures → Jay fix → {files changed}
  #2  {N} failures → Jay fix → {files changed}
  #3  ALL PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 4: Stuck Report (Same Error 3x)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit QA: STUCK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Cycles: {cycle}/{max}
  Recurring Error: {errorSig}
  Appeared: {count} times

  This error persists after multiple fix attempts.
  Manual investigation recommended.

  Suggestion: /swkit debug "{errorSig}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 5: Max Cycles Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit QA: MAX CYCLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Cycles: 5/5 (limit reached)
  Remaining Failures: {N}

  Last Error:
  {last test output snippet}

  Options:
  1. /swkit debug — 과학적 디버깅으로 전환
  2. /swkit qa — 추가 5 사이클 실행
  3. 수동 수정 후 재시도
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Signature Extraction

Extract a normalized error signature from test output:
1. Find the FIRST failing test name + error message
2. Strip variable parts (timestamps, paths, line numbers)
3. Normalize whitespace
4. Use as comparison key for same-error detection

Example:
- Raw: `TypeError: Cannot read property 'id' of undefined at /src/auth.js:42`
- Signature: `TypeError: Cannot read property 'id' of undefined`

## Integration with Team Pipeline

When used within `/swkit team` (team-verify stage):
- QA loop runs after exec stage completes
- Failures trigger team-fix stage
- QA loop results feed into verification report

## Error Handling

- Test command not found → ask user to specify
- Jay fix introduces new failures → count as new cycle, detect if oscillating
- Bash timeout → report as infrastructure error, suggest manual run
