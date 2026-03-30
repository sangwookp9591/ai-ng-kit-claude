# Multi-AI Consensus Architecture

aing v3.0 introduces a Multi-AI Consensus Engine that coordinates three independent AI voices
(Claude, Codex, Gemini) to produce higher-quality decisions through structured voting.

## Overview

Traditional single-model pipelines have a blind-spot problem: one model's biases propagate
unchecked through every decision. The consensus engine solves this by treating each AI as an
independent voter. Decisions require agreement before they reach the user.

```
User Request
     |
Intent Router ──► DECISION_TYPE classification
     |
cli-bridge factory ──► spawn 3 AI voices
     |
┌────────┬────────┬────────┐
│ Claude │ Codex  │ Gemini │
└────┬───┴────┬───┴────┬───┘
     │        │        │
     ▼        ▼        ▼
  Consensus Voter (majority / unanimous)
     │
     ▼
  User Sovereignty Gate
     │
     ▼
  Final Decision
```

## cli-bridge Factory (`scripts/multi-ai/cli-bridge.mjs`)

The `createBridge(provider)` factory returns a uniform interface for each AI backend:

```js
import { createBridge } from './cli-bridge.mjs';

const claude  = createBridge('claude');
const codex   = createBridge('codex');
const gemini  = createBridge('gemini');

// Each bridge exposes the same API:
const response = await claude.ask(prompt, { context, timeout });
```

Bridges normalize provider-specific quirks (auth, token format, streaming) into a single
`.ask()` / `.review()` / `.challenge()` interface. Adding a new provider means implementing
one adapter — see "How to Add New AI Providers" below.

## DECISION_TYPES

Every decision the engine encounters is classified into one of four types. The type determines
how many voices vote and whether the user is consulted.

| Type               | Voters | Threshold  | User consulted? | Examples                            |
|--------------------|:------:|------------|:---------------:|-------------------------------------|
| `MECHANICAL`       |   1    | Auto-pass  | No              | Formatting, lint fixes, imports     |
| `TASTE`            |   3    | Majority   | On split        | Naming, structure, API shape        |
| `USER_CHALLENGE`   |   3    | Unanimous  | Always          | Scope changes, new dependencies     |
| `SECURITY_WARNING` |   3    | Unanimous  | Always (block)  | Credential exposure, unsafe eval    |

Classification happens in `decision-classifier.mjs` using signal analysis from the intent
router and complexity scorer.

## Consensus Voting Logic

### Unanimous (all agree)
The decision passes automatically. Evidence is logged but no user prompt is required
(except for `USER_CHALLENGE` and `SECURITY_WARNING`, which always surface).

### Majority (2 of 3 agree)
The majority opinion is adopted. The dissenting voice's reasoning is preserved in the
evidence chain so the user can review it later.

### Split (all disagree)
No decision is made. The engine presents all three perspectives to the user with a
structured comparison table and asks for a tie-break. This enforces User Sovereignty.

### Reject (any voice flags SECURITY_WARNING)
A single security flag from any voice blocks the action. The user must explicitly
acknowledge the risk before proceeding.

## User Sovereignty Principle

The consensus engine is advisory. The user always has final authority:

1. **Override**: Any consensus result can be overridden by the user with `--force`.
2. **Transparency**: Every vote is logged with reasoning, visible via `aing-analytics`.
3. **No silent action**: `USER_CHALLENGE` and `SECURITY_WARNING` decisions never auto-apply.
4. **Audit trail**: All consensus sessions are persisted in `.aing/consensus/` as JSONL.

This principle ensures the AI assists but never usurps human judgment on consequential
decisions.

## Integration with outside-voice.mjs

The existing `outside-voice.mjs` adversarial reviewer now participates in the consensus
engine as the "challenge" step:

1. The primary voice (Claude) proposes a solution.
2. `outside-voice.mjs` routes the proposal to the other two bridges (Codex, Gemini).
3. Each external voice independently reviews and votes.
4. Votes feed back into the consensus voter.

This replaces the previous single-model adversarial review with genuine cross-model
challenge, eliminating the "agreeable adversary" problem where a single model playing
devil's advocate still shares the same underlying biases.

```
outside-voice.mjs
     │
     ├──► codex.challenge(proposal)  ──► vote + reasoning
     │
     └──► gemini.challenge(proposal) ──► vote + reasoning
```

## How to Add New AI Providers

Adding a fourth (or fifth) voice requires three steps:

### 1. Create a bridge adapter

Create `scripts/multi-ai/bridges/<provider>.mjs`:

```js
export default {
  name: 'provider-name',

  async ask(prompt, opts = {}) {
    // Call the provider's API / CLI
    // Return { text, tokenUsage, latencyMs }
  },

  async review(diff, criteria) {
    // Return { verdict: 'pass'|'warn'|'fail', findings: [] }
  },

  async challenge(proposal, context) {
    // Return { vote: 'agree'|'disagree'|'block', reasoning: string }
  }
};
```

### 2. Register in cli-bridge.mjs

```js
import newProvider from './bridges/new-provider.mjs';

const PROVIDERS = {
  claude,
  codex,
  gemini,
  'new-provider': newProvider,   // add here
};
```

### 3. Update consensus quorum

In `consensus-voter.mjs`, the quorum thresholds auto-adjust based on provider count:

- 3 providers: majority = 2, unanimous = 3
- 4 providers: majority = 3, unanimous = 4
- N providers: majority = ceil(N/2), unanimous = N

No manual threshold changes are needed; the voter reads `PROVIDERS` at startup.

### Testing a new provider

```bash
# Unit test the bridge adapter
node --test tests/multi-ai/bridge-new-provider.test.mjs

# Integration test with consensus voting
EVALS=1 node --test tests/multi-ai/consensus.test.mjs
```

## Configuration

Provider availability and timeouts are configured in `.aing/config.json`:

```json
{
  "multiAi": {
    "providers": ["claude", "codex", "gemini"],
    "timeoutMs": 30000,
    "fallbackOnTimeout": "skip",
    "costMode": "balanced"
  }
}
```

- `fallbackOnTimeout`: `"skip"` (exclude timed-out voice) or `"block"` (wait indefinitely).
- `costMode`: `"balanced"` (all votes), `"economy"` (MECHANICAL decisions skip consensus).

## File Map

| File                              | Purpose                              |
|-----------------------------------|--------------------------------------|
| `scripts/multi-ai/cli-bridge.mjs`          | Bridge factory (`createBridge`)     |
| `scripts/multi-ai/consensus-voter.mjs`     | Voting logic and quorum             |
| `scripts/multi-ai/decision-classifier.mjs` | DECISION_TYPE classification        |
| `scripts/multi-ai/bridges/claude.mjs`      | Claude adapter                      |
| `scripts/multi-ai/bridges/codex.mjs`       | Codex adapter                       |
| `scripts/multi-ai/bridges/gemini.mjs`      | Gemini adapter                      |
| `scripts/review/outside-voice.mjs`         | Challenge integration               |
