# Stage 4: team-fix (= PDCA Act) — Budget-Bounded Persistence

**Token budget으로 제어** — budget 초과 시 사용자 확인 요청.
stop hook(`persistent-mode.ts`)이 세션 종료를 차단.
circuit breaker(동일 에러 signature 10회)가 fail-safe.

## Token Budget 확인

매 fix iteration 시작 전 token 사용량을 확인합니다:

```
현재 세션 token 사용량 확인 → budget 비교
→ 초과: AskUserQuestion "Token budget 초과 ({N}k/{limit}k). 계속할까요? (continue/cancel)"
→ continue: budget 동일 량 추가 확장
→ cancel: 현재 상태로 completion 진행
```

## Error Recovery (코드 강제)

`scripts/hooks/error-recovery.ts`가 동일 에러를 추적:

### 에러 Signature 해시

에러 감지를 시간 기반이 아닌 **메시지 해시 기반**으로 수행합니다:
```
signature = hash(error_type + error_message + file_path)
→ 동일 signature 반복 횟수로 판단
→ 서로 다른 에러 20개 ≠ 같은 에러 20번
```

### Recovery 단계
- **3회 반복**: 대안 접근 제안 (advisory)
- **5회 반복**: 대안 접근 **강제** (같은 도구/명령 사용 금지)
- **7회 반복**: `/aing debug` 자동 전환 제안
- 성공 시 해당 signature 카운터 자동 리셋

## Regression 추적

fix가 다른 것을 깨뜨릴 수 있습니다. team-verify에서 감지합니다:

```
이전 verify PASS 항목 기록 → 다음 verify에서 비교
→ 이전 PASS가 현재 FAIL → [REGRESSION] 태그
→ fix agent에게 regression 정보 전달:
  "이전에 통과했던 {item}이 이번 fix로 인해 실패했습니다. 원래 기능을 깨뜨리지 않으면서 수정하세요."
```

## Fix with Context

When entering team-fix, read the latest handoff to understand what was tried:
1. Read `.aing/handoffs/{feature}/team-verify-*.md` for verification findings
2. Read `.aing/handoffs/{feature}/team-architect-*.md` for architect feedback (있으면)
3. **이전 fix 시도 히스토리** 누적 전달 (같은 접근 반복 방지)
4. After fix, write a team-fix handoff documenting what was changed

에러가 지속되면 (`error-recovery.ts` 감지):
- `/aing debug` 로 전환하여 근본 원인 분석 제안
- error signature를 debug handoff에 포함

## 실행

실패한 태스크의 원래 담당 에이전트를 **새 Task로** 재스폰합니다 (기존 task reset이 아닌 새로 생성):

```
Agent({
  subagent_type: "aing:{name}",
  description: "{Name}: Fix #{attempt} — {실패 사유 요약}",
  model: "{original model}",
  prompt: "... (아래 Retry Template 참조) ..."
})
```

터미널 표시:
```
⏺ aing:jay(Jay: Fix #1 — lint 에러 수정) Sonnet
```

## Fix Worker Prompt (Retry Template)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {Name} 재투입 — 수정 작업
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are {Name} in team "{feature-slug}".
This is fix attempt #{attempt}.

ORIGINAL TASK: {원래 태스크 설명}

VERIFICATION FAILURE:
{Milla/Sam의 검증 실패 출력 — 구체적 사유}

{regression이 있으면:}
⚠️ REGRESSION DETECTED:
{이전 PASS → 현재 FAIL 항목}
원래 기능을 깨뜨리지 않으면서 수정하세요.

{이전 fix 히스토리:}
PREVIOUS FIX ATTEMPTS:
#1: {what was tried} → {result}
#2: {what was tried} → {result}

VERIFICATION COMMANDS:
검증 명령 실행 시 반드시 exit code를 캡처하세요:
  Bash: npx tsc --noEmit 2>&1; echo "EXIT=$?"
  Bash: npm test 2>&1; echo "EXIT=$?"
EXIT=0 + 빈 출력 = PASS (에러 없음). 빈 출력을 보고 재시도하지 마세요.
같은 명령을 2회 이상 연속 실행하고 있다면 루프에 빠진 것 — 즉시 중단하세요.

YOUR MISSION:
위 검증 실패를 수정하세요. 수정 후 테스트를 실행하여 통과를 확인하세요.

COMMUNICATION FORMAT:
"@{Name}❯ Fix #{attempt}: {what you fixed}. Evidence: {test results}"

PROTOCOL:
1. 실패 원인 분석
2. 코드 수정
3. 테스트 실행 (TDD)
4. 증거 수집
5. SendMessage "@{Name}❯ Fix #{attempt} 완료: {summary}. Evidence: {results}"
```

## 전환 조건
- Fix 완료 → team-verify (재검증) → team-architect (이중 검증)
- Fix 실패 → team-fix (재시도, token budget 내)
- Token budget 초과 + 사용자 cancel → completion
- 명시적 cancel → completion
- Circuit breaker (동일 에러 signature 10회) → completion (fail-safe)
