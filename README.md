<p align="center">
  <img src="images/banner.svg" width="600" alt="sw-kit Harness Engineering Agent">
</p>

<p align="center">
  <a href="#install">Install</a> · <a href="#team">Team</a> · <a href="#innovations">Innovations</a> · <a href="#commands">Commands</a> · <a href="#architecture">Architecture</a>
</p>

---

## Install

**Claude Code 세션에서**

```
/plugin marketplace add sangwookp9591/sw-kit-claude
```

```
/plugin install sw-kit
```

**터미널에서 한 줄로**

```
claude plugin marketplace add sangwookp9591/sw-kit-claude && claude plugin install sw-kit
```

**업데이트**

```
claude plugin update sw-kit@swkit-marketplace
```

---

<h2 id="team">Agent Team (10 named agents)</h2>

<table>
<tr>
<td width="50%" valign="top">

### <img src="images/sam.svg" width="16"> Leadership

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/sam.svg" width="18"> | **Sam** | CTO / Lead | `opus` |
| <img src="images/able.svg" width="18"> | **Able** | PM / Planning | `sonnet` |
| <img src="images/klay.svg" width="18"> | **Klay** | Architect / Explorer | `opus` |

### <img src="images/willji.svg" width="16"> Design

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/willji.svg" width="18"> | **Willji** | UI/UX Designer | `sonnet` |

</td>
<td width="50%" valign="top">

### <img src="images/jay.svg" width="16"> Backend

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/jay.svg" width="18"> | **Jay** | API Development | `sonnet` |
| <img src="images/jerry.svg" width="18"> | **Jerry** | DB / Infrastructure | `sonnet` |
| <img src="images/milla.svg" width="18"> | **Milla** | Security / Auth | `sonnet` |

### <img src="images/derek.svg" width="16"> Frontend

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/derek.svg" width="18"> | **Derek** | Screen Build | `sonnet` |
| <img src="images/rowan.svg" width="18"> | **Rowan** | Motion / Interaction | `sonnet` |

</td>
</tr>
<tr>
<td width="100%" colspan="2" valign="top">

### <img src="images/iron.svg" width="16"> Magic

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/iron.svg" width="18"> | **Iron** | Wizard -- guided magic for non-developers | `sonnet` |

</td>
</tr>
</table>

### Cost-Aware Team Presets

Teams are **auto-selected** based on task complexity analysis:

| Preset | Size | Est. Cost | When |
|--------|:----:|-----------|------|
| **Solo** | 1 | ~15K tok | Bug fix, single file |
| **Duo** | 2 | ~18K tok | Mid feature, API |
| **Squad** | 4 | ~48K tok | Fullstack, multi-domain |
| **Full** | 7 | ~123K tok | Architecture, security |

---

<h2 id="innovations">5 Innovations</h2>

| | Innovation | What it solves |
|:---:|-----------|---------------|
| 1 | **Context Budget** | Tracks ~token consumption per hook, trims by priority when over budget |
| 2 | **Cross-Session Learning** | Captures success patterns, reapplies in future sessions automatically |
| 3 | **Adaptive Routing** | Scores task complexity, routes to haiku / sonnet / opus dynamically |
| 4 | **Evidence Chain** | Collects test/build/lint proof -- no evidence, no "done" |
| 5 | **Self-Healing** | Health check + recovery engine + circuit breaker + git rollback |

### Harness 4-Axis Score

```
Constrain  ██████████████████████████████████████████████░░ 92
Inform     ████████████████████████████████████████████░░░░ 90
Verify     ████████████████████████████████████████████░░░░ 90
Correct    ████████████████████████████████████████████░░░░ 90
                                                     avg 90.5
```

| Axis | Modules |
|------|---------|
| **Constrain** | Guardrail Engine (7 rules), Safety Invariants (5 limits), Cost Ceiling, Dry-Run |
| **Inform** | Context Budget, Progress Tracker, Convention Extractor, Context Compaction |
| **Verify** | TDD Engine (RED-GREEN-REFACTOR), Evidence Chain, Agent Trace |
| **Correct** | Health Check, Recovery Engine, Circuit Breaker, Retry (exp. backoff), Rollback |

---

<h2 id="commands">Commands</h2>

### Workflow

| Command | What it does |
|---------|-------------|
| `/swkit start <name>` | Start PDCA cycle (Plan stage) |
| `/swkit auto <feat> <task>` | Full pipeline: Klay - Able - Jay/Derek - Milla - Sam |
| `/swkit status` | Real-time dashboard (PDCA + TDD + Tasks + Budget) |
| `/swkit next` | Advance to next PDCA stage |
| `/swkit wizard` | <img src="images/iron.svg" width="14"> Iron -- guided magic for non-developers |

### TDD

| Command | What it does |
|---------|-------------|
| `/swkit tdd start <feat> <target>` | Begin RED phase -- write failing test first |
| `/swkit tdd check pass` | Record pass -- advance phase (RED-GREEN-REFACTOR) |
| `/swkit tdd check fail` | Record fail -- stay in current phase with guidance |
| `/swkit tdd status` | Show current TDD phase |

