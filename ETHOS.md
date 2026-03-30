# ETHOS

**aing Builder Philosophy**

16명의 에이전트, 39개의 스킬, 0개의 런타임 의존성.
이 문서는 aing을 만드는 원칙이다. 기능 목록이 아니라 판단 기준이다.

---

## 1. No Evidence, No Done

증거 없이 완료를 선언하지 않는다.

"다 됐습니다"는 의견이다. 증거가 있어야 사실이 된다.
aing은 6가지 증거 타입을 정의한다:

| Type | 검증 대상 |
|------|----------|
| `test` | 테스트 통과 |
| `build` | 빌드 성공 |
| `lint` | 정적 분석 통과 |
| `security` | 보안 감사 통과 |
| `review` | 코드 리뷰 완료 |
| `code` | 코드 변경 존재 |

최소 하나의 증거가 필요하다. Sam(CTO)은 증거 체인을 검증한 뒤에만 PASS를 내린다.
증거가 없으면 Completeness 점수가 올라갈 수 없다.

이 원칙은 타협 불가다. 에이전트가 "잘 작동할 것 같습니다"라고 말하는 순간, 그건 작동하지 않는 것이다.

---

## 2. PDCA는 속도가 아닌 방향

Plan, Do, Check, Act.

이 사이클은 느려지기 위한 것이 아니다.
잘못된 방향으로 빠르게 가는 것을 막기 위한 것이다.

aing의 PDCA는 복잡도에 따라 자동 스케일링된다.
Complexity score 0-15를 측정하고, 점수에 따라 iteration 횟수와 review tier가 결정된다.

- 낮은 복잡도: 짧은 사이클, 가벼운 리뷰
- 높은 복잡도: 긴 사이클, 다층 리뷰 (CEO/Eng/Design/Outside Voice)

Plan 없이 Do로 뛰어드는 것은 지도 없이 운전하는 것이다.
Check 없이 Act하는 것은 눈 감고 방향을 트는 것이다.

사이클을 건너뛰는 것은 허용되지 않는다. 축소하는 것은 허용된다.

---

## 3. 에이전트는 역할이다

aing에는 16명의 에이전트가 있다. 각자 이름과 관점을 가진다.

- **Simon** (CEO): 이 기능이 지금 필요한가? 사라지면 화낼 사용자가 있는가?
- **Sam** (CTO): 증거가 있는가? Completeness는 몇 점인가?
- **Able** (PM): 작업 분해가 되었는가? 우선순위는?
- **Klay** (Architect): 구조가 맞는가? 경계가 명확한가?
- **Milla** (Security): 취약점은 없는가? Trust boundary는?
- **Jay** (Backend), **Derek** (Frontend), **Jerry** (Infra), **Willji** (Design)...

한 사람이 모든 관점을 가질 수 없다.
CEO는 시장을 보고, CTO는 증거를 보고, Security는 공격 벡터를 본다.

이것이 4-tier review pipeline의 근거다.
같은 코드를 CEO, Engineer, Designer, Outside Voice가 각자의 렌즈로 본다.
다양한 시각이 모여야 품질이 올라간다.

에이전트는 도구가 아니다. 역할이다.

---

## 4. 자가 치유 우선

실패는 정보이지 종료 조건이 아니다.

시스템이 실패하면 먼저 스스로 복구를 시도한다.
사람에게 에스컬레이션하는 것은 자가 치유가 실패한 뒤다.

aing의 복구 메커니즘:

- **Circuit Breaker**: 연속 실패 감지 시 호출 차단. 냉각 후 재시도.
- **Exponential Backoff**: 재시도 간격을 지수적으로 증가. 시스템에 숨 쉴 틈을 줌.
- **Snapshot Recovery**: 검증 실패 시 git 체크포인트로 롤백.
- **Retry Engine**: 일시적 실패를 구별하고 재시도.

실패를 숨기지 않는다. 기록하고, 분석하고, 학습한다.
"왜 실패했는가"가 "실패했다"보다 중요하다.

---

## 5. Cross-Session Learning

세션이 끝나도 학습은 남는다.

aing은 프로젝트 메모리를 통해 세션 간 학습을 유지한다.
하지만 모든 정보가 영구적이지는 않다.

**Confidence Decay** 규칙:

- 관측된 정보 (`observed`): 30일에 걸쳐 신뢰도가 감소한다. 코드는 변하고, 관측은 썩는다.
- 사용자가 직접 말한 정보 (`user-stated`): 신뢰도가 감소하지 않는다. 사용자 발언은 영구적이다.

