/**
 * aing QA Health Score Calculator
 *
 * @module scripts/review/qa-health-score
 */

export interface HealthCategoryConfig {
  weight: number;
  label: string;
}

export interface HealthIssue {
  severity: string;
  [key: string]: unknown;
}

export interface CategoryData {
  errors?: number;
  broken?: number;
  issues?: HealthIssue[];
  [key: string]: unknown;
}

export interface CategoryScore {
  score: number;
  weight: number;
  label: string;
}

export interface HealthScoreResult {
  overall: number;
  categories: Record<string, CategoryScore>;
  grade: string;
}

/**
 * Health score categories with weights.
 */
export const HEALTH_CATEGORIES: Record<string, HealthCategoryConfig> = {
  console:       { weight: 0.15, label: 'Console Errors' },
  links:         { weight: 0.10, label: 'Broken Links' },
  visual:        { weight: 0.10, label: 'Visual Issues' },
  functional:    { weight: 0.20, label: 'Functional Bugs' },
  ux:            { weight: 0.15, label: 'UX Problems' },
  performance:   { weight: 0.10, label: 'Performance' },
  content:       { weight: 0.05, label: 'Content Quality' },
  accessibility: { weight: 0.15, label: 'Accessibility' },
};

/**
 * Severity deductions (from 100 base).
 */
const SEVERITY_DEDUCTIONS: Record<string, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
};

/**
 * Calculate score for a single category.
 */
export function calculateCategoryScore(category: string, data: CategoryData): number {
  if (category === 'console') {
    const errorCount = data.errors || 0;
    if (errorCount === 0) return 100;
    if (errorCount <= 3) return 70;
    if (errorCount <= 10) return 40;
    return 10;
  }

  if (category === 'links') {
    const brokenCount = data.broken || 0;
    return Math.max(0, 100 - (brokenCount * 15));
  }

  // All other categories: deduct by severity
  let score = 100;
  for (const issue of (data.issues || [])) {
    const deduction = SEVERITY_DEDUCTIONS[issue.severity] || 0;
    score -= deduction;
  }
  return Math.max(0, score);
}

/**
 * Calculate overall health score.
 */
export function calculateHealthScore(categoryData: Record<string, CategoryData>): HealthScoreResult {
  const categories: Record<string, CategoryScore> = {};
  let weightedTotal = 0;

  for (const [key, config] of Object.entries(HEALTH_CATEGORIES)) {
    const data = categoryData[key] || {};
    const score = calculateCategoryScore(key, data);
    categories[key] = { score, weight: config.weight, label: config.label };
    weightedTotal += score * config.weight;
  }

  const overall = Math.round(weightedTotal);
  const grade = overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C'
    : overall >= 60 ? 'D' : 'F';

  return { overall, categories, grade };
}

/**
 * Format health score for display.
 */
export function formatHealthScore(result: HealthScoreResult): string {
  const lines = [
    `QA Health Score: ${result.overall}/100 (${result.grade})`,
    '',
    'Category Breakdown:',
  ];

  for (const [, data] of Object.entries(result.categories)) {
    const bar = '█'.repeat(Math.round(data.score / 10)) + '░'.repeat(10 - Math.round(data.score / 10));
    lines.push(`  ${data.label.padEnd(18)} ${bar} ${data.score}/100 (${Math.round(data.weight * 100)}%)`);
  }

  return lines.join('\n');
}
