---
name: init
description: "프로젝트 초기화. 질문 기반 문맥 수집 → PROJECT.md + REQUIREMENTS.md + TECH-STACK.md 생성."
triggers: ["init", "초기화", "새 프로젝트", "프로젝트 시작", "project init"]
metadata:
  filePattern: []
  bashPattern: []
---

# /swkit init — Project Initialization

GSD의 new-project 방식을 sw-kit 스타일로 재해석한 프로젝트 초기화 스킬입니다.
질문 기반 문맥 수집 후 `.sw-kit/project/` 에 프로젝트 문맥 파일을 생성합니다.

**When this skill is invoked, immediately execute the workflow below. Do not only restate or summarize these instructions back to the user.**

## Flag Parsing

Check for flags in the user's invocation:
- `--help` → Show Help Text and stop
- `--reset` → 기존 `.sw-kit/project/` 삭제 후 재초기화
- `--detect` → 질문 없이 코드베이스 자동 감지만 수행
- No flags → Run Pre-Init Check, then full initialization

## Help Text

When user runs with `--help`, display this and stop:

```
sw-kit Init - 프로젝트 초기화

USAGE:
  /swkit init                   인터랙티브 프로젝트 초기화
  /swkit init <project-name>    프로젝트명 지정 후 초기화
  /swkit init --detect          코드베이스 자동 감지만 수행
  /swkit init --reset           기존 초기화 데이터 삭제 후 재실행
  /swkit init --help            이 도움말

OUTPUT:
  .sw-kit/project/PROJECT.md      프로젝트 정의
  .sw-kit/project/REQUIREMENTS.md 요구사항 체크리스트
  .sw-kit/project/TECH-STACK.md   기술 스택 분석

NEXT STEPS:
  /swkit plan <feature>   기능 계획 수립
  /swkit do <task>        작업 실행
  /swkit tdd start        TDD 사이클 시작
```

## Pre-Init Check: Already Initialized?

`.sw-kit/project/PROJECT.md` 가 존재하는지 확인:

```bash
test -f .sw-kit/project/PROJECT.md && echo "exists" || echo "fresh"
```

### 이미 초기화된 경우 (--reset 플래그 없음)

`exists` 가 반환되고 `--reset` 플래그가 없으면 AskUserQuestion:

**Question:** "이 프로젝트는 이미 초기화되어 있습니다. 어떻게 하시겠습니까?"

**Options:**
1. **현재 문서 보기** — PROJECT.md 내용 출력 후 종료
2. **요구사항만 업데이트** — REQUIREMENTS.md 재생성
3. **전체 재초기화** — 모든 문서 삭제 후 처음부터
4. **취소** — 변경 없음

**Option 1 선택 시:** `.sw-kit/project/PROJECT.md` 읽어서 출력 후 종료.
**Option 2 선택 시:** Phase 2 (Q1~Q3 스킵, Q4~Q5만) → Phase 3 (REQUIREMENTS.md만 재생성).
**Option 3 선택 시:** `rm -rf .sw-kit/project/` 후 전체 Phase 실행.
**Option 4 선택 시:** 종료.

### --reset 플래그

```bash
rm -rf .sw-kit/project/
```

이후 전체 Phase 실행.

---

## Phase 1: 문맥 수집 (AskUserQuestion 순차 진행)

**IMPORTANT:** AskUserQuestion을 사용하여 질문을 **한 번에 하나씩** 순차적으로 진행합니다. 도구가 없으면 일반 텍스트로 질문하고 답변 대기.

먼저 ToolSearch로 AskUserQuestion 도구를 탐색:

```
ToolSearch("AskUserQuestion")
```

도구가 없으면 일반 텍스트로 질문합니다.

### Q1: 프로젝트 한 줄 요약

**Question:** "이 프로젝트는 무엇인가요? (한 줄로 요약해주세요)"

**Hint:** "예: 팀 일정 공유 웹 앱, 실시간 채팅 서비스 API, 전자상거래 플랫폼"

수집: `PROJECT_SUMMARY`

### Q2: 주요 사용자

**Question:** "주요 사용자는 누구인가요?"

**Hint:** "예: 소규모 팀 직장인, 대학생, 중소기업 운영자"

수집: `TARGET_USERS`

### Q3: 핵심 기능

**Question:** "핵심 기능 3가지를 알려주세요 (쉼표로 구분)"

**Hint:** "예: 로그인/회원가입, 일정 등록 및 공유, 알림 발송"

수집: `CORE_FEATURES` (쉼표로 분리하여 배열로 저장)

### Q4: 기술 스택

**Question:** "기술 스택이 정해져 있나요? (없으면 자동 감지합니다)"

**Options:**
1. **자동 감지** — 코드베이스에서 자동 탐색
2. **직접 입력** — 사용할 기술 스택 직접 입력
3. **혼합** — 자동 감지 후 추가 입력

수집: `TECH_INPUT_MODE` + `TECH_STACK_INPUT` (직접 입력 시)

### Q5: 제약 조건

**Question:** "특별한 제약 조건이 있나요? (없으면 Enter)"