이 구분이 중요하다.

"이 프로젝트는 React를 쓴다"를 에이전트가 관측했다면, 30일 뒤 재확인이 필요하다.
"우리는 절대 jQuery를 쓰지 않는다"를 사용자가 말했다면, 그것은 지속적 제약이다.

정보가 쌓이기만 하면 노이즈가 된다.
Confidence decay는 메모리를 신선하게 유지하는 메커니즘이다.

---

## 6. Hook은 눈이다

보이지 않으면 제어할 수 없다.

aing은 9개의 네이티브 Hook으로 에이전트 행동을 모니터링한다:

| Hook | 시점 |
|------|------|
| `session-start` | 세션 시작 |
| `pre-tool-use` | 도구 호출 전 |
| `post-tool-use` | 도구 호출 후 |
| `pre-compact` | 컨텍스트 압축 전 |
| `user-prompt-submit` | 사용자 입력 제출 |
| `stop` | 에이전트 정지 |
| `stop-failure` | 에이전트 비정상 정지 |
| `subagent-start` | 서브에이전트 생성 |
| `subagent-stop` | 서브에이전트 종료 |

Hook은 개입이 아니다. 관측이다.
도구 호출을 차단할 수도 있고, 비용을 추적할 수도 있고, 위험 패턴을 감지할 수도 있다.

Hook이 없으면 에이전트는 블랙박스다.
블랙박스에 자율성을 주는 것은 위험하다.

Hook 응답은 5ms 이내. 관측의 비용이 높으면 관측하지 않게 된다.

---

## 7. Zero Dependencies, Maximum Portability

런타임 의존성: 0.

aing은 Node.js 내장 API만으로 동작한다.
`node:fs`, `node:path`, `node:crypto`, `node:child_process`.
npm install이 필요한 외부 패키지는 없다.

이유는 단순하다:

- 의존성은 공급망 공격의 표면이다.
- 의존성은 버전 충돌의 원인이다.
- 의존성은 이식성의 적이다.

111개 모듈, 21,500+ LOC, 56개 테스트 파일.
전부 zero dependencies로 구현되었다.

어디서든 실행 가능해야 한다. Node.js가 있으면 된다. 그것이 전부다.

---

## 8. 사용자가 결정한다

에이전트는 추천한다. 결정하지 않는다.

aing은 Multi-AI consensus (Claude + Codex + Gemini 3-voice voting)를 지원한다.
하지만 투표 결과가 곧 결정은 아니다.

의사결정은 세 가지로 분류된다:

| 분류 | 설명 | 결정 주체 |
|------|------|----------|
| `MECHANICAL` | 정답이 있는 기술적 판단 | 자동 |
| `TASTE` | 정답이 없는 취향/방향 판단 | 사람 필요 |
| `USER_CHALLENGE` | 에이전트 제안에 대한 거부권 | 사용자 |

lint 에러 수정은 MECHANICAL이다. 에이전트가 알아서 한다.
UI 색상 선택은 TASTE다. 사용자에게 묻는다.
에이전트가 파일 삭제를 제안하면 USER_CHALLENGE다. 사용자가 거부할 수 있다.

Simon(CEO)의 규칙: "추천하되, 결정하지 마라. 양쪽을 보여주고, 사용자가 고른다."

AI가 더 똑똑해져도 이 원칙은 변하지 않는다.
도구가 강력할수록 제어권은 더 명확해야 한다.

---

## 요약

| # | 원칙 | 한 줄 |
|:-:|------|------|
| 1 | No Evidence, No Done | 증거가 사실을 만든다 |
| 2 | PDCA는 방향이다 | 잘못된 방향의 속도는 낭비다 |
| 3 | 에이전트는 역할이다 | 다양한 렌즈가 품질을 만든다 |
| 4 | 자가 치유 우선 | 실패는 정보다 |
| 5 | Cross-Session Learning | 관측은 썩고, 발언은 영구다 |
| 6 | Hook은 눈이다 | 보이지 않으면 제어 불가 |
| 7 | Zero Dependencies | 어디서든 실행 가능 |
| 8 | 사용자가 결정한다 | 도구는 추천하고, 사람이 고른다 |

---

<p align="center">
  <sub>aing Harness Engineering Agent &mdash; Built by <a href="https://github.com/sangwookp9591">SW</a></sub>
</p>
