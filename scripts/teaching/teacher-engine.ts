/**
 * Teacher Engine — 소크라테스 문답법 기반 교육 엔진.
 *
 * 기능 구현과 동시에 사용자에게 가르치는 "learn by building" 방식.
 * 매 구현 단계에서 "왜 이렇게 하는지" 질문하고,
 * 답변에 따라 난이도를 실시간 조정한다.
 *
 * @module scripts/teaching/teacher-engine
 */

import {
  startSession,
  diagnose,
  recordAnswer,
  generateSummary,
  type DifficultyLevel,
  type DiagnosisResult,
  type KnowledgeProfile,
} from './knowledge-tracker.js';

// ── Types ──

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

// ── Concept Extraction ──

/**
 * 작업 설명에서 관련 프로그래밍 개념을 추출한다.
 * 키워드 매칭 기반 — LLM 호출 없이 빠르게 동작.
 */
export function extractConcepts(taskDescription: string): Array<{ name: string; category: string }> {
  const conceptMap: Record<string, { keywords: string[]; category: string }> = {
    // TypeScript
    'TypeScript Basics': { keywords: ['typescript', 'ts', 'type', 'interface'], category: 'typescript' },
    'TypeScript Generics': { keywords: ['generic', 'generics', '<T>', 'type parameter'], category: 'typescript' },
    'TypeScript Union Types': { keywords: ['union', 'discriminated', '|'], category: 'typescript' },
    'TypeScript Utility Types': { keywords: ['Partial', 'Pick', 'Omit', 'Record', 'utility type'], category: 'typescript' },

    // JavaScript
    'Async/Await': { keywords: ['async', 'await', 'promise', 'Promise'], category: 'javascript' },
    'Closures': { keywords: ['closure', 'lexical scope', 'factory'], category: 'javascript' },
    'Event Loop': { keywords: ['event loop', 'microtask', 'setTimeout', 'setInterval'], category: 'javascript' },
    'Error Handling': { keywords: ['try', 'catch', 'error handling', 'throw'], category: 'javascript' },
    'ES Modules': { keywords: ['import', 'export', 'module', 'esm', 'mjs'], category: 'javascript' },
    'Array Methods': { keywords: ['map', 'filter', 'reduce', 'forEach', 'array'], category: 'javascript' },
    'Destructuring': { keywords: ['destructure', 'destructuring', 'spread', '...'], category: 'javascript' },

    // Node.js
    'Node.js File System': { keywords: ['fs', 'readFile', 'writeFile', 'file system'], category: 'nodejs' },
    'Node.js HTTP': { keywords: ['http', 'server', 'request', 'response', 'express'], category: 'nodejs' },
    'Node.js Streams': { keywords: ['stream', 'pipe', 'readable', 'writable'], category: 'nodejs' },
    'Node.js Child Process': { keywords: ['spawn', 'exec', 'child_process', 'fork'], category: 'nodejs' },
    'Node.js Crypto': { keywords: ['crypto', 'hash', 'encrypt', 'decrypt', 'uuid'], category: 'nodejs' },

    // React
    'React Components': { keywords: ['component', 'jsx', 'tsx', 'react'], category: 'react' },
    'React Hooks': { keywords: ['useState', 'useEffect', 'useCallback', 'useMemo', 'hook'], category: 'react' },
    'React State Management': { keywords: ['state', 'context', 'reducer', 'zustand', 'redux'], category: 'react' },

    // Design Patterns
    'Singleton Pattern': { keywords: ['singleton', 'single instance'], category: 'patterns' },
    'Observer Pattern': { keywords: ['observer', 'event emitter', 'subscribe', 'publish'], category: 'patterns' },
    'Factory Pattern': { keywords: ['factory', 'create', 'builder'], category: 'patterns' },
    'Strategy Pattern': { keywords: ['strategy', 'adapter', 'plugin'], category: 'patterns' },
    'Circular Buffer': { keywords: ['circular buffer', 'ring buffer', 'bounded'], category: 'patterns' },

    // Architecture
    'REST API Design': { keywords: ['rest', 'api', 'endpoint', 'route', 'crud'], category: 'architecture' },
    'Database Design': { keywords: ['database', 'schema', 'migration', 'sql', 'orm'], category: 'architecture' },
    'Testing Strategy': { keywords: ['test', 'tdd', 'unit test', 'e2e', 'mock'], category: 'architecture' },
    'CI/CD': { keywords: ['ci', 'cd', 'deploy', 'pipeline', 'github actions'], category: 'architecture' },
    'State Machine': { keywords: ['state machine', 'fsm', 'transition', 'phase'], category: 'architecture' },

    // Security
    'Authentication': { keywords: ['auth', 'login', 'jwt', 'token', 'session'], category: 'security' },
    'Input Validation': { keywords: ['validation', 'sanitize', 'injection', 'xss'], category: 'security' },

    // Performance
    'Caching': { keywords: ['cache', 'memoize', 'ttl', 'invalidate'], category: 'performance' },
    'Algorithm Complexity': { keywords: ['O(n)', 'complexity', 'big-o', 'optimization'], category: 'performance' },

    // Git
    'Git Basics': { keywords: ['git', 'commit', 'branch', 'merge', 'rebase'], category: 'git' },
    'Git Workflow': { keywords: ['pr', 'pull request', 'code review', 'gitflow'], category: 'git' },
  };

  const lower = taskDescription.toLowerCase();
  const matched: Array<{ name: string; category: string }> = [];

  for (const [name, config] of Object.entries(conceptMap)) {
    if (config.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      matched.push({ name, category: config.category });
    }
  }

  return matched;
}

