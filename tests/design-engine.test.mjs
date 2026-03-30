import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Design Engine', () => {
  it('should generate tokens from brief', async () => {
    const { generateTokens } = await import('../dist/scripts/design/design-engine.js');
    const tokens = generateTokens({
      projectName: 'TestApp',
      projectType: 'dashboard',
      aesthetic: 'minimal',
      targetAudience: 'developers',
      darkMode: true,
      frameworks: ['react'],
    });
    assert.ok(tokens.colors.length >= 8);
    assert.ok(tokens.spacing.length >= 8);
    assert.ok(tokens.typography.length >= 5);
    assert.ok(tokens.radius.length >= 4);
  });

  it('should generate light palette when darkMode is false', async () => {
    const { generateTokens } = await import('../dist/scripts/design/design-engine.js');
    const tokens = generateTokens({
      projectName: 'LightApp',
      projectType: 'landing',
      aesthetic: 'clean',
      targetAudience: 'general',
      darkMode: false,
      frameworks: ['react'],
    });
    const bg = tokens.colors.find(c => c.name === 'background');
    assert.ok(bg);
    assert.equal(bg.value, '#ffffff');
  });

  it('should generate components based on project type', async () => {
    const { generateComponents } = await import('../dist/scripts/design/design-engine.js');
    const brief = { projectName: 'Test', projectType: 'dashboard', aesthetic: '', targetAudience: '', darkMode: true, frameworks: [] };
    const components = generateComponents(brief);
    assert.ok(components.length >= 8, `Expected at least 8 components, got ${components.length}`);
    const names = components.map(c => c.name);
    assert.ok(names.includes('Button'));
    assert.ok(names.includes('DataTable'));
    assert.ok(names.includes('Sidebar'));
  });

  it('should score design tokens', async () => {
    const { generateTokens, scoreDesign } = await import('../dist/scripts/design/design-engine.js');
    const tokens = generateTokens({
      projectName: 'Test',
      projectType: 'saas',
      aesthetic: '',
      targetAudience: '',
      darkMode: true,
      frameworks: [],
    });
    const score = scoreDesign(tokens);
    assert.ok(score.overall >= 0 && score.overall <= 10);
    assert.ok(score.contrast >= 0);
    assert.ok(score.consistency >= 0);
    assert.ok(Array.isArray(score.issues));
  });

  it('should generate complete design system', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const system = generateDesignSystem({
      projectName: 'FullTest',
      projectType: 'ecommerce',
      aesthetic: 'modern',
      targetAudience: 'shoppers',
      darkMode: true,
      frameworks: ['nextjs', 'tailwind'],
    });
    assert.ok(system.brief.projectName === 'FullTest');
    assert.ok(system.tokens.colors.length > 0);
    assert.ok(system.components.length > 0);
    assert.ok(system.score.overall > 0);
    assert.ok(system.generatedAt);
  });

  it('should export CSS custom properties', async () => {
    const { generateTokens, exportAsCSS } = await import('../dist/scripts/design/design-engine.js');
    const tokens = generateTokens({
      projectName: 'CSS',
      projectType: 'saas',
      aesthetic: '',
      targetAudience: '',
      darkMode: true,
      frameworks: [],
    });
    const css = exportAsCSS(tokens, true);
    assert.ok(css.includes(':root.dark'));
    assert.ok(css.includes('--background:'));
    assert.ok(css.includes('--space-'));
    assert.ok(css.includes('--radius-'));
  });

  it('should export Tailwind config', async () => {
    const { generateTokens, exportAsTailwind } = await import('../dist/scripts/design/design-engine.js');
    const tokens = generateTokens({
      projectName: 'TW',
      projectType: 'dashboard',
      aesthetic: '',
      targetAudience: '',
      darkMode: true,
      frameworks: [],
    });
    const tw = exportAsTailwind(tokens);
    assert.ok(tw.includes('module.exports'));
    assert.ok(tw.includes('Geist Sans'));
    assert.ok(tw.includes('colors'));
  });
});

describe('Design Compare', () => {
  it('should compare multiple variants', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { compareDesigns } = await import('../dist/scripts/design/design-compare.js');

    const dark = generateDesignSystem({ projectName: 'Dark', projectType: 'dashboard', aesthetic: 'dark', targetAudience: 'devs', darkMode: true, frameworks: [] });
    const light = generateDesignSystem({ projectName: 'Light', projectType: 'dashboard', aesthetic: 'light', targetAudience: 'devs', darkMode: false, frameworks: [] });

    const result = compareDesigns([
      { name: 'Dark', system: dark },
      { name: 'Light', system: light },
    ]);

    assert.ok(result.winner);
    assert.equal(result.variants.length, 2);
    assert.equal(result.variants[0].rank, 1);
    assert.ok(result.reasoning.length > 0);
  });

  it('should format comparison as markdown', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { compareDesigns, formatComparison } = await import('../dist/scripts/design/design-compare.js');

    const sys = generateDesignSystem({ projectName: 'A', projectType: 'saas', aesthetic: '', targetAudience: '', darkMode: true, frameworks: [] });
    const result = compareDesigns([{ name: 'A', system: sys }]);
    const md = formatComparison(result);
    assert.ok(md.includes('Design Comparison'));
    assert.ok(md.includes('Winner'));
  });
});
