---
name: review-code
description: "🛡️ Milla 에이전트로 코드 리뷰. 버그, 보안, 품질 점검."
triggers: ["review", "리뷰", "검토", "코드리뷰"]
---

# /swkit review — Code Review

## Usage
```
/swkit review
/swkit review src/auth/
```

## Agent Deployment

Spawn Milla with the `description` parameter for terminal visibility:

```
Agent({
  subagent_type: "sw-kit:milla",
  description: "Milla: 보안 리뷰 + 코드 품질 점검",
  model: "sonnet",
  prompt: "..."
})
```

터미널 표시:
```
⏺ sw-kit:milla(Milla: 보안 리뷰 + 코드 품질 점검) Sonnet
  ⎿  Done (11 tool uses · 45.7k tokens · 2m 40s)
```

Milla가 점검하는 항목:
- 버그, 로직 오류
- 보안 취약점 (OWASP Top 10)
- 성능 안티패턴
- 컨벤션 위반
