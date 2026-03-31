/**
 * aing Design Scoring — AI Slop Detection + Quality Assessment
 *
 * @module scripts/review/design-scoring
 */

export interface AISlopPattern {
  id: number;
  name: string;
  description: string;
  patterns: string[];
}

export interface LitmusCheck {
  id: number;
  question: string;
}

export interface DesignCategoryConfig {
  weight: number;
  items: number;
}

export interface DetectedSlop {
  id: number;
  name: string;
  description: string;
  matched: string;
}

export interface CategoryEvaluation {
  score: number;
  issues?: unknown[];
}

export interface DesignScoreResult {
  overall: number;
  grade: string;
  aiSlopScore: number;
  categories: Record<string, { score: number; weight: number }>;
}

export interface DesignAuditContext {
  files?: string[];
}

/**
 * AI Slop Blacklist — 10 anti-patterns.
 */
export const AI_SLOP_BLACKLIST: AISlopPattern[] = [
  { id: 1, name: 'purple-gradient', description: 'Purple/violet/indigo gradient backgrounds or blue-to-purple color schemes', patterns: ['purple', 'violet', 'indigo', 'gradient.*purple', 'from-purple', 'to-indigo'] },
  { id: 2, name: '3-column-grid', description: '3-column feature grid with icon-in-colored-circle + bold title + 2-line description', patterns: ['grid-cols-3.*icon', 'three.*column.*feature'] },
  { id: 3, name: 'icons-in-circles', description: 'Icons in colored circles as section decoration (SaaS starter template look)', patterns: ['rounded-full.*bg-', 'icon.*circle'] },
  { id: 4, name: 'centered-everything', description: 'text-align: center on all headings, descriptions, cards', patterns: ['text-center'] },
  { id: 5, name: 'uniform-radius', description: 'Uniform bubbly border-radius on every element', patterns: ['rounded-2xl', 'rounded-3xl', 'rounded-full'] },
  { id: 6, name: 'decorative-blobs', description: 'Decorative blobs, floating circles, wavy SVG dividers', patterns: ['blob', 'wavy', 'divider.*svg', 'floating.*circle'] },
  { id: 7, name: 'emoji-design', description: 'Emoji as design elements (rockets in headings, emoji as bullets)', patterns: [] },
  { id: 8, name: 'colored-left-border', description: 'Colored left-border on cards (border-left: 3px solid)', patterns: ['border-l-', 'border-left.*solid'] },
  { id: 9, name: 'generic-hero', description: 'Generic hero copy ("Welcome to...", "Unlock the power of...")', patterns: ['Welcome to', 'Unlock the power', 'all-in-one solution', 'Your.*platform for'] },
  { id: 10, name: 'cookie-cutter-rhythm', description: 'hero → 3 features → testimonials → pricing → CTA, every section same height', patterns: [] },
];

/**
 * OpenAI Hard Rejection Criteria (7).
 */
export const HARD_REJECTIONS: string[] = [
  'Generic SaaS card grid as first impression',
  'Beautiful image with weak brand',
  'Strong headline with no clear action',
  'Busy imagery behind text',
  'Sections repeating same mood statement',
  'Carousel with no narrative purpose',
  'App UI made of stacked cards instead of layout',
];

/**
 * Litmus Checks (7 YES/NO tests).
 */
export const LITMUS_CHECKS: LitmusCheck[] = [
  { id: 1, question: 'Brand/product unmistakable in first screen?' },
  { id: 2, question: 'One strong visual anchor present?' },
  { id: 3, question: 'Page understandable by scanning headlines only?' },
  { id: 4, question: 'Each section has one job?' },
  { id: 5, question: 'Are cards actually necessary?' },
  { id: 6, question: 'Does motion improve hierarchy or atmosphere?' },
  { id: 7, question: 'Would design feel premium with all shadows removed?' },
];

/**
 * Design audit categories with weights.
 */
