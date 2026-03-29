/**
 * aing Evidence Resolver
 * Generates dynamic evidence-related content for SKILL.md templates.
 *
 * @module scripts/build/resolvers/evidence-resolver
 */
import { JUDGE_CRITERIA } from '../../evidence/llm-judge.mjs';
import { BROWSER_EVIDENCE_TYPES } from '../../review/browser-evidence.mjs';

/**
 * Generate evidence types table.
 * @returns {string}
 */
export function resolveEvidenceTypes() {
  const types = [
    ['test', 'Jest/Vitest/pytest 등 테스트 결과', 'pass/fail + count'],
    ['build', 'tsc/esbuild/webpack 등 빌드 결과', 'success/errors'],
    ['lint', 'ESLint/Prettier 등 린트 결과', 'error count'],
    ['review', '리뷰 파이프라인 결과', 'CLEAR/ISSUES'],
    ['llm-judge', 'LLM 기반 품질 평가', '0-10 score'],
    ['browser-screenshot', 'MCP Playwright 스크린샷', 'visual check'],
    ['browser-console', '브라우저 콘솔 에러', 'error count'],
    ['browser-a11y', '접근성 감사', 'violation count'],
    ['browser-visual-diff', 'Before/After 비교', 'diff percent'],
  ];

  const lines = [
    '| Type | Source | Metric |',
    '|------|--------|--------|',
  ];

  for (const [type, source, metric] of types) {
    lines.push(`| ${type} | ${source} | ${metric} |`);
  }

  return lines.join('\n');
}

/**
 * Generate LLM judge criteria table.
 * @returns {string}
 */
export function resolveJudgeCriteria() {
  const descriptions = {
    correctness: '기능적 정확성, 로직 에러, 엣지 케이스',
    completeness: '요구사항 충족도, 누락 기능',
    'code-quality': '코드 구조, DRY, 가독성, 유지보수성',
    security: 'OWASP Top 10, 인증/인가, 데이터 노출',
    performance: 'N+1 쿼리, 메모리 누수, 캐싱',
    'ux-quality': '로딩 상태, 에러 메시지, 접근성',
    'design-quality': 'AI Slop 감지, 시각적 일관성',
  };

  const lines = [
    '| Criterion | Description | Score |',
    '|-----------|-------------|-------|',
  ];

  for (const [key, desc] of Object.entries(descriptions)) {
    lines.push(`| ${key} | ${desc} | 0-10 |`);
  }

  return lines.join('\n');
}
