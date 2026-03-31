# E2E Test Framework for ai-ng Claude

A 3-tier evaluation infrastructure for testing ai-ng skills end-to-end.

## Architecture

```
Tier 1: Session Runner     — spawns Claude Code, captures NDJSON output
Tier 2: Eval Store          — persists results, detects regressions across runs
Tier 3: LLM Judge           — uses Claude as a judge model to score quality
```

### Tier 1 — Session Runner (`session-runner.ts`)

Spawns `claude -p --output-format stream-json` and parses the NDJSON stream into structured data:

- `AssistantMessage[]` — all assistant text messages
- `ToolCall[]` — every tool invocation with name, input, and result
- Duration, success/failure, raw output

### Tier 2 — Eval Store (`eval-store.ts`)

Stores evaluation results to `~/.aing/evals/` as timestamped JSON files. Supports:

- **Save** — persist any eval result with test name, score, details
- **Load** — retrieve the latest result for a given test
- **Compare** — diff two eval sets to find improvements, regressions, unchanged, and new tests
- **List** — browse recent evaluations

### Tier 3 — LLM Judge (`llm-judge.ts`)

Uses Claude as an evaluator. Sends the skill output plus a rubric to `claude -p` and parses a structured JSON score. Default criteria:

| Criterion     | Weight | Description                                    |
|---------------|--------|------------------------------------------------|
| correctness   | 3.0    | Did the skill produce correct output?          |
| completeness  | 2.0    | Did it cover all required aspects?             |
| clarity       | 1.5    | Is the output clear and well-structured?       |
| efficiency    | 1.0    | Did it use tools/agents efficiently?           |
| safety        | 1.5    | Did it respect guardrails and safety invariants?|
| evidence      | 0.5    | Did it provide evidence for claims?            |
| voice         | 0.5    | Did it maintain the correct agent voice?       |

## Running Tests

### Prerequisites

- Node.js >= 22
- `claude` CLI installed and authenticated
- The project checked out at `/Users/iron/Project/ai-ng-claude/`

### Quick run (unit-style assertions only)

```bash
EVALS=1 node --test tests/e2e/skills/auto-skill.e2e.test.ts
EVALS=1 node --test tests/e2e/skills/review-skill.e2e.test.ts
```

### Run all E2E tests

```bash
npm run test:e2e
```

### Include LLM Judge scoring

```bash
EVALS=1 JUDGE=1 node --test tests/e2e/skills/review-skill.e2e.test.ts
```

### Environment variables

| Variable | Purpose                                  |
|----------|------------------------------------------|
| `EVALS`  | Set to `1` to enable E2E tests (skipped by default) |
| `JUDGE`  | Set to `1` to enable LLM judge scoring (expensive)  |

## Adding a New E2E Test

1. Create `tests/e2e/skills/<skill-name>.e2e.test.ts`
2. Import the 3-tier utilities:

```typescript
import { runSession } from '../session-runner.js';
import { saveEval, loadLatestEval } from '../eval-store.js';
import { judgeOutput } from '../llm-judge.js';  // optional
```

3. Follow this pattern:

```typescript
import { describe, it, before } from 'node:test';
import assert from 'node:assert';

const SKIP = !process.env['EVALS'];

describe('my-skill E2E', { skip: SKIP ? 'Set EVALS=1' : false }, () => {
  let result;

  before(async () => {
    result = await runSession({
      prompt: '/aing my-skill "task description"',
      timeout: 120_000,
    });
  });

  it('should complete successfully', () => {
    assert.ok(result.success);
  });

  it('should persist eval', () => {
    saveEval({
      testName: 'my-skill-basic',
      timestamp: new Date().toISOString(),
      duration: result.duration,
      passed: result.success,
      details: { toolCallCount: result.toolCalls.length },
    });
  });
});
```

## Eval Storage

Results are saved to `~/.aing/evals/` with naming `{timestamp}-{testName}.json`.

To compare runs:

```typescript
import { listEvals, compareEvals } from './eval-store.js';

const all = listEvals(100);
const baseline = all.filter(e => e.timestamp < '2026-03-01');
const current = all.filter(e => e.timestamp >= '2026-03-01');
const diff = compareEvals(baseline, current);
console.log(diff);  // { improved, regressed, unchanged, newTests }
```

## Design Decisions

- **NDJSON parsing**: Claude CLI's `stream-json` format emits one JSON object per line. The session runner handles partial lines and multiple event types.
- **Skip by default**: E2E tests are expensive (they spawn real Claude sessions). They only run when `EVALS=1` is set, preventing accidental cost during `npm test`.
- **LLM Judge is opt-in**: Judge evaluation requires an extra Claude call per test. Enable with `JUDGE=1`.
- **Regression detection**: Each test persists its eval result. Subsequent runs compare against the latest baseline to catch regressions automatically.
