---
name: figma-read
description: "📐 Figma Reader 에이전트로 Figma 파일 분석. 기획 문서(화면/플로우/컴포넌트/인터랙션) 자동 추출."
triggers: ["figma-read", "피그마", "figma", "기획문서", "디자인 분석", "화면 분석"]
---

# /swkit figma-read — Figma Spec Extraction

Figma 파일을 읽어 구조화된 기획 문서를 생성합니다.

## Usage
```
/swkit figma-read <figma-url>
/swkit figma-read "https://figma.com/design/abc123/MyProject?node-id=1-2"
```

## Agent Deployment

Figma Reader 에이전트를 opus로 스폰합니다 (대규모 Figma 파일 처리):

```
Agent({
  subagent_type: "sw-kit:figma-reader",
  description: "Figma Reader: 기획 문서 추출 — {url}",
  model: "opus",
  prompt: "..."
})
```

터미널 표시:
```
⏺ sw-kit:figma-reader(Figma Reader: 기획 문서 추출) Opus
```

## Step 1: URL 파싱

Figma URL에서 추출:
- **fileKey**: `/design/` 뒤의 세그먼트
- **nodeId**: `node-id` 쿼리 파라미터 값

예시: `https://figma.com/design/abc123/MyProject?node-id=1-2`
→ fileKey: `abc123`, nodeId: `1-2`

## Step 2: MCP 가용성 체크 (MANDATORY)

Figma MCP 도구 사용 가능 여부를 확인합니다.
사용 불가 시 사용자에게 안내 후 수동 입력 모드로 전환.

## Step 3: 구조 분석

1. `get_metadata` — 전체 페이지/프레임 구조 (대규모 파일 우선)
2. `get_design_context` — 주요 프레임 상세 정보
3. `get_screenshot` — 시각 참조 (선택)
4. `search_design_system` — 디자인 시스템 컴포넌트 확인

## Step 4: 기획 문서 생성

추출한 데이터를 5개 섹션으로 구조화하여 `.sw-kit/designs/figma-spec.md`에 저장.

포맷은 `references/output-spec.md` 참조.

## Step 5: 파이프라인 연결 (선택)

기획 문서 생성 후 구현 진행도 비교가 필요하면:

```
/swkit progress-check --spec .sw-kit/designs/figma-spec.md
```

→ Progress Checker 에이전트가 "분석할 프로젝트 경로를 알려주세요"라고 질문합니다.

## Output
- `.sw-kit/designs/figma-spec.md` — 구조화된 기획 문서
- `.sw-kit/designs/metadata.json` — Figma file/node IDs

## Error Handling
- Figma MCP 미설치 → fallback 안내 (수동 입력 모드)
- URL 파싱 실패 → "올바른 Figma URL을 입력하세요" 안내
- Rate limit → 재시도 안내 + 부분 결과 저장
