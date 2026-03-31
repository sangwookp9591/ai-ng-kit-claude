/**
 * Knowledge Tracker — 사용자의 학습 진도를 추적하고 난이도를 적응시킨다.
 *
 * 저장 위치: .aing/learning/knowledge.json
 * 개념별 confidence (0-1), 질문/정답 횟수, 최근 학습일 기반으로
 * 난이도를 자동 조정한다.
 *
 * @module scripts/teaching/knowledge-tracker
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export interface ConceptRecord {
    name: string;
    category: string;
    level: DifficultyLevel;
    firstSeen: string;
    lastPracticed: string;
    confidence: number;
    questionsAsked: number;
    correctAnswers: number;
    wrongAnswers: number;
    skipped: number;
    context: string;
    notes: string[];
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
    strongAreas: string[];
    weakAreas: string[];
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
    reviewNeeded: string[];
}
export declare function loadKnowledge(projectDir: string): KnowledgeProfile;
export declare function saveKnowledge(projectDir: string, profile: KnowledgeProfile): void;
/**
 * 개념에 대한 질문 결과를 기록한다.
 */
export declare function recordAnswer(projectDir: string, result: QuestionResult): ConceptRecord;
/**
 * 세션 시작 시 호출. 스트릭 계산 + confidence decay 적용.
 */
export declare function startSession(projectDir: string): KnowledgeProfile;
/**
 * 작업에 관련된 개념 목록으로 사용자 수준을 진단한다.
 */
export declare function diagnose(projectDir: string, relatedConcepts: string[]): DiagnosisResult;
/**
 * 학습 요약 리포트를 생성한다.
 */
export declare function generateSummary(projectDir: string): string;
//# sourceMappingURL=knowledge-tracker.d.ts.map