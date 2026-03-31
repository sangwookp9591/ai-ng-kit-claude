---
name: do
description: "자연어 자동 라우팅. 의도를 분석해 plan/auto/team/wizard 중 최적 명령으로 분배."
triggers: ["do", "해줘", "만들어", "추가해", "수정해", "고쳐"]
---

# /aing do — 자연어 자동 라우팅

사용자의 자연어 입력을 분석하여 `plan` / `auto` / `team` 중 최적 aing 파이프라인으로 자동 분배합니다.

## Usage

```
/aing do <자연어 태스크 설명>
/aing do "인증 기능 추가해줘"
/aing do "src/auth.ts에 JWT 검증 미들웨어 추가해줘"
/aing do "대규모 리팩토링 진행해줘"
```

## Step 1: Intent 분석

`${CLAUDE_PLUGIN_ROOT}/dist/scripts/routing/intent-router.js`를 실행하여 라우팅 결정을 받습니다:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/routing/intent-router.js" "<사용자 입력>"
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
━━━ aing 자동 라우팅 ━━━
입력: "<originalInput>"
분석: <reason>
라우팅: /aing <route> (<preset> preset)
━━━━━━━━━━━━━━━━━━━━━━━
```

예시:
```
━━━ aing 자동 라우팅 ━━━
입력: "src/auth.ts에 JWT 검증 미들웨어 추가해줘"
분석: 파일 경로 참조 (src/auth.ts) + complexity 2
라우팅: /aing auto (solo preset)
━━━━━━━━━━━━━━━━━━━━━━━
```

confidence가 0.7 미만이면 라우팅 전에 AskUserQuestion으로 확인합니다:

```
라우팅 신뢰도가 낮습니다 (confidence: {값}).
"/aing {route}"로 진행할까요? (y/n)
```

## Step 3: 라우팅 실행

분석 결과에 따라 해당 스킬을 호출합니다.

### route = "debug"
```
Skill("aing:debug") 호출
- 4-phase 체계적 디버깅 (investigate → analyze → hypothesize → implement)
- "버그", "에러", "안 돼", "고쳐" 등의 키워드로 트리거
```

### route = "review-pipeline"
```
Skill("aing:review-pipeline") 호출
- 4-tier 리뷰 파이프라인 (Eng / CEO / Design / Outside Voice)
- "리뷰", "봐줘", "확인해" 등의 키워드로 트리거
```

### route = "review-cso"
```
Skill("aing:review-code") 호출 (CSO 모드)
- 14-phase OWASP + STRIDE 보안 감사
- "보안", "취약점", "OWASP" 등의 키워드로 트리거
```

### route = "explore"
```
Skill("aing:explore") 호출
- Klay이 코드베이스 스캔 + 아키텍처 분석
- "구조", "설명해", "이해", "어떻게 동작" 등의 키워드로 트리거
```

### route = "perf"
```
Skill("aing:perf") 호출
- Jun이 성능 프로파일링 (runtime / bundle / memory / query)
- "느려", "성능", "최적화" 등의 키워드로 트리거
```

### route = "refactor"
```
Skill("aing:refactor") 호출
- Klay + Jay/Derek + Milla 구조적 리팩토링
- "리팩토링", "정리", "개선" 등의 키워드로 트리거
```

### route = "tdd"
```
Skill("aing:tdd") 호출
- RED-GREEN-REFACTOR TDD 사이클
- "테스트", "TDD", "커버리지" 등의 키워드로 트리거
```

### route = "auto"
```
Skill("aing:auto") 호출
- preset에 따라 Solo/Duo/Squad/Full/Design 자동 선택
- preset="design" → Design Preset 사용 (willji 포함)
- 사용자 입력을 그대로 task description으로 전달
```

### route = "plan"
```
Skill("aing:plan-task") 호출
- 사용자 입력을 task description으로 전달
- plan 완료 후 → auto/team 선택 프롬프트 표시 (plan-task SKILL.md Step 3)
```

### route = "team"
```
Skill("aing:team") 호출
- 사용자 입력을 task description으로 전달
- preset에 따라 에이전트 자동 선택 (team SKILL.md Agent Selection 참조)
```

## 라우팅 규칙 요약

### 직접 라우팅 (특정 스킬로 즉시 연결)

| 시그널 | 라우팅 | 예시 |
|--------|--------|------|
| "버그"/"에러"/"고쳐"/"안 돼" | `debug` | "로그인하면 500 에러 나" |
| "리뷰"/"봐줘"/"확인해" | `review-pipeline` | "내가 짠 코드 봐줘" |
| "보안"/"취약점"/"OWASP" | `review-cso` | "보안 문제 없는지 확인" |
| "구조"/"설명해"/"이해" | `explore` | "이 프로젝트 구조 설명해" |
| "느려"/"성능"/"최적화" | `perf` | "왜 이렇게 느리지" |
| "리팩토링"/"정리"/"개선" | `refactor` | "이 코드 리팩토링해줘" |
| "테스트"/"TDD"/"커버리지" | `tdd` | "이 기능 테스트 짜줘" |

### 일반 라우팅 (복잡도 기반 자동 선택)

| 시그널 | 라우팅 | 이유 |
|--------|--------|------|
| "디자인"/"UI"/"화면" | `auto` (Design preset) | 디자인 도메인 |
| "계획"/"분석"/"설계" | `plan` | 계획 수립 필요 |
| "팀"/"전체"/"대규모" | `team` | 팀 파이프라인 필요 |
| 파일 경로/앵커 + complexity ≤ 4 | `auto` (Solo/Duo) | 구체적 → 즉시 실행 |
| 파일 경로/앵커 + complexity ≥ 5 | `team` | 복잡도 높음 |
| 짧은 구체적 요청 (4-15단어) | `auto` (Solo) | 빠른 실행 |
| 너무 짧은 입력 (≤3단어) | `plan` | 스코핑 필요 |
| 기본 | `auto` | 자동 실행 |

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
