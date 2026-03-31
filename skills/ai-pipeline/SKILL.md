---
name: ai-pipeline
description: "AI 자동 개발 파이프라인. 모델 찾기 → 비교 → 코드 생성 → API 생성 → 테스트."
triggers: ["ai pipeline", "ai-pipeline", "모델 찾기", "모델 비교", "AI 파이프라인", "model pipeline", "ai 개발"]
---

# /aing ai-pipeline — AI 자동 개발 파이프라인

모델 탐색부터 프로덕션 API까지 자동으로 진행하는 5-Phase 파이프라인.
Lightweight model (mobile/browser/edge inference) 우선.

## Usage

```
/aing ai-pipeline "<태스크 설명>"
/aing ai-pipeline "이미지 분류 모델을 브라우저에서 실행"
/aing ai-pipeline "한국어 감성 분석 API 만들어줘"
/aing ai-pipeline "음성 인식 모바일 앱에 넣어줘"
```

## Pipeline Overview

```
Phase 1: DISCOVER    → Hugg가 모델 후보 탐색
Phase 2: COMPARE     → Hugg가 정량 비교 매트릭스 작성
Phase 3: IMPLEMENT   → Jo가 추론 코드 + 전처리/후처리 생성
Phase 4: API         → Jo가 서빙 엔드포인트 스캐폴딩
Phase 5: TEST        → Jay가 통합 테스트 + 성능 검증
```

## Step 1: 요구사항 수집

사용자 입력에서 다음을 추출합니다:

| 항목 | 설명 | 기본값 |
|------|------|--------|
| **Task** | NLP, Vision, Audio, Multimodal 등 | (필수) |
| **Target Runtime** | browser, mobile, server, edge | browser |
| **Size Budget** | 모델 크기 상한 | browser: 50MB, mobile: 100MB, server: 500MB |
| **Latency Budget** | 추론 시간 상한 | browser: 200ms, mobile: 100ms, server: 500ms |
| **License** | 허용 라이선스 | Apache-2.0, MIT |
| **Language** | 지원 언어 | TypeScript |

누락된 필수 항목이 있으면 AskUserQuestion으로 확인합니다.

## Step 2: Phase 1 — DISCOVER (Hugg)

Hugg 에이전트를 spawning합니다:

```
Agent(
  subagent_type="aing:hugg",
  name="hugg",
  prompt="[AI PIPELINE — Phase 1: DISCOVER]

Task: {task description}
Target Runtime: {runtime}
Size Budget: {size}MB
Latency Budget: {latency}ms
License: {license}

## Mission
1. HuggingFace Hub에서 태스크 관련 모델 탐색
2. 다운로드 수, 최근 업데이트, 커뮤니티 평점 기준 필터
3. Lightweight 우선 필터: size < {budget}MB
4. 최소 5개 후보 목록 작성
5. 각 후보의 모델 카드 요약 (architecture, training data, benchmark)

Output: 후보 모델 목록을 파일로 저장
→ .aing/ai-pipeline/candidates.md"
)
```

## Step 3: Phase 2 — COMPARE (Hugg)

후보 목록을 기반으로 Hugg가 정량 비교:

```
Agent(
  subagent_type="aing:hugg",
  name="hugg",
  prompt="[AI PIPELINE — Phase 2: COMPARE]

Read: .aing/ai-pipeline/candidates.md

## Mission
1. 각 후보 모델의 벤치마크 수치 수집
2. 비교 매트릭스 작성 (Model Comparison Report 포맷)
3. Runtime 호환성 확인 (Transformers.js / ONNX / TFLite)
4. 양자화 가능 여부 및 예상 성능 분석
5. TOP 3 선정 + Implementation Spec 작성

Output: 비교 리포트 + 선정 결과 저장
→ .aing/ai-pipeline/comparison.md
→ .aing/ai-pipeline/selected-model.md (Jo용 Implementation Spec)"
)
```

## Step 4: Phase 3 — IMPLEMENT (Jo)

선정된 모델로 Jo가 추론 코드 생성:

