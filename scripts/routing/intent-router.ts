/**
 * aing Intent Router
 * 자연어 입력을 분석하여 최적의 aing 파이프라인으로 라우팅합니다.
 * @module scripts/routing/intent-router
 */

import { scoreComplexity } from './complexity-scorer.js';
import { adjustConfidence } from './routing-history.js';
import { rerank, type RankedCandidate, type RerankerOptions } from './reranker.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('intent-router');

// ─────────────────────────────────────────────
// 앵커 패턴 정의
// ─────────────────────────────────────────────

/** 파일 경로 / 확장자 패턴 */
const FILE_PATH_PATTERNS: RegExp[] = [
  /src\//,
  /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|c|cpp|cs|rb|php|swift|kt)\b/,
  /\b(lib|dist|build|app|pages|components|utils|hooks|services|api|models|controllers|routes)\//,
];

/** camelCase / PascalCase / snake_case 심볼 */
const SYMBOL_PATTERNS: RegExp[] = [
  /\b[a-z][a-zA-Z0-9]{2,}[A-Z][a-zA-Z0-9]*\b/,  // camelCase
  /\b[A-Z][a-zA-Z0-9]{2,}[A-Z][a-zA-Z0-9]*\b/,  // PascalCase
  /\b[a-z]+_[a-z][a-z0-9_]{2,}\b/,               // snake_case (2+ underscores)
];

/** 이슈/PR 번호 */
const ISSUE_REF_PATTERN: RegExp = /#\d+/;

/** 에러 참조 */
const ERROR_PATTERNS: RegExp[] = [
  /\b(TypeError|ReferenceError|SyntaxError|RangeError|Error:)\b/,
  /\bException\b/,
  /\bstack trace\b/i,
];

