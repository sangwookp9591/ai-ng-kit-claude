# aing Commands Reference

## Workflow

| Command | What it does |
|---------|-------------|
| `/aing start <name>` | Start PDCA cycle (Plan stage) |
| `/aing auto <feat> <task>` | Full pipeline: Klay - Able - Jay/Derek - Milla - Sam |
| `/aing status` | Real-time dashboard (PDCA + TDD + Tasks + Budget) |
| `/aing next` | Advance to next PDCA stage |
| `/aing wizard` | Iron -- guided magic for non-developers |

## TDD

| Command | What it does |
|---------|-------------|
| `/aing tdd start <feat> <target>` | Begin RED phase -- write failing test first |
| `/aing tdd check pass` | Record pass -- advance phase (RED-GREEN-REFACTOR) |
| `/aing tdd check fail` | Record fail -- stay in current phase with guidance |
| `/aing tdd status` | Show current TDD phase |

## Task Checklist

| Command | What it does |
|---------|-------------|
| `/aing task create <title>` | Create Main Task with Sub Tasks |
| `/aing task check <id> <seq>` | Mark subtask done |
| `/aing task list` | List all tasks with progress |

## Agent Direct

| Command | Agent | Role |
|---------|-------|------|
| `/aing explore <target>` | Klay | Architecture + codebase scan |
| `/aing plan <task>` | Able + Klay | Requirements + architecture |
| `/aing execute <task>` | Jay + Derek | Backend + Frontend |
| `/aing review` | Milla | Security + quality review |
| `/aing verify` | Sam | Final review + evidence chain |

## Review Pipeline

| Command | What it does |
|---------|-------------|
| `/aing review-pipeline` | Auto-select review depth by complexity |
| `/aing review-pipeline eng` | Eng Review: Klay + Jay + Milla |
| `/aing review-pipeline ceo` | CEO Review: Able + Sam |
| `/aing review-pipeline design` | Design Review: Willji + Iron |
| `/aing review-pipeline full` | All 4 tiers + outside voice |

**Complexity-based auto-selection:**

| Complexity | Tiers |
|:----------:|-------|
| low (0-3) | Eng only (Milla) |
| mid (4-7) | Eng + Design |
| high (8+) | CEO + Eng + Design + Outside Voice |

## Ship Workflow

| Step | Action |
|:----:|--------|
| 1 | Pre-flight: review dashboard CLEARED + evidence PASS |
| 2 | Base branch merge (auto conflict detection) |
| 3 | Test execution + failure triage |
| 4 | Pre-landing review (SQL injection, LLM boundary, scope drift) |
| 5 | Version bump (auto major/minor/patch) |
| 6 | CHANGELOG generation (conventional commits) |
| 7 | Push + PR creation (auto-generated body) |

## Security

| Command | What it does |
|---------|-------------|
| `/aing review cso` | 14-phase security audit (OWASP + STRIDE + secrets + supply chain) |

## Recovery & Safety

| Command | What it does |
|---------|-------------|
| `/aing rollback` | Revert to last git checkpoint |
| `/aing freeze <dir>` | Restrict edits to directory |
| `/aing unfreeze` | Clear freeze restriction |
| `/aing careful` | Safety mode for production work |

## Design

| Command | What it does |
|---------|-------------|
| `/aing design-consultation` | Full design system proposal |
| `/aing design-review` | Visual QA audit (AI slop + litmus + hard rejections) |

## Other

| Command | What it does |
|---------|-------------|
| `/aing retro [7d|14d|30d]` | Engineering retrospective |
| `/aing benchmark` | Performance regression detection |
| `/aing investigate` | Systematic debugging (4-phase) |
| `/aing office-hours` | YC-style product review |
| `/aing perf runtime` | Performance analysis |
| `/aing refactor src/` | Code refactoring |
| `/aing lsp` | Dead code / static analysis |
| `/aing land-and-deploy` | Full CD pipeline (merge → deploy → canary) |
| `/aing learn show` | View cross-session learning |
| `/aing help` | Show agent team and commands |

## Quick Reference

| 상황 | 명령어 |
|:-----|:------|
| 간단한 수정 | `/aing do "설명"` |
| 새 기능 | `/aing auto 기능명 "설명"` |
| 버그 | `/aing debug "증상"` |
| 코드 리뷰 | `/aing review-pipeline` |
| PR + 배포 | `/aing ship` |
| 테스트 | `/aing tdd start 기능 "설명"` |
| 코드 이해 | `/aing explore src/` |
| 보안 감사 | `/aing review cso` |
| 실수 복구 | `/aing rollback` |
