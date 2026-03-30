/**
 * aing Design Engine
 * Programmatic design system generation and management.
 * Works with Willji agent for AI-powered design decisions.
 * @module scripts/design/design-engine
 */

import { createLogger } from '../core/logger.js';

const log = createLogger('design-engine');

// ── Design Token Types ────────────────────────────────────────

export interface ColorToken {
  name: string;
  value: string;
  usage: string;
  contrast?: number;
}

export interface SpacingToken {
  name: string;
  value: string;
  px: number;
}

export interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing?: string;
}

export interface RadiusToken {
  name: string;
  value: string;
}

export interface DesignTokens {
  colors: ColorToken[];
  spacing: SpacingToken[];
  typography: TypographyToken[];
  radius: RadiusToken[];
  shadows?: string[];
}

// ── Design Brief ────────────────────────────────────────────

export interface DesignBrief {
  projectName: string;
  projectType: 'saas' | 'ecommerce' | 'dashboard' | 'landing' | 'mobile' | 'docs' | 'other';
  aesthetic: string;
  targetAudience: string;
  colorPreference?: string;
  darkMode: boolean;
  frameworks: string[];
}

// ── Design System ────────────────────────────────────────────

export interface DesignSystem {
  brief: DesignBrief;
  tokens: DesignTokens;
  components: ComponentSpec[];
  score: DesignScore;
  generatedAt: string;
}

export interface ComponentSpec {
  name: string;
  category: 'layout' | 'navigation' | 'input' | 'display' | 'feedback' | 'overlay';
  variants: string[];
  props: string[];
  accessibility: string[];
}

export interface DesignScore {
  overall: number;
  contrast: number;
  consistency: number;
  spacing: number;
  typography: number;
  accessibility: number;
  issues: DesignIssue[];
}

export interface DesignIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion: string;
}

// ── Default Token Presets ────────────────────────────────────

const SPACING_SCALE: SpacingToken[] = [
  { name: 'space-0', value: '0', px: 0 },
  { name: 'space-1', value: '0.25rem', px: 4 },
  { name: 'space-2', value: '0.5rem', px: 8 },
  { name: 'space-3', value: '0.75rem', px: 12 },
  { name: 'space-4', value: '1rem', px: 16 },
  { name: 'space-5', value: '1.25rem', px: 20 },
  { name: 'space-6', value: '1.5rem', px: 24 },
  { name: 'space-8', value: '2rem', px: 32 },
  { name: 'space-10', value: '2.5rem', px: 40 },
  { name: 'space-12', value: '3rem', px: 48 },
  { name: 'space-16', value: '4rem', px: 64 },
];

const RADIUS_SCALE: RadiusToken[] = [
  { name: 'radius-none', value: '0' },
  { name: 'radius-sm', value: '0.25rem' },
  { name: 'radius-md', value: '0.375rem' },
  { name: 'radius-lg', value: '0.5rem' },
  { name: 'radius-xl', value: '0.75rem' },
  { name: 'radius-2xl', value: '1rem' },
  { name: 'radius-full', value: '9999px' },
];

const DARK_PALETTE: ColorToken[] = [
  { name: 'background', value: '#09090b', usage: 'Page background' },
  { name: 'foreground', value: '#fafafa', usage: 'Primary text' },
  { name: 'card', value: '#18181b', usage: 'Card/surface background' },
  { name: 'card-foreground', value: '#fafafa', usage: 'Card text' },
  { name: 'muted', value: '#27272a', usage: 'Muted background' },
  { name: 'muted-foreground', value: '#a1a1aa', usage: 'Muted text' },
  { name: 'border', value: '#27272a', usage: 'Borders and dividers' },
  { name: 'input', value: '#27272a', usage: 'Input background' },
  { name: 'primary', value: '#fafafa', usage: 'Primary actions' },
  { name: 'primary-foreground', value: '#18181b', usage: 'Primary action text' },
  { name: 'secondary', value: '#27272a', usage: 'Secondary actions' },
  { name: 'secondary-foreground', value: '#fafafa', usage: 'Secondary action text' },
  { name: 'accent', value: '#27272a', usage: 'Accent elements' },
  { name: 'accent-foreground', value: '#fafafa', usage: 'Accent text' },
  { name: 'destructive', value: '#7f1d1d', usage: 'Destructive actions' },
  { name: 'destructive-foreground', value: '#fafafa', usage: 'Destructive text' },
  { name: 'ring', value: '#d4d4d8', usage: 'Focus ring' },
];

