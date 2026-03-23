---
name: design-to-code
description: "⚡ Derek 에이전트로 디자인 → React 컴포넌트 변환. AST 검증, shadcn/ui 통합, TDD 강제."
triggers: ["design-to-code", "디자인투코드", "react 변환", "컴포넌트 변환", "shadcn", "stitch to react"]
---

# /swkit design-to-code — Design to React Component Conversion

## Usage
```
/swkit design-to-code
/swkit design-to-code "dashboard 페이지"
/swkit design-to-code shadcn "데이터 테이블 추가"
```

## Agent Deployment

```
Agent({
  subagent_type: "sw-kit:derek",
  description: "Derek: 디자인 → React 변환",
  model: "sonnet",
  prompt: "..."
})
```

## PDCA Mapping
- **Do**: React 컴포넌트 구현 (TDD 강제)
- **Check**: AST 검증 + 테스트 통과

## MCP Availability Check

1. `list_tools`로 Stitch MCP prefix 탐색
2. **발견 시**: Stitch에서 디자인 메타데이터/HTML 자동 가져오기
3. **미발견 시**: `.sw-kit/designs/{page}.html` 로컬 파일에서 변환 (수동 export된 HTML 지원)

shadcn MCP도 탐색:
1. `list_tools`로 shadcn MCP prefix 탐색 (예: `shadcn:`, `mcp_shadcn:`)
2. **발견 시**: 컴포넌트 카탈로그 브라우징 및 메타데이터 조회 가능
3. **미발견 시**: `npx shadcn@latest add [component]` CLI로 대체

## Retrieval & Networking

1. **Namespace discovery**: `list_tools`로 Stitch MCP prefix 탐색
2. **Metadata fetch**: `[prefix]:get_screen`으로 디자인 JSON 가져오기
3. **Asset download**:
   - HTML: `bash scripts/fetch-stitch.sh "[htmlCode.downloadUrl]" ".sw-kit/designs/{page}.html"`
   - Screenshot: URL에 `=w{width}` 추가 후 다운로드
4. **Visual audit**: 다운로드된 스크린샷으로 디자인 의도 확인

## Architectural Rules

* **Modular components**: 독립 파일로 분리. 단일 대형 파일 금지.
* **Logic isolation**: 이벤트 핸들러와 비즈니스 로직은 `src/hooks/`의 커스텀 훅으로 분리
* **Data decoupling**: 정적 텍스트, 이미지 URL, 리스트는 `src/data/mockData.ts`로 분리
* **Type safety**: 모든 컴포넌트에 `Readonly<[ComponentName]Props>` TypeScript interface
* **Style mapping**:
  - HTML `<head>`에서 `tailwind.config` 추출
  - `resources/style-guide.json`과 동기화
  - 임의 hex 코드 대신 테마 매핑된 Tailwind 클래스 사용

## Execution Steps (TDD Enforced)

1. **Environment setup**: `node_modules` 없으면 `npm install`
2. **Data layer**: `src/data/mockData.ts` 생성
3. **TDD Cycle per component**:
   - **RED**: 컴포넌트 테스트 작성 (렌더링, props, 접근성)
   - **GREEN**: `resources/component-template.tsx` 기반으로 최소 구현
   - **REFACTOR**: 테스트 통과 상태에서 정리
4. **Application wiring**: `App.tsx` 업데이트
5. **Quality check**:
   - `npm run validate <file_path>` (AST 검증)
   - `resources/architecture-checklist.md` 대조
   - `npm run dev`로 라이브 결과 확인

## shadcn/ui Integration

shadcn/ui 컴포넌트가 적합한 경우 우선 사용:

### Component Discovery
```bash
npx shadcn@latest add [component-name]
```

### Key Patterns
- `cn()` utility로 클래스 합성
- CSS 변수 기반 테마 커스터마이징
- `class-variance-authority`로 variant 관리
- Wrapper 컴포넌트는 `components/` (not `components/ui/`)에 생성

### Available Categories
- Layout: Accordion, Card, Tabs, Collapsible
- Forms: Button, Input, Select, Checkbox
- Data: Table, Badge, Avatar, Progress
- Overlays: Dialog, Sheet, Popover, Tooltip
- Navigation: NavigationMenu, Breadcrumb, Pagination

## Evidence Collection

| Evidence Type | 수집 방법 | PASS 기준 |
|--------------|----------|----------|
| `test` | TDD 테스트 결과 | 모든 테스트 통과 |
| `build` | `npm run build` 출력 | 빌드 성공 |
| `component-ast` | AST 검증 (`npm run validate`) | 하드코딩 hex 없음, interface 존재, dark mode 클래스 포함 |

## Resources

- `resources/component-template.tsx` — 컴포넌트 보일러플레이트
- `resources/architecture-checklist.md` — 20항목 품질 게이트
- `resources/style-guide.json` — 디자인 토큰 매핑
- `scripts/fetch-stitch.sh` — Stitch GCS 다운로드 스크립트
- `scripts/validate.js` — AST 기반 코드 검증

## Troubleshooting

| 이슈 | 해결 |
|------|------|
| Fetch 에러 | URL을 bash 명령에서 따옴표로 감싸기 |
| Validation 에러 | AST 리포트 확인 → 누락 interface, 하드코딩 스타일 수정 |
| Import 에러 | `tsconfig.json`에 `@/*` path alias 확인 |
| 스타일 충돌 | `globals.css` import + CSS 변수명 일치 확인 |