/** 코드 블록 */
const CODE_BLOCK_PATTERN: RegExp = /```/;

/** 번호 매기기 목록 */
const NUMBERED_LIST_PATTERN: RegExp = /^\s*\d+\.\s+/m;

// ─────────────────────────────────────────────
// 키워드 정의
// ─────────────────────────────────────────────

const DESIGN_KEYWORDS: string[] = [
  '디자인', 'UI', 'UX', '화면', '페이지 디자인', '랜딩', '대시보드 디자인',
  'design', 'landing page', 'dashboard design', 'stitch', 'mockup', 'wireframe',
];

const PLAN_KEYWORDS: string[] = [
  '계획', '분석', '설계', '기획', '아키텍처', '검토', '조사', '리서치',
  'plan', 'analyze', 'design', 'research', 'investigate',
];

const TEAM_KEYWORDS: string[] = [
  '팀', '전체', '대규모', '시스템 전체', '마이그레이션', '리팩토링 전체',
  'team', 'large scale', 'full system', 'migration', 'entire',
];

// ─────────────────────────────────────────────
// 직접 라우팅 키워드 (코드 강제)
// ─────────────────────────────────────────────

interface DirectRoute {
  route: Route;
  keywords: string[];
  confidence: number;
  reason: string;
}

const DIRECT_ROUTES: DirectRoute[] = [
  {
    route: 'debug',
    keywords: ['버그', '에러', '오류', '고쳐', '안 돼', '안돼', '안됨', 'bug', 'error', 'fix bug', 'debug', '디버그', '500 에러', '404', 'crash', '크래시'],
    confidence: 0.90,
    reason: '디버그 키워드 감지',
  },
  {
    route: 'review-pipeline',
    keywords: ['리뷰', '봐줘', '확인해', '코드 리뷰', 'code review', 'review', 'PR 리뷰'],
    confidence: 0.88,
    reason: '리뷰 키워드 감지',
  },
  {
    route: 'review-cso',
    keywords: ['보안', '취약점', 'OWASP', 'security audit', '보안 감사', 'STRIDE', '보안 리뷰', 'security review', '취약성'],
    confidence: 0.92,
    reason: '보안 감사 키워드 감지',
  },
  {
    route: 'explore',
    keywords: ['구조', '설명해', '이해', '어떻게 동작', '분석해', 'explain', 'how does', 'explore', '탐색', '코드베이스'],
    confidence: 0.85,
    reason: '탐색/설명 키워드 감지',
  },
  {
    route: 'perf',
    keywords: ['느려', '느리', '성능', '최적화', 'slow', 'performance', 'optimize', '프로파일', 'profil', '병목', 'bottleneck', '메모리 누수', 'memory leak'],
    confidence: 0.90,
    reason: '성능 키워드 감지',
  },
  {
    route: 'refactor',
    keywords: ['리팩토링', '정리', '개선', 'refactor', 'cleanup', 'restructure', '구조 개선', '코드 정리'],
    confidence: 0.85,
    reason: '리팩토링 키워드 감지',
  },
  {
    route: 'tdd',
    keywords: ['테스트', 'TDD', '커버리지', 'test', 'coverage', '테스트 작성', 'write test', 'spec', 'jest', 'vitest'],
    confidence: 0.88,
    reason: 'TDD/테스트 키워드 감지',
  },
];

// ─────────────────────────────────────────────
// 앵커 탐지
// ─────────────────────────────────────────────

interface AnchorResult {
  hasAnchor: boolean;
  anchorTypes: string[];
}

/**
 * 입력 텍스트에서 구체적 앵커가 있는지 탐지합니다.
 */
function detectAnchors(input: string): AnchorResult {
  const anchorTypes: string[] = [];

  if (FILE_PATH_PATTERNS.some(p => p.test(input))) anchorTypes.push('file');
  if (SYMBOL_PATTERNS.some(p => p.test(input))) anchorTypes.push('symbol');
  if (ISSUE_REF_PATTERN.test(input)) anchorTypes.push('issue');
  if (ERROR_PATTERNS.some(p => p.test(input))) anchorTypes.push('error');
  if (CODE_BLOCK_PATTERN.test(input)) anchorTypes.push('codeblock');
  if (NUMBERED_LIST_PATTERN.test(input)) anchorTypes.push('list');

  return { hasAnchor: anchorTypes.length > 0, anchorTypes };
}

// ─────────────────────────────────────────────
// 키워드 탐지
// ─────────────────────────────────────────────

function detectDesign(input: string): boolean {
  return DESIGN_KEYWORDS.some(kw => input.toLowerCase().includes(kw.toLowerCase()));
}

function detectPlanIntent(input: string): boolean {
  return PLAN_KEYWORDS.some(kw => input.toLowerCase().includes(kw.toLowerCase()));
}

function detectTeamIntent(input: string): boolean {
  return TEAM_KEYWORDS.some(kw => input.toLowerCase().includes(kw.toLowerCase()));
}

// ─────────────────────────────────────────────
// complexity 추정 (자연어 기반)
// ─────────────────────────────────────────────

/**
 * 자연어 입력에서 complexity 신호를 추출합니다.
 */
function estimateComplexity(input: string, _anchorInfo: AnchorResult): number {
  // 파일 참조 수 추정 (확장자 매치 + src/ 경로 매치 합산)
  const extMatches = (input.match(/\.(ts|tsx|js|jsx|mjs|py|go|rs|java)\b/g) || []).length;
  const pathMatches = (input.match(/(?:src|lib|app|pages|components|utils|hooks|services|api|models|controllers|routes)\//g) || []).length;
  const fileCount = Math.max(extMatches + Math.floor(pathMatches / 2), 1);

  // 라인 수 추정: 파일 수 × 40줄 기본값 (파일당 최소 변경 40줄 가정)
  const wordCount = input.trim().split(/\s+/).length;
  const lineCount = Math.max(fileCount * 40, wordCount * 2, 10);

  // 도메인 수 추정 (키워드로)
  const domainKeywords: string[][] = [
    ['backend', 'api', 'endpoint', '서버', '백엔드'],
    ['frontend', 'ui', 'component', '프론트', '화면'],
    ['db', 'database', 'schema', 'migration', 'sql', '데이터베이스'],
    ['auth', 'security', '인증', '보안', 'jwt', 'oauth'],
    ['test', 'tdd', '테스트'],
  ];
  const inputLower = input.toLowerCase();
  const domainCount = domainKeywords.filter(
    domains => domains.some(kw => inputLower.includes(kw))
  ).length || 1;

  const hasTests = /테스트|test|tdd/i.test(input);
  const hasArchChange = /아키텍처|architecture|설계|시스템 전체|전체 구현/i.test(input);
  const hasSecurity = /보안|security|auth|인증|jwt|oauth/i.test(input);

  const { score } = scoreComplexity({
    fileCount,
    lineCount,
    domainCount,
    hasTests,
    hasArchChange,
    hasSecurity,
  });

  log.info(`complexity 추정: score=${score}, files=${fileCount}, domains=${domainCount}`);
  return score;
}

// ─────────────────────────────────────────────
// preset 결정
// ─────────────────────────────────────────────

type Route = 'auto' | 'plan' | 'plan-only' | 'team' | 'wizard' | 'debug' | 'review-pipeline' | 'review-cso' | 'explore' | 'perf' | 'refactor' | 'tdd';
type Preset = 'solo' | 'duo' | 'squad' | 'full' | 'design';

export interface IntentResult {
  route: Route;
  preset: Preset;
  confidence: number;
  reason: string;
  originalInput: string;
}

function resolvePreset(route: Route, complexityScore: number, isDesign: boolean): Preset {
  if (isDesign) return 'design';

  if (route === 'team') {
    if (complexityScore >= 7) return 'full';
    return 'squad';
  }

  if (route === 'auto') {
    if (complexityScore <= 2) return 'solo';
    if (complexityScore <= 4) return 'duo';
    return 'squad';
  }

  return 'solo';
}

// ─────────────────────────────────────────────
// 핵심 라우팅 함수
// ─────────────────────────────────────────────

/**
 * 자연어 입력을 분석하여 최적의 aing 파이프라인으로 라우팅합니다.
 */
export function routeIntent(input: string | null): IntentResult {
  const safeInput = (input == null ? '' : String(input)).trim();
  const originalInput = safeInput;

  // 빈 입력 → plan(기본값)
  if (!safeInput) {
    return {
      route: 'plan',
      preset: 'solo',
      confidence: 0.5,
      reason: '입력 없음 — 계획 수립 필요',
      originalInput,
    };
  }

  const anchorInfo = detectAnchors(safeInput);
  const inputLower = safeInput.toLowerCase();

  // ── 최우선: 직접 라우팅 (코드 강제) ──
  for (const dr of DIRECT_ROUTES) {
    if (dr.keywords.some(kw => inputLower.includes(kw.toLowerCase()))) {
      const complexityScore = estimateComplexity(safeInput, anchorInfo);
      const adjustedConfidence = adjustConfidence(dr.confidence, dr.route);
      const preset = resolvePreset('auto', complexityScore, false);
      // confidence < 0.5이면 fallback 안내
      const reason = adjustedConfidence < 0.5
        ? `${dr.reason} (낮은 성공률로 인해 라우팅 재검토 권장)`
        : dr.reason;
      log.info(`직접 라우팅: "${safeInput.slice(0, 40)}..." → ${dr.route}, confidence=${adjustedConfidence}`);
      return {
        route: dr.route,
        preset,
        confidence: adjustedConfidence,
        reason,
        originalInput,
      };
    }
  }

  const isDesign = detectDesign(safeInput);
  const isPlanIntent = detectPlanIntent(safeInput);
  const isTeamIntent = detectTeamIntent(safeInput);
  const wordCount = safeInput.split(/\s+/).length;
  const complexityScore = estimateComplexity(safeInput, anchorInfo);

  let route: Route;
  let confidence: number;
  let reason: string;

  // ── 우선순위 1: 팀 키워드 → team ──
  if (isTeamIntent) {
    route = 'team';
    confidence = 0.85;
    reason = `팀 키워드 감지 + complexity ${complexityScore}`;
  }
  // ── 우선순위 2: 디자인 키워드 → auto(design) ──
  else if (isDesign) {
    route = 'auto';
    confidence = 0.88;
    reason = `디자인 도메인 감지`;
  }
  // ── 우선순위 3: 계획/분석 키워드 → plan 또는 plan-only ──
  else if (isPlanIntent) {
    const hasArchKeyword = /아키텍처|architecture|시스템\s*설계|system\s*design/i.test(safeInput);
    // 아키텍처 키워드 or high complexity → full plan (합의)
    if (hasArchKeyword || complexityScore >= 5) {
      route = 'plan';
      confidence = 0.82;
      reason = `계획/분석 키워드 감지${hasArchKeyword ? ' + 아키텍처 결정 필요' : ''}`;
    }
    // complexity 낮고 앵커 있으면 plan-only (경량)
    else if (complexityScore <= 4 && anchorInfo.hasAnchor) {
      route = 'plan-only';
      confidence = 0.82;
      reason = `계획 키워드 + 앵커 있음 + low complexity ${complexityScore} → 경량 플래닝`;
    }
    // 그 외 → plan-only
    else {
      route = 'plan-only';
      confidence = 0.75;
      reason = `계획 키워드 + low complexity ${complexityScore} → 경량 플래닝`;
    }
  }
  // ── 우선순위 4: 앵커 있음 → auto (또는 complexity ≥ 5 이면 team) ──
  else if (anchorInfo.hasAnchor) {
    if (complexityScore >= 5) {
      route = 'team';
      confidence = 0.78;
      reason = `앵커(${anchorInfo.anchorTypes.join(', ')}) + complexity ${complexityScore} ≥ 5`;
    } else {
      route = 'auto';
      confidence = 0.85;
      reason = `앵커(${anchorInfo.anchorTypes.join(', ')}) + complexity ${complexityScore}`;
    }
  }
  // ── 우선순위 5: complexity 기반 ──
  else if (complexityScore >= 5) {
    route = 'team';
    confidence = 0.75;
    reason = `complexity ${complexityScore} ≥ 5 — 팀 필요`;
  }
  // ── 우선순위 6: 짧고 단순한 입력 (≤15단어, 앵커 없음) → plan-only ──
  else if (wordCount <= 15) {
    route = 'plan-only';
    confidence = 0.70;
    reason = `짧은 입력 (${wordCount}단어) — 경량 플래닝`;
  }
  // ── 기본: auto ──
  else {
    route = 'auto';
    confidence = 0.65;
    reason = `기본 라우팅 — 자동 실행`;
  }

  const preset = resolvePreset(route, complexityScore, isDesign);

  // 히스토리 피드백 기반 confidence 동적 조정
  const adjustedConfidence = adjustConfidence(confidence, route);
  const finalReason = adjustedConfidence < 0.5
    ? `${reason} (낮은 성공률로 인해 라우팅 재검토 권장)`
    : reason;

  log.info(`라우팅 결정: "${safeInput.slice(0, 40)}..." → ${route}(${preset}), confidence=${adjustedConfidence}`);

  return {
    route,
    preset,
    confidence: adjustedConfidence,
    reason: finalReason,
    originalInput,
  };
}

// ─────────────────────────────────────────────
// 2단계: 후보 리스트 + 리랭킹
// ─────────────────────────────────────────────

export interface RankedIntentResult extends IntentResult {
  finalScore: number;
  sparseScore: number;
  denseScore: number;
}

/**
 * 2단계 라우팅: 1단계 routeIntent() 결과 + 대안 후보들을 리랭킹하여 정렬된 리스트를 반환합니다.
 * 기존 routeIntent() API는 변경 없이 유지됩니다.
 */
export function routeIntentRanked(input: string | null, options?: RerankerOptions): RankedIntentResult[] {
  const primary = routeIntent(input);
  const safeInput = (input == null ? '' : String(input)).trim();

  if (!safeInput) {
    return [{
      ...primary,
      finalScore: primary.confidence,
      sparseScore: primary.confidence,
      denseScore: 0.5,
    }];
  }

  // Generate alternative candidates from direct routes and heuristic routes
  const candidateRoutes = new Set<Route>([primary.route]);
  const candidates: Array<{ route: Route; confidence: number; preset: Preset; reason: string }> = [
    { route: primary.route, confidence: primary.confidence, preset: primary.preset, reason: primary.reason },
  ];

  const anchorInfo = detectAnchors(safeInput);
  const complexityScore = estimateComplexity(safeInput, anchorInfo);
  const isDesign = detectDesign(safeInput);
  const inputLower = safeInput.toLowerCase();

  // Collect alternative direct route matches (excluding primary)
  for (const dr of DIRECT_ROUTES) {
    if (candidateRoutes.has(dr.route)) continue;
    if (dr.keywords.some(kw => inputLower.includes(kw.toLowerCase()))) {
      const adjustedConfidence = adjustConfidence(dr.confidence, dr.route);
      const preset = resolvePreset('auto', complexityScore, false);
      candidateRoutes.add(dr.route);
      candidates.push({
        route: dr.route,
        confidence: adjustedConfidence,
        preset,
        reason: dr.reason,
      });
    }
  }

  // Add heuristic fallback candidates if not already present
  const fallbackCandidates: Array<{ route: Route; confidence: number; condition: boolean }> = [
    { route: 'auto', confidence: 0.60, condition: !candidateRoutes.has('auto') },
    { route: 'plan-only', confidence: 0.55, condition: !candidateRoutes.has('plan-only') && complexityScore <= 4 },
    { route: 'team', confidence: 0.50, condition: !candidateRoutes.has('team') && complexityScore >= 5 },
  ];

  for (const fb of fallbackCandidates) {
    if (fb.condition) {
      const preset = resolvePreset(fb.route, complexityScore, isDesign);
      candidateRoutes.add(fb.route);
      candidates.push({
        route: fb.route,
        confidence: fb.confidence,
        preset,
        reason: '대안 후보',
      });
    }
  }

  // Rerank all candidates
  const ranked = rerank(
    candidates.map(c => ({ route: c.route, confidence: c.confidence })),
    options,
  );

  // Build lookup for candidate metadata
  const candidateMap = new Map(candidates.map(c => [c.route, c]));

  return ranked.map((r: RankedCandidate) => {
    const meta = candidateMap.get(r.route as Route)!;
    return {
      route: meta.route,
      preset: meta.preset,
      confidence: r.sparseScore,
      reason: meta.reason,
      originalInput: safeInput,
      finalScore: r.finalScore,
      sparseScore: r.sparseScore,
      denseScore: r.denseScore,
    };
  });
}

// ─────────────────────────────────────────────
// CLI 실행 (JSON stdout 출력)
// ─────────────────────────────────────────────

if (process.argv[1] && /intent-router\.(mjs|js)$/.test(process.argv[1])) {
  const input = process.argv.slice(2).join(' ');
  const result = routeIntent(input);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