const LIGHT_PALETTE: ColorToken[] = [
  { name: 'background', value: '#ffffff', usage: 'Page background' },
  { name: 'foreground', value: '#09090b', usage: 'Primary text' },
  { name: 'card', value: '#ffffff', usage: 'Card/surface background' },
  { name: 'card-foreground', value: '#09090b', usage: 'Card text' },
  { name: 'muted', value: '#f4f4f5', usage: 'Muted background' },
  { name: 'muted-foreground', value: '#71717a', usage: 'Muted text' },
  { name: 'border', value: '#e4e4e7', usage: 'Borders and dividers' },
  { name: 'input', value: '#e4e4e7', usage: 'Input background' },
  { name: 'primary', value: '#18181b', usage: 'Primary actions' },
  { name: 'primary-foreground', value: '#fafafa', usage: 'Primary action text' },
  { name: 'secondary', value: '#f4f4f5', usage: 'Secondary actions' },
  { name: 'secondary-foreground', value: '#18181b', usage: 'Secondary action text' },
  { name: 'accent', value: '#f4f4f5', usage: 'Accent elements' },
  { name: 'accent-foreground', value: '#18181b', usage: 'Accent text' },
  { name: 'destructive', value: '#ef4444', usage: 'Destructive actions' },
  { name: 'destructive-foreground', value: '#fafafa', usage: 'Destructive text' },
  { name: 'ring', value: '#18181b', usage: 'Focus ring' },
];

