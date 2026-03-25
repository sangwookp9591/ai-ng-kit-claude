---
name: progress-check
description: "Progress Checker로 기획 문서 vs 코드베이스 구현 진행도 비교. 진행률%, 미구현 항목 리포트."
triggers: ["progress-check", "진행도", "진행률", "구현 현황", "coverage", "implementation progress"]
---

# /swkit progress-check — Implementation Progress Analysis

기획 문서와 프로젝트 코드베이스를 비교하여 구현 진행도를 산출합니다.

## Usage
```
/swkit progress-check
/swkit progress-check --spec .sw-kit/designs/figma-spec.md --project /path/to/project
/swkit progress-check --spec docs/PRD.md
```

## MANDATORY: 경로 질문

인자가 없으면 반드시 AskUserQuestion으로 질문:

1. `--spec` 미제공 → 기본값 `.sw-kit/designs/figma-spec.md` 사용, 없으면 "기획 문서 경로를 알려주세요"
2. `--project` 미제공 → **"분석할 프로젝트 경로를 알려주세요"** (필수 질문)

## Agent Deployment

```
Agent({
  subagent_type: "sw-kit:progress-checker",
  description: "Progress Checker: 구현 진행도 분석",
  model: "opus",
  prompt: "..."
})
```

## Workflow

### Step 1: 기획 문서 파싱
figma-spec.md (또는 수동 기획서)에서 체크리스트 항목 추출:
- Screen Inventory → 화면 목록
- Component Inventory → 컴포넌트 목록
- User Flows → 플로우 연결
- Interaction Specs → 인터랙션 항목
- Implementation Mapping Hints → 매핑 힌트 (있으면 우선 활용)

### Step 2: 프로젝트 구조 파악
대상 프로젝트를 Glob/Grep으로 탐색:
- `app/`, `src/`, `pages/` 등 라우트 디렉토리
- `components/` 컴포넌트 디렉토리
- `__tests__/`, `*.test.*`, `*.spec.*` 테스트 파일
- 라우터 설정 파일 (next.config, router.ts 등)

### Step 3: 4가지 비교 전략 실행
1. **파일 존재**: Glob으로 예상 파일 패턴 탐색
2. **라우트 정의**: 라우터 설정에서 경로 매칭
3. **컴포넌트 존재**: 컴포넌트 디렉토리에서 이름 매칭
4. **테스트 커버리지**: 관련 테스트 파일 존재 확인

### Step 4: 진행도 계산 + 리포트 생성
`.sw-kit/reports/progress-report.md`에 저장.

## Output
- `.sw-kit/reports/progress-report.md` — 진행도 리포트
- 콘솔에 요약 테이블 출력

## Figma 없이도 사용 가능
수동 기획서(PRD, 요구사항 문서 등)도 입력 가능합니다.
기획 문서에 화면/컴포넌트/플로우 목록이 있으면 비교 가능.

## Error Handling
- 기획 문서 없음 → "기획 문서 경로를 알려주세요"
- 프로젝트 경로 없음 → "분석할 프로젝트 경로를 알려주세요"
- 매칭 불확실 → "Partial" 분류 + 사유 기록
