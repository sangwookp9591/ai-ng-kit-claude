---
name: debug
description: "과학적 디버깅. 증상→가설→증거→반증→결론. Klay(탐색) + Jay(수정) + Milla(검증) 협업."
triggers: ["debug", "디버그", "버그", "안돼", "안됨", "에러", "오류", "fix bug"]
---

# /aing debug — Scientific Debugging

## Usage
```
/aing debug <증상>          — 새 디버그 세션 시작
/aing debug                 — 미완료 세션 재개
/aing debug --list          — 전체 세션 목록 조회
```

## Mode Detection

인자 파싱 순서:
1. `--list` 플래그 → **목록 모드**
2. 인자 없음 + `.aing/debug/` 에 OPEN/INVESTIGATING 세션 있음 → **재개 모드**
3. 인자 있음 → **새 세션 모드**

---

## Mode A: 새 세션 시작 (인자 있음)

### Step 1: 디렉토리 확인 및 slug 생성

```bash
mkdir -p .aing/debug
```

증상 텍스트를 slug으로 변환 규칙:
- 공백 → `-`
- 한글/특수문자 제거 후 영문 의미 요약 (예: "로그인 안됨" → `login-failure`)
- 최대 30자
- 소문자

### Step 2: DEBUG.md 파일 생성

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/scripts/cli/persist.js" debug-init \
  --dir "$(pwd)" \
  --slug "{slug}" \
  --title "{symptom}" \
  --date "{YYYY-MM-DD}"
```

파일이 생성되지 않으면 Write 도구로 직접 생성:
`.aing/debug/{YYYY-MM-DD}-{slug}.md` — 아래 템플릿 사용

### Step 3: Klay — 증상 수집 (Symptom Collection)

Klay를 스폰하여 코드베이스를 탐색하고 증거를 수집:

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 증상 수집 — {slug}",
  model: "sonnet",
  prompt: "[DEBUG MODE] 다음 증상을 조사하세요: {symptom}

출력 포맷 (SYMPTOM_REPORT):
## Symptom
{user's description}

## Reproduction
- Steps to reproduce (if determinable)
- Error messages / stack traces found

## Affected Files
| File | Line | Relevance |
|------|------|-----------|
| {path} | {line} | {why relevant} |

## Initial Observations
- {observation 1 with file:line evidence}
- {observation 2}

Rules:
- 실제 코드를 읽고 증거 기반으로 작성
- 추측 금지 — 모든 관찰에 file:line 참조 필수
- 에러 메시지, 스택 트레이스, 로그를 찾아서 포함"
})
```

### Step 4: Klay — 가설 생성 (Hypothesis Generation)

Klay의 보고서를 바탕으로 경쟁 가설 생성:

```
Agent({
  subagent_type: "aing:klay",
  description: "Klay: 가설 생성 — {slug}",
  model: "sonnet",
  prompt: "[DEBUG MODE] 다음 증상 보고서를 기반으로 가설을 생성하세요.

=== SYMPTOM_REPORT ===
{Klay의 Step 3 출력}

출력 포맷 (HYPOTHESIS_SET):
## Hypotheses

### H1: {hypothesis name}
- **Claim**: {what you think is wrong}
- **Evidence FOR**: {observations supporting this}
- **Evidence AGAINST**: {observations contradicting this}
- **Test**: {how to verify/falsify — specific command, file check, or code change}
- **Confidence**: HIGH / MEDIUM / LOW

### H2: {hypothesis name}
(same format)

### H3: {hypothesis name} (if applicable)
(same format)

## Recommended Investigation Order
1. {H_id} — {reason: highest confidence / easiest to test / highest impact}
2. {H_id} — {reason}

## Discriminating Probe
{가설들을 가장 효과적으로 구분하는 단일 테스트}

Rules:
- 최소 2개 가설 필수 (단일 가설은 확증 편향 위험)
- 각 가설에 반드시 Evidence AGAINST 포함 (반증 가능성)
- Test는 구체적이고 실행 가능해야 함"
})
```

### Step 5: Jay — 가설 검증 + 수정 (Hypothesis Testing)

Jay를 스폰하여 상위 가설을 검증하고 수정 코드 작성:

```
Agent({
  subagent_type: "aing:jay",
  description: "Jay: 가설 검증 — {top hypothesis}",
  model: "sonnet",
  prompt: "[DEBUG MODE] 다음 가설을 검증하세요.

=== HYPOTHESIS ===
{Step 4의 상위 가설}

=== DISCRIMINATING PROBE ===
{Step 4의 Discriminating Probe}

행동:
1. Discriminating Probe를 실행하여 가설 검증
2. 검증 결과에 따라:
   - CONFIRMED: 근본 원인 확인 → 수정 코드 작성
   - REFUTED: 다음 가설로 이동 (결과 반환)
   - INCONCLUSIVE: 추가 조사 필요 (구체적으로 무엇이 필요한지 명시)

출력 포맷 (TEST_RESULT):
## Hypothesis: {name}
## Verdict: CONFIRMED / REFUTED / INCONCLUSIVE
## Evidence
- {test performed}: {result}
- {file:line}: {what was found}

## Fix (if CONFIRMED)
{description of the fix applied}
{files changed with before/after}

## Next Steps (if REFUTED or INCONCLUSIVE)
- {what to investigate next}"
})
```

