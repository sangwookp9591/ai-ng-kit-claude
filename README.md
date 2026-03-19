# sw-kit — Harness Engineering Agent

> **개발자에게는 최고의 도우미, 비개발자에게는 최고의 마술사.**

AI 네이티브 시대의 개발 하네스. 구조화된 워크플로우, 지능형 컨텍스트, 자기 학습 에이전트.

---

## Install

```bash
claude plugin marketplace add sangwookp9591/sw-kit-claude
claude plugin install sw-kit@swkit-marketplace
```

## Quick Start

```bash
# PDCA 사이클 시작
/swkit start my-feature

# 코드베이스 탐색
/swkit explore src/

# 비개발자라면 마술사 모드
/swkit wizard
```

## 5 Innovations

| # | Innovation | Description |
|---|-----------|-------------|
| 1 | **Context Budget** | 토큰 소비를 추적하고 예산 내에서 최적화 (~근사치) |
| 2 | **Cross-Session Learning** | 성공 패턴을 캡처하여 다음 세션에 자동 적용 |
| 3 | **Adaptive Routing** | 작업 복잡도에 따라 최적 모델 자동 선택 (haiku/sonnet/opus) |
| 4 | **Evidence Chain** | 테스트/빌드/린트 결과를 체인으로 연결하여 완료 증명 |
| 5 | **Self-Healing** | 장애 자동 감지/복구, 서킷 브레이커로 반복 실패 차단 |

## PDCA-Lite 5-Stage

```
Plan → Do → Check → Act (iterate if <90%) → Review → Completed
```

- **Plan**: 요구사항 분석, 작업 분해, 수락 기준 설정
- **Do**: 코드 구현, 단계별 실행
- **Check**: 테스트/빌드/린트 검증, 증거 체인 구성
- **Act**: 결과 반영, 필요 시 반복 (최대 5회)
- **Review**: 최종 검토, 학습 기록, 완료 보고서

## 6 Agents

| Agent | Role | Model |
|-------|------|-------|
| **Explorer** | 코드베이스 탐색, 구조 파악 | haiku |
| **Planner** | 작업 계획, 분해, 위험 분석 | sonnet |
| **Executor** | 코드 구현, 수정, 테스트 | sonnet/opus |
| **Reviewer** | 코드 리뷰, 보안/품질 점검 | sonnet |
| **Verifier** | 완료 증명, 증거 체인 수집 | haiku |
| **Wizard** | 비개발자 가이디드 워크플로우 | sonnet |

## Commands

| Command | Description |
|---------|-------------|
| `/pdca start <name>` | PDCA 사이클 시작 |
| `/pdca status` | 현재 상태 확인 |
| `/pdca next` | 다음 단계 진행 |
| `/kit explore <target>` | 코드베이스 탐색 |
| `/kit plan <task>` | 작업 계획 수립 |
| `/kit execute <task>` | 코드 구현 |
| `/kit review` | 코드 리뷰 |
| `/kit verify` | 완료 검증 |
| `/learn show` | 학습 기록 조회 |
| `/wizard` | 마술사 모드 |

## Multilingual

한국어와 영어를 자동 감지합니다.

```
"계획 세워줘"  → Plan 단계 트리거
"검증해줘"    → Check 단계 트리거
"만들어줘"    → Wizard 모드 활성화
```

## Requirements

- Claude Code v2.1.69+
- Node.js v18+

## License

Apache-2.0
