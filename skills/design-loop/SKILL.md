---
name: design-loop
description: "🔄 Willji + Derek 에이전트로 자율 멀티페이지 빌드 루프. Baton system으로 반복 생성."
triggers: ["design-loop", "디자인루프", "멀티페이지", "사이트 빌드", "site build", "baton"]
---

# /swkit design-loop — Autonomous Multi-Page Build Loop

## Usage
```
/swkit design-loop
/swkit design-loop start
/swkit design-loop "포트폴리오 사이트 5페이지"
```

## Agent Deployment

```
# Phase 1: Design generation (Willji)
Agent({
  subagent_type: "sw-kit:willji",
  description: "Willji: 페이지 디자인 생성",
  model: "sonnet",
  prompt: "..."
})

# Phase 2: Code integration (Derek)
Agent({
  subagent_type: "sw-kit:derek",
  description: "Derek: 페이지 코드 통합",
  model: "sonnet",
  prompt: "..."
})
```

## PDCA Mapping
- **Do**: 반복 빌드 (각 iteration = PDCA Do의 inner loop)
- **Check**: 시각 검증 (Chrome DevTools MCP 또는 수동)

design-loop은 PDCA Do 단계의 **delegated sub-cycle**로 동작합니다.
- 각 iteration의 retry는 PDCA Act 카운트와 별개
- iteration 완료 시 evidence를 PDCA Check에 전달
- 전체 루프 완료 후 PDCA Check 단계로 진행

## MCP Availability Check (MANDATORY)

1. `list_tools`로 Stitch MCP prefix 탐색
2. **필수**: Stitch MCP가 없으면 이 skill은 사용 불가 — 안내 메시지 출력 후 종료

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️ Stitch MCP 필수
  design-loop은 Stitch MCP가 필요합니다.
  설치: https://stitch.withgoogle.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Prerequisites

- Stitch MCP Server (필수)
- `.sw-kit/designs/DESIGN.md` (없으면 `design-system` skill로 먼저 생성)
- `.sw-kit/designs/SITE.md` (사이트 비전 및 로드맵)
- Chrome DevTools MCP (선택 — 시각 검증용)

## The Baton System

`.sw-kit/designs/next-prompt.md`가 iteration 간 릴레이 바톤 역할:

```markdown
---
page: about
---
A page describing how the app works.

**DESIGN SYSTEM (REQUIRED):**
[Copy from .sw-kit/designs/DESIGN.md]

**Page Structure:**
1. Header with navigation
2. Main content area
3. Footer with links
```

**Critical Rules:**
- `page` frontmatter 필드가 출력 파일명 결정
- 프롬프트에 DESIGN.md의 디자인 시스템 블록 반드시 포함
- 작업 완료 전 반드시 next-prompt.md 업데이트 (루프 유지)

## Execution Protocol

### Step 1: Read the Baton
`.sw-kit/designs/next-prompt.md`에서 페이지 이름과 프롬프트 추출

### Step 2: Consult Context Files
| File | Purpose |
|------|---------|
| `.sw-kit/designs/SITE.md` | 사이트 비전, Stitch Project ID, 기존 페이지, 로드맵 |
| `.sw-kit/designs/DESIGN.md` | 시각 스타일 (Stitch 프롬프트에 필수) |

### Step 3: Generate with Stitch
1. `[prefix]:generate_screen_from_text` 호출
2. Asset 다운로드: `.sw-kit/designs/{page}.html`, `.sw-kit/designs/{page}.png`

### Step 4: Integrate into Site
1. HTML을 `site/public/{page}.html`로 이동
2. Asset 경로 수정
3. 네비게이션 업데이트 (placeholder 링크 연결)
4. 일관된 header/footer 적용

### Step 5: Update Site Documentation
`.sw-kit/designs/SITE.md` 수정:
- 새 페이지를 Sitemap에 `[x]`로 추가
- 소비한 아이디어를 Creative Freedom에서 제거
- 완료된 Roadmap 항목 업데이트

### Step 6: Prepare Next Baton (CRITICAL)
`.sw-kit/designs/next-prompt.md` 업데이트:
1. 다음 페이지 결정 (Roadmap → Creative Freedom → 새 아이디어)
2. YAML frontmatter + 디자인 시스템 블록 포함하여 작성

## Evidence Collection

| Evidence Type | 수집 방법 | PASS 기준 |
|--------------|----------|----------|
| `design` | 각 iteration의 Stitch 생성 결과 | 페이지 HTML/PNG 저장 완료 |
| `visual-qa` | Chrome DevTools 스크린샷 비교 (선택) | 레이아웃 일치 |

## File Structure

```
.sw-kit/designs/
├── DESIGN.md          # 디자인 시스템
├── SITE.md            # 사이트 비전 + 로드맵
├── metadata.json      # Stitch project/screen IDs
├── next-prompt.md     # 바톤 파일
└── {page}.html/png    # 생성된 페이지
```

## Common Pitfalls

- ❌ next-prompt.md 업데이트 잊음 (루프 중단)
- ❌ Sitemap에 있는 페이지 재생성
- ❌ DESIGN.md 블록 누락한 프롬프트
- ❌ placeholder 링크(`href="#"`) 방치
- ❌ metadata.json 미저장
