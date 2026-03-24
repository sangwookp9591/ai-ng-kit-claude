---
name: cost
description: "비용/토큰 투명성 보고. 에이전트별 활동과 예상 비용을 표시합니다."
triggers: ["cost", "비용", "토큰", "얼마", "얼마나"]
---

# /swkit cost — 비용/토큰 투명성 보고

이 세션에서 에이전트들이 얼마나 활동했는지, 예상 비용이 얼마인지 투명하게 보여줍니다.

## 실행

반드시 아래 Bash 커맨드를 실행하세요. 분석하거나 질문하지 마세요.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/evidence/cost-reporter.mjs"
```

## 결과 해석

결과를 읽고 사용자에게 아래 형식으로 핵심을 요약합니다:

- 가장 활발한 에이전트: `{name}` ({N}개 액션)
- 이 세션 예상 비용: 약 `${cost}`
- 세션 경과 시간: `{elapsed}`분

## 중요 안내

비용은 **추정치**입니다.

- 액션당 평균 2,000 토큰 기준으로 계산
- Sonnet output 단가($15/1M tokens) 적용
- 정확한 사용량은 [Anthropic Console](https://console.anthropic.com)에서 확인

## 관련 커맨드

- `/swkit agent-ui --monitor` — 에이전트 활동 실시간 모니터
- `/swkit verify` — 완료 증거 체인 검증
