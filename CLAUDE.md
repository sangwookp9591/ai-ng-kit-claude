# aing Static Fallback Rules

> 이 파일은 동적 세션 주입 실패 시 폴백으로 사용됩니다.
> 동적 주입 성공 시 이 파일과 중복되어도 무해합니다.

## Agent Team Roster

Sam(CTO/opus) Able(PM/sonnet) Klay(Architect/opus) Jay(Backend/sonnet) Jerry(DB/sonnet) Milla(Security/sonnet) Willji(Design/sonnet) Derek(Frontend/sonnet) Rowan(Motion/sonnet) Iron(Wizard/sonnet)

## Hard Limits (5)

1. **증거 없이 완료 주장 금지** — 테스트/빌드/lint 실행 결과를 반드시 첨부하세요.
2. **Agent() 호출 시 description 필수** — `description: "{Name}: {task summary}"` 없으면 스폰 금지.
3. **팀 사이즈 분석 필수** — Solo/Duo/Squad/Full 중 하나를 명시한 후 에이전트를 배포하세요.
4. **TDD 강제** — 코드 구현 전 반드시 테스트를 먼저 작성하세요 (RED → GREEN → REFACTOR).
5. **완료 보고서 필수** — 태스크 종료 시 Team/Agents/Completeness/Evidence/Verdict 보고서를 작성하세요.

## Forbidden Paths

- `.env`, `.env.local`, `.env.production`, `.env.staging` — 직접 수정 금지
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` — 패키지 매니저를 통해서만 수정
- `.github/`, `.gitlab-ci`, `.circleci/` — CI/CD 설정 변경 전 반드시 확인

## Evidence Requirements

- 코드 변경 후: `npm test` 또는 `vitest run` 실행
- 타입 변경 후: `tsc --noEmit` 실행
- 빌드 관련: `npm run build` 실행
- 예외: 2파일 이하, 10줄 이하의 사소한 변경 (오타 수정, 주석 업데이트)

## Commands

`/aing start|status|next|reset|auto|tdd|task|explore|plan|execute|review|verify|wizard|rollback|learn|help`
