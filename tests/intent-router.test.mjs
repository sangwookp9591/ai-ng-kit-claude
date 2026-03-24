/**
 * TDD: intent-router.mjs 단위 테스트
 * Run: node --test tests/intent-router.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const { routeIntent } = await import('../scripts/routing/intent-router.mjs');

// ─────────────────────────────────────────────
// 앵커 탐지
// ─────────────────────────────────────────────
describe('앵커 탐지', () => {
  it('파일 경로(src/)가 포함된 입력 → auto 라우팅', () => {
    const result = routeIntent('src/auth.ts 파일에 JWT 검증 추가해줘');
    assert.equal(result.route, 'auto');
    assert.ok(result.confidence >= 0.7);
  });

  it('.ts 확장자 포함 → auto 라우팅', () => {
    const result = routeIntent('user.service.ts에서 createUser 함수 수정해줘');
    assert.equal(result.route, 'auto');
  });

  it('.js 확장자 포함 → auto 라우팅', () => {
    const result = routeIntent('index.js 오류 고쳐줘');
    assert.equal(result.route, 'auto');
  });

  it('.py 확장자 포함 → auto 라우팅', () => {
    const result = routeIntent('main.py에 함수 추가해줘');
    assert.equal(result.route, 'auto');
  });

  it('이슈/PR 번호(#42) 포함 → auto 라우팅', () => {
    const result = routeIntent('#42 이슈 수정해줘');
    assert.equal(result.route, 'auto');
  });

  it('TypeError 에러 참조 포함 → auto 라우팅', () => {
    const result = routeIntent('TypeError: Cannot read property 에러 고쳐줘');
    assert.equal(result.route, 'auto');
  });

  it('코드 블록(```) 포함 → auto 라우팅', () => {
    const result = routeIntent('```js\nconsole.log("hi")\n``` 이 코드 최적화해줘');
    assert.equal(result.route, 'auto');
  });

  it('camelCase 심볼 포함 → auto 라우팅', () => {
    const result = routeIntent('getUserById 함수 리팩토링해줘');
    assert.equal(result.route, 'auto');
  });

  it('PascalCase 심볼 포함 → auto 라우팅', () => {
    const result = routeIntent('UserService 클래스에 메서드 추가해줘');
    assert.equal(result.route, 'auto');
  });
});

// ─────────────────────────────────────────────
// 키워드 기반 라우팅
// ─────────────────────────────────────────────
describe('키워드 라우팅', () => {
  it('"디자인" 키워드 → auto(design preset)', () => {
    const result = routeIntent('로그인 화면 디자인해줘');
    assert.equal(result.route, 'auto');
    assert.equal(result.preset, 'design');
  });

  it('"UI" 키워드 → auto(design preset)', () => {
    const result = routeIntent('대시보드 UI 만들어줘');
    assert.equal(result.route, 'auto');
    assert.equal(result.preset, 'design');
  });

  it('"화면" 키워드 → auto(design preset)', () => {
    const result = routeIntent('메인 화면 수정해줘');
    assert.equal(result.route, 'auto');
    assert.equal(result.preset, 'design');
  });

  it('"계획" 키워드 → plan 라우팅', () => {
    const result = routeIntent('인증 시스템 계획 세워줘');
    assert.equal(result.route, 'plan');
  });

  it('"분석" 키워드 → plan 라우팅', () => {
    const result = routeIntent('현재 아키텍처 분석해줘');
    assert.equal(result.route, 'plan');
  });

  it('"설계" 키워드 → plan 라우팅', () => {
    const result = routeIntent('DB 스키마 설계해줘');
    assert.equal(result.route, 'plan');
  });

  it('"팀" 키워드 → team 라우팅', () => {
    const result = routeIntent('팀으로 전체 인증 시스템 구현해줘');
    assert.equal(result.route, 'team');
  });

  it('"대규모" 키워드 → team 라우팅', () => {
    const result = routeIntent('대규모 리팩토링 진행해줘');
    assert.equal(result.route, 'team');
  });

  it('"전체" 키워드 → team 라우팅', () => {
    const result = routeIntent('전체 백엔드 API 구현해줘');
    assert.equal(result.route, 'team');
  });
});

// ─────────────────────────────────────────────
// complexity 기반 라우팅
// ─────────────────────────────────────────────
describe('complexity 기반 라우팅', () => {
  it('짧고 단순한 입력(≤15단어, 앵커 없음) → plan 라우팅', () => {
    const result = routeIntent('인증 기능 추가해줘');
    assert.equal(result.route, 'plan');
  });

  it('낮은 complexity(≤2) → auto(solo preset)', () => {
    // 파일 참조 + 단순 태스크 = 즉시 실행 가능
    const result = routeIntent('src/utils.ts에 헬퍼 함수 하나 추가해줘');
    assert.equal(result.route, 'auto');
    assert.equal(result.preset, 'solo');
  });

  it('중간 complexity(3-4) → auto(duo preset)', () => {
    // 파일 3개 참조 (fileCount=3, lineCount=120) → complexity 3 → duo
    const result = routeIntent('src/utils.ts, src/helpers.ts, src/format.ts 세 파일 공통 로직 합쳐줘');
    assert.equal(result.route, 'auto');
    assert.equal(result.preset, 'duo');
  });

  it('높은 complexity(≥5) → team 라우팅', () => {
    const result = routeIntent('사용자 인증 시스템 전체 구현: JWT, OAuth, 소셜 로그인, 세션 관리, 보안 미들웨어, DB 스키마 변경, 프론트엔드 연동');
    assert.equal(result.route, 'team');
  });
});

// ─────────────────────────────────────────────
// 출력 형식 검증
// ─────────────────────────────────────────────
describe('출력 형식', () => {
  it('결과에 필수 필드가 모두 포함됨', () => {
    const result = routeIntent('테스트 입력');
    assert.ok('route' in result, 'route 필드 필요');
    assert.ok('preset' in result, 'preset 필드 필요');
    assert.ok('confidence' in result, 'confidence 필드 필요');
    assert.ok('reason' in result, 'reason 필드 필요');
    assert.ok('originalInput' in result, 'originalInput 필드 필요');
  });

  it('originalInput은 원본 입력을 그대로 포함', () => {
    const input = '테스트 입력 문자열';
    const result = routeIntent(input);
    assert.equal(result.originalInput, input);
  });

  it('confidence는 0~1 범위', () => {
    const result = routeIntent('어떤 입력이든');
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
  });

  it('route는 auto|plan|team|wizard 중 하나', () => {
    const validRoutes = ['auto', 'plan', 'team', 'wizard'];
    const result = routeIntent('테스트');
    assert.ok(validRoutes.includes(result.route), `Invalid route: ${result.route}`);
  });

  it('preset은 solo|duo|squad|full|design 중 하나', () => {
    const validPresets = ['solo', 'duo', 'squad', 'full', 'design'];
    const result = routeIntent('src/app.ts 수정해줘');
    assert.ok(validPresets.includes(result.preset), `Invalid preset: ${result.preset}`);
  });

  it('빈 문자열 입력 → plan 라우팅 (기본값)', () => {
    const result = routeIntent('');
    assert.equal(result.route, 'plan');
  });

  it('null 입력 → plan 라우팅 (기본값)', () => {
    const result = routeIntent(null);
    assert.equal(result.route, 'plan');
  });
});

// ─────────────────────────────────────────────
// CLI 실행 (JSON stdout 출력)
// ─────────────────────────────────────────────
describe('CLI 실행', () => {
  it('node intent-router.mjs로 실행 시 JSON stdout 출력', () => {
    const output = execFileSync(
      process.execPath,
      ['/Users/iron/Project/sw-kit-claude/scripts/routing/intent-router.mjs', 'src/auth.ts에 JWT 추가해줘'],
      { encoding: 'utf-8' }
    );
    const parsed = JSON.parse(output.trim());
    assert.ok('route' in parsed);
    assert.ok('preset' in parsed);
    assert.equal(parsed.route, 'auto');
  });
});
