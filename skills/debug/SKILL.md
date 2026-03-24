---
name: debug
description: "과학적 디버깅. 증상→가설→테스트→결론, 영구 상태 파일로 세션 간 재개."
triggers: ["debug", "디버그", "버그", "안돼", "안됨", "에러", "오류"]
---

# /swkit debug — Scientific Debugging

## Usage
```
/swkit debug <증상>          — 새 디버그 세션 시작
/swkit debug                 — 미완료 세션 재개
/swkit debug --list          — 전체 세션 목록 조회
```

## Mode Detection

인자 파싱 순서:
1. `--list` 플래그 → **목록 모드**
2. 인자 없음 + `.sw-kit/debug/` 에 OPEN/INVESTIGATING 세션 있음 → **재개 모드**
3. 인자 있음 → **새 세션 모드**

---

## Mode A: 새 세션 시작 (인자 있음)

### Step 1: 디렉토리 확인 및 slug 생성

```bash
mkdir -p .sw-kit/debug
```

증상 텍스트를 slug으로 변환 규칙:
- 공백 → `-`
- 한글/특수문자 제거 후 영문 의미 요약 (예: "로그인 안됨" → `login-failure`)
- 최대 30자
- 소문자

### Step 2: DEBUG.md 파일 생성

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/cli/persist.mjs" debug-init \
  --slug "{slug}" \
  --title "{symptom}" \
  --date "{YYYY-MM-DD}"
```

파일이 생성되지 않으면 Write 도구로 직접 생성:
`.sw-kit/debug/{slug}.md` — 아래 템플릿 사용

### Step 3: Klay 에이전트로 관련 코드 탐색

```
Agent({
  subagent_type: "sw-kit:klay",
  description: "Klay: 디버그 탐색 — {slug}",
  model: "sonnet",
  prompt: "다음 증상과 관련된 코드를 탐색해주세요.\n\n증상: {symptom}\n\n탐색 목표:\n1. 증상과 관련 가능성 있는 파일 목록 (최대 10개)\n2. 각 파일의 관련 이유 (한 줄)\n3. 의심 코드 경로 (함수명, 라인 범위)\n\n탐색 결과를 구조화된 목록으로 반환하세요."
})
```

### Step 4: 가설 생성

Klay 탐색 결과를 바탕으로 최소 2개 이상의 가설 생성:
- H1: 가장 가능성 높은 원인
- H2: 대안 원인
- H3+: 추가 원인 (필요시)

각 가설에 대해:
1. 테스트 방법 명시 (Bash로 실행 가능한 명령 포함)
2. 예상 결과 기술
3. Bash로 테스트 실행
4. 결과를 CONFIRMED / REJECTED / INCONCLUSIVE 로 판정

### Step 5: DEBUG.md 업데이트

매 가설 테스트 후 Edit 도구로 결과 기록. CONFIRMED 가설이 나오면:
1. 수정 계획 수립
2. 최소한의 코드 수정 (증거 기반만)
3. 수정 후 검증 테스트 실행
4. Status → RESOLVED 업데이트

---

## Mode B: 세션 재개 (인자 없음)

### Step 1: 미완료 세션 스캔

```bash
grep -rl "Status: OPEN\|Status: INVESTIGATING" .sw-kit/debug/ 2>/dev/null | sort
```

결과가 없으면: "활성 디버그 세션이 없습니다. `/swkit debug <증상>` 으로 새 세션을 시작하세요."

### Step 2: 세션 선택 안내

세션이 1개이면 자동 선택. 2개 이상이면 목록 출력 후 선택 안내:

```
활성 디버그 세션:
  1. login-failure — 로그인 안됨 (INVESTIGATING)
  2. api-timeout  — API 응답 없음 (OPEN)

재개할 세션 번호를 입력하세요:
```

### Step 3: 마지막 상태에서 재개

선택된 `.sw-kit/debug/{slug}.md` 를 읽고:
- 마지막 미테스트 가설부터 계속
- INCONCLUSIVE 가설은 재테스트 고려
- 새 가설 추가 필요시 H{N+1} 로 추가

---

## Mode C: 목록 조회 (`--list`)

```bash
ls .sw-kit/debug/*.md 2>/dev/null
```

각 파일에서 Status, Created, title 추출 후 테이블 출력:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit debug sessions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  OPEN
  login-failure     로그인 안됨           2026-03-24

  INVESTIGATING
  api-timeout       API 응답 없음         2026-03-23

  RESOLVED
  null-pointer      NPE in UserService    2026-03-22

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

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
- **테스트**: {what to test}
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
- 최소 2개 이상의 가설 생성 필수
- 수정 후 반드시 검증 테스트 실행
- 세션 종료 전 Status 업데이트 필수 (RESOLVED or 이유 명시)
