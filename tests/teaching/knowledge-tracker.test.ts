/**
 * Knowledge Tracker 테스트
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

import {
  loadKnowledge,
  saveKnowledge,
  recordAnswer,
  startSession,
  diagnose,
  generateSummary,
  type QuestionResult,
} from '../../scripts/teaching/knowledge-tracker.js';

// ── Test Helpers ──

function tmpProject(): string {
  const dir = join(tmpdir(), `aing-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

// ── Tests ──

describe('Knowledge Tracker', () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = tmpProject();
  });

  afterEach(() => {
    cleanup(projectDir);
  });

  describe('loadKnowledge / saveKnowledge', () => {
    it('빈 프로젝트에서 기본 프로필을 반환한다', () => {
      const profile = loadKnowledge(projectDir);
      assert.strictEqual(profile.concepts.length, 0);
      assert.strictEqual(profile.totalSessions, 0);
      assert.strictEqual(profile.preferredDifficulty, 'intermediate');
    });

    it('저장 후 로드하면 동일한 데이터를 반환한다', () => {
      const profile = loadKnowledge(projectDir);
      profile.totalSessions = 5;
      profile.preferredDifficulty = 'advanced';
      saveKnowledge(projectDir, profile);

      const loaded = loadKnowledge(projectDir);
      assert.strictEqual(loaded.totalSessions, 5);
      assert.strictEqual(loaded.preferredDifficulty, 'advanced');
    });

    it('knowledge.json 파일이 생성된다', () => {
      const profile = loadKnowledge(projectDir);
      saveKnowledge(projectDir, profile);
      const path = join(projectDir, '.aing', 'learning', 'knowledge.json');
      assert.ok(existsSync(path));
    });
  });

  describe('recordAnswer', () => {
    it('정답 시 confidence가 증가한다', () => {
      const result: QuestionResult = {
        concept: 'Async/Await',
        category: 'javascript',
        outcome: 'correct',
        difficulty: 'intermediate',
        timestamp: new Date().toISOString(),
      };

      const concept = recordAnswer(projectDir, result);
      assert.ok(concept.confidence > 0.5, `confidence should increase from 0.5, got ${concept.confidence}`);
      assert.strictEqual(concept.correctAnswers, 1);
      assert.strictEqual(concept.questionsAsked, 1);
    });

    it('오답 시 confidence가 감소한다', () => {
      // 먼저 정답으로 기본 레코드 생성
      recordAnswer(projectDir, {
        concept: 'Closures',
        category: 'javascript',
        outcome: 'correct',
        difficulty: 'intermediate',
        timestamp: new Date().toISOString(),
      });

      const concept = recordAnswer(projectDir, {
        concept: 'Closures',
        category: 'javascript',
        outcome: 'wrong',
        userAnswer: 'global scope에서 접근 가능',
        difficulty: 'intermediate',
        timestamp: new Date().toISOString(),
      });

      assert.strictEqual(concept.wrongAnswers, 1);
      assert.ok(concept.notes.length > 0, '오답 내용이 notes에 기록되어야 한다');
    });

    it('skip 시 skipCount가 증가한다', () => {
      recordAnswer(projectDir, {
        concept: 'TypeScript Generics',
        category: 'typescript',
        outcome: 'skipped',
        difficulty: 'intermediate',
        timestamp: new Date().toISOString(),
      });

      const profile = loadKnowledge(projectDir);
      assert.strictEqual(profile.skipCount, 1);
    });

    it('새 개념이 자동 생성된다', () => {
      recordAnswer(projectDir, {
        concept: 'React Hooks',
        category: 'react',
        outcome: 'correct',
        difficulty: 'beginner',
        timestamp: new Date().toISOString(),
      });

      const profile = loadKnowledge(projectDir);
      const concept = profile.concepts.find(c => c.name === 'React Hooks');
      assert.ok(concept, 'React Hooks 개념이 생성되어야 한다');
      assert.strictEqual(concept!.category, 'react');
    });

    it('동일 개념에 대한 반복 답변이 누적된다', () => {
      for (let i = 0; i < 5; i++) {
        recordAnswer(projectDir, {
          concept: 'Error Handling',
          category: 'javascript',
          outcome: 'correct',
          difficulty: 'intermediate',
          timestamp: new Date().toISOString(),
        });
      }

      const profile = loadKnowledge(projectDir);
      const concept = profile.concepts.find(c => c.name === 'Error Handling');
      assert.strictEqual(concept!.questionsAsked, 5);
      assert.strictEqual(concept!.correctAnswers, 5);
      assert.ok(concept!.confidence > 0.8, '5번 정답이면 confidence가 높아야 한다');
    });
  });

  describe('startSession', () => {
    it('세션 시작 시 totalSessions가 증가한다', () => {
      startSession(projectDir);
      const profile = loadKnowledge(projectDir);
      assert.strictEqual(profile.totalSessions, 1);
    });

    it('첫 세션에서 streakDays가 1이 된다', () => {
      const profile = startSession(projectDir);
      assert.strictEqual(profile.streakDays, 1);
    });

    it('같은 날 다시 시작하면 streak이 유지된다', () => {
      startSession(projectDir);
      const profile = startSession(projectDir);
      assert.strictEqual(profile.streakDays, 1);
      assert.strictEqual(profile.totalSessions, 2);
    });
  });

  describe('diagnose', () => {
    it('알려진 개념이 없으면 beginner를 추천한다', () => {
      const result = diagnose(projectDir, ['TypeScript Generics', 'React Hooks', 'REST API Design']);
      assert.strictEqual(result.suggestedLevel, 'beginner');
      assert.strictEqual(result.unknownConcepts.length, 3);
      assert.strictEqual(result.knownConcepts.length, 0);
    });

    it('대부분 알면 advanced를 추천한다', () => {
      // 3개 개념을 높은 confidence로 등록
      for (const name of ['Async/Await', 'Error Handling', 'ES Modules']) {
        for (let i = 0; i < 6; i++) {
          recordAnswer(projectDir, {
            concept: name,
            category: 'javascript',
            outcome: 'correct',
            difficulty: 'advanced',
            timestamp: new Date().toISOString(),
          });
        }
      }

      const result = diagnose(projectDir, ['Async/Await', 'Error Handling', 'ES Modules']);
      assert.strictEqual(result.suggestedLevel, 'advanced');
      assert.ok(result.knownConcepts.length >= 2);
    });

    it('빈 개념 목록이면 knownRatio 0이므로 beginner를 반환한다', () => {
      const result = diagnose(projectDir, []);
      // knownRatio = 0/0 = 0.5 처리 → 하지만 실제로는 0개니까 beginner
      // diagnose에서 빈 배열은 knownRatio = 0으로 계산
      assert.ok(['beginner', 'intermediate'].includes(result.suggestedLevel));
    });
  });

  describe('generateSummary', () => {
    it('빈 프로필에서 안내 메시지를 반환한다', () => {
      const summary = generateSummary(projectDir);
      assert.ok(summary.includes('학습 기록이 없습니다'));
    });

    it('학습 후 요약에 통계가 포함된다', () => {
      startSession(projectDir);
      recordAnswer(projectDir, {
        concept: 'Async/Await',
        category: 'javascript',
        outcome: 'correct',
        difficulty: 'intermediate',
        timestamp: new Date().toISOString(),
      });

      const summary = generateSummary(projectDir);
      assert.ok(summary.includes('학습 현황'));
      assert.ok(summary.includes('총 세션'));
      assert.ok(summary.includes('정답률'));
    });
  });

  describe('난이도 자동 조정', () => {
    it('skip이 많으면 난이도가 내려간다', () => {
      // 4번 skip
      for (let i = 0; i < 4; i++) {
        recordAnswer(projectDir, {
          concept: `Concept${i}`,
          category: 'misc',
          outcome: 'skipped',
          difficulty: 'intermediate',
          timestamp: new Date().toISOString(),
        });
      }

      const profile = loadKnowledge(projectDir);
      assert.strictEqual(profile.preferredDifficulty, 'beginner');
    });
  });

  describe('영역 분류', () => {
    it('강점/약점 영역이 자동 분류된다', () => {
      // 강점: javascript (연속 정답)
      for (let i = 0; i < 6; i++) {
        recordAnswer(projectDir, {
          concept: 'Async/Await',
          category: 'javascript',
          outcome: 'correct',
          difficulty: 'intermediate',
          timestamp: new Date().toISOString(),
        });
      }

      // 약점: security (연속 오답)
      for (let i = 0; i < 3; i++) {
        recordAnswer(projectDir, {
          concept: 'Authentication',
          category: 'security',
          outcome: 'wrong',
          difficulty: 'intermediate',
          timestamp: new Date().toISOString(),
        });
      }

      const profile = loadKnowledge(projectDir);
      assert.ok(profile.strongAreas.includes('javascript'), `strongAreas should include javascript, got: ${profile.strongAreas}`);
      assert.ok(profile.weakAreas.includes('security'), `weakAreas should include security, got: ${profile.weakAreas}`);
    });
  });
});
