import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BRIEF = {
  projectName: 'TestApp',
  projectType: 'dashboard',
  aesthetic: 'minimal',
  targetAudience: 'developers',
  darkMode: true,
  frameworks: ['react', 'tailwind'],
};

describe('Design Iterate', () => {
  it('should apply color feedback', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { iterateDesign } = await import('../dist/scripts/design/design-iterate.js');
    const system = generateDesignSystem(BRIEF);
    const result = iterateDesign(system, [
      { type: 'color', action: 'adjust', target: 'primary', value: '#3b82f6', reason: 'Use blue primary' },
    ], 1);
    assert.ok(result.changes.length >= 1);
    assert.equal(result.iteration, 1);
    const primary = result.system.tokens.colors.find(c => c.name === 'primary');
    assert.equal(primary?.value, '#3b82f6');
  });

  it('should add new color tokens', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { iterateDesign } = await import('../dist/scripts/design/design-iterate.js');
    const system = generateDesignSystem(BRIEF);
    const result = iterateDesign(system, [
      { type: 'color', action: 'add', target: 'success', value: '#22c55e', reason: 'Add success color' },
    ]);
    const success = result.system.tokens.colors.find(c => c.name === 'success');
    assert.ok(success);
    assert.equal(success.value, '#22c55e');
  });

  it('should auto-fix design issues', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { autoFixDesign } = await import('../dist/scripts/design/design-iterate.js');
    const system = generateDesignSystem(BRIEF);
    const result = autoFixDesign(system);
    assert.ok(result.newScore >= result.previousScore);
  });

  it('should format iteration report', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { iterateDesign, formatIteration } = await import('../dist/scripts/design/design-iterate.js');
    const system = generateDesignSystem(BRIEF);
    const result = iterateDesign(system, [
      { type: 'color', action: 'adjust', target: 'primary', value: '#f00', reason: 'test' },
    ]);
    const md = formatIteration(result);
    assert.ok(md.includes('Iteration'));
    assert.ok(md.includes('Score'));
  });
});

describe('Design Gallery', () => {
  it('should create gallery from variants', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { createGallery } = await import('../dist/scripts/design/design-gallery.js');
    const dark = generateDesignSystem({ ...BRIEF, darkMode: true });
    const light = generateDesignSystem({ ...BRIEF, darkMode: false });
    const gallery = createGallery([
      { name: 'Dark', system: dark },
      { name: 'Light', system: light },
    ]);
    assert.equal(gallery.entries.length, 2);
  });

  it('should add entries to gallery', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { createGallery, addToGallery } = await import('../dist/scripts/design/design-gallery.js');
    const sys = generateDesignSystem(BRIEF);
    let gallery = createGallery([{ name: 'V1', system: sys }]);
    gallery = addToGallery(gallery, 'V2', generateDesignSystem({ ...BRIEF, projectType: 'saas' }));
    assert.equal(gallery.entries.length, 2);
  });

  it('should filter by tags', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { createGallery, filterGallery } = await import('../dist/scripts/design/design-gallery.js');
    const gallery = createGallery([
      { name: 'A', system: generateDesignSystem(BRIEF), tags: ['dark', 'dashboard'] },
      { name: 'B', system: generateDesignSystem({ ...BRIEF, darkMode: false }), tags: ['light', 'dashboard'] },
    ]);
    const dark = filterGallery(gallery, ['dark']);
    assert.equal(dark.length, 1);
    assert.equal(dark[0].name, 'A');
  });

  it('should format gallery as markdown', async () => {
    const { generateDesignSystem } = await import('../dist/scripts/design/design-engine.js');
    const { createGallery, formatGallery } = await import('../dist/scripts/design/design-gallery.js');
    const gallery = createGallery([
      { name: 'Test', system: generateDesignSystem(BRIEF) },
    ]);
    const md = formatGallery(gallery);
    assert.ok(md.includes('Design Gallery'));
    assert.ok(md.includes('Test'));
  });

  it('should generate palette HTML preview', async () => {
    const { generateTokens } = await import('../dist/scripts/design/design-engine.js');
    const { generatePalettePreview } = await import('../dist/scripts/design/design-gallery.js');
    const tokens = generateTokens(BRIEF);
    const html = generatePalettePreview(tokens);
    assert.ok(html.includes('<div'));
    assert.ok(html.includes('background'));
  });
});

describe('Design Evolve', () => {
  it('should run evolution with default config', async () => {
    const { evolveDesign } = await import('../dist/scripts/design/design-evolve.js');
    const result = evolveDesign(BRIEF);
    assert.ok(result.best);
    assert.ok(result.generations.length > 0);
    assert.ok(result.totalVariants > 0);
    assert.ok(result.best.score.overall > 0);
  });

  it('should respect custom config', async () => {
    const { evolveDesign } = await import('../dist/scripts/design/design-evolve.js');
    const result = evolveDesign(BRIEF, { populationSize: 3, generations: 2 });
    assert.equal(result.generations.length, 2);
  });

  it('should format evolution report', async () => {
    const { evolveDesign, formatEvolution } = await import('../dist/scripts/design/design-evolve.js');
    const result = evolveDesign(BRIEF, { populationSize: 3, generations: 2 });
    const md = formatEvolution(result);
    assert.ok(md.includes('Evolution Report'));
    assert.ok(md.includes('Gen'));
  });
});
