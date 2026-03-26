---
name: explore
description: "🔍 Klay 에이전트로 코드베이스 탐색. 구조, 패턴, 의존성 파악."
triggers: ["explore", "탐색", "찾아", "구조", "분석"]
---

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
