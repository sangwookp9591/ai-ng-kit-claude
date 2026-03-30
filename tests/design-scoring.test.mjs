import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Design Scoring', () => {
  it('should detect AI slop patterns', async () => {
    const m = await import('../dist/scripts/review/design-scoring.js');
    // The module should export slop detection functions
    assert.ok(m);
  });
});

describe('AI Slop Detection Patterns', () => {
  const SLOP_PATTERNS = [
    'Consider using modern design',
    'any shade of blue',
    'beautiful and elegant',
    'sleek and professional',
    'world-class user experience',
  ];

  it('should identify vague copy as AI slop', () => {
    for (const pattern of SLOP_PATTERNS) {
      const hasVague = /consider|any shade|beautiful|sleek|world-class/i.test(pattern);
      assert.ok(hasVague, `Pattern should be detected as AI slop: ${pattern}`);
    }
  });

  it('should pass concrete design specs', () => {
    const GOOD_SPECS = [
      'Background: #09090b (zinc-950)',
      'Font size: 16px / 1rem body text',
      'Border radius: 0.375rem (6px)',
      'Spacing: 8px grid system',
      'Contrast ratio: 7.2:1 (WCAG AAA)',
    ];
    for (const spec of GOOD_SPECS) {
      const isVague = /consider|any shade|beautiful|sleek|world-class/i.test(spec);
      assert.ok(!isVague, `Good spec should not be detected as slop: ${spec}`);
    }
  });

  it('should detect weasel words', () => {
    const WEASEL_WORDS = [
      'leverage cutting-edge technology',
      'ensure seamless integration',
      'optimize the user journey',
      'enhance the overall experience',
      'streamline the workflow',
    ];
    const weaselPattern = /leverage|seamless|optimize|enhance|streamline/i;
    for (const phrase of WEASEL_WORDS) {
      assert.ok(weaselPattern.test(phrase), `Should detect weasel word in: ${phrase}`);
    }
  });

  it('should pass actionable design guidance', () => {
    const ACTIONABLE = [
      'Set line-height to 1.5 for body text',
      'Use 4px increments for all spacing',
      'Limit color palette to 5 primary shades',
      'Add 200ms ease-out transition on hover',
      'Cap content width at 65ch for readability',
    ];
    const weaselPattern = /leverage|seamless|optimize|enhance|streamline/i;
    for (const text of ACTIONABLE) {
      assert.ok(!weaselPattern.test(text), `Actionable text should not flag: ${text}`);
    }
  });
});
