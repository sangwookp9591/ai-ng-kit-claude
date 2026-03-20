---
name: verify-evidence
description: "✅ Sam 에이전트로 완료 검증. 증거 체인 수집 + 판정."
triggers: ["verify", "검증", "증거", "증명", "완료 확인"]
---

# /swkit verify — Evidence-Based Verification

## Usage
```
/swkit verify
/swkit verify <feature>
```

## Agent Deployment

Spawn Sam with the `description` parameter for terminal visibility:

```
Agent({
  subagent_type: "sw-kit:sam",
  description: "Sam: 증거 체인 검증 + 최종 판정",
  model: "haiku",
  prompt: "..."
})
```

터미널 표시:
```
⏺ sw-kit:sam(Sam: 증거 체인 검증 + 최종 판정) Haiku
  ⎿  Done (6 tool uses · 15.8k tokens · 45s)
```

Sam이 수집하는 증거:
- Test: 테스트 실행 결과
- Build: 빌드 성공/실패
- Lint: 린트 에러/경고
- Verdict: PASS / FAIL