export const DESIGN_CATEGORIES: Record<string, DesignCategoryConfig> = {
  'visual-hierarchy':   { weight: 0.15, items: 8 },
  'typography':         { weight: 0.15, items: 15 },
  'spacing-layout':     { weight: 0.15, items: 12 },
  'color-contrast':     { weight: 0.10, items: 10 },
  'interaction-states': { weight: 0.10, items: 10 },
  'responsive':         { weight: 0.10, items: 8 },
  'content-quality':    { weight: 0.10, items: 8 },
  'ai-slop':            { weight: 0.05, items: 10 },
  'motion':             { weight: 0.05, items: 6 },
  'performance-feel':   { weight: 0.05, items: 6 },
};

/**
 * Grade scale.
 */
const GRADES: Record<string, number> = { A: 90, B: 75, C: 60, D: 45, F: 0 };

/**
 * Detect AI slop patterns in code/content.
 */
export function detectAISlop(content: string): DetectedSlop[] {
  const detected: DetectedSlop[] = [];
  const lower = content.toLowerCase();

  for (const item of AI_SLOP_BLACKLIST) {
    for (const pattern of item.patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        detected.push({ id: item.id, name: item.name, description: item.description, matched: pattern });
        break;
      }
    }
  }

  return detected;
}

/**
 * Calculate design score from category evaluations.
 */
export function calculateDesignScore(evaluations: Record<string, CategoryEvaluation>): DesignScoreResult {
  let weightedTotal = 0;
  const categories: Record<string, { score: number; weight: number }> = {};

  for (const [key, config] of Object.entries(DESIGN_CATEGORIES)) {
    const eval_ = evaluations[key] || { score: 100, issues: [] };
    categories[key] = { score: eval_.score, weight: config.weight };
    weightedTotal += eval_.score * config.weight;
  }

  const overall = Math.round(weightedTotal);
  const grade = overall >= GRADES.A ? 'A' : overall >= GRADES.B ? 'B'
    : overall >= GRADES.C ? 'C' : overall >= GRADES.D ? 'D' : 'F';

  const aiSlopScore = evaluations['ai-slop']?.score || 100;

  return { overall, grade, aiSlopScore, categories };
}

/**
 * Format design score for display.
 */
export function formatDesignScore(result: DesignScoreResult): string {
  const lines = [
    `Design Score: ${result.overall}/100 (${result.grade})`,
    `AI Slop Score: ${result.aiSlopScore}/100`,
    '',
    'Category Breakdown:',
  ];

  for (const [key, data] of Object.entries(result.categories)) {
    const name = key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    lines.push(`  ${name.padEnd(22)} ${data.score}/100 (${Math.round(data.weight * 100)}%)`);
  }

  return lines.join('\n');
}

/**
 * Build design audit prompt for Willji agent.
 */
export function buildDesignAuditPrompt(context: DesignAuditContext): string {
  const slopList = AI_SLOP_BLACKLIST.map((s, i) => `${i + 1}. ${s.description}`).join('\n');
  const litmusList = LITMUS_CHECKS.map(c => `- ${c.question}`).join('\n');
  const rejectionList = HARD_REJECTIONS.map((r, i) => `${i + 1}. ${r}`).join('\n');

  return `# Design Audit

## Files to Audit
${(context.files || []).join('\n')}

## AI Slop Blacklist (flag ALL detected)
${slopList}

## Hard Rejection Criteria
${rejectionList}

## Litmus Checks (answer YES/NO)
${litmusList}

## Scoring
Rate each category 0-100:
- Visual Hierarchy (15%)
- Typography (15%)
- Spacing & Layout (15%)
- Color & Contrast (10%)
- Interaction States (10%)
- Responsive (10%)
- Content Quality (10%)
- AI Slop (5%)
- Motion (5%)
- Performance Feel (5%)

For each finding: severity (HIGH/MEDIUM/POLISH), file:line, description, fix suggestion.`;
}
