/**
 * Knowledge Tracker — 사용자의 학습 진도를 추적하고 난이도를 적응시킨다.
 *
 * 저장 위치: .aing/learning/knowledge.json
 * 개념별 confidence (0-1), 질문/정답 횟수, 최근 학습일 기반으로
 * 난이도를 자동 조정한다.
 *
 * @module scripts/teaching/knowledge-tracker
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

// ── Types ──

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ConceptRecord {
  name: string;
  category: string;
  level: DifficultyLevel;
  firstSeen: string;
  lastPracticed: string;
  confidence: number;       // 0.0 - 1.0
  questionsAsked: number;
  correctAnswers: number;
  wrongAnswers: number;
  skipped: number;
  context: string;          // 어떤 작업 중에 배웠는지
  notes: string[];          // 사용자의 오답/이해 패턴
}

export interface KnowledgeProfile {
  concepts: ConceptRecord[];
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  preferredDifficulty: DifficultyLevel;
  skipCount: number;
  streakDays: number;
  lastSessionDate: string;
  strongAreas: string[];    // confidence > 0.8인 카테고리
  weakAreas: string[];      // confidence < 0.4인 카테고리
}

export interface QuestionResult {
  concept: string;
  category: string;
  outcome: 'correct' | 'wrong' | 'partial' | 'skipped';
  userAnswer?: string;
  difficulty: DifficultyLevel;
  timestamp: string;
}

export interface DiagnosisResult {
  suggestedLevel: DifficultyLevel;
  knownConcepts: string[];
  unknownConcepts: string[];
  reviewNeeded: string[];    // confidence 감소한 것들
}

// ── Constants ──

const KNOWLEDGE_FILE = 'knowledge.json';
const CONFIDENCE_DECAY_DAYS = 14;    // 14일 안 하면 감소 시작
const CONFIDENCE_DECAY_RATE = 0.05;  // 14일당 0.05 감소
const MASTERY_THRESHOLD = 0.8;
const WEAK_THRESHOLD = 0.4;
const STREAK_RESET_HOURS = 36;       // 36시간 넘으면 스트릭 리셋

// ── File I/O (atomic) ──

function getKnowledgePath(projectDir: string): string {
  return join(projectDir, '.aing', 'learning', KNOWLEDGE_FILE);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function defaultProfile(): KnowledgeProfile {
  return {
    concepts: [],
    totalSessions: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    preferredDifficulty: 'intermediate',
    skipCount: 0,
    streakDays: 0,
    lastSessionDate: '',
    strongAreas: [],
    weakAreas: [],
  };
}

export function loadKnowledge(projectDir: string): KnowledgeProfile {
  const path = getKnowledgePath(projectDir);
  if (!existsSync(path)) return defaultProfile();
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as KnowledgeProfile;
  } catch {
    return defaultProfile();
  }
}

export function saveKnowledge(projectDir: string, profile: KnowledgeProfile): void {
  const path = getKnowledgePath(projectDir);
  ensureDir(path);
  const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, JSON.stringify(profile, null, 2));
  renameSync(tmp, path);
}

// ── Core Logic ──

/**
 * 개념에 대한 질문 결과를 기록한다.
 */
export function recordAnswer(
  projectDir: string,
  result: QuestionResult
): ConceptRecord {
  const profile = loadKnowledge(projectDir);
  let concept = profile.concepts.find(c => c.name === result.concept);

  if (!concept) {
    concept = {
      name: result.concept,
      category: result.category,
      level: result.difficulty,
      firstSeen: result.timestamp,
      lastPracticed: result.timestamp,
      confidence: 0.5,
      questionsAsked: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      skipped: 0,
      context: '',
      notes: [],
    };
    profile.concepts.push(concept);
  }

  concept.questionsAsked += 1;
  concept.lastPracticed = result.timestamp;
  profile.totalQuestions += 1;

  switch (result.outcome) {
    case 'correct':
      concept.correctAnswers += 1;
      concept.confidence = Math.min(1.0, concept.confidence + 0.15);
      profile.totalCorrect += 1;
      break;
    case 'partial':
      concept.correctAnswers += 0.5;
      concept.confidence = Math.min(1.0, concept.confidence + 0.05);
      break;
    case 'wrong':
      concept.wrongAnswers += 1;
      concept.confidence = Math.max(0.0, concept.confidence - 0.1);
      if (result.userAnswer) {
        concept.notes.push(`[${result.timestamp}] 오답: ${result.userAnswer}`);
      }
      break;
    case 'skipped':
      concept.skipped += 1;
      profile.skipCount += 1;
      break;
  }

  // 난이도 자동 조정
  profile.preferredDifficulty = calculateDifficulty(profile);
  updateAreas(profile);
  saveKnowledge(projectDir, profile);
  return concept;
}

/**
 * 세션 시작 시 호출. 스트릭 계산 + confidence decay 적용.
 */
export function startSession(projectDir: string): KnowledgeProfile {
  const profile = loadKnowledge(projectDir);
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // 스트릭 계산
  if (profile.lastSessionDate) {
    const last = new Date(profile.lastSessionDate);
    const hoursSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    if (hoursSince > STREAK_RESET_HOURS) {
      profile.streakDays = 1;
    } else if (profile.lastSessionDate !== today) {
      profile.streakDays += 1;
    }
  } else {
    profile.streakDays = 1;
  }

  profile.lastSessionDate = today;
  profile.totalSessions += 1;

  // Confidence decay
  applyConfidenceDecay(profile);

  updateAreas(profile);
  saveKnowledge(projectDir, profile);
  return profile;
}