### Task Checklist

| Command | What it does |
|---------|-------------|
| `/swkit task create <title>` | Create Main Task with Sub Tasks |
| `/swkit task check <id> <seq>` | Mark subtask done |
| `/swkit task list` | List all tasks with progress |

### Agent Direct

| Command | Agent | Role |
|---------|-------|------|
| `/swkit explore <target>` | <img src="images/klay.svg" width="14"> Klay | Architecture + codebase scan |
| `/swkit plan <task>` | <img src="images/able.svg" width="14"> Able + <img src="images/klay.svg" width="14"> Klay | Requirements + architecture |
| `/swkit execute <task>` | <img src="images/jay.svg" width="14"> Jay + <img src="images/derek.svg" width="14"> Derek | Backend + Frontend |
| `/swkit review` | <img src="images/milla.svg" width="14"> Milla | Security + quality review |
| `/swkit verify` | <img src="images/sam.svg" width="14"> Sam | Final review + evidence chain |

### Recovery

| Command | What it does |
|---------|-------------|
| `/swkit rollback` | Revert to last git checkpoint (non-destructive) |
| `/swkit learn show` | View cross-session learning history |
| `/swkit help` | Show agent team and full command list |

---

## Quick Start

```
-- Start a PDCA cycle
/swkit start user-auth

-- Or run the full pipeline automatically
/swkit auto user-auth "JWT authentication with refresh tokens"

-- Non-developer? Just say what you want
/swkit wizard
```

### Pipeline Flow

<p align="center">
  <img src="images/pipeline-flow.svg" width="600" alt="sw-kit pipeline flow">
</p>

```
/swkit auto user-auth "JWT auth"

  1. Klay     -- scan codebase, extract conventions, design architecture
  2. Able     -- write requirements + spec + task checklist
  3. Jay      -- implement API (TDD: RED-GREEN-REFACTOR)
     Jerry    -- database schema + migration
     Milla    -- auth middleware + security
     Willji   -- login UI design
     Derek    -- frontend implementation
     Rowan    -- form interactions + animations
  4. Milla    -- security review (OWASP Top 10)
     Sam      -- final code review + evidence chain
  5. Sam      -- verdict:
                 [test] PASS (24/24)
                 [build] PASS
                 [lint] PASS (0 errors)
                 Verdict: PASS

  -> .sw-kit/reports/ completion report
  -> Cross-Session Learning captured
```

---

## Multilingual

Korean and English auto-detected:

| Input | Action |
|-------|--------|
| "plan" / "plan this" | PDCA Plan stage |
| "verify" / "verify" | PDCA Check stage |
| "build me" / "build" | Iron wizard mode |
| "explore" / "explore" | Klay codebase scan |

---

<h2 id="architecture">Architecture</h2>

```
sw-kit-claude/
  .claude-plugin/plugin.json         -- plugin manifest
  hooks/hooks.json                   -- 7 hook events
  hooks-handlers/                    -- session-start, user-prompt, pre/post-tool, compact, stop
  scripts/
    core/         state, config, logger, context-budget, display, dashboard, stdin
    guardrail/    guardrail-engine, safety-invariants, cost-ceiling, dry-run,
                  progress-tracker, convention-extractor
    pdca/         pdca-engine (5-Stage: plan-do-check-act-review)
    tdd/          tdd-engine (RED-GREEN-REFACTOR)
    routing/      complexity-scorer, model-router, routing-history
    memory/       project-memory, learning-capture
    evidence/     evidence-collector, evidence-chain, evidence-report
    recovery/     health-check, recovery-engine, circuit-breaker, retry-engine
    trace/        agent-trace
    compaction/   context-compaction (priority-based preservation)
    pipeline/     agent-pipeline, team-orchestrator, auto-runner, rollback, handoff
    task/         task-manager, plan-manager
    i18n/         intent-detector, locale
  agents/         10 named agents (sam, able, klay, jay, jerry, milla, willji, derek, rowan, iron)
  commands/       swkit.md, help.md
  skills/         11 skill definitions
  templates/      plan, review, completion, adr
  images/         12 custom SVG icons
```

### Runtime Data (`.sw-kit/`, gitignored)

```
.sw-kit/
  state/          PDCA status, TDD phase, invariants, pipeline, circuit-breaker
  tasks/          Main Task -> Sub Task checklists
  plans/          Plan documents
  snapshots/      Compaction snapshots (max 10)
  reports/        Completion reports
  handoffs/       Stage transition context
  logs/           Structured JSONL logs
```

---

## Performance

| Metric | Result |
|--------|--------|
| Hook response | **5ms** (budget: 5,000ms) |
| Config cold start | **36ms** |
| Test suite | **33/33 ALL GREEN** |
| External dependencies | **0** |
| Harness maturity | **Level 5 / 5** |

## Requirements

- Claude Code v2.1.69+
- Node.js v18+

## License

Apache-2.0

---

<p align="center">
  <sub>Built by <a href="https://github.com/sangwookp9591">SW</a></sub>
</p>
