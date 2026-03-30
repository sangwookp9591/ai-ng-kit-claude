/**
 * Teacher Engine 테스트
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

import {
  extractConcepts,
  generateQuestionTemplate,
  createTeachingPlan,
  startTeachingSession,
  processAnswer,
  endTeachingSession,
} from '../../scripts/teaching/teacher-engine.js';

// ── Helpers ──

function tmpProject(): string {
  const dir = join(tmpdir(), `aing-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// ── Tests ──

describe('Teacher Engine', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = tmpProject();
  });

  afterEach(() => {
    cleanup(projectDir);
  });

  describe('extractConcepts', () => {
    it('TypeScript 관련 키워드를 감지한다', () => {
      const concepts = extractConcepts('TypeScript generic 타입으로 CircularBuffer 구현');
      const names = concepts.map(c => c.name);
      assert.ok(names.includes('TypeScript Generics'), `Should detect generics, got: ${names}`);
      assert.ok(names.includes('TypeScript Basics'), `Should detect basics, got: ${names}`);
    });

    it('async/await 관련 키워드를 감지한다', () => {
      const concepts = extractConcepts('async 함수에서 Promise.all로 병렬 요청 처리');
      const names = concepts.map(c => c.name);
      assert.ok(names.includes('Async/Await'));
    });

    it('React 관련 키워드를 감지한다', () => {
      const concepts = extractConcepts('React component에서 useState hook 사용');
      const names = concepts.map(c => c.name);
      assert.ok(names.includes('React Components'));
      assert.ok(names.includes('React Hooks'));
    });

    it('REST API 관련 키워드를 감지한다', () => {
      const concepts = extractConcepts('REST API endpoint에 CRUD 라우트 추가');
      const names = concepts.map(c => c.name);
      assert.ok(names.includes('REST API Design'));
    });

    it('보안 관련 키워드를 감지한다', () => {
      const concepts = extractConcepts('JWT 기반 auth 토큰 인증 구현');
      const names = concepts.map(c => c.name);
      assert.ok(names.includes('Authentication'));
    });

    it('빈 문자열에서 빈 배열을 반환한다', () => {
      const concepts = extractConcepts('');
      assert.strictEqual(concepts.length, 0);
    });

    it('관련 없는 문자열에서 빈 배열을 반환한다', () => {
      const concepts = extractConcepts('오늘 점심 뭐 먹을까');
      assert.strictEqual(concepts.length, 0);
    });

    it('category가 올바르게 분류된다', () => {
      const concepts = extractConcepts('fs module로 file 읽기');
      const fsConcept = concepts.find(c => c.name === 'Node.js File System');
      assert.ok(fsConcept);
      assert.strictEqual(fsConcept!.category, 'nodejs');
    });

    it('여러 카테고리의 개념이 동시에 추출된다', () => {
      const concepts = extractConcepts('React component에서 fetch로 REST api 호출 후 state에 저장');
      const categories = new Set(concepts.map(c => c.category));
      assert.ok(categories.size >= 2, `Should detect multiple categories, got: ${[...categories]}`);
    });

    it('디자인 패턴을 감지한다', () => {
      const concepts = extractConcepts('singleton 패턴으로 database connection 관리');
      const names = concepts.map(c => c.name);
      assert.ok(names.includes('Singleton Pattern'));
    });

    it('git 관련 키워드를 감지한다', () => {
      const concepts = extractConcepts('git branch 전략과 PR code review');
      const names = concepts.map(c => c.name);
      assert.ok(names.includes('Git Basics') || names.includes('Git Workflow'));
    });
  });

  describe('generateQuestionTemplate', () => {
    it('beginner 질문을 생성한다', () => {
      const q = generateQuestionTemplate('Async/Await', 'javascript', 'beginner', '');
      assert.ok(q.id.startsWith('q-'));
      assert.strictEqual(q.concept, 'Async/Await');
      assert.strictEqual(q.difficulty, 'beginner');
      assert.ok(q.hints.length >= 2, 'beginner는 힌트가 2개 이상');
    });

    it('advanced 질문은 힌트가 적다', () => {
      const q = generateQuestionTemplate('Caching', 'performance', 'advanced', '');
      assert.ok(q.hints.length <= 2, 'advanced는 힌트가 적어야 한다');
    });

    it('유효한 질문 유형을 반환한다', () => {
      const validTypes = ['why', 'what-if', 'compare', 'predict', 'debug', 'refactor'];
      const q = generateQuestionTemplate('Error Handling', 'javascript', 'intermediate', '');
      assert.ok(validTypes.includes(q.type), `Invalid type: ${q.type}`);
    });

    it('question 문자열이 비어있지 않다', () => {
      const q = generateQuestionTemplate('REST API Design', 'architecture', 'intermediate', '');
      assert.ok(q.question.length > 10, 'Question should be meaningful');
    });
  });

  describe('createTeachingPlan', () => {
    it('작업에서 교육 계획을 생성한다', () => {
      const plan = createTeachingPlan(projectDir, 'TypeScript generic으로 stack 자료구조 구현');
      assert.ok(plan.task.includes('TypeScript'));
      assert.ok(plan.concepts.length > 0, 'Should extract concepts');
      assert.ok(['beginner', 'intermediate', 'advanced'].includes(plan.difficulty));
    });

    it('빈 작업에서도 기본 계획을 반환한다', () => {
      const plan = createTeachingPlan(projectDir, '');
      assert.ok(plan.difficulty);
      assert.strictEqual(plan.concepts.length, 0);
    });

    it('diagnosis가 포함된다', () => {
      const plan = createTeachingPlan(projectDir, 'async await으로 API 호출');
      assert.ok(plan.diagnosis);
      assert.ok(Array.isArray(plan.diagnosis.unknownConcepts));
    });
  });

  describe('startTeachingSession', () => {
    it('세션을 시작한다', () => {
      const session = startTeachingSession(projectDir, 'HTTP 서버 구현');
      assert.strictEqual(session.currentStep, 0);
      assert.strictEqual(session.questionsAsked, 0);
      assert.ok(session.startedAt);
      assert.ok(session.profile);
    });

    it('profile에 세션이 기록된다', () => {
      startTeachingSession(projectDir, 'test task');
      const session2 = startTeachingSession(projectDir, 'test task 2');
      assert.strictEqual(session2.profile.totalSessions, 2);
    });
  });

  describe('processAnswer', () => {
    it('정답 시 correctAnswers가 증가한다', () => {
      let session = startTeachingSession(projectDir, 'async 테스트');
      session.plan.steps = [{
        stepNumber: 1,
        title: 'Test Step',
        description: 'test',
        concepts: ['Async/Await'],
        questions: [{
          id: 'q-test-1',
          type: 'why',
          concept: 'Async/Await',
          category: 'javascript',
          difficulty: 'intermediate',
          question: 'Why?',
          hints: [],
          expectedAnswer: '',
          explanation: '',
        }],
        codeToWrite: '',
        afterExplanation: '',
      }];

      session = processAnswer(projectDir, session, 'q-test-1', 'correct');
      assert.strictEqual(session.correctAnswers, 1);
      assert.strictEqual(session.questionsAsked, 1);
    });

    it('스킵 3회 초과 시 난이도가 내려간다', () => {
      let session = startTeachingSession(projectDir, 'complex task');
      session.plan.difficulty = 'advanced';
      session.plan.steps = [{
        stepNumber: 1,
        title: 'Test',
        description: '',
        concepts: [],
        questions: [
          { id: 'q1', type: 'why', concept: 'A', category: 'x', difficulty: 'advanced', question: '', hints: [], expectedAnswer: '', explanation: '' },
          { id: 'q2', type: 'why', concept: 'B', category: 'x', difficulty: 'advanced', question: '', hints: [], expectedAnswer: '', explanation: '' },
          { id: 'q3', type: 'why', concept: 'C', category: 'x', difficulty: 'advanced', question: '', hints: [], expectedAnswer: '', explanation: '' },
          { id: 'q4', type: 'why', concept: 'D', category: 'x', difficulty: 'advanced', question: '', hints: [], expectedAnswer: '', explanation: '' },
        ],
        codeToWrite: '',
        afterExplanation: '',
      }];

      session = processAnswer(projectDir, session, 'q1', 'skipped');
      session = processAnswer(projectDir, session, 'q2', 'skipped');
      session = processAnswer(projectDir, session, 'q3', 'skipped');
      session = processAnswer(projectDir, session, 'q4', 'skipped');

      assert.strictEqual(session.plan.difficulty, 'intermediate');
    });
  });

  describe('endTeachingSession', () => {
    it('세션 종료 리포트를 생성한다', () => {
      const session = startTeachingSession(projectDir, 'test');
      const report = endTeachingSession(projectDir, session);
      assert.ok(report.includes('학습 세션 완료'));
      assert.ok(report.includes('소요 시간'));
      assert.ok(report.includes('질문 수'));
      assert.ok(report.includes('정답률'));
    });
  });
});