// ── Question Generation ──

/**
 * 난이도에 맞는 질문 템플릿을 생성한다.
 * 실제 질문 내용은 Teacher 에이전트가 컨텍스트에 맞게 수정한다.
 */
export function generateQuestionTemplate(
  concept: string,
  category: string,
  difficulty: DifficultyLevel,
  _codeContext: string
): TeachingQuestion {
  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const templates: Record<DifficultyLevel, Record<QuestionType, string>> = {
    beginner: {
      why: `이 코드에서 ${concept}을(를) 사용하는 이유가 뭘까요?`,
      'what-if': `만약 이 부분을 빼면 어떤 일이 생길까요?`,
      compare: `${concept} 대신 다른 방법을 쓸 수도 있었을까요?`,
      predict: `이 코드를 실행하면 어떤 결과가 나올 것 같나요?`,
      debug: `여기서 에러가 났는데, 어떤 부분이 문제일 것 같나요?`,
      refactor: `이 코드를 더 읽기 쉽게 만들 수 있을까요?`,
    },
    intermediate: {
      why: `여기서 ${concept} 패턴을 선택한 근거가 뭘까요? 트레이드오프는?`,
      'what-if': `이 함수에 예상치 못한 입력이 들어오면 어떻게 될까요?`,
      compare: `${concept}과 대안 접근법을 비교하면, 각각의 장단점은?`,
      predict: `이 코드의 시간/공간 복잡도는 어떻게 될까요?`,
      debug: `이 에러의 근본 원인은 무엇이고, 어떻게 방지할 수 있을까요?`,
      refactor: `이 코드에서 DRY 원칙이 위반된 부분이 있나요?`,
    },
    advanced: {
      why: `이 아키텍처 결정이 실패할 수 있는 시나리오는 뭘까요?`,
      'what-if': `동시성 문제나 race condition이 발생할 수 있는 지점은?`,
      compare: `이 설계를 다른 팀에 인수인계한다면, 가장 먼저 개선할 점은?`,
      predict: `이 시스템이 10배 트래픽을 받으면 어디가 먼저 병목이 될까요?`,
      debug: `이 간헐적 버그의 재현 조건을 어떻게 좁힐 수 있을까요?`,
      refactor: `이 모듈의 책임이 명확한가요? Single Responsibility를 기준으로 판단해보세요.`,
    },
  };

  // 난이도에 맞는 질문 유형 선택
  const types: QuestionType[] = ['why', 'what-if', 'compare', 'predict', 'debug', 'refactor'];
  const selectedType = types[Math.floor(Math.random() * types.length)];

  return {
    id,
    type: selectedType,
    concept,
    category,
    difficulty,
    question: templates[difficulty][selectedType],
    hints: generateHints(concept, difficulty),
    expectedAnswer: '',  // Teacher 에이전트가 채운다
    explanation: '',     // Teacher 에이전트가 채운다
  };
}

