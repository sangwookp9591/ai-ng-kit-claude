# agent-ui DX 진단 보고서

**Date:** 2026-03-23
**Auditor:** Ralplan consensus (Planner + Architect + Critic)
**Decision:** Option C (Enhance Existing) 채택. activity-tracker 신규 모듈 불필요.

---

## D1: user-prompt-submit.mjs 팀 배치 테이블

**파일:** `hooks-handlers/user-prompt-submit.mjs:39-69`
**결과:** 이미 동작함

- `selectTeam(signals)`로 복잡도 기반 팀 자동 추천
- Agent/Role/Model/Task 4열 테이블 출력
- intent별 라우팅 안내 (plan/do/check/wizard 분기)
- `additionalContext`로 주입 → 사용자에게 보임

**개선 적용:**
- 구분선 (`━━━`) 추가로 시각적 구분 강화
- Pipeline 요약 라인 추가 (`Agent1(Role) → Agent2(Role) → ...`)

---

## D2: statusline.mjs 에이전트 추적

**파일:** `scripts/hud/statusline.mjs:84-149`
**결과:** 이미 동작함

- transcript tail 256KB 파싱 (`parseActiveAgents`)
- `tool_use` / `tool_result` 쌍으로 활성 에이전트 감지
- `subagent_type.startsWith('aing:')` 필터
- 블링킹 컬러 도트로 HUD 표시

**판정:** 현행 유지. Resilient read-only 방식.

---

## D3: Rule 2 description 파라미터

**파일:** `hooks-handlers/session-start.mjs:108-117`
**결과:** 소프트 강제 (프롬프트 지시)

- Rule 2: `description` 파라미터 필수 명시
- Claude Code 네이티브 표시: `⏺ aing:klay(Klay: 아키텍처 탐색) Opus`
- Hook-level 검증 없음 (LLM 준수에 의존)

**판정:** 현재로 충분. 빈번한 누락 발견 시 pre-tool-use 경고 추가 가능.

---

## D4: hooks.json matcher 영향

**파일:** `hooks/hooks.json:30,42`
**결과:** 핵심 블라인드스팟 (수정 완료)

- **수정 전:** `"Write|Edit|Bash"` → Agent/Task spawn 미감지
- **수정 후:** `"Write|Edit|Bash|Agent|Task"` → 에이전트 spawn/complete 감지
- `recordToolUse`가 `agent: 'session'`으로 고정 → 에이전트 이름 추출 로직 추가

**영향 분석:**
- `pre-tool-use.mjs`: `checkStepLimit`만 실행 (Bash/Write/Edit 가드가 Agent/Task를 필터). 안전.
- `post-tool-use.mjs`: `recordToolUse`가 에이전트 이름으로 trace 기록. Bash evidence 수집은 Agent/Task에 미적용.

---

## D5: transcript_path 가용성

**파일:** `scripts/hud/statusline.mjs:84-85`
**결과:** 메인 세션에서 가용

- `stdin.transcript_path`가 null이면 빈 배열 반환 (graceful fallback)
- 서브에이전트 세션에서는 statusline 직접 호출 안 됨 (메인 세션 HUD만 사용)

**판정:** 현행 충분. 추가 대응 불필요.

---

## 결론

| 항목 | 판정 | 조치 |
|------|------|------|
| D1 팀 배치 테이블 | ✅ 동작 | 포맷 개선 완료 |
| D2 statusline 추적 | ✅ 동작 | 현행 유지 |
| D3 Rule 2 description | ⚠️ 소프트 | 현행 유지 (모니터링) |
| D4 hooks.json matcher | 🔴→✅ | `Agent|Task` 추가 완료 |
| D5 transcript_path | ✅ 가용 | 현행 유지 |

**Option C(기존 시스템 개선)로 핵심 문제 해결됨. Option A(activity-tracker) 도입 불필요.**
