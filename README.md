# sw-kit — Harness Engineering Agent

> **For developers: the ultimate assistant. For everyone: the ultimate magician.**

Structured workflows, intelligent context, self-learning agents for AI-native development.

```
44 modules | 160KB | 5,100+ LOC | 33/33 tests | 5ms hook response | 0 dependencies
```

---

## Install

Claude Code session:
```
/plugin marketplace add sangwookp9591/sw-kit-claude
/plugin install sw-kit
```

Terminal:
```bash
claude plugin marketplace add sangwookp9591/sw-kit-claude && claude plugin install sw-kit
```

## Update

```
/plugin update sw-kit
```

---

## Agent Team (12)

### CTO
| | Name | Role | Model |
|---|------|------|-------|
| <img src="images/sam.svg" width="20"> | **Sam** | CTO / Lead | opus |

### Planning
| | Name | Role | Model |
|---|------|------|-------|
| <img src="images/able.svg" width="20"> | **Able** | PM / Planning | sonnet |
| <img src="images/klay.svg" width="20"> | **Klay** | Architect / Design | opus |

### Backend
| | Name | Role | Model |
|---|------|------|-------|
| <img src="images/jay.svg" width="20"> | **Jay** | API Development | sonnet |
| <img src="images/jerry.svg" width="20"> | **Jerry** | DB / Infrastructure | sonnet |
| <img src="images/milla.svg" width="20"> | **Milla** | Security / Auth | sonnet |

### Design
| | Name | Role | Model |
|---|------|------|-------|
| <img src="images/willji.svg" width="20"> | **Willji** | UI/UX Design | sonnet |

### Frontend
| | Name | Role | Model |
|---|------|------|-------|
| <img src="images/derek.svg" width="20"> | **Derek** | Screen Implementation | sonnet |
| <img src="images/rowan.svg" width="20"> | **Rowan** | Interaction / Motion | sonnet |

### Ops
| | Name | Role | Model |
|---|------|------|-------|
| <img src="images/scout.svg" width="20"> | **Scout** | Codebase Explorer | haiku |
| <img src="images/proof.svg" width="20"> | **Proof** | Evidence Verifier | haiku |

### Magic
| | Name | Role | Model |
|---|------|------|-------|
| <img src="images/iron.svg" width="20"> | **Iron** | Wizard for Non-developers | sonnet |

---

## Cost-Aware Team Presets

Auto-selected based on task complexity:

| Preset | Members | Cost | Use Case |
|--------|:-------:|------|----------|
| Solo | 1 | ~15K tokens | Bug fix, single file change |
| Duo | 2 | ~18K tokens | Mid-size feature, API addition |
| Squad | 4 | ~48K tokens | Fullstack, multi-domain |
| Full | 7 | ~123K tokens | Architecture change, security-sensitive |

---

## 5 Innovations

| # | Innovation | Description |
|---|-----------|-------------|
| 1 | **Context Budget** | Token consumption tracking and optimization (~approximation) |
| 2 | **Cross-Session Learning** | Auto-capture success patterns for next session |
| 3 | **Adaptive Routing** | Complexity-based optimal model selection (haiku/sonnet/opus) |
| 4 | **Evidence Chain** | Structured completion proof via test/build/lint chain |
| 5 | **Self-Healing** | Auto failure detection, circuit breaker, git rollback |

## Harness Engineering 4-Axis (90.5/100)

| Axis | Score | What it does |
|------|:-----:|-------------|
| **Constrain** | 92 | Guardrail 7 rules, Safety Invariants 5 types, Cost Ceiling, Dry-Run |
| **Inform** | 90 | Context Budget, Progress Tracker, Convention Extractor, Compaction |
| **Verify** | 90 | TDD Engine (R-G-B), Evidence Chain, Agent Trace, 33/33 Tests |
| **Correct** | 90 | Self-Healing, Circuit Breaker, Git Rollback, Auto Team Recovery |

---

## Quick Start