**Hint:** "예: 3개월 런치 목표, 모바일 우선 설계, GDPR 준수 필요, 동시접속 1000명"

수집: `CONSTRAINTS` (없으면 빈 문자열)

---

## Phase 2: 코드베이스 자동 감지

Q4에서 "자동 감지" 또는 "혼합"을 선택했거나, 기존 코드베이스가 있는 경우 실행합니다.

### Step 1: 디렉토리 생성

```bash
mkdir -p .sw-kit/project
```

### Step 2: Klay 에이전트로 코드베이스 탐색

```
Agent({
  subagent_type: "sw-kit:klay",
  description: "Klay: 코드베이스 기술 스택 자동 감지",
  model: "sonnet",
  prompt: "이 프로젝트의 기술 스택을 탐색해주세요.\n\n탐색 목표:\n1. package.json, requirements.txt, go.mod, Cargo.toml, pom.xml 등 의존성 파일\n2. 주요 프레임워크 및 라이브러리 (이름 + 버전)\n3. 빌드/테스트/린트 명령어\n4. 런타임 (Node.js 버전, Python 버전 등)\n5. 패키지 매니저 (npm/yarn/pnpm/pip 등)\n6. 디렉토리 구조 요약 (최대 2레벨)\n\n결과를 다음 형식으로 반환하세요:\nRUNTIME: {runtime and version}\nPACKAGE_MANAGER: {pm}\nFRAMEWORK: {framework and version}\nBUILD_CMD: {build command}\nTEST_CMD: {test command}\nLINT_CMD: {lint command}\nDEPS: {key dependencies as 'name@version: purpose' list}\nDEV_DEPS: {key dev dependencies as 'name@version: purpose' list}\nSTRUCTURE: {directory summary}"
})
```

코드베이스가 없거나 탐색 실패 시 "신규 프로젝트"로 처리하고 계속 진행.

수집: `DETECTED_STACK` (Klay 반환값)

### Step 3: 스택 병합 (혼합 모드인 경우)

사용자 입력(`TECH_STACK_INPUT`)과 자동 감지(`DETECTED_STACK`)를 병합.
충돌 시 사용자 입력을 우선합니다.

---

## Phase 3: 문서 생성

### Step 1: PROJECT.md 생성

`templates/project.md` 템플릿을 참조하여 `.sw-kit/project/PROJECT.md` 생성.

수집된 데이터로 플레이스홀더 치환:
- `{name}` → 프로젝트명 (사용자가 `init <name>`으로 지정했거나, PROJECT_SUMMARY에서 추출)
- `{one-line description}` → PROJECT_SUMMARY
- `{users}` → TARGET_USERS
- `{problem}` → PROJECT_SUMMARY에서 핵심 문제 추출
- `{date}` → 오늘 날짜 (YYYY-MM-DD)
- `{feature1}`, `{feature2}`, `{feature3}` → CORE_FEATURES 배열
- `{runtime}`, `{framework}`, `{db}`, `{libs}` → 감지된 스택
- `{constraint1}`, `{constraint2}` → CONSTRAINTS (없으면 "없음")

### Step 2: REQUIREMENTS.md 생성

`templates/requirements.md` 템플릿을 참조하여 `.sw-kit/project/REQUIREMENTS.md` 생성.

CORE_FEATURES를 기반으로 요구사항 자동 추론:
- Must Have: 핵심 기능들의 기본 구현 요구사항
- Should Have: 성능, UX, 에러 처리 관련
- Nice to Have: 고급 기능, 최적화
- Out of Scope: 명시적으로 언급되지 않은 복잡한 기능

### Step 3: TECH-STACK.md 생성

`templates/tech-stack.md` 템플릿을 참조하여 `.sw-kit/project/TECH-STACK.md` 생성.

DETECTED_STACK 또는 TECH_STACK_INPUT 데이터로 채움.
탐지 실패한 항목은 `(미정)` 으로 표시.

---

## Phase 4: 완료

### Show Completion

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sw-kit 프로젝트 초기화 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  프로젝트: {project name}
  대상 사용자: {TARGET_USERS}
  핵심 기능: {CORE_FEATURES count}개

  생성된 파일:
  ─────────────────────────────────────
  .sw-kit/project/PROJECT.md       프로젝트 정의
  .sw-kit/project/REQUIREMENTS.md  요구사항 체크리스트
  .sw-kit/project/TECH-STACK.md    기술 스택 분석

  다음 단계:
  ─────────────────────────────────────
  /swkit plan <feature>   기능 계획 수립
  /swkit do <task>        작업 실행
  /swkit tdd start        TDD 사이클 시작
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 규칙

- AskUserQuestion을 사용하여 질문을 **한 번에 하나씩** 순차적으로 진행
- 자동 감지 실패 시 조용히 넘어가고 (미정)으로 표시
- 기존 `.sw-kit/project/` 외부 파일은 절대 수정하지 않음
- Klay 에이전트 호출 시 `description` 파라미터 필수
- 생성된 파일은 사용자가 직접 편집 가능한 마크다운 형식 유지