### Step 6: DEBUG.md 업데이트

매 가설 테스트 후 Edit 도구로 결과 기록. CONFIRMED 가설이 나오면:
1. 수정 계획 수립
2. 최소한의 코드 수정 (증거 기반만)
3. Status → INVESTIGATING → RESOLVED 업데이트 (Milla 검증 후)

### Step 7: Milla — 수정 검증 (Fix Verification)

수정이 적용된 경우 반드시 Milla로 검증:

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: 수정 검증 — {slug}",
  model: "sonnet",
  prompt: "다음 버그 수정을 검증하세요.

=== ORIGINAL SYMPTOM ===
{symptom}

=== FIX APPLIED ===
{Jay의 수정 내용}

검증 항목:
1. 수정이 원래 증상을 해결하는가?
2. 수정이 새로운 버그를 도입하지 않는가?
3. 관련 테스트가 통과하는가?
4. 보안 취약점이 없는가?

Verdict: PASS / FAIL — {reason}"
})
```

## Loop Control

- Step 5에서 REFUTED → 다음 가설로 이동 (Step 5 반복)
- 모든 가설 REFUTED → Step 4로 돌아가 새 관찰로 재시도
- 최대 3 가설 사이클
- 수정 적용 시 → 반드시 Step 7(검증) 실행
- Milla FAIL → 수정 롤백 후 대안 접근

---

## Mode B: 세션 재개 (인자 없음)

### Step 1: 미완료 세션 스캔

```bash
grep -rl "Status: OPEN\|Status: INVESTIGATING" .aing/debug/ 2>/dev/null | sort
```

결과가 없으면: "활성 디버그 세션이 없습니다. `/aing debug <증상>` 으로 새 세션을 시작하세요."

### Step 2: 세션 선택 안내

세션이 1개이면 자동 선택. 2개 이상이면 목록 출력 후 선택 안내:

```
활성 디버그 세션:
  1. login-failure — 로그인 안됨 (INVESTIGATING)
  2. api-timeout  — API 응답 없음 (OPEN)

재개할 세션 번호를 입력하세요:
```

### Step 3: 마지막 상태에서 재개

선택된 `.aing/debug/{date}-{slug}.md` 를 읽고:
- 마지막 미테스트 가설부터 계속
- INCONCLUSIVE 가설은 재테스트 고려
- 새 가설 추가 필요시 H{N+1} 로 추가

---

## Mode C: 목록 조회 (`--list`)

```bash
ls .aing/debug/*.md 2>/dev/null
```

각 파일에서 Status, Created, title 추출 후 테이블 출력:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing debug sessions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  OPEN
  2026-03-24  login-failure     로그인 안됨

  INVESTIGATING
  2026-03-23  api-timeout       API 응답 없음

  RESOLVED
  2026-03-22  null-pointer      NPE in UserService

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Error Handling

- Klay Step 3 실패 → 사용자에게 증상 상세 정보 요청
- 3 사이클 후 모든 가설 REFUTED → 수집된 증거를 요약하여 사용자에게 안내 후 가이드 요청
- Jay 수정이 Milla 검증 FAIL → 수정 롤백, 대안 접근 시도

---

## State Persistence

디버그 세션은 `.aing/debug/{YYYY-MM-DD}-{symptom-slug}.md` 에 저장:
- 증상 보고서
- 테스트된 모든 가설
- 수집된 증거
- 최종 판정 및 수정 사항

---

## DEBUG.md 템플릿

```markdown
# Debug: {title}
- Status: OPEN
- Created: {YYYY-MM-DD}
- Last Activity: {YYYY-MM-DD}

## 증상
{user-reported symptom}

## 관련 코드
- [ ] {file1} — {reason}
- [ ] {file2} — {reason}

## 가설
### H1: {hypothesis}
- **Claim**: {what you think is wrong}
- **Evidence FOR**: {observations supporting}
- **Evidence AGAINST**: {observations contradicting}
- **Test**: {how to verify}
- **결과**: (미실행)
- **판정**: -

## 결론
(미완료)

## 수정 사항
(없음)
```

---

## 규칙

- 추측으로 코드 수정 금지 — CONFIRMED 가설만으로 수정 진행
- 모든 가설 테스트 결과를 DEBUG.md 에 즉시 기록
- 최소 2개 이상의 가설 생성 필수 (단일 가설은 확증 편향 위험)
- 각 가설에 Evidence AGAINST 포함 필수 (반증 가능성 확보)
- 수정 후 반드시 Milla 검증 실행
- 세션 종료 전 Status 업데이트 필수 (RESOLVED or 이유 명시)
