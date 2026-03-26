---
name: task
description: "📋 Task 체크리스트 관리. Main Task → Sub Tasks 계층 추적."
triggers: ["task", "태스크", "체크리스트", "checklist", "할일"]
---

# /aing task — Task Checklist Manager

## Actions
- `/aing task create <title> --subtasks "step1, step2, step3"` — 태스크 생성
- `/aing task check <task-id> <seq>` — 서브태스크 완료 체크 ☐→☑
- `/aing task list` — 전체 태스크 목록
- `/aing task show <task-id>` — 상세 체크리스트

## Structure
```
📋 Main Task (60%)
━━━━━━━━━━━━━━━━━━━━
  ☑ 1. Step 1 (13:20:05)
  ☑ 2. Step 2 (13:25:10)
  ☐ 3. Step 3
━━━━━━━━━━━━━━━━━━━━
  Progress: 2/3 (66%)
```
