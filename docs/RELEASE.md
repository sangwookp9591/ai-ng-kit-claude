# aing 릴리즈 가이드

## 버전 관리 규칙

3곳의 버전이 반드시 동일해야 합니다:

| 파일 | 필드 |
|------|------|
| `package.json` | `"version"` |
| `.claude-plugin/plugin.json` | `"version"` |
| `.claude-plugin/marketplace.json` | `"version"` (2곳: 루트 + plugins[0]) |

## 릴리즈 절차

### 1. 코드 변경 완료

모든 변경사항이 main 브랜치에 머지된 상태여야 합니다.

### 2. 버전 범프

```bash
# 3곳 모두 업데이트 (예: 2.8.8 → 2.8.9)
# package.json
# .claude-plugin/plugin.json
# .claude-plugin/marketplace.json (2곳)
```

검증:
```bash
grep '"version"' package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json
```

### 3. CHANGELOG 작성

`CHANGELOG.md` 상단에 새 버전 엔트리 추가:

```markdown
## [X.Y.Z] - YYYY-MM-DD — 제목

### Added / Fixed / Changed
- 변경 내용
```

### 4. 빌드 확인

```bash
npm run build:ts    # TypeScript 컴파일 → dist/ 생성
npm run test:unit   # 단위 테스트
```

`dist/` 디렉토리가 정상 생성되는지 확인. `package.json`의 `"files"` 필드에 `"dist/"`가 포함되어 있어서 publish 시 자동 포함됩니다.

### 5. 커밋 & 푸시

```bash
git add -A
git commit -m "fix: 설명 + vX.Y.Z"   # 또는 feat:, chore:
git push origin main
```

### 6. 사용자 업데이트 확인

푸시 후 사용자들은 아래 명령으로 업데이트 가능:

```
claude plugin update aing@aing-marketplace
```

## 빌드 아키텍처

```
소스 (.ts)                    빌드 결과 (dist/)
─────────────────────────────────────────────────
hooks-handlers/*.ts    →    dist/hooks-handlers/*.js    (hooks.json에서 참조)
scripts/**/*.ts        →    dist/scripts/**/*.js        (SKILL.md에서 참조)
```

- `hooks.json`: `${CLAUDE_PLUGIN_ROOT}/dist/hooks-handlers/*.js` 참조
- `skills/*/SKILL.md`: `${CLAUDE_PLUGIN_ROOT}/dist/scripts/*.js` 참조
- `package.json` `"files"` 필드: `["agents/", "skills/", "hooks/", "dist/", "browse/dist/", ...]`

## 주의사항

- `.mjs` 확장자를 스킬에서 사용하지 말 것. `tsc`는 `module: "NodeNext"`에서 `.js`로 출력
- `prepublishOnly`가 `npm run build`를 실행하므로, npm publish 시 자동 빌드됨
- 플러그인 캐시(`~/.claude/plugins/cache/`)는 git clone 기반이므로, `dist/`가 git에 포함되어야 함
  - 또는 설치 후 `npm install && npm run build` 실행 필요

## 버전 히스토리 확인

```bash
# 현재 설치된 버전
cat ~/.claude/plugins/installed_plugins.json | grep -A2 '"aing@aing-marketplace"'

# 릴리즈 태그 (사용 시)
git tag -l 'v*'
```
