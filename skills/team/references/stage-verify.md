# Stage 3: team-verify (= PDCA Check)

## 역할 분리 (Gate vs Verify)

| 관점 | Gate (stage-exec) | Verify (여기) |
|------|-------------------|---------------|
| 에이전트 | Milla(haiku) | Milla(sonnet) + Sam(haiku) |
| 범위 | build + test only | 코드 품질 + 보안 + 아키텍처 정합성 |
| 시점 | task마다 | 모든 exec task 완료 후 |
| 목적 | 빠른 차단 (broken code 방지) | 전체 품질 보증 |

**Gate에서 이미 확인한 build/test는 재확인하지 않습니다** — verify는 gate가 못 보는 것에 집중합니다.

## 실행

**IMPORTANT**: Sam은 team-verify에서 `model: "haiku"`로 스폰합니다 (agents/sam.md의 기본 opus를 오버라이드). verify-fix 루프의 비용 효율을 위한 의도적 선택입니다.

Milla와 Sam을 병렬로 스폰:

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: 코드 품질 + 보안 점검",
  team_name: "<feature-slug>",
  name: "milla",
  model: "opus",
  prompt: "[VERIFY — 코드 품질 + 보안]
모든 exec task 완료 후 전체 검증입니다.

NOTE: build/test는 gate에서 이미 확인됨 — 재실행하지 마세요.

수행:
1. 코드 품질: 로직 결함, 안티패턴, 유지보수성
2. 보안: 인젝션, 인증/인가, 민감 데이터 노출
3. 아키텍처 정합성: 기존 패턴과 일관성

출력 — Severity 기반:
## Verify: Milla
### Findings
| # | Severity | Area | Finding | File:Line |
|---|----------|------|---------|-----------|

### Regression Check
이전 gate에서 PASS였던 항목이 현재 FAIL인지 확인:
| Item | Gate Status | Current Status | Regression? |

### Verdict
- PASS: CRITICAL 0, MAJOR 0
- FAIL: CRITICAL 1+ 또는 MAJOR 1+
- MINOR 이슈는 PASS + notes로 처리 (fix loop 트리거하지 않음)

Rules:
- Severity 분류 필수: CRITICAL / MAJOR / MINOR
- MINOR만 있으면 반드시 PASS (불필요한 fix loop 방지)
- 증거는 file:line 형태
- regression 발견 시 반드시 태그: [REGRESSION]"
})