function generateHints(concept: string, difficulty: DifficultyLevel): string[] {
  if (difficulty === 'beginner') {
    return [
      `${concept}의 가장 기본적인 역할을 생각해보세요.`,
      `비슷한 것을 일상생활에서 찾아볼 수 있을까요?`,
      `없으면 어떤 문제가 생길지 상상해보세요.`,
    ];
  }
  if (difficulty === 'intermediate') {
    return [
      `장점과 단점을 각각 하나씩 떠올려보세요.`,
      `다른 프로젝트에서 비슷한 패턴을 본 적이 있나요?`,
    ];
  }
  return [
    `실제 프로덕션 환경을 기준으로 생각해보세요.`,
  ];
}

// ── Teaching Plan ──

/**
 * 작업과 사용자 수준에 기반한 교육 계획을 생성한다.
 */
export function createTeachingPlan(
  projectDir: string,
  task: string
): TeachingPlan {
  const concepts = extractConcepts(task);
  const conceptNames = concepts.map(c => c.name);
  const diagnosis = diagnose(projectDir, conceptNames);

  return {
    task,
    difficulty: diagnosis.suggestedLevel,
    diagnosis,
    steps: [],  // Teacher 에이전트가 실제 구현 단계를 채운다
    estimatedQuestions: Math.max(3, concepts.length * 2),
    concepts: conceptNames,
  };
}

// ── Session Management ──

/**
 * Teacher 세션을 시작한다.
 */
export function startTeachingSession(
  projectDir: string,
  task: string
): TeachingSession {
  const profile = startSession(projectDir);
  const plan = createTeachingPlan(projectDir, task);

  return {
    plan,
    currentStep: 0,
    currentQuestion: 0,
    profile,
    startedAt: new Date().toISOString(),
    questionsAsked: 0,
    correctAnswers: 0,
    skippedCount: 0,
  };
}

/**
 * 질문 결과를 기록하고 세션 상태를 업데이트한다.
 */
export function processAnswer(
  projectDir: string,
  session: TeachingSession,
  questionId: string,
  outcome: 'correct' | 'wrong' | 'partial' | 'skipped',
  userAnswer?: string
): TeachingSession {
  // 현재 질문 정보 찾기
  const currentStep = session.plan.steps[session.currentStep];
  const question = currentStep?.questions.find(q => q.id === questionId);

  if (question) {
    recordAnswer(projectDir, {
      concept: question.concept,
      category: question.category,
      outcome,
      userAnswer,
      difficulty: question.difficulty,
      timestamp: new Date().toISOString(),
    });
  }

  session.questionsAsked += 1;
  if (outcome === 'correct') session.correctAnswers += 1;
  if (outcome === 'skipped') session.skippedCount += 1;

  // 스킵이 많으면 난이도 낮춤
  if (session.skippedCount > 3 && session.plan.difficulty !== 'beginner') {
    session.plan.difficulty = lowerDifficulty(session.plan.difficulty);
  }

  // 정답률 높으면 난이도 올림
  const accuracy = session.questionsAsked > 0
    ? session.correctAnswers / session.questionsAsked
    : 0;
  if (session.questionsAsked >= 5 && accuracy > 0.8 && session.plan.difficulty !== 'advanced') {
    session.plan.difficulty = raiseDifficulty(session.plan.difficulty);
  }

  return session;
}

/**
 * 세션 종료 시 학습 요약을 생성한다.
 */
export function endTeachingSession(projectDir: string, session: TeachingSession): string {
  const duration = Math.round(
    (Date.now() - new Date(session.startedAt).getTime()) / 60000
  );
  const accuracy = session.questionsAsked > 0
    ? Math.round((session.correctAnswers / session.questionsAsked) * 100)
    : 0;

  const lines: string[] = [
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  학습 세션 완료`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `| 항목 | 결과 |`,
    `|------|------|`,
    `| 소요 시간 | ${duration}분 |`,
    `| 질문 수 | ${session.questionsAsked} |`,
    `| 정답률 | ${accuracy}% |`,
    `| 스킵 | ${session.skippedCount} |`,
    `| 난이도 | ${session.plan.difficulty} |`,
    ``,
    generateSummary(projectDir),
  ];

  return lines.join('\n');
}

// ── Helpers ──

function lowerDifficulty(level: DifficultyLevel): DifficultyLevel {
  if (level === 'advanced') return 'intermediate';
  return 'beginner';
}

function raiseDifficulty(level: DifficultyLevel): DifficultyLevel {
  if (level === 'beginner') return 'intermediate';
  return 'advanced';
}
