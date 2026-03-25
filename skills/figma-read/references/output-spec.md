# Figma Spec Output Format

figma-reader 에이전트가 생성하는 `.sw-kit/designs/figma-spec.md`의 표준 포맷입니다.

---

## 템플릿

```markdown
# Figma Spec: {프로젝트명}

**Source**: {Figma URL}
**Extracted**: {ISO date}
**File Key**: {fileKey}
**Pages**: {N}개

---

## 1. Screen Inventory (화면 목록)

| # | Screen Name | Page | Frame ID | Description | Priority |
|---|-------------|------|----------|-------------|----------|
| 1 | Login       | Auth | 1:234    | 로그인 화면  | High     |
| 2 | Dashboard   | Main | 1:567    | 대시보드 메인 | High    |

## 2. User Flows (사용자 플로우)

### Flow 1: {플로우 이름}
```
[Screen A] → [Screen B] → [Screen C]
   │              │
   └─ Action: {설명}
```
- **시작점**: {시작 화면}
- **종착점**: {완료 화면}
- **분기**: {조건부 경로가 있으면 설명}

## 3. Component Inventory (컴포넌트 목록)

| Component | Variants | Used In | Props/States | Design Token Refs |
|-----------|----------|---------|-------------|-------------------|
| Button    | Primary, Secondary, Ghost | Login, Dashboard | size, disabled | color/primary, spacing/md |
| Card      | Default, Elevated | Dashboard | title, content | shadow/lg, radius/md |

## 4. Interaction Specs (인터랙션 사양)

| Screen | Element | Trigger | Action | Target | Animation |
|--------|---------|---------|--------|--------|-----------|
| Login  | Submit btn | Click | Navigate | Dashboard | Fade 300ms |
| Dashboard | Menu icon | Click | Open | Sidebar | Slide-right |

## 5. Implementation Mapping Hints (구현 매핑 힌트)

기획 항목을 코드로 구현할 때 참고할 매핑 정보입니다.
progress-checker가 이 섹션을 활용하여 구현 진행도를 비교합니다.

| Spec Item | Expected File Pattern | Expected Route | Component Name |
|-----------|----------------------|----------------|----------------|
| Login screen | `app/login/**` or `pages/login.*` | `/login` | `LoginPage` |
| Dashboard | `app/dashboard/**` | `/dashboard` | `DashboardPage` |
| Button | `components/ui/button.*` | - | `Button` |
```

---

## 작성 규칙

1. 레이어 네이밍이 불규칙한 경우 raw 이름 그대로 기록 (추론하지 않음)
2. Description은 한국어로 작성
3. Frame ID는 Figma nodeId 형식 (예: `1:234`)
4. Priority는 High/Medium/Low로 분류 (메인 화면: High, 부가 화면: Low)
5. Implementation Mapping Hints는 최선의 추측이며, 실제 프로젝트 구조에 따라 달라질 수 있음