Agent({
  subagent_type: "aing:sam",
  description: "Sam: 증거 체인 검증 + 최종 판정",
  team_name: "<feature-slug>",
  name: "sam",
  model: "haiku",    ← opus 오버라이드
  prompt: "[VERIFY — 증거 체인]
증거 체인 체크리스트 대조입니다. 로직 검증은 Milla가 담당합니다.

수행 (체크리스트 대조만):
1. [test] 테스트 결과 파일/출력 존재 여부 + 통과 여부
2. [build] 빌드 성공 아티팩트 존재 여부
3. [lint] 린트 결과 확인
4. [tdd] 새 기능에 대응하는 test 파일 존재 여부

출력:
## Verify: Sam
- [test]  PASS/FAIL/NOT_AVAILABLE
- [build] PASS/FAIL/NOT_AVAILABLE
- [lint]  PASS/FAIL/NOT_AVAILABLE
- [tdd]   PASS/FAIL/NOT_AVAILABLE
- Verdict: PASS / FAIL

VERIFICATION COMMANDS:
증거 수집 시 반드시 exit code를 캡처하세요:
  Bash: npx tsc --noEmit 2>&1; echo "EXIT=$?"
  → EXIT=0 + 빈 출력 = [build] PASS (에러 없음)
  → EXIT≠0 = [build] FAIL
tsc, eslint 등은 성공 시 출력이 비어있습니다. 빈 출력을 NOT_AVAILABLE로 처리하지 마세요.

Rules:
- NOT_AVAILABLE ≠ FAIL — 증거 수집 불가 시 WARNING으로 표시
- 빈 출력 + EXIT=0 → PASS (NOT_AVAILABLE이 아님)
- 테스트가 없는 프로젝트: [test] NOT_AVAILABLE + WARNING
- FAIL 조건: 명시적 FAIL 결과가 있는 경우만"
})
```

터미널 표시:
```
⏺ aing:milla(Milla: 코드 품질 + 보안 점검) Sonnet
⏺ aing:sam(Sam: 증거 체인 검증 + 최종 판정) Haiku
```

## Verdict 통합 — Severity 기반 자동 전환

**하네스 원칙**: "검증할까요?" / "리뷰 먼저 할까요?" 같은 질문은 금지입니다. 파이프라인이 자동으로 판정하고 전환합니다.

### 판정 매트릭스

| Milla | Sam | 통합 Verdict | 전환 |
|-------|-----|-------------|------|
| PASS | PASS | **PASS** | → team-architect |
| PASS | FAIL | **FAIL** | → team-fix (Sam findings) |
| FAIL | PASS | **FAIL** | → team-fix (Milla findings) |
| FAIL | FAIL | **FAIL** | → team-fix (병합 findings) |

**어느 하나라도 FAIL → 전체 FAIL**. 단, findings를 병합하여 fix에 전달합니다.

### NOT_AVAILABLE 처리

Sam의 증거가 NOT_AVAILABLE인 경우 (테스트 없는 프로젝트 등):
- NOT_AVAILABLE **자체는 FAIL이 아님** — WARNING으로 표시
- Milla가 PASS이고 Sam이 WARNING만 있으면 → **PASS** (team-architect가 최종 판단)
- team-architect(Klay)에게 WARNING 항목을 전달하여 아키텍트가 위험 판단

## QA Loop Integration

After team-verify agents complete their review, if implementation tests exist:
1. Run `/aing qa` with the project test command
2. QA results feed into the verification report
3. If QA fails → trigger team-fix stage
4. If QA passes → include in verification evidence

## Architect 이중 검증 (team-architect)

Milla/Sam PASS 후 자동 실행. Klay(opus)가 아키텍트 관점에서 독립 검증:

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: Architect 이중 검증 — 완료 claim 검증",
  model: "opus",
  prompt: "[ARCHITECT VERIFY]
이전 검증 결과:
{Milla findings + Sam evidence chain}

{이전 REJECT 이력이 있으면:}
=== PREVIOUS REJECT HISTORY ===
Attempt #1: {reject reason} → {fix summary}
Attempt #2: {reject reason} → {fix summary}

WARNING 항목 (Sam):
{NOT_AVAILABLE 항목 목록}

... (architect-verify.ts가 상태 관리)"
})
```

### Architect 판정 규칙

| 상황 | Verdict | 전환 |
|------|---------|------|
| 이슈 없음 | APPROVED | → completion |
| CRITICAL/MAJOR 이슈 | REJECTED | → team-fix (feedback 포함) |
| **MINOR only** | **APPROVED with notes** | → completion (MINOR로 fix loop 트리거 안 함) |
| 이전과 동일 REJECT 사유 | REJECTED + escalate | → team-fix + `/aing debug` 제안 |

**코드 수준 강제** (`scripts/hooks/architect-verify.ts`):
- `startVerification()` → state 파일에 pending=true 기록
- stop hook이 pending 상태에서 세션 종료 차단
- APPROVED → `recordApproval()` → completion
- REJECTED → `recordRejection(feedback)` → team-fix (max 3 attempts)
- **3 attempts 소진**: 최선 버전으로 completion + Confidence: LOW + 미해결 findings 명시

## 전환 조건
- Milla/Sam PASS → team-architect (Klay 검증)
- Klay APPROVED → completion
- Klay REJECTED → team-fix
- Milla/Sam FAIL → team-fix