const DEFAULT_TYPOGRAPHY: TypographyToken[] = [
  { name: 'heading-1', fontFamily: 'Geist Sans', fontSize: '2.25rem', fontWeight: 700, lineHeight: '2.5rem', letterSpacing: '-0.02em' },
  { name: 'heading-2', fontFamily: 'Geist Sans', fontSize: '1.875rem', fontWeight: 600, lineHeight: '2.25rem', letterSpacing: '-0.01em' },
  { name: 'heading-3', fontFamily: 'Geist Sans', fontSize: '1.5rem', fontWeight: 600, lineHeight: '2rem' },
  { name: 'heading-4', fontFamily: 'Geist Sans', fontSize: '1.25rem', fontWeight: 600, lineHeight: '1.75rem' },
  { name: 'body-lg', fontFamily: 'Geist Sans', fontSize: '1.125rem', fontWeight: 400, lineHeight: '1.75rem' },
  { name: 'body', fontFamily: 'Geist Sans', fontSize: '1rem', fontWeight: 400, lineHeight: '1.5rem' },
  { name: 'body-sm', fontFamily: 'Geist Sans', fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.25rem' },
  { name: 'caption', fontFamily: 'Geist Sans', fontSize: '0.75rem', fontWeight: 400, lineHeight: '1rem' },
  { name: 'code', fontFamily: 'Geist Mono', fontSize: '0.875rem', fontWeight: 400, lineHeight: '1.5rem' },
  { name: 'code-sm', fontFamily: 'Geist Mono', fontSize: '0.75rem', fontWeight: 400, lineHeight: '1.25rem' },
];

// ── Core Functions ────────────────────────────────────────────

/**
 * Generate design tokens from a brief.
 */
export function generateTokens(brief: DesignBrief): DesignTokens {
  log.info(`Generating tokens for ${brief.projectName} (${brief.projectType})`);

  const colors = brief.darkMode ? [...DARK_PALETTE] : [...LIGHT_PALETTE];

  return {
    colors,
    spacing: [...SPACING_SCALE],
    typography: [...DEFAULT_TYPOGRAPHY],
    radius: [...RADIUS_SCALE],
    shadows: [
      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    ],
  };
}

/**
 * Generate component inventory based on project type.
 */
export function generateComponents(brief: DesignBrief): ComponentSpec[] {
  const base: ComponentSpec[] = [
    { name: 'Button', category: 'input', variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'], props: ['variant', 'size', 'disabled', 'loading'], accessibility: ['role=button', 'aria-disabled', 'keyboard-Enter/Space'] },
    { name: 'Input', category: 'input', variants: ['default', 'error', 'disabled'], props: ['type', 'placeholder', 'error', 'disabled'], accessibility: ['aria-label', 'aria-describedby', 'aria-invalid'] },
    { name: 'Card', category: 'display', variants: ['default', 'interactive', 'outlined'], props: ['padding', 'shadow', 'hoverable'], accessibility: ['role=region', 'aria-labelledby'] },
    { name: 'Badge', category: 'display', variants: ['default', 'secondary', 'destructive', 'outline'], props: ['variant'], accessibility: ['role=status'] },
    { name: 'Dialog', category: 'overlay', variants: ['default', 'alert', 'sheet'], props: ['open', 'onClose', 'title'], accessibility: ['role=dialog', 'aria-modal', 'focus-trap', 'Escape-close'] },
    { name: 'Toast', category: 'feedback', variants: ['default', 'success', 'error', 'warning'], props: ['title', 'description', 'duration', 'action'], accessibility: ['role=alert', 'aria-live=polite'] },
    { name: 'Avatar', category: 'display', variants: ['image', 'fallback', 'initials'], props: ['src', 'alt', 'fallback', 'size'], accessibility: ['alt-text', 'role=img'] },
    { name: 'Separator', category: 'layout', variants: ['horizontal', 'vertical'], props: ['orientation', 'decorative'], accessibility: ['role=separator', 'aria-orientation'] },
  ];

  // Add type-specific components
  const typeComponents: Record<string, ComponentSpec[]> = {
    dashboard: [
      { name: 'DataTable', category: 'display', variants: ['default', 'sortable', 'filterable', 'paginated'], props: ['columns', 'data', 'sorting', 'filtering', 'pagination'], accessibility: ['role=table', 'aria-sort', 'aria-rowcount'] },
      { name: 'Stat', category: 'display', variants: ['default', 'trend-up', 'trend-down'], props: ['label', 'value', 'trend', 'icon'], accessibility: ['aria-label'] },
      { name: 'Chart', category: 'display', variants: ['line', 'bar', 'pie', 'area'], props: ['data', 'type', 'title'], accessibility: ['aria-label', 'aria-describedby'] },
      { name: 'Sidebar', category: 'navigation', variants: ['expanded', 'collapsed', 'mobile'], props: ['items', 'collapsed', 'onToggle'], accessibility: ['role=navigation', 'aria-label'] },
    ],
    saas: [
      { name: 'PricingCard', category: 'display', variants: ['basic', 'popular', 'enterprise'], props: ['plan', 'price', 'features', 'cta'], accessibility: ['aria-label'] },
      { name: 'FeatureGrid', category: 'layout', variants: ['2-col', '3-col', '4-col'], props: ['features', 'columns'], accessibility: ['role=list'] },
      { name: 'Navbar', category: 'navigation', variants: ['default', 'sticky', 'transparent'], props: ['logo', 'links', 'actions'], accessibility: ['role=navigation', 'aria-label=Main'] },
    ],
    ecommerce: [
      { name: 'ProductCard', category: 'display', variants: ['grid', 'list', 'minimal'], props: ['image', 'title', 'price', 'rating'], accessibility: ['aria-label'] },
      { name: 'CartItem', category: 'display', variants: ['default', 'compact'], props: ['product', 'quantity', 'onRemove'], accessibility: ['role=listitem'] },
    ],
    landing: [
      { name: 'Hero', category: 'layout', variants: ['centered', 'split', 'gradient'], props: ['headline', 'subheadline', 'cta', 'image'], accessibility: ['role=banner'] },
      { name: 'Testimonial', category: 'display', variants: ['card', 'inline', 'carousel'], props: ['quote', 'author', 'role', 'avatar'], accessibility: ['role=figure', 'aria-label'] },
    ],
  };

  const extra = typeComponents[brief.projectType] ?? [];
  return [...base, ...extra];
}

/**
 * Score a design system for quality issues.
 */
export function scoreDesign(tokens: DesignTokens): DesignScore {
  const issues: DesignIssue[] = [];
  let contrastScore = 10;
  let consistencyScore = 10;
  let spacingScore = 10;
  let typographyScore = 10;
  let accessibilityScore = 10;

  // Check color contrast (simplified)
  const bg = tokens.colors.find(c => c.name === 'background');
  const fg = tokens.colors.find(c => c.name === 'foreground');
  if (!bg || !fg) {
    issues.push({ severity: 'critical', category: 'color', message: 'Missing background or foreground color', suggestion: 'Add background and foreground color tokens' });
    contrastScore -= 3;
  }

  // Check spacing scale consistency
  const spacingValues = tokens.spacing.map(s => s.px);
  for (let i = 1; i < spacingValues.length; i++) {
    const ratio = spacingValues[i] / spacingValues[Math.max(0, i - 1)];
    if (ratio > 3 && spacingValues[i - 1] > 0) {
      issues.push({ severity: 'warning', category: 'spacing', message: `Large gap in spacing scale: ${tokens.spacing[i - 1].name} → ${tokens.spacing[i].name}`, suggestion: 'Add intermediate spacing value' });
      spacingScore -= 1;
    }
  }

  // Check typography
  const fontFamilies = new Set(tokens.typography.map(t => t.fontFamily));
  if (fontFamilies.size > 3) {
    issues.push({ severity: 'warning', category: 'typography', message: `Too many font families: ${fontFamilies.size}`, suggestion: 'Limit to 2-3 font families (sans, serif, mono)' });
    typographyScore -= 2;
  }

  // Check font sizes
  const fontSizes = tokens.typography.map(t => parseFloat(t.fontSize));
  const minSize = Math.min(...fontSizes);
  if (minSize < 0.75) {
    issues.push({ severity: 'warning', category: 'accessibility', message: `Font size too small: ${minSize}rem`, suggestion: 'Minimum readable size is 0.75rem (12px)' });
    accessibilityScore -= 2;
  }

  // Check minimum color tokens
  if (tokens.colors.length < 8) {
    issues.push({ severity: 'warning', category: 'color', message: 'Insufficient color tokens', suggestion: 'Include at least: background, foreground, primary, secondary, muted, accent, destructive, border' });
    consistencyScore -= 2;
  }

  const overall = Math.round((contrastScore + consistencyScore + spacingScore + typographyScore + accessibilityScore) / 5 * 10) / 10;

  return { overall, contrast: contrastScore, consistency: consistencyScore, spacing: spacingScore, typography: typographyScore, accessibility: accessibilityScore, issues };
}

/**
 * Generate a complete design system from a brief.
 */
export function generateDesignSystem(brief: DesignBrief): DesignSystem {
  log.info(`Generating design system for ${brief.projectName}`);

  const tokens = generateTokens(brief);
  const components = generateComponents(brief);
  const score = scoreDesign(tokens);

  return {
    brief,
    tokens,
    components,
    score,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Export design tokens as CSS custom properties.
 */
export function exportAsCSS(tokens: DesignTokens, darkMode: boolean = true): string {
  const lines: string[] = [];
  const selector = darkMode ? ':root.dark' : ':root';

  lines.push(`${selector} {`);

  // Colors
  for (const color of tokens.colors) {
    lines.push(`  --${color.name}: ${color.value};`);
  }

  lines.push('');

  // Spacing
  for (const sp of tokens.spacing) {
    lines.push(`  --${sp.name}: ${sp.value};`);
  }

  lines.push('');

  // Radius
  for (const r of tokens.radius) {
    lines.push(`  --${r.name}: ${r.value};`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Export design tokens as Tailwind config partial.
 */
export function exportAsTailwind(tokens: DesignTokens): string {
  const colors: Record<string, string> = {};
  for (const c of tokens.colors) {
    colors[c.name] = `var(--${c.name})`;
  }

  const config = {
    theme: {
      extend: {
        colors,
        borderRadius: Object.fromEntries(tokens.radius.map(r => [r.name.replace('radius-', ''), r.value])),
        fontFamily: {
          sans: ['Geist Sans', 'system-ui', 'sans-serif'],
          mono: ['Geist Mono', 'monospace'],
        },
      },
    },
  };

  return `// Generated by aing Design Engine\nmodule.exports = ${JSON.stringify(config, null, 2)}`;
}
