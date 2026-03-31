/**
 * Teacher Engine — 소크라테스 문답법 기반 교육 엔진.
 *
 * 기능 구현과 동시에 사용자에게 가르치는 "learn by building" 방식.
 * 매 구현 단계에서 "왜 이렇게 하는지" 질문하고,
 * 답변에 따라 난이도를 실시간 조정한다.
 *
 * @module scripts/teaching/teacher-engine
 */
import { type DifficultyLevel, type DiagnosisResult, type KnowledgeProfile } from './knowledge-tracker.js';
export type QuestionType = 'why' | 'what-if' | 'compare' | 'predict' | 'debug' | 'refactor';
export interface TeachingQuestion {
    id: string;
    type: QuestionType;
    concept: string;
    category: string;
    difficulty: DifficultyLevel;
    question: string;
    hints: string[];
    expectedAnswer: string;
    explanation: string;
    followUp?: string;
}
export interface TeachingStep {
    stepNumber: number;
    title: string;
    description: string;
    concepts: string[];
    questions: TeachingQuestion[];
    codeToWrite: string;
    afterExplanation: string;
}
export interface TeachingPlan {
    task: string;
    difficulty: DifficultyLevel;
    diagnosis: DiagnosisResult;
    steps: TeachingStep[];
    estimatedQuestions: number;
    concepts: string[];
}
export interface TeachingSession {
    plan: TeachingPlan;
    currentStep: number;
    currentQuestion: number;
    profile: KnowledgeProfile;
    startedAt: string;
    questionsAsked: number;
    correctAnswers: number;
    skippedCount: number;
}
/**
 * 작업 설명에서 관련 프로그래밍 개념을 추출한다.
 * 키워드 매칭 기반 — LLM 호출 없이 빠르게 동작.
 */
export declare function extractConcepts(taskDescription: string): Array<{
    name: string;
    category: string;
}>;
/**
 * 난이도에 맞는 질문 템플릿을 생성한다.
 * 실제 질문 내용은 Teacher 에이전트가 컨텍스트에 맞게 수정한다.
 */
export declare function generateQuestionTemplate(concept: string, category: string, difficulty: DifficultyLevel, _codeContext: string): TeachingQuestion;
/**
 * 작업과 사용자 수준에 기반한 교육 계획을 생성한다.
 */
export declare function createTeachingPlan(projectDir: string, task: string): TeachingPlan;
/**
 * Teacher 세션을 시작한다.
 */
export declare function startTeachingSession(projectDir: string, task: string): TeachingSession;
/**
 * 질문 결과를 기록하고 세션 상태를 업데이트한다.
 */
export declare function processAnswer(projectDir: string, session: TeachingSession, questionId: string, outcome: 'correct' | 'wrong' | 'partial' | 'skipped', userAnswer?: string): TeachingSession;
/**
 * 세션 종료 시 학습 요약을 생성한다.
 */
export declare function endTeachingSession(projectDir: string, session: TeachingSession): string;
//# sourceMappingURL=teacher-engine.d.ts.map