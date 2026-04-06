<p align="center">
  <img src="images/banner.svg" width="600" alt="aing Harness Engineering Agent">
</p>

<p align="center">
  <a href="#install">Install</a> · <a href="#team">Team</a> · <a href="#why">Why aing</a> · <a href="#quick-start">Quick Start</a> · <a href="#performance">Performance</a> · <a href="docs/COMMANDS.md">Commands</a> · <a href="docs/USER-GUIDE.md">Guide</a>
</p>

---

## Install

```
/plugin marketplace add sangwookp9591/ai-ng-kit-claude
/plugin install aing
```

업데이트: `claude plugin update aing@aing-marketplace`

> 릴리즈 방법: [docs/RELEASE.md](docs/RELEASE.md) 참고. `package.json` + `.claude-plugin/marketplace.json` + `.claude-plugin/plugin.json` 3곳 버전 동일 필수.

---

<h2 id="team">Agent Team (21 named agents)</h2>

<table>
<tr>
<td width="50%" valign="top">

### Leadership

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/simon.svg" width="18"> | **Simon** | CEO / Product Strategy | `opus` |
| <img src="images/sam.svg" width="18"> | **Sam** | CTO / Lead | `opus` |
| <img src="images/able.svg" width="18"> | **Able** | PM / Planning | `opus` |
| <img src="images/klay.svg" width="18"> | **Klay** | Architect / Explorer | `opus` |
| | **Ryan** | Deliberation Facilitator | `opus` |

### Design

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/willji.svg" width="18"> | **Willji** | UI/UX Designer | `sonnet` |

</td>
<td width="50%" valign="top">

### Backend

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/jay.svg" width="18"> | **Jay** | API Development | `sonnet` |
| <img src="images/jerry.svg" width="18"> | **Jerry** | DB / Infrastructure | `sonnet` |
| <img src="images/milla.svg" width="18"> | **Milla** | Security / Auth | `sonnet` |
| | **Critic** | Deliberation Critic | `opus` |
| | **Noa** | Synthesis Verifier | `sonnet` |
| | **Jun** | Performance / Optimization | `sonnet` |
| <img src="images/kain.svg" width="18"> | **Kain** | Code Intelligence | `sonnet` |

### Frontend

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/derek.svg" width="18"> | **Derek** | Screen Build | `sonnet` |
| <img src="images/rowan.svg" width="18"> | **Rowan** | Motion / Interaction | `sonnet` |

</td>
</tr>
<tr>
<td colspan="2">

### AI / ML

| | Name | Role | Model |
|:---:|------|------|:-----:|
| | **Jo** | AI Implementation Senior | `sonnet` |
| | **Hugg** | AI Model Research Senior | `sonnet` |

### Special

| | Name | Role | Model |
|:---:|------|------|:-----:|
| <img src="images/iron.svg" width="18"> | **Iron** | Wizard -- guided magic for non-developers | `sonnet` |
| | **Teacher** | Socratic teaching -- learns by questioning | `sonnet` |

</td>
</tr>
</table>

---

<h2 id="why">Why aing</h2>

**21 agents, 41 skills, 60 browse commands, 1,098 tests, AING-DR Consensus Planning.**

| Feature | Spec |
|:--------|:-----|
| Named Agents | **21** (role, personality, model tier) |
| Skills | **41** (debug, review, ship, TDD, perf, CSO, harness, ai-pipeline...) |
| Browse Commands | **60** (MCP Playwright) |
| PDCA Lifecycle | **auto-scaling** (complexity 0-15) |
| Cost Intelligence | **budget + ceiling + model router** |
| Self-Healing | **circuit breaker + retry + rollback** |
| Multi-AI Consensus | **3-voice voting** (Claude + Codex + Gemini) |
| Evidence Chain | **6-type mandatory proof** |
| Design System | **5 modules** (token/compare/iterate/evolve/gallery) |
| Ship Pipeline | **11 steps** (test → review → version → PR) |
| Tests | **1,098** pass |
| Eval System | **10 E2E suites** |
| Runtime Deps | **1** (ast-grep) |
| Hook Response | **5ms** |

> 상세: [docs/WHY-AING.md](docs/WHY-AING.md)

---

<h2 id="quick-start">Quick Start</h2>

자연어로 말하면 됩니다. 명령어를 외울 필요 없어요.

```
로그인 기능 만들어줘
```

또는 `/aing do "로그인 기능 만들어줘"`

| 상황 | 명령어 |
|:-----|:------|
| 간단한 수정 | `/aing do "설명"` |
| 새 기능 | `/aing auto 기능명 "설명"` |
| 버그 | `/aing debug "증상"` 또는 `/aing investigate` |
| 코드 리뷰 | `/aing review-pipeline` |
| 보안 감사 | `/aing review cso` |
| 하네스 설계 | `/aing harness "리서치 팀 만들어"` |
| PR + 배포 | `/aing ship` → `/aing land-and-deploy` |
| 교육/학습 | `/aing teacher "배우고 싶은 기능"` |
| 디자인 시스템 | `/aing design-consultation` |
| AI 파이프라인 | `/aing ai-pipeline "감성 분석 모델 브라우저 실행"` |
| 성능 분석 | `/aing perf runtime` |
| 실수 복구 | `/aing rollback` |
| 비개발자 | `/aing wizard` |

