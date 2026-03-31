# Why aing?

## 하나의 명령, 전체 팀이 움직인다

aing는 16명의 전문 에이전트가 협업하는 하네스 엔지니어링 시스템입니다.
코드를 짜는 것이 아니라, 코드를 짜는 팀을 운영합니다.

## 핵심 차별점

### 1. 16 Named Agents
각 에이전트는 전문 역할, 성격, 모델 티어를 가집니다. Sam(CTO)이 최종 판정하고, Klay(아키텍트)가 구조를 설계하고, Milla(보안)가 OWASP Top 10을 검증합니다.

### 2. PDCA Engine
Plan-Do-Check-Act 5단계 사이클을 자동 관리. 복잡도(0-15)에 따라 반복 횟수와 리뷰 깊이가 자동 조절됩니다.

### 3. Cost Intelligence
- **Context Budget**: 토큰 예산 추적 (외부 API 호출 없이)
- **Model Router**: 복잡도 기반 haiku/sonnet/opus 자동 선택
- **Cost Ceiling**: 세션 비용 상한 가드레일

### 4. Self-Healing Recovery
- Circuit Breaker: 연속 실패 시 자동 차단
- Retry Engine: 지수 백오프 + 지터
- Recovery Engine: git 체크포인트 복구
- Rollback: 검증 실패 시 안전하게 복구

### 5. Multi-AI Consensus
3개 AI(Claude + Codex + Gemini) 투표 기반 합의. MECHANICAL/TASTE/USER_CHALLENGE/SECURITY_WARNING 4가지 결정 유형.

### 6. Evidence Chain
테스트/빌드/린트/리뷰/브라우저/벤치마크 6종 증거. 증거 없이는 완료 판정 불가. Sam의 verdict가 ACHIEVED여야 ship 가능.

### 7. 4-Tier Review Pipeline
복잡도에 따라 자동 스케일:
- Eng Review (Klay + Jay + Milla): 코드 품질 + 보안
- CEO Review (Able + Sam): 스코프 + 전략
- Design Review (Willji): AI Slop 10가지 안티패턴
- Outside Voice: 독립 subagent 블라인드 스팟 감지

### 8. 40 Skills
디버깅, 리뷰, Ship, TDD, 성능 분석, 보안 감사, 리팩토링, 하네스 설계 등 전문 워크플로우를 즉시 실행.

### 9. Teacher Agent
소크라틱 교육 에이전트. 답을 주지 않고 질문으로 이끔. 학습자 수준 자동 추적. 만들면서 배운다.

### 10. Harness Architect
메타 스킬: 도메인을 분석하고, 에이전트 팀을 자동 설계하고, 검증하고, 시뮬레이션합니다. 하네스가 하네스를 만든다.

## 수치

| 지표 | 값 |
|------|:--:|
| Named Agents | 16 |
| Skills | 40 |
| Browse Commands | 60 |
| Tests | 1,712+ |
| E2E Suites | 10 |
| Modules | 149+ (~38.5K LOC) |
| Hook Events | 10 |
| Runtime Deps | 1 (ast-grep) |
| Hook Response | 5ms |

## 설계 철학

**Constrain → Inform → Verify → Correct**

| 축 | 점수 | 핵심 모듈 |
|----|:----:|----------|
| Constrain | 93 | Guardrail(7), Safety Invariants(5), Cost Ceiling, Freeze, Phase Gate |
| Inform | 93 | Context Budget, Progress, Compaction, Telemetry, 3-Tier Notepad, Learner |
| Verify | 95 | Evidence Chain, LLM Judge(7), Review(4-tier), QA Health, 1,712 Tests |
| Correct | 92 | Circuit Breaker, Retry, Recovery, Rollback, Persistent Mode, Heartbeat |
