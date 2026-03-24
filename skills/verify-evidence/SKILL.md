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

## Step 4: Goal-Backward Verification (목표 달성 확인)

증거 체인 검증이 완료된 후, 목표-역방향 검증을 수행합니다:

1. 원래 작업 요청/계획서에서 **목표**를 추출합니다
2. 목표가 달성되려면 **무엇이 참이어야 하는지** 도출합니다 (3-5개 조건)
3. 각 조건을 코드/테스트에서 **실제로 검증**합니다
4. 최종 판정:
   - ACHIEVED: 증거 PASS + 목표 조건 모두 충족
   - COMPLETED_NOT_ACHIEVED: 증거 PASS + 일부 목표 미충족
   - FAILED: 증거 FAIL

Sam 에이전트에게 전달할 때 이 구분을 포함하세요.

유틸리티: `scripts/evidence/goal-checker.mjs`
```js
import { checkGoalAchievement, deriveAssertions } from './scripts/evidence/goal-checker.mjs';

// 목표에서 assertion 자동 도출
const assertions = deriveAssertions(goalDescription);
// 각 assertion을 수동 또는 코드 분석으로 verified 처리 후 판정
const result = checkGoalAchievement(projectDir, goalDescription, assertions);
// result.verdict: 'ACHIEVED' | 'COMPLETED_NOT_ACHIEVED' | 'INCOMPLETE'
```
