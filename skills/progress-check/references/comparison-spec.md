# Progress Check Comparison Spec

progress-checker 에이전트의 비교 전략 상세 사양입니다.

## 비교 매트릭스 포맷

```markdown
# Implementation Progress Report

**Spec**: {기획 문서 경로}
**Project**: {프로젝트 경로}
**Date**: {ISO date}
**Overall Progress**: {N}% ({completed}/{total})

## Summary
| Category    | Total | Done | Partial | Missing | Progress |
|-------------|-------|------|---------|---------|----------|
| Screens     |       |      |         |         |          |
| Components  |       |      |         |         |          |
| Flows       |       |      |         |         |          |
| Interactions|       |      |         |         |          |
| Tests       |       |      |         |         |          |
| **Total**   |       |      |         |         |          |

## Detailed Findings

### ✅ Implemented
- [Screen] Login — `app/login/page.tsx` (route: `/login`)
- [Component] Button — `components/ui/button.tsx`

### 🔶 Partial
- [Screen] Dashboard — `app/dashboard/page.tsx` exists but missing chart widget
  - **Reason**: 3/5 sub-components implemented

### ❌ Missing
- [Screen] Settings — No matching file found
  - **Expected**: `app/settings/**` or `pages/settings.*`
```

## 비교 전략 상세

### 1. 파일 존재 (File Existence)
기획 항목의 Implementation Mapping Hints에서 Expected File Pattern을 추출하여 Glob 탐색.

| Spec Item | Search Patterns |
|-----------|----------------|
| Login screen | `**/login/page.*`, `**/login/index.*`, `**/login.*` |
| Button component | `**/button.*`, `**/Button.*`, `**/ui/button.*` |

### 2. 라우트 정의 (Route Definition)
프레임워크별 라우트 탐색:
- **Next.js App Router**: `app/**/page.tsx` 파일 기반
- **Next.js Pages Router**: `pages/**/*.tsx` 파일 기반
- **React Router**: `router.ts`, `routes.ts`에서 path 정의 grep
- **Vue Router**: `router/index.ts`에서 path 정의 grep

### 3. 컴포넌트 존재 (Component Existence)
- `components/` 디렉토리에서 이름 매칭 (case-insensitive)
- 컴포넌트 export 확인: `export (default|const|function) ComponentName`

### 4. 테스트 커버리지 (Test Coverage)
- `*.test.*`, `*.spec.*`, `__tests__/` 파일에서 관련 테스트 존재 확인
- `describe('ComponentName'` 또는 `test('screen name'` 패턴 grep

## 매칭 판정 기준

| 상태 | 조건 |
|------|------|
| ✅ Done | 파일 존재 + 라우트/export 확인 |
| 🔶 Partial | 파일 존재하지만 하위 항목 일부 누락 |
| ❌ Missing | 파일 미존재 또는 라우트 미정의 |

## 수동 매핑 오버라이드

프로젝트에 `.sw-kit/mapping.json`이 있으면 자동 매칭보다 우선합니다:

```json
{
  "Login screen": { "file": "src/features/auth/LoginPage.tsx", "route": "/auth/login" },
  "Button": { "file": "src/design-system/atoms/Button.tsx" }
}
```
