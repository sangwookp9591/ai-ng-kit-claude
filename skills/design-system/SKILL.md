---
name: design-system
description: "🎯 Willji 에이전트로 DESIGN.md 합성. Stitch 프로젝트 분석 → 시맨틱 디자인 시스템 문서화."
triggers: ["design-system", "디자인시스템", "DESIGN.md", "디자인 토큰", "design tokens"]
---

# /swkit design-system — Design System Synthesis

## Usage
```
/swkit design-system
/swkit design-system analyze
/swkit design-system "Furniture Collection 프로젝트"
```

## Agent Deployment

```
Agent({
  subagent_type: "sw-kit:willji",
  description: "Willji: 디자인 시스템 합성",
  model: "sonnet",
  prompt: "..."
})
```

## PDCA Mapping
- **Plan**: 디자인 시스템 정의 (프로젝트 초기 단계)

## MCP Availability Check (MANDATORY)

1. `list_tools`로 Stitch MCP prefix 탐색
2. **발견 시**: Stitch 프로젝트 스크린 분석 → DESIGN.md 자동 합성
3. **미발견 시**: 기존 코드/CSS/Tailwind config 분석 → DESIGN.md 템플릿 생성

## Execution Steps

### With Stitch MCP

1. **Project Lookup**: `[prefix]:list_projects` → 대상 프로젝트 식별
2. **Screen Lookup**: `[prefix]:list_screens` → 분석할 화면 선택
3. **Metadata Fetch**: `[prefix]:get_screen` → HTML/CSS, screenshot, dimensions
4. **Asset Download**: HTML 코드 다운로드 → Tailwind 클래스 및 커스텀 CSS 파싱
5. **Project Metadata**: `[prefix]:get_project` → designTheme (색상 모드, 폰트, roundness)

### Analysis & Synthesis

1. **프로젝트 아이덴티티 추출** (JSON): 프로젝트 제목, ID
2. **분위기 정의** (이미지/HTML): 전체적인 "vibe" 포착 (Airy, Dense, Minimalist 등)
3. **색상 팔레트 매핑** (Tailwind Config/JSON):
   - 서술적 자연어 이름 (예: "Deep Muted Teal-Navy")
   - 정확한 hex 코드 (예: "#294056")
   - 기능적 역할 (예: "primary actions에 사용")
4. **기하학 & 형태 번역** (CSS/Tailwind):
   - `rounded-full` → "Pill-shaped"
   - `rounded-lg` → "Subtly rounded corners"
   - `rounded-none` → "Sharp, squared-off edges"
5. **깊이 & 고도 설명**: 그림자 스타일 (Flat, Whisper-soft, Heavy drop shadows)

### Without Stitch MCP

1. 프로젝트 소스 코드 탐색 (`globals.css`, `tailwind.config`, `theme.*`)
2. 기존 디자인 토큰 추출
3. DESIGN.md 템플릿에 반영

## Output Format

출력: `.sw-kit/designs/DESIGN.md`

```markdown
# Design System: [Project Title]
**Project ID:** [Insert Project ID Here]

## 1. Visual Theme & Atmosphere
(분위기, 밀도, 미학 철학 설명)

## 2. Color Palette & Roles
(Descriptive Name + Hex Code + Functional Role)

## 3. Typography Rules
(폰트 패밀리, 웨이트 사용법, letter-spacing 특성)

## 4. Component Stylings
* **Buttons:** (형태, 색상 할당, 동작)
* **Cards/Containers:** (모서리 둥글기, 배경색, 그림자)
* **Inputs/Forms:** (선 스타일, 배경)

## 5. Layout Principles
(여백 전략, 마진, 그리드 정렬)
```

## Evidence Collection

| Evidence Type | 수집 방법 | PASS 기준 |
|--------------|----------|----------|
| `design` | DESIGN.md 파일 생성 확인 | 5개 섹션 모두 포함, hex 코드 정확 |

## Best Practices

- 기술 용어를 자연어로 번역 (예: `rounded-xl` → "generously rounded corners")
- 색상은 역할 기반으로 명명 (예: "Primary Action" + 외관 설명)
- 분위기 설명을 구체적으로 (Minimalist, Vibrant, Brutalist 등)
- hex 코드를 서술적 이름과 함께 항상 병기
