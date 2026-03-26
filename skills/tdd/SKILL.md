---
name: tdd
description: "🔴🟢🔵 TDD 사이클 관리. Red→Green→Refactor 자동 페이즈 전환."
triggers: ["tdd", "테스트", "test first", "red green", "TDD"]
---

# /aing tdd — Test-Driven Development

## Actions
- `/aing tdd start <feature> <target>` — TDD 사이클 시작 (🔴 RED)
- `/aing tdd check pass` — 테스트 통과 기록
- `/aing tdd check fail` — 테스트 실패 기록
- `/aing tdd status` — 현재 TDD 페이즈 표시

## Flow
```
🔴 RED (테스트 작성, 실패 확인)
  → 🟢 GREEN (최소 구현, 통과 확인)
    → 🔵 REFACTOR (정리, 테스트 재확인)
      → 🔴 RED (다음 기능...)
```
