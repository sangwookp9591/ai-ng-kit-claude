---
name: design
description: "🎨 Willji 에이전트로 UI 디자인 생성/편집. Stitch MCP 연동, 프롬프트 강화, 워크플로우 라우팅."
triggers: ["design", "디자인", "stitch", "UI 디자인", "화면 디자인", "screen design"]
---

# /swkit design — UI Design Generation & Editing

## Usage
```
/swkit design <prompt>
/swkit design generate "대시보드 랜딩페이지"
/swkit design enhance "로그인 페이지 만들어줘"
/swkit design edit "헤더에 검색바 추가"
```

## Sub-commands

| Command | 기능 | 원본 skill |
|---------|------|-----------|
| `design generate` | 텍스트 → Stitch 디자인 생성 | stitch-design |
| `design enhance` | 모호한 프롬프트 → 구조화된 디자인 프롬프트 | enhance-prompt |
| `design edit` | 기존 화면 편집/수정 | stitch-design (edit) |

## Agent Deployment

```
Agent({
  subagent_type: "sw-kit:willji",
  description: "Willji: UI 디자인 생성",
  model: "sonnet",
  prompt: "..."
})
```

## PDCA Mapping
- **Plan**: 디자인 기획, DESIGN.md 참조
- **Do**: Stitch MCP로 화면 생성/편집

## MCP Availability Check (MANDATORY)

Willji는 작업 시작 시 반드시 아래를 수행:

1. `list_tools`로 Stitch MCP prefix 탐색 (예: `stitch:`, `mcp_stitch:`)
2. **발견 시**: prefix를 저장하고 MCP 도구로 디자인 생성/편집 진행
3. **미발견 시**: 아래 fallback 메시지 출력 후 수동 가이드 제공

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️ Stitch MCP 미설치
  수동 디자인 가이드로 전환합니다.
  설치: https://stitch.withgoogle.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Fallback 모드에서는:
- DESIGN.md 템플릿 제공
- 프롬프트 강화 (enhance) 기능은 MCP 없이도 동작
- 디자인 구조 문서화 및 컴포넌트 명세 작성

## Workflow 1: Generate (text-to-design)

1. **Context 확인**: `.sw-kit/designs/DESIGN.md` 존재 여부 체크
2. **Prompt Enhancement Pipeline**:
   - 사용자 입력에서 누락된 요소 평가 (플랫폼, 페이지 타입, 구조, 스타일, 색상)
   - UI/UX 키워드로 모호한 용어 변환 (참조: `references/design-mappings.md`)
   - 분위기(vibe) 설명어 추가
   - 페이지 구조를 번호 매긴 섹션으로 정리
   - 디자인 시스템 블록 포맷팅
3. **Stitch 호출**: `[prefix]:generate_screen_from_text` with enhanced prompt
4. **Asset 저장**: `.sw-kit/designs/{page}.html`, `.sw-kit/designs/{page}.png`
5. **Evidence 수집**: `{ type: 'design', result: 'pass', source: 'stitch-generate' }`

### Enhanced Prompt Format
```markdown
[한 줄 설명: 페이지 목적과 분위기]

**DESIGN SYSTEM (REQUIRED):**
- Platform: [Web/Mobile], [Desktop/Mobile]-first
- Theme: [Light/Dark], [스타일 설명어]
- Background: [색상 설명] (#hex)
- Primary Accent: [색상 설명] (#hex) for [역할]
- Text Primary: [색상 설명] (#hex)

**PAGE STRUCTURE:**
1. **[섹션]:** [설명]
2. **[섹션]:** [설명]
...
```

## Workflow 2: Enhance (prompt optimization)

MCP 없이도 동작하는 독립 기능.

1. 사용자 입력 평가 (누락 요소 체크)
2. `.sw-kit/designs/DESIGN.md` 존재 시 디자인 시스템 컨텍스트 주입
3. UI/UX 키워드 강화 (참조: `references/prompt-keywords.md`)
4. 구조화된 프롬프트 출력

### Keyword Enhancement Table

| 모호한 표현 | 강화된 표현 |
|------------|-----------|
| "메뉴" | "navigation bar with logo and menu items" |
| "버튼" | "primary call-to-action button" |
| "리스트" | "card grid layout" 또는 "vertical list with thumbnails" |
| "폼" | "form with labeled input fields and submit button" |
| "사진 영역" | "hero section with full-width image" |
| "모던" | "clean, minimal, with generous whitespace" |
| "프로페셔널" | "sophisticated, trustworthy, with subtle shadows" |
| "다크 모드" | "dark theme with high-contrast accents on deep backgrounds" |

## Workflow 3: Edit (screen modification)

1. 기존 화면 ID 확인 (`.sw-kit/designs/metadata.json`)
2. 변경 사항을 구조화된 편집 프롬프트로 변환
3. `[prefix]:edit_screens` 호출
4. 업데이트된 asset 저장

## Evidence Collection

| Evidence Type | 수집 방법 | PASS 기준 |
|--------------|----------|----------|
| `design` | Stitch 생성/편집 결과 screenshot URL | 화면이 정상 생성되고 asset이 저장됨 |

## References

- `references/design-mappings.md` — UI/UX 키워드 매핑
- `references/prompt-keywords.md` — Stitch가 잘 이해하는 기술 용어
- `references/tool-schemas.md` — Stitch MCP 도구 호출 방법

## Output Directory

모든 디자인 산출물은 `.sw-kit/designs/`에 저장:
```
.sw-kit/designs/
├── DESIGN.md          # 디자인 시스템 (design-system skill로 생성)
├── metadata.json      # Stitch project/screen IDs
├── {page}.html        # 생성된 HTML
└── {page}.png         # 스크린샷
```