> 전체 명령어: [docs/COMMANDS.md](docs/COMMANDS.md) · 초보자 가이드: [docs/USER-GUIDE.md](docs/USER-GUIDE.md)

---

### 새로워진 aing: Teacher 모드 🧑‍🏫

단순히 코드를 짜주는 것을 넘어, **함께 만들며 배우는** AI 교육 엔진이 탑재되었습니다.

- **개념 분해**: 구현하려는 기능을 단계별 개념으로 쪼개어 설명합니다 (`ast-grep` 기반 분석).
- **소크라테스식 질문**: 코드를 바로 짜지 않고, 사용자의 이해를 돕기 위한 질문을 먼저 던집니다.
- **학습 추적**: 세션이 바뀌어도 사용자가 어디까지 배웠는지 기억하고 다음 단계로 안내합니다.

```bash
/aing teacher "React에서 무한 스크롤 구현하기"
/aing teacher "Redux Toolkit 패턴 배우기"
/aing teacher status # 내 학습 현황 확인
```

---

### 24 Innovations

| # | Innovation | What it solves |
|:-:|-----------|---------------|
| 1 | **Context Budget** | Token consumption tracking per hook |
| 2 | **Cross-Session Learning** | Pattern reuse with confidence decay |
| 3 | **Adaptive Routing** | Complexity → haiku/sonnet/opus |
| 4 | **Evidence Chain** | No evidence, no "done" |
| 5 | **Self-Healing** | Circuit breaker + recovery + rollback |
| 6 | **4-Tier Review** | CEO/Eng/Design/Outside Voice |
| 7 | **Ship Workflow** | 7-step automated pipeline |
| 8 | **CSO Audit** | 14-phase OWASP + STRIDE |
| 9 | **AI Slop Detection** | 10 anti-patterns + 7 litmus |
| 10 | **Multi-AI Consensus** | 3-voice voting with sovereignty |
| 11 | **PDCA Auto-Scaling** | Complexity → iteration limits |
| 12 | **Prompt Injection Guard** | 7 patterns + XML trust boundary |
| 13 | **Design System Engine** | Token gen/compare/iterate/evolve/gallery |
| 14 | **Teacher Agent** | Socratic learning by questioning |
| 15 | **41 Skills** | Full workflow coverage |
| 16 | **60 Browse Commands** | MCP Playwright powered |
| 17 | **Autoplan Engine** | 6-principle auto-decision |
| 18 | **Confidence Decay** | 30-day decay for observed learnings |
| 19 | **AST Grep** | Structural code search/replace via @ast-grep/napi |
| 20 | **3-Tier Notepad** | Priority/working/manual — survives compaction |
| 21 | **Team Heartbeat** | Worker health monitoring + phase gate verification |
| 22 | **Learner Hook** | Auto-detect reusable command/file/error-fix patterns |
| 23 | **Persistent Mode** | Don't-stop execution with session recovery |
| 24 | **Production Browse Server** | Session/activity/auth/crash-recovery (1,706 LOC) |
| 25 | **Harness Architect** | Meta-skill: auto-design + validate + gallery + simulate + evolve + compose + debug (2,523 LOC) |

### Harness 4-Axis

| Axis | Score | Modules |
|------|:-----:|---------|
| Constrain | 93 | Guardrail(7), Safety Invariants(5), Cost Ceiling, Freeze, Phase Gate |
| Inform | 93 | Context Budget, Progress, Compaction, Telemetry, 3-Tier Notepad, Learner |
| Verify | 95 | Evidence Chain, LLM Judge(7), Review(4-tier), QA Health, 1,712 Tests, 10 E2E Suites |
| Correct | 92 | Circuit Breaker, Retry, Recovery, Rollback, Persistent Mode, Heartbeat |

---

<h2 id="performance">Performance</h2>

| Metric | Result |
|--------|--------|
| Hook response | **5ms** |
| Test suite | **1,098 cases / 255 suites** (node:test + E2E + eval) |
| Runtime deps | **1** (@ast-grep/napi) |
| Modules | **149+** (~38.5K LOC) |
| Hook events | **10** (7 → +Subagent/Compact) |
| Browse commands | **60** |
| Skills | **41** |
| Agents | **18** |
| Design system | **1,200+ LOC** (5 modules) |
| Browse server | **1,706 LOC** (production grade) |

## Requirements

- Claude Code v2.1.69+
- Node.js v22+

## License

Apache-2.0

---

<p align="center">
  <sub>Built by <a href="https://github.com/sangwookp9591">SW</a></sub>
</p>
