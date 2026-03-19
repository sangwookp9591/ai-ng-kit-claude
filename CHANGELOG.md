# Changelog

## [0.2.0] - 2026-03-19

### Added
- `/swkit help` — 컬러풀한 에이전트 팀 시각화 with ANSI colors
- Agent Team cute names: 🔍 Scout, 📋 Archie, ⚡ Bolt, 🛡️ Shield, ✅ Proof, 🪄 Iron
- `scripts/core/display.mjs` — 재사용 가능한 터미널 UI 모듈
- `/help` command definition
- 5 Innovations color-coded display
- PDCA flow visualization with active stage indicator
- Full commands reference with emoji icons

### Changed
- Version bump to 0.2.0 (plugin.json, marketplace.json, package.json)

## [0.1.0] - 2026-03-19

### Added — Initial Release
- **PDCA-Lite 5-Stage Engine** (Plan → Do → Check → Act → Review)
- **5 Innovations**:
  1. Context Budget — 토큰 소비 추적/최적화 (~근사치)
  2. Cross-Session Learning — 성공 패턴 자동 캡처/재적용
  3. Adaptive Routing — 복잡도 기반 동적 모델 선택 (haiku/sonnet/opus)
  4. Evidence Chain — 구조화된 완료 증명 (test/build/lint)
  5. Self-Healing Engine — 장애 자동 감지/복구, 서킷 브레이커
- **6 Agents**: Explorer, Planner, Executor, Reviewer, Verifier, Wizard
- **7 Hook Handlers**: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, Stop, StopFailure
- **Multilingual** intent detection (한국어/English)
- **Wizard Mode** — 비개발자를 위한 가이디드 워크플로우
- **Atomic State Management** — temp+rename 패턴으로 상태 파일 손상 방지
- **4 Document Templates** — plan, review, completion, ADR
- **2 Skills** — pdca-workflow, evidence-verification
- Zero external dependencies, ~60KB JS, Claude Code v2.1.69+
