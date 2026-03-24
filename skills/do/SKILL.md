---
name: do
description: "자연어 자동 라우팅. 의도를 분석해 plan/auto/team/wizard 중 최적 명령으로 분배."
triggers: ["do", "해줘", "만들어", "추가해", "수정해", "고쳐"]
---

# /swkit do — 자연어 자동 라우팅

사용자의 자연어 입력을 분석하여 `plan` / `auto` / `team` 중 최적 sw-kit 파이프라인으로 자동 분배합니다.

## Usage

```
/swkit do <자연어 태스크 설명>
/swkit do "인증 기능 추가해줘"
/swkit do "src/auth.ts에 JWT 검증 미들웨어 추가해줘"
/swkit do "대규모 리팩토링 진행해줘"
```

## Step 1: Intent 분석

`${CLAUDE_PLUGIN_ROOT}/scripts/routing/intent-router.mjs`를 실행하여 라우팅 결정을 받습니다:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/routing/intent-router.mjs" "<사용자 입력>"
```

출력 예시:
```json
{
  "route": "auto",
  "preset": "solo",
  "confidence": 0.85,
  "reason": "파일 경로 참조 (src/auth.ts) + complexity 2",
  "originalInput": "src/auth.ts에 JWT 검증 미들웨어 추가해줘"
}
```

## Step 2: 라우팅 결과 표시 (MANDATORY)

분석 결과를 항상 사용자에게 표시합니다:

```
━━━ sw-kit 자동 라우팅 ━━━
입력: "<originalInput>"
분석: <reason>
라우팅: /swkit <route> (<preset> preset)
━━━━━━━━━━━━━━━━━━━━━━━
```

예시:
```
━━━ sw-kit 자동 라우팅 ━━━
입력: "src/auth.ts에 JWT 검증 미들웨어 추가해줘"
분석: 파일 경로 참조 (src/auth.ts) + complexity 2
라우팅: /swkit auto (solo preset)
━━━━━━━━━━━━━━━━━━━━━━━
```

confidence가 0.7 미만이면 라우팅 전에 AskUserQuestion으로 확인합니다:

```
라우팅 신뢰도가 낮습니다 (confidence: {값}).
"/swkit {route}"로 진행할까요? (y/n)
```

## Step 3: 라우팅 실행

분석 결과에 따라 해당 스킬을 호출합니다.

### route = "auto"

```
Skill("sw-kit:auto") 호출
- preset에 따라 Solo/Duo/Squad/Full/Design 자동 선택
- preset="design" → Design Preset 사용 (willji 포함)
- 사용자 입력을 그대로 task description으로 전달
```

### route = "plan"

```
Skill("sw-kit:plan-task") 호출
- 사용자 입력을 task description으로 전달
- plan 완료 후 → auto/team 선택 프롬프트 표시 (plan-task SKILL.md Step 3)
```

### route = "team"

```
Skill("sw-kit:team") 호출
- 사용자 입력을 task description으로 전달
- preset에 따라 에이전트 자동 선택 (team SKILL.md Agent Selection 참조)
```

### route = "wizard"

```
Skill("sw-kit:wizard-mode") 호출
- 대화형 설정 모드로 진입
```

## 라우팅 규칙 요약

| 시그널 | 라우팅 | 이유 |
|--------|--------|------|
| 파일 경로/함수명/에러 참조 + complexity ≤ 4 | `auto` (Solo/Duo) | 구체적 → 즉시 실행 |
| 파일 경로/앵커 + complexity ≥ 5 | `team` | 복잡도 높음 |
| "디자인"/"UI"/"화면" 키워드 | `auto` (Design preset) | 디자인 도메인 |
| "계획"/"분석"/"설계" 키워드 | `plan` | 계획 수립 필요 |
| "팀"/"전체"/"대규모" 키워드 | `team` | 팀 파이프라인 필요 |
| 짧고 모호 (≤15단어, 앵커 없음) | `plan` | 스코핑 필요 |
| complexity ≤ 2 | `auto` (Solo) | 빠른 단일 에이전트 경로 |
| complexity 3-4 | `auto` (Duo) | 중간 복잡도 |
| complexity ≥ 5 | `team` | 팀 파이프라인 필요 |

## 앵커란?

`intent-router.mjs`가 탐지하는 구체적 참조:
- 파일 경로: `src/`, `.ts`, `.js`, `.py` 등
- 코드 심볼: camelCase/PascalCase/snake_case 식별자
- 이슈/PR 번호: `#42`
- 에러 참조: `TypeError`, `Error:` 등
- 코드 블록: ` ``` ` 포함
- 번호 매기기 목록: `1. 2. 3.`

## Error Handling

- `intent-router.mjs` 실행 실패 시: `plan`으로 폴백
- JSON 파싱 실패 시: `plan`으로 폴백
- 어떤 경우에도 사용자에게 라우팅 결과를 표시
