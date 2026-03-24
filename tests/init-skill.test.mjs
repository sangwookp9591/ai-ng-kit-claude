/**
 * TDD: /swkit init 스킬 및 템플릿 시스템 단위 테스트
 * Run: node --test tests/init-skill.test.mjs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

// ─────────────────────────────────────────────
// SKILL.md 존재 및 메타데이터 검증
// ─────────────────────────────────────────────
describe('init SKILL.md 구조', () => {
  const skillPath = join(ROOT, 'skills/init/SKILL.md');
  let content = '';

  before(() => {
    content = readFileSync(skillPath, 'utf8');
  });

  it('SKILL.md 파일이 존재해야 한다', () => {
    assert.ok(existsSync(skillPath), 'skills/init/SKILL.md not found');
  });

  it('frontmatter name이 init이어야 한다', () => {
    assert.match(content, /^name:\s*init/m);
  });

  it('description 필드가 있어야 한다', () => {
    assert.match(content, /^description:/m);
  });

  it('triggers에 "init"이 포함되어야 한다', () => {
    assert.match(content, /triggers:.*\[.*"init"/);
  });

  it('triggers에 "초기화"가 포함되어야 한다', () => {
    assert.match(content, /"초기화"/);
  });

  it('triggers에 "새 프로젝트"가 포함되어야 한다', () => {
    assert.match(content, /"새 프로젝트"/);
  });

  it('AskUserQuestion 사용 지시가 있어야 한다', () => {
    assert.match(content, /AskUserQuestion/);
  });

  it('5개 질문(Q1~Q5)이 모두 정의되어야 한다', () => {
    assert.match(content, /### Q1/);
    assert.match(content, /### Q2/);
    assert.match(content, /### Q3/);
    assert.match(content, /### Q4/);
    assert.match(content, /### Q5/);
  });

  it('--help 플래그 처리가 있어야 한다', () => {
    assert.match(content, /--help/);
  });

  it('--reset 플래그 처리가 있어야 한다', () => {
    assert.match(content, /--reset/);
  });

  it('--detect 플래그 처리가 있어야 한다', () => {
    assert.match(content, /--detect/);
  });

  it('Phase 1~4가 모두 정의되어야 한다', () => {
    assert.match(content, /## Phase 1/);
    assert.match(content, /## Phase 2/);
    assert.match(content, /## Phase 3/);
    assert.match(content, /## Phase 4/);
  });

  it('.sw-kit/project/ 저장 경로가 명시되어야 한다', () => {
    assert.match(content, /\.sw-kit\/project\//);
  });

  it('Klay 에이전트 호출이 포함되어야 한다', () => {
    assert.match(content, /sw-kit:klay/);
  });

  it('Klay 호출 시 description 파라미터가 있어야 한다', () => {
    assert.match(content, /description:.*Klay/);
  });

  it('3개 출력 파일(PROJECT, REQUIREMENTS, TECH-STACK)이 명시되어야 한다', () => {
    assert.match(content, /PROJECT\.md/);
    assert.match(content, /REQUIREMENTS\.md/);
    assert.match(content, /TECH-STACK\.md/);
  });

  it('완료 배너가 있어야 한다', () => {
    assert.match(content, /━{10,}/);
  });

  it('다음 단계 안내가 있어야 한다', () => {
    assert.match(content, /\/swkit plan/);
    assert.match(content, /\/swkit do/);
  });
});

// ─────────────────────────────────────────────
// 템플릿 파일 존재 검증
// ─────────────────────────────────────────────
describe('템플릿 파일 존재', () => {
  const templates = ['project.md', 'requirements.md', 'tech-stack.md', 'debug.md'];

  for (const tmpl of templates) {
    it(`templates/${tmpl} 파일이 존재해야 한다`, () => {
      const p = join(ROOT, 'templates', tmpl);
      assert.ok(existsSync(p), `templates/${tmpl} not found`);
    });
  }
});

// ─────────────────────────────────────────────
// templates/project.md 내용 검증
// ─────────────────────────────────────────────
describe('templates/project.md 구조', () => {
  const tmplPath = join(ROOT, 'templates/project.md');
  let content = '';

  before(() => {
    content = readFileSync(tmplPath, 'utf8');
  });

  it('{name} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{name\}/);
  });

  it('{one-line description} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{one-line description\}/);
  });

  it('{users} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{users\}/);
  });

  it('{date} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{date\}/);
  });

  it('{feature1}, {feature2}, {feature3}이 있어야 한다', () => {
    assert.match(content, /\{feature1\}/);
    assert.match(content, /\{feature2\}/);
    assert.match(content, /\{feature3\}/);
  });

  it('Tech Stack 섹션이 있어야 한다', () => {
    assert.match(content, /## Tech Stack/);
  });

  it('{runtime}, {framework}, {db}, {libs} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{runtime\}/);
    assert.match(content, /\{framework\}/);
    assert.match(content, /\{db\}/);
    assert.match(content, /\{libs\}/);
  });

  it('Constraints 섹션이 있어야 한다', () => {
    assert.match(content, /## Constraints/);
  });
});

// ─────────────────────────────────────────────
// templates/requirements.md 내용 검증
// ─────────────────────────────────────────────
describe('templates/requirements.md 구조', () => {
  const tmplPath = join(ROOT, 'templates/requirements.md');
  let content = '';

  before(() => {
    content = readFileSync(tmplPath, 'utf8');
  });

  it('{project} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{project\}/);
  });

  it('{date} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{date\}/);
  });

  it('Must Have 섹션이 있어야 한다', () => {
    assert.match(content, /## Must Have/);
  });

  it('Should Have 섹션이 있어야 한다', () => {
    assert.match(content, /## Should Have/);
  });

  it('Nice to Have 섹션이 있어야 한다', () => {
    assert.match(content, /## Nice to Have/);
  });

  it('Out of Scope 섹션이 있어야 한다', () => {
    assert.match(content, /## Out of Scope/);
  });

  it('체크박스 형식(- [ ])이 포함되어야 한다', () => {
    assert.match(content, /- \[ \]/);
  });
});

// ─────────────────────────────────────────────
// templates/tech-stack.md 내용 검증
// ─────────────────────────────────────────────
describe('templates/tech-stack.md 구조', () => {
  const tmplPath = join(ROOT, 'templates/tech-stack.md');
  let content = '';

  before(() => {
    content = readFileSync(tmplPath, 'utf8');
  });

  it('{project} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{project\}/);
  });

  it('{date} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{date\}/);
  });

  it('Runtime 섹션이 있어야 한다', () => {
    assert.match(content, /## Runtime/);
  });

  it('Framework 섹션이 있어야 한다', () => {
    assert.match(content, /## Framework/);
  });

  it('Dependencies 테이블이 있어야 한다', () => {
    assert.match(content, /## Dependencies/);
    assert.match(content, /\| Package \| Version \| Purpose \|/);
  });

  it('Dev Dependencies 테이블이 있어야 한다', () => {
    assert.match(content, /## Dev Dependencies/);
  });

  it('Build & Test 섹션이 있어야 한다', () => {
    assert.match(content, /## Build & Test/);
  });

  it('{build_cmd}, {test_cmd}, {lint_cmd} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{build_cmd\}/);
    assert.match(content, /\{test_cmd\}/);
    assert.match(content, /\{lint_cmd\}/);
  });
});

// ─────────────────────────────────────────────
// templates/debug.md 내용 검증
// ─────────────────────────────────────────────
describe('templates/debug.md 구조', () => {
  const tmplPath = join(ROOT, 'templates/debug.md');
  let content = '';

  before(() => {
    content = readFileSync(tmplPath, 'utf8');
  });

  it('{title} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{title\}/);
  });

  it('{date} 플레이스홀더가 있어야 한다', () => {
    assert.match(content, /\{date\}/);
  });

  it('Status: OPEN이 있어야 한다', () => {
    assert.match(content, /Status: OPEN/);
  });

  it('Symptom 섹션이 있어야 한다', () => {
    assert.match(content, /## Symptom/);
  });

  it('Related Code 섹션이 있어야 한다', () => {
    assert.match(content, /## Related Code/);
  });

  it('Hypotheses 섹션과 H1이 있어야 한다', () => {
    assert.match(content, /## Hypotheses/);
    assert.match(content, /### H1/);
  });

  it('Test, Expected, Actual, Verdict 필드가 있어야 한다', () => {
    assert.match(content, /\*\*Test\*\*/);
    assert.match(content, /\*\*Expected\*\*/);
    assert.match(content, /\*\*Actual\*\*/);
    assert.match(content, /\*\*Verdict\*\*/);
  });

  it('Conclusion 섹션이 있어야 한다', () => {
    assert.match(content, /## Conclusion/);
  });

  it('Changes Made 섹션이 있어야 한다', () => {
    assert.match(content, /## Changes Made/);
  });
});

// ─────────────────────────────────────────────
// 기존 템플릿 파일 보존 검증
// ─────────────────────────────────────────────
describe('기존 템플릿 파일 보존', () => {
  const existing = ['adr.md', 'completion.md', 'plan.md', 'review.md'];

  for (const tmpl of existing) {
    it(`기존 templates/${tmpl}이 그대로 존재해야 한다`, () => {
      const p = join(ROOT, 'templates', tmpl);
      assert.ok(existsSync(p), `templates/${tmpl} was removed`);
    });
  }
});