```bash
# PDCA cycle
/swkit start my-feature

# Full pipeline auto-run
/swkit auto my-feature "Implement JWT auth"

# Wizard mode (non-developers)
/swkit wizard
```

## Commands

### PDCA
| Command | Description |
|---------|-------------|
| `/swkit start <name>` | Start PDCA cycle |
| `/swkit status` | Dashboard |
| `/swkit next` | Advance to next stage |
| `/swkit reset <name>` | Reset cycle |

### TDD
| Command | Description |
|---------|-------------|
| `/swkit tdd start <feature> <target>` | Start TDD (RED) |
| `/swkit tdd check <pass\|fail>` | Record result, phase transition |
| `/swkit tdd status` | Current TDD phase |

### Task
| Command | Description |
|---------|-------------|
| `/swkit task create <title>` | Create Main + Sub Tasks |
| `/swkit task check <id> <seq>` | Check subtask done |
| `/swkit task list` | List all tasks |

### Agent
| Command | Description |
|---------|-------------|
| `/swkit explore <target>` | <img src="images/scout.svg" width="14"> Scout -- codebase scan |
| `/swkit plan <task>` | <img src="images/able.svg" width="14"> Able + <img src="images/klay.svg" width="14"> Klay -- planning |
| `/swkit execute <task>` | <img src="images/jay.svg" width="14"> Jay + <img src="images/derek.svg" width="14"> Derek -- implementation |
| `/swkit review` | <img src="images/milla.svg" width="14"> Milla + <img src="images/proof.svg" width="14"> Proof -- review |
| `/swkit verify` | <img src="images/proof.svg" width="14"> Proof -- evidence chain |
| `/swkit wizard` | <img src="images/iron.svg" width="14"> Iron -- magic mode |

### Pipeline
| Command | Description |
|---------|-------------|
| `/swkit auto <feature> <task>` | Full auto-run |
| `/swkit rollback` | Checkpoint rollback |

### Utility
| Command | Description |
|---------|-------------|
| `/swkit learn show` | Learning history |
| `/swkit help` | Help |

---

## Multilingual

Auto-detects Korean and English:

```
"plan" / "plan"      -> Plan stage trigger
"verify" / "verify"  -> Check stage trigger
"build me" / "build" -> Iron wizard mode
```

---

## Architecture

```
.sw-kit/                    -- runtime data (gitignored)
  state/                    -- PDCA, TDD, invariants, pipeline, circuit-breaker
  tasks/                    -- checklist (main -> sub tasks)
  plans/                    -- plan documents
  snapshots/                -- compaction snapshots
  reports/                  -- completion reports
  logs/                     -- structured logs (JSONL)
  handoffs/                 -- stage transition handoffs
  routing-history.json      -- adaptive routing history
  project-memory.json       -- cross-session learning

hooks-handlers/             -- 7 hook handlers (sync readFileSync pattern)
scripts/
  core/                     -- state, config, logger, context-budget, display, dashboard
  guardrail/                -- guardrail-engine, safety-invariants, cost-ceiling,
                               dry-run, progress-tracker, convention-extractor
  pdca/                     -- pdca-engine (5-Stage)
  routing/                  -- complexity-scorer, model-router, routing-history
  memory/                   -- project-memory, learning-capture
  evidence/                 -- evidence-collector, evidence-chain, evidence-report
  recovery/                 -- health-check, recovery-engine, circuit-breaker, retry-engine
  trace/                    -- agent-trace
  compaction/               -- context-compaction (priority-based)
  pipeline/                 -- agent-pipeline, rollback, team-orchestrator, auto-runner, handoff
  tdd/                      -- tdd-engine (Red-Green-Refactor)
  task/                     -- task-manager, plan-manager
  i18n/                     -- intent-detector, locale
```

## Performance

| Metric | Result |
|--------|--------|
| Hook response | **5ms** (budget: 5,000ms) |
| Config cold start | **36ms** |
| Test suite | **33/33 ALL GREEN** |
| Dependencies | **0** |

## Requirements

- Claude Code v2.1.69+
- Node.js v18+

## License

Apache-2.0