```
Agent(
  subagent_type="aing:jo",
  name="jo",
  prompt="[AI PIPELINE — Phase 3: IMPLEMENT]

Read: .aing/ai-pipeline/selected-model.md

## Mission
1. selected-model.md의 Implementation Spec 확인
2. Target Runtime에 맞는 추론 코드 생성:
   - browser → Transformers.js pipeline 또는 ONNX.js
   - mobile → TFLite / CoreML wrapper
   - server → Python (FastAPI) 또는 Node.js
3. 전처리/후처리 파이프라인 구현
4. TDD: 모델 로딩 + 추론 결과 검증 테스트 작성
5. 타입 정의 포함

Output: 추론 코드 파일들 생성
→ src/ai/ 또는 lib/ai/ 디렉토리"
)
```

## Step 5: Phase 4 — API (Jo)

서빙 레이어 생성:

```
Agent(
  subagent_type="aing:jo",
  name="jo",
  prompt="[AI PIPELINE — Phase 4: API]

Read: Phase 3에서 생성된 추론 코드

## Mission
1. 기존 프로젝트 구조에 맞는 API 엔드포인트 생성:
   - Next.js → app/api/ Route Handler
   - Express/Hono → routes/
   - FastAPI → routers/
2. 입력 검증 (zod/pydantic schema)
3. 에러 핸들링 (모델 로딩 실패, 입력 형식 오류)
4. 응답 포맷 (JSON, streaming 지원)
5. OpenAPI/Swagger 스펙 (있다면)

Output: API 엔드포인트 파일들"
)
```

## Step 6: Phase 5 — TEST (Jay)

통합 테스트 + 성능 검증:

```
Agent(
  subagent_type="aing:jay",
  name="jay",
  prompt="[AI PIPELINE — Phase 5: TEST]

## Mission
1. 추론 코드 단위 테스트:
   - 모델 로딩 성공 확인
   - 샘플 입력 → 기대 출력 형태 확인
   - 에러 케이스 (잘못된 입력, 모델 없음)
2. API 통합 테스트:
   - 엔드포인트 요청/응답 검증
   - 입력 검증 테스트
   - 에러 응답 포맷 확인
3. 성능 테스트:
   - 추론 시간 측정 (10회 평균)
   - 메모리 사용량 확인
   - Latency budget 준수 여부
4. 모든 테스트 실행 후 결과 보고

Output: 테스트 파일 + 성능 리포트
→ .aing/ai-pipeline/test-report.md"
)
```

## Step 7: 결과 종합

모든 Phase 완료 후 결과를 사용자에게 보고:

```
━━━ AI Pipeline 완료 ━━━

📊 모델: {selected model name}
   Size: {X}MB | Latency: {X}ms | License: {license}

📁 생성된 파일:
   - {inference code path}
   - {api endpoint path}
   - {test file path}

✅ 테스트: {passed}/{total} passed
⚡ 성능: avg latency {X}ms (budget: {Y}ms)

📋 리포트:
   - .aing/ai-pipeline/comparison.md
   - .aing/ai-pipeline/test-report.md
━━━━━━━━━━━━━━━━━━━━━━━
```

## Size Budget Defaults

| Runtime | Default Budget | Rationale |
|---------|---------------|-----------|
| browser | 50MB | WebAssembly + download time |
| mobile | 100MB | App bundle size constraint |
| edge | 200MB | Serverless function size limit |
| server | 500MB | Container memory budget |

## Supported Tasks

| Category | Examples |
|----------|---------|
| NLP | text-classification, token-classification, question-answering, summarization, translation, text-generation, fill-mask, sentence-similarity |
| Vision | image-classification, object-detection, image-segmentation, zero-shot-image-classification |
| Audio | automatic-speech-recognition, audio-classification, text-to-speech |
| Multimodal | image-to-text, visual-question-answering, document-question-answering |

## Error Handling

- Phase 실패 시: 해당 Phase를 재시도 (최대 2회)
- 모델 후보 없음: size budget 2배로 확장 후 재탐색
- 런타임 호환 모델 없음: 대체 런타임 제안
- 테스트 실패: Jo에게 수정 요청 후 재테스트

## Pipeline State

각 Phase의 상태를 `.aing/ai-pipeline/` 디렉토리에 저장:

```
.aing/ai-pipeline/
├── candidates.md        # Phase 1 output
├── comparison.md        # Phase 2 output
├── selected-model.md    # Phase 2 output (Jo용 스펙)
└── test-report.md       # Phase 5 output
```
