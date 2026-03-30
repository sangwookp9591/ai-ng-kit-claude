---
name: lsp
description: "죽은 코드 탐지. LSP + AST 기반 미사용 export/함수/타입/파일 탐색. Kain(분석) + Milla(검증)."
triggers: ["lsp", "dead code", "죽은 코드", "unused", "미사용", "unreachable", "안쓰는"]
---

# /aing lsp — Dead Code Detection

## Usage
```
/aing lsp <target>            — 대상 디렉토리/파일 죽은 코드 탐지
/aing lsp                     — 전체 프로젝트 스캔
/aing lsp --fix               — 탐지 + 자동 제거
```

## Mode Detection

인자 파싱:
1. `--fix` 플래그 → **탐지 + 제거 모드**
2. `<target>` → **대상 지정 모드**
3. 인자 없음 → **전체 스캔 모드**

---

## Step 1: Kain — LSP/AST 기반 죽은 코드 탐지

```
Agent({
  subagent_type: "aing:kain",
  description: "Kain: 죽은 코드 탐지 — {target}",
  model: "sonnet",
  prompt: "[DEAD CODE DETECTION]
다음 대상에서 죽은 코드를 찾으세요: {target or 'entire project'}

탐지 방법 (우선순위대로 사용):

### Method 1: LSP Find References
MCP 도구 `lsp_find_references`로 각 exported 심볼의 참조 수 확인.
참조가 0 (정의 자신만 있음) → 죽은 코드 후보.

### Method 2: AST Grep
`ast_grep_search`로 패턴 매칭:
- `export function $NAME` → 해당 $NAME이 다른 파일에서 import되는지 Grep
- `export const $NAME` → 동일
- `export type $NAME` / `export interface $NAME` → 동일

### Method 3: Grep Fallback
LSP/AST 불가 시 Grep으로:
- 모든 export 추출
- 각 export name을 프로젝트 전체에서 Grep
- import하는 곳이 없으면 죽은 코드 후보

### 탐지 카테고리

1. **Unused Exports**: export되었으나 어디서도 import하지 않는 함수/변수/타입
2. **Unused Files**: 어디서도 import하지 않는 파일 전체
3. **Unreachable Code**: return/throw 뒤의 코드, 항상 false인 조건분기
4. **Unused Parameters**: 함수 파라미터 중 사용되지 않는 것
5. **Commented-out Code**: 주석 처리된 코드 블록 (3줄 이상)

### 제외 대상 (False Positive 방지)
- entry point 파일 (index.ts, main.ts, app.ts, page.tsx, route.ts)
- 테스트 파일에서만 사용되는 test helper → 죽은 코드가 아님
- package.json의 bin/main/exports에 명시된 파일
- dynamic import (import())로 사용되는 모듈
- 프레임워크 convention 파일 (layout.tsx, middleware.ts, proxy.ts 등)
- hook handler 파일 (hooks-handlers/)

출력 포맷:
## Dead Code Report

### Unused Exports ({N} found)
| File | Export | Type | Confidence |
|------|--------|------|------------|
| {path}:{line} | {name} | function/const/type/interface | high/medium |

### Unused Files ({N} found)
| File | Lines | Last Modified | Confidence |
|------|-------|---------------|------------|
| {path} | {N} | {date} | high/medium |

### Unreachable Code ({N} found)
| File:Line | Pattern | Detail |
|-----------|---------|--------|
| {loc} | after-return/dead-branch/commented | {detail} |

### Unused Parameters ({N} found)
| File:Line | Function | Parameter |
|-----------|----------|-----------|
| {loc} | {fn name} | {param name} |

### Summary
- Total dead code candidates: {N}
- High confidence: {N}
- Medium confidence: {N} (manual review recommended)
- Estimated removable lines: {N}"
})
```

## Step 2: 결과 분류 및 리포트

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing lsp: {target}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Unused Exports:    {N}
  Unused Files:      {N}
  Unreachable Code:  {N}
  Unused Parameters: {N}
  Commented-out:     {N}

  Removable Lines:   ~{N}
  Confidence: {N} high / {N} medium

  → /aing lsp --fix 로 자동 제거
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 3: 자동 제거 (--fix 모드만)

### 3-1: Checkpoint 생성

```bash
CHECKPOINT=$(git rev-parse HEAD)
```

### 3-2: Jay — High confidence 항목만 제거

```
Agent({
  subagent_type: "aing:jay",
  description: "Jay: 죽은 코드 제거 — {target}",
  model: "sonnet",
  prompt: "[DEAD CODE REMOVAL]
다음 죽은 코드를 제거하세요.

=== DEAD CODE REPORT ===
{Kain's report — HIGH CONFIDENCE items only}

Rules:
- **high confidence만 제거** (medium은 건드리지 않음)
- Unused exports: export 키워드 제거. 해당 함수/변수가 파일 내에서도 안 쓰이면 전체 삭제
- Unused files: 파일 삭제
- Unreachable code: 해당 라인 삭제
- Commented-out code: 주석 블록 삭제
- Unused parameters: 밑줄 prefix 추가 (_param) 또는 제거 (타입 시그니처 영향 확인)
- 제거 후 import 정리 (사용되지 않는 import도 제거)
- 변경한 파일 목록 출력"
})
```

### 3-3: Milla — 제거 검증

```
Agent({
  subagent_type: "aing:milla",
  description: "Milla: 죽은 코드 제거 검증",
  model: "sonnet",
  prompt: "[REMOVAL VERIFY]
죽은 코드 제거 결과를 검증하세요.

=== ORIGINAL REPORT ===
{Klay's dead code report}

=== REMOVED ITEMS ===
{Jay's removal list}

검증:
1. git diff로 제거된 코드만 삭제되었는지 확인 (기능 코드 손상 없음)
2. 남은 import가 모두 유효한지 확인
3. 테스트 실행 — 모든 테스트 통과하는지

## Verdict: PASS / FAIL
## Rollback Needed: yes/no"
})
```

### 3-4: 제거 리포트

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  aing lsp --fix: {target}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Removed: {N} items
  Lines deleted: {N}
  Files deleted: {N}
  Verification: {PASS/FAIL}
  Checkpoint: {git hash}

  Remaining (medium confidence — manual review):
  - {item 1}
  - {item 2}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Error Handling
- LSP 서버 없음 → AST Grep + Grep fallback 자동 전환
- AST Grep 사용 불가 → Grep-only 모드 (confidence 한 단계 낮춤)
- 제거 후 테스트 실패 → 자동 rollback + 실패 원인 리포트
- 대규모 프로젝트 (>500 파일) → 디렉토리 단위 분할 스캔
