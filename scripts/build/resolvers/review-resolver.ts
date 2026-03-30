/**
 * aing Review Resolver
 * Generates dynamic review-related content for SKILL.md templates.
 *
 * Absorbed from gstack's review resolver pattern:
 * - {{REVIEW_DASHBOARD}} → Current review readiness state
 * - {{REVIEW_TIERS}} → Tier table from review-engine.mjs
 * - {{SCOPE_DRIFT_CHECK}} → Scope drift detection instructions
 *
 * @module scripts/build/resolvers/review-resolver
 */
import { REVIEW_AGENTS } from '../../review/review-engine.js';

interface ReviewAgentConfig {
  agents: string[];
  focus: string[];
}

/**
 * Generate the review tiers table.
 */
export function resolveReviewTiers(): string {
  const lines: string[] = [
    '| Tier | Agents | Focus | Required |',
    '|------|--------|-------|----------|',
  ];

  for (const [key, config] of Object.entries(REVIEW_AGENTS) as [string, ReviewAgentConfig][]) {
    const label = key.replace('-', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const agents = config.agents.length > 0 ? config.agents.join(', ') : 'subagent';
    const focus = config.focus.join(', ');
    const required = key === 'eng-review' ? 'YES' : 'no';
    lines.push(`| ${label} | ${agents} | ${focus} | ${required} |`);
  }

  return lines.join('\n');
}

/**
 * Generate review dashboard placeholder instructions.
 */
export function resolveReviewDashboard(): string {
  return `리뷰 완료 후 Dashboard를 출력하세요:
\`\`\`
import { buildDashboard, formatDashboard } from 'scripts/review/review-dashboard.mjs';
const dashboard = buildDashboard(projectDir);
console.log(formatDashboard(dashboard));
\`\`\`

Dashboard는 review-log.jsonl 기반으로 자동 생성됩니다.
각 리뷰 결과는 recordReview()로 영속화하세요.`;
}

/**
 * Generate scope drift check instructions.
 */
export function resolveScopeDriftCheck(): string {
  return `### Scope Drift Check
계획 vs 실제 diff를 비교:
1. 원래 계획/목표를 읽는다
2. git diff로 실제 변경사항 확인
3. 계획에 없는 변경 → Out of Scope (플래그)
4. 계획에 있는데 미구현 → Missed Goals (플래그)
5. drift > 30% → 사용자에게 경고`;
}