/**
 * 작업에 관련된 개념 목록으로 사용자 수준을 진단한다.
 */
export function diagnose(
  projectDir: string,
  relatedConcepts: string[]
): DiagnosisResult {
  const profile = loadKnowledge(projectDir);
  const knownConcepts: string[] = [];
  const unknownConcepts: string[] = [];
  const reviewNeeded: string[] = [];

  for (const name of relatedConcepts) {
    const record = profile.concepts.find(c => c.name === name);
    if (!record) {
      unknownConcepts.push(name);
    } else if (record.confidence >= MASTERY_THRESHOLD) {
      knownConcepts.push(name);
    } else if (record.confidence < WEAK_THRESHOLD) {
      unknownConcepts.push(name);
    } else {
      // 중간 수준이지만 오래됐으면 복습 필요
      const daysSince = daysBetween(record.lastPracticed, new Date().toISOString());
      if (daysSince > CONFIDENCE_DECAY_DAYS) {
        reviewNeeded.push(name);
      } else {
        knownConcepts.push(name);
      }
    }
  }

  // 알려진 비율로 난이도 추천
  const knownRatio = relatedConcepts.length > 0
    ? knownConcepts.length / relatedConcepts.length
    : 0.5;

  let suggestedLevel: DifficultyLevel;
  if (knownRatio >= 0.7) suggestedLevel = 'advanced';
  else if (knownRatio >= 0.3) suggestedLevel = 'intermediate';
  else suggestedLevel = 'beginner';

  return { suggestedLevel, knownConcepts, unknownConcepts, reviewNeeded };
}

/**
 * 학습 요약 리포트를 생성한다.
 */
export function generateSummary(projectDir: string): string {
  const profile = loadKnowledge(projectDir);
  if (profile.concepts.length === 0) {
    return '아직 학습 기록이 없습니다. `/aing teacher <task>`로 시작해보세요.';
  }

  const accuracy = profile.totalQuestions > 0
    ? Math.round((profile.totalCorrect / profile.totalQuestions) * 100)
    : 0;

  const mastered = profile.concepts.filter(c => c.confidence >= MASTERY_THRESHOLD);
  const learning = profile.concepts.filter(c => c.confidence >= WEAK_THRESHOLD && c.confidence < MASTERY_THRESHOLD);
  const weak = profile.concepts.filter(c => c.confidence < WEAK_THRESHOLD);

  const lines: string[] = [
    `## 학습 현황`,
    ``,
    `| 항목 | 값 |`,
    `|------|-----|`,
    `| 총 세션 | ${profile.totalSessions} |`,
    `| 총 질문 | ${profile.totalQuestions} |`,
    `| 정답률 | ${accuracy}% |`,
    `| 연속 학습 | ${profile.streakDays}일 |`,
    `| 현재 난이도 | ${profile.preferredDifficulty} |`,
    ``,
  ];

  if (mastered.length > 0) {
    lines.push(`### 마스터한 개념 (${mastered.length}개)`);
    mastered.forEach(c => lines.push(`- ${c.name} (confidence: ${(c.confidence * 100).toFixed(0)}%)`));
    lines.push('');
  }

  if (learning.length > 0) {
    lines.push(`### 학습 중인 개념 (${learning.length}개)`);
    learning.forEach(c => lines.push(`- ${c.name} (confidence: ${(c.confidence * 100).toFixed(0)}%)`));
    lines.push('');
  }

  if (weak.length > 0) {
    lines.push(`### 복습 필요 (${weak.length}개)`);
    weak.forEach(c => lines.push(`- ${c.name} (confidence: ${(c.confidence * 100).toFixed(0)}%)`));
    lines.push('');
  }

  return lines.join('\n');
}

// ── Helpers ──

function calculateDifficulty(profile: KnowledgeProfile): DifficultyLevel {
  if (profile.concepts.length === 0) return 'intermediate';

  const avgConfidence = profile.concepts.reduce((sum, c) => sum + c.confidence, 0)
    / profile.concepts.length;

  // 스킵이 많으면 난이도 낮춤
  const skipRatio = profile.totalQuestions > 0
    ? profile.skipCount / profile.totalQuestions
    : 0;

  if (skipRatio > 0.3) return 'beginner';
  if (avgConfidence >= 0.7) return 'advanced';
  if (avgConfidence >= 0.4) return 'intermediate';
  return 'beginner';
}

function applyConfidenceDecay(profile: KnowledgeProfile): void {
  const now = new Date().toISOString();
  for (const concept of profile.concepts) {
    const days = daysBetween(concept.lastPracticed, now);
    if (days > CONFIDENCE_DECAY_DAYS) {
      const decayPeriods = Math.floor(days / CONFIDENCE_DECAY_DAYS);
      const decay = decayPeriods * CONFIDENCE_DECAY_RATE;
      concept.confidence = Math.max(0.1, concept.confidence - decay);
    }
  }
}

function updateAreas(profile: KnowledgeProfile): void {
  const byCategory = new Map<string, number[]>();
  for (const c of profile.concepts) {
    const list = byCategory.get(c.category) || [];
    list.push(c.confidence);
    byCategory.set(c.category, list);
  }

  profile.strongAreas = [];
  profile.weakAreas = [];

  for (const [category, confidences] of byCategory) {
    const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    if (avg >= MASTERY_THRESHOLD) profile.strongAreas.push(category);
    else if (avg < WEAK_THRESHOLD) profile.weakAreas.push(category);
  }
}

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
}
