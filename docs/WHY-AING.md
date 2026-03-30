# Why aing? — gstack 대비 차별화 포인트

## Scorecard: ai-ng 103 vs gstack 94 (+9점)

| 차원 | gstack | ai-ng | 승자 |
|------|:------:|:-----:|:----:|
| Browser/QA | 9 | 7 | gstack |
| Review System | 6 | 8 | **ai-ng** |
| Skill Completeness | 9 | 9 | 동등 |
| Agent Architecture | 4 | 8 | **ai-ng** |
| Orchestration | 5 | 8 | **ai-ng** |
| Design System | 9 | 6 | gstack |
| Ship/Deploy | 8 | 7 | gstack |
| Test Coverage | 9 | 8 | gstack |
| Code Quality | 7 | 8 | **ai-ng** |
| Build System | 8 | 6 | gstack |
| Cost/Resource Mgmt | 3 | 8 | **ai-ng** |
| Recovery/Resilience | 2 | 7 | **ai-ng** |
| Extensibility | 7 | 7 | 동등 |
| Documentation | 8 | 6 | gstack |

## ai-ng만의 강점 (gstack에 없는 것)

### 1. 16 Named Agents
gstack은 skill 기반이고 에이전트 개념이 없음. ai-ng는 16명의 전문 에이전트가 각자 역할, 성격, 모델 티어를 가짐.

### 2. PDCA Engine
Plan-Do-Check-Act 5단계 사이클을 자동 관리. 복잡도(0-15)에 따라 반복 횟수와 리뷰 깊이 자동 조절.

### 3. Cost Intelligence
- Context Budget: 토큰 예산 추적 (외부 API 호출 없이)
- Model Router: 복잡도 기반 haiku/sonnet/opus 자동 선택
- Cost Ceiling: 세션 비용 상한 가드레일

### 4. Recovery System
- Circuit Breaker: 연속 실패 시 자동 차단
- Retry Engine: 지수 백오프 + 지터
- Recovery Engine: git 체크포인트 복구

### 5. Multi-AI Consensus
3개 AI(Claude + Codex + Gemini) 투표 기반 합의. MECHANICAL/TASTE/USER_CHALLENGE/SECURITY_WARNING 4가지 결정 유형.

### 6. Evidence Chain
테스트/빌드/린트/리뷰/브라우저/벤치마크 6종 증거. 증거 없이는 완료 판정 불가.

### 7. Zero Dependencies
런타임 외부 의존성 0개. Node.js 내장 모듈만 사용.

### 8. Teacher Agent
소크라틱 교육 에이전트. 답을 주지 않고 질문으로 이끔. 학습자 수준 자동 추적.

### 9. Design System Engine
토큰 생성 → 비교 → 반복 개선 → 진화적 최적화 → 갤러리. CSS/Tailwind 자동 출력.

### 10. 39 Skills (gstack 30 추월)
investigate, office-hours, retro, benchmark, design-consultation, design-review, cso-audit, land-and-deploy 등 gstack 전 스킬 흡수 + 고유 스킬 추가.

## gstack이 앞서는 영역
- Browse LOC depth (14.2K vs 2.6K) — gstack은 sidebar agent, compare board 등 부가 기능이 더 많음
- Test LOC (24.3K vs 9.5K) — gstack은 LLM eval 테스트가 매우 방대함
- Design System LOC (3K+ vs 1K) — gstack은 design CLI가 더 성숙함
- Compiled binary — gstack은 bun compile로 단일 바이너리 배포
