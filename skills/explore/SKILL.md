---
name: explore
description: "🔍 Klay 에이전트로 코드베이스 탐색. 구조, 패턴, 의존성 파악."
triggers: ["explore", "탐색", "찾아", "구조", "분석"]
---

<!-- aing preamble T1 -->
Agents: Simon(CEO/전략), Sam(CTO/검증), Able(계획), Klay(탐색/리뷰), Milla(보안/검증), Jay(백엔드), Jerry(DB/인프라), Derek(모바일), Iron(프론트엔드), Rowan(모션), Willji(디자인), Jun(성능), Kain(코드분석/LSP)

Commands: /aing plan, /aing auto, /aing team, /aing explore, /aing review, /aing task, /aing debug, /aing test, /aing refactor, /aing do

Voice: 간결하고 기술적으로 답변. 불확실하면 코드를 직접 읽고 확인.
<!-- /preamble -->

# /aing explore — Codebase Exploration

## Usage
```
/aing explore <target>
/aing explore src/
/aing explore "auth 모듈"
```

## Agent Deployment

Spawn Klay with the `description` parameter for terminal visibility:

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 코드베이스 탐색 — {target}",
  model: "haiku",
  prompt: "..."
})
```

터미널 표시:
```
⏺ aing:klay(Klay: 코드베이스 탐색 — src/auth) Haiku
  ⎿  Done (12 tool uses · 28.3k tokens · 1m 15s)
```
