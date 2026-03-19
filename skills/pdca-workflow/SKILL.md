---
name: pdca-workflow
description: PDCA 워크플로우 가이드. 구조화된 개발 사이클(Plan→Do→Check→Act→Review)을 자동으로 관리합니다.
triggers: ["pdca", "계획", "검증", "plan", "verify", "check", "review"]
agents:
  check: verifier
  review: reviewer
  plan: planner
  do: executor
  explore: explorer
---

# PDCA Workflow

sw-kit의 핵심 개발 방법론. 모든 작업을 5단계 사이클로 관리합니다.

## Stages

### 1. Plan (계획)
- 요구사항 분석
- 작업 분해 (steps + acceptance criteria)
- `templates/plan.md` 기반 계획서 생성

### 2. Do (실행)
- 계획에 따라 코드 구현
- Executor 에이전트가 단계별 실행
- 각 단계 완료 시 증거 수집

### 3. Check (검증)
- 테스트/빌드/린트 실행
- Verifier 에이전트가 증거 체인 구성
- Match Rate 계산: ≥90% → Review, <90% → Act (반복)

### 4. Act (반영)
- Check에서 발견된 이슈 수정
- 최대 5회 반복 (configurable)
- 개선 후 Do→Check 재진입

### 5. Review (리뷰)
- Reviewer 에이전트가 최종 품질 검토
- 학습 기록 저장 (Cross-Session Learning)
- 완료 보고서 생성

## Auto-Trigger
- "계획 세워줘", "plan this" → Plan stage
- "검증해줘", "verify" → Check stage
- "리뷰해줘", "review" → Review stage
