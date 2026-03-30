# Testing Guide

aing uses a four-tier testing strategy with no external test framework — everything runs on
Node.js built-in `node --test`.

## Test Tiers

### Tier 1: Unit Tests

Fast, isolated tests for individual modules. No network, no file system side effects.

```bash
node --test tests/*.test.mjs
node --test tests/core/*.test.mjs
```

Target: every `scripts/` module has a corresponding `tests/<category>/<module>.test.mjs`.

### Tier 2: Integration Tests

Cross-module tests that verify wiring between components (e.g., intent router feeding
complexity scorer, evidence chain consuming LLM judge output).

```bash
node --test tests/integration/*.test.mjs
```

These may read fixture files from `tests/fixtures/` but still avoid network calls.

### Tier 3: End-to-End (E2E) Tests

Full pipeline tests that exercise the PDCA cycle, ship workflow, or review pipeline
end-to-end with mocked agent responses.

```bash
node --test tests/e2e/*.test.mjs
```

E2E tests use the `tests/helpers/mock-agent.mjs` harness to simulate multi-agent
interactions without spawning real subprocesses.

### Tier 4: LLM Eval (Gated)

Non-deterministic quality evaluations using `llm-judge.mjs`. These call a real LLM and
are gated behind the `EVALS=1` environment variable to avoid accidental cost.

```bash
EVALS=1 node --test tests/eval/*.test.mjs
```

Eval tests are never run in standard CI. They are triggered manually or in a dedicated
eval pipeline.

## Diff-Based Test Selection (`touchfiles.mjs`)

`scripts/build/touchfiles.mjs` analyzes `git diff` output to determine which test files
are affected by the current changes:

```bash
node scripts/build/touchfiles.mjs
# Output: list of test files that cover changed modules
```

How it works:

1. Parse `git diff --name-only` for changed source files.
2. Map each source file to its test file(s) via naming convention and import graph.
3. Output the minimal set of test files that cover the change.

This is used in CI to run only relevant tests on PRs, keeping pipeline time under 60 seconds
for typical changes.

## Eval Store

The eval store (`scripts/evidence/eval-store.mjs`) persists LLM judge scores across runs
so you can track quality trends:

```bash
# Run evals and store results
EVALS=1 node --test tests/eval/*.test.mjs

# Compare current scores against baseline
node scripts/evidence/eval-store.mjs --compare
```

Scores are stored in `.aing/evals/` as timestamped JSON files. Each entry records:

- Test name and module under evaluation
- 7 criteria scores (0-10 each)
- Aggregate score
- Model and prompt version used

## LLM Judge (`scripts/evidence/llm-judge.mjs`)

The LLM judge evaluates generated output against 7 criteria:

| #  | Criterion       | Weight | What it measures                          |
|----|-----------------|:------:|-------------------------------------------|
| 1  | Correctness     | 20%    | Factual accuracy, no hallucination        |
| 2  | Completeness    | 15%    | All requirements addressed                |
| 3  | Clarity         | 15%    | Readable, well-structured output          |
| 4  | Safety          | 15%    | No harmful content, proper guardrails     |
| 5  | Efficiency      | 10%    | Token/resource efficiency                 |
| 6  | Consistency     | 10%    | Aligns with prior decisions and context   |
| 7  | User Alignment  | 15%    | Matches user intent and preferences       |

Scores are normalized to 0-10. A passing threshold is 7.0 aggregate.

## Running Tests

### All unit tests
```bash
node --test tests/*.test.mjs
```

### Specific category
```bash
node --test tests/core/*.test.mjs
node --test tests/routing/*.test.mjs
node --test tests/review/*.test.mjs
node --test tests/ship/*.test.mjs
```

### With verbose output
```bash
node --test --test-reporter spec tests/*.test.mjs
```

### Only tests affected by current diff
```bash
node --test $(node scripts/build/touchfiles.mjs)
```

## CI Pipeline Expectations

The CI pipeline runs on every push and PR:

1. **Lint check** — `node scripts/build/check-freshness.mjs` verifies generated files are
   up to date.
2. **Unit + Integration** — `node --test tests/*.test.mjs tests/integration/*.test.mjs`
   must pass with zero failures.
3. **E2E** — `node --test tests/e2e/*.test.mjs` runs the full pipeline tests.
4. **Touchfile gate** — On PRs, only diff-selected tests run (via `touchfiles.mjs`).
5. **Eval (optional)** — Scheduled nightly with `EVALS=1`. Not blocking for PRs.

Expected metrics for v3.0:
- 446+ tests across 118 suites
- Zero external test dependencies (no mocha, jest, vitest)
- Sub-60s CI for typical PRs (touchfile-selected)
