/**
 * Eval Engine Tests
 *
 * Tests for:
 * - Static validator with mock SKILL.md content
 * - Eval result formatting
 * - Regression detection logic
 * - Heuristic scoring
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// Inline implementations for testing without TS compilation
// (Mirrors the logic in scripts/eval/ so tests can run standalone via node)
// ---------------------------------------------------------------------------

/** Parse YAML-like frontmatter from SKILL.md */
function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: null, body: content };
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return { frontmatter: null, body: content };

  const raw = content.slice(3, endIndex).trim();
  const body = content.slice(endIndex + 3).trim();
  const fm = {};

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      try { fm[key] = JSON.parse(value); } catch { fm[key] = value; }
    } else {
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      fm[key] = value;
    }
  }
  return { frontmatter: fm, body };
}

/** Validate SKILL.md content (subset of static-validator) */
function validateSkillContent(content, agentNames = []) {
  const findings = [];
  const { frontmatter: fm, body } = parseFrontmatter(content);

  // Frontmatter checks
  if (!fm) {
    findings.push({ rule: 'frontmatter-missing', message: 'SKILL.md must start with YAML frontmatter (---)', severity: 'error' });
  } else {
    if (!fm.name || String(fm.name).trim().length === 0) {
      findings.push({ rule: 'frontmatter-name', message: 'Frontmatter must include a non-empty "name" field', severity: 'error' });
    }
    if (!fm.description || String(fm.description).trim().length === 0) {
      findings.push({ rule: 'frontmatter-description', message: 'Frontmatter must include a non-empty "description" field', severity: 'error' });
    }
    if (!fm.triggers) {
      findings.push({ rule: 'frontmatter-triggers', message: 'Frontmatter should include "triggers"', severity: 'warning' });
    }
  }

  // Placeholder check
  const placeholderPattern = /\{\{[A-Z_]+\}\}/g;
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(placeholderPattern);
    if (matches) {
      for (const match of matches) {
        findings.push({ rule: 'unresolved-placeholder', message: `Unresolved placeholder: ${match}`, severity: 'error', line: i + 1 });
      }
    }
  }

  // Phase completeness
  const phasePattern = /^##\s+(Phase|Step)\s+\d+/i;
  let currentPhase = null;
  let currentPhaseStart = 0;
  let phaseContentLines = 0;
  const bodyLines = body.split('\n');

  for (let i = 0; i < bodyLines.length; i++) {
    if (phasePattern.test(bodyLines[i])) {
      if (currentPhase && phaseContentLines < 2) {
        findings.push({ rule: 'empty-phase', message: `Phase "${currentPhase}" has no substantive content`, severity: 'error', line: currentPhaseStart + 1 });
      }
      currentPhase = bodyLines[i].replace(/^#+\s*/, '').trim();
      currentPhaseStart = i;
      phaseContentLines = 0;
    } else if (currentPhase && bodyLines[i].trim().length > 0) {
      phaseContentLines++;
    }
  }
  if (currentPhase && phaseContentLines < 2) {
    findings.push({ rule: 'empty-phase', message: `Phase "${currentPhase}" has no substantive content`, severity: 'error', line: currentPhaseStart + 1 });
  }

  // Content quality
  const contentLines = lines.filter(l => l.trim().length > 0 && !l.startsWith('---'));
  if (contentLines.length < 5) {
    findings.push({ rule: 'content-too-short', message: `Skill has only ${contentLines.length} non-empty lines`, severity: 'error' });
  }

  return findings;
}

/** Compute heuristic scores */
function computeHeuristicScore(content) {
  const lines = content.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0).length;
  const headings = lines.filter(l => /^##\s/.test(l)).length;
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  const hasSteps = /^\d+\.\s/m.test(content) || /^-\s\[/m.test(content);
  const hasFrontmatter = content.startsWith('---');
  const toolRefs = (content.match(/\b(Read|Write|Edit|Bash|Glob|Grep|TaskCreate|TeamCreate)\b/g) || []).length;

  const clarity = Math.min(5, 1 + (hasFrontmatter ? 1 : 0) + Math.min(2, headings) + (nonEmpty > 20 ? 1 : 0));
  const completeness = Math.min(5, 1 + Math.min(2, Math.floor(nonEmpty / 15)) + Math.min(1, headings) + (hasSteps ? 1 : 0));
  const actionability = Math.min(5, 1 + Math.min(2, Math.floor(codeBlocks)) + (hasSteps ? 1 : 0) + (toolRefs > 0 ? 1 : 0));
  const accuracy = hasFrontmatter && nonEmpty > 10 ? 3 : 2;
  const coherence = Math.min(5, 1 + Math.min(2, headings) + (nonEmpty > 10 && nonEmpty < 500 ? 1 : 0) + (hasFrontmatter ? 1 : 0));

  return { clarity, completeness, actionability, accuracy, coherence };
}

/** Detect regressions by comparing current scores to baseline */
function detectRegressions(currentScores, baselineScores) {
  const alerts = [];
  for (const [criterion, current] of Object.entries(currentScores)) {
    const previous = baselineScores[criterion];
    if (previous !== undefined && current < previous) {
      const delta = current - previous;
      if (delta <= -2) {
        alerts.push({ criterion, previousScore: previous, currentScore: current, delta });
      }
    }
  }
  return alerts;
}

/** Format eval results as markdown table */
function formatResultsTable(results) {
  const header = '| Skill | Tier | Score | Max | Pass | Findings | Duration | Cost |';
  const sep = '|-------|------|-------|-----|------|----------|----------|------|';
  const rows = results.map(r => {
    const passIcon = r.passed ? 'PASS' : 'FAIL';
    const errorCount = r.findings.filter(f => f.severity === 'error').length;
    const warnCount = r.findings.filter(f => f.severity === 'warning').length;
    const findingsSummary = `${errorCount}E ${warnCount}W`;
    const duration = r.duration_ms < 1000 ? `${r.duration_ms}ms` : `${(r.duration_ms / 1000).toFixed(1)}s`;
    const cost = r.cost_estimate > 0 ? `$${r.cost_estimate.toFixed(2)}` : 'free';
    return `| ${r.skill} | ${r.tier} | ${r.score} | ${r.maxScore} | ${passIcon} | ${findingsSummary} | ${duration} | ${cost} |`;
  });
  return [header, sep, ...rows].join('\n');
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Static Validator', () => {
  const VALID_SKILL = `---
name: test-skill
description: "A test skill for validation"
triggers: ["test", "validate"]
---

# /aing test-skill

Run this skill to validate things.

## Step 1: Setup

1. Check environment
2. Load configuration
3. Initialize state

## Step 2: Execute

- Run the main logic
- Verify outputs
- Report results
`;

  it('should pass a valid SKILL.md', () => {
    const findings = validateSkillContent(VALID_SKILL);
    const errors = findings.filter(f => f.severity === 'error');
    assert.equal(errors.length, 0, `Unexpected errors: ${errors.map(e => e.message).join(', ')}`);
  });

  it('should detect missing frontmatter', () => {
    const content = '# Just a heading\n\nSome content here.\nMore content.\nLine 4.\nLine 5.\nLine 6.';
    const findings = validateSkillContent(content);
    assert.ok(findings.some(f => f.rule === 'frontmatter-missing'), 'Should flag missing frontmatter');
  });

  it('should detect missing name field', () => {
    const content = `---
description: "test"
---

# Heading

Content line 1
Content line 2
Content line 3
Content line 4
Content line 5
`;
    const findings = validateSkillContent(content);
    assert.ok(findings.some(f => f.rule === 'frontmatter-name'), 'Should flag missing name');
  });

  it('should detect missing description field', () => {
    const content = `---
name: test
---

# Heading

Content line 1
Content line 2
Content line 3
Content line 4
Content line 5
`;
    const findings = validateSkillContent(content);
    assert.ok(findings.some(f => f.rule === 'frontmatter-description'), 'Should flag missing description');
  });

  it('should detect unresolved placeholders', () => {
    const content = `---
name: test
description: "test"
triggers: ["test"]
---

# Heading

Use {{UNRESOLVED}} here and {{ANOTHER_ONE}} there.
Content line 2
Content line 3
Content line 4
Content line 5
`;
    const findings = validateSkillContent(content);
    const placeholders = findings.filter(f => f.rule === 'unresolved-placeholder');
    assert.equal(placeholders.length, 2, 'Should find 2 placeholders');
    assert.ok(placeholders[0].message.includes('UNRESOLVED'));
    assert.ok(placeholders[1].message.includes('ANOTHER_ONE'));
  });

  it('should detect empty phases', () => {
    const content = `---
name: test
description: "test"
triggers: ["test"]
---

# Heading

Some intro text here with enough lines.
More content for validation.

## Phase 1: Setup

Set up the environment.
Configure things properly.

## Phase 2: Empty Phase

## Phase 3: Done

Finish everything up.
Clean up resources.
`;
    const findings = validateSkillContent(content);
    const emptyPhases = findings.filter(f => f.rule === 'empty-phase');
    assert.equal(emptyPhases.length, 1, 'Should find 1 empty phase');
    assert.ok(emptyPhases[0].message.includes('Phase 2'), 'Should be Phase 2');
  });

  it('should detect too-short content', () => {
    const content = `---
name: x
description: "x"
---
# H
`;
    const findings = validateSkillContent(content);
    assert.ok(findings.some(f => f.rule === 'content-too-short'), 'Should flag short content');
  });

  it('should warn about missing triggers', () => {
    const content = `---
name: test
description: "test"
---

# Heading

Content line 1
Content line 2
Content line 3
Content line 4
Content line 5
`;
    const findings = validateSkillContent(content);
    assert.ok(findings.some(f => f.rule === 'frontmatter-triggers' && f.severity === 'warning'), 'Should warn about missing triggers');
  });
});

describe('Eval Result Formatting', () => {
  it('should format results as a markdown table', () => {
    const results = [
      {
        tier: 'STATIC',
        skill: 'auto',
        score: 95,
        maxScore: 100,
        passed: true,
        findings: [{ rule: 'ai-slop', message: 'test', severity: 'info' }],
        duration_ms: 12,
        cost_estimate: 0,
      },
      {
        tier: 'LLM_JUDGE',
        skill: 'debug',
        score: 10,
        maxScore: 25,
        passed: false,
        findings: [
          { rule: 'low-clarity', message: 'test', severity: 'error' },
          { rule: 'mid-accuracy', message: 'test', severity: 'warning' },
        ],
        duration_ms: 3200,
        cost_estimate: 0.15,
      },
    ];

    const table = formatResultsTable(results);

    // Verify table structure
    assert.ok(table.includes('| Skill |'), 'Should have header');
    assert.ok(table.includes('|----'), 'Should have separator');
    assert.ok(table.includes('| auto |'), 'Should have auto row');
    assert.ok(table.includes('PASS'), 'Should show PASS');
    assert.ok(table.includes('FAIL'), 'Should show FAIL');
    assert.ok(table.includes('free'), 'Should show free for zero cost');
    assert.ok(table.includes('$0.15'), 'Should show cost');
    assert.ok(table.includes('12ms'), 'Should show ms duration');
    assert.ok(table.includes('3.2s'), 'Should show seconds duration');
  });

  it('should count errors and warnings correctly', () => {
    const results = [
      {
        tier: 'STATIC',
        skill: 'test',
        score: 60,
        maxScore: 100,
        passed: false,
        findings: [
          { rule: 'a', message: 'a', severity: 'error' },
          { rule: 'b', message: 'b', severity: 'error' },
          { rule: 'c', message: 'c', severity: 'warning' },
          { rule: 'd', message: 'd', severity: 'info' },
        ],
        duration_ms: 5,
        cost_estimate: 0,
      },
    ];

    const table = formatResultsTable(results);
    assert.ok(table.includes('2E 1W'), 'Should show 2 errors and 1 warning');
  });
});

describe('Regression Detection', () => {
  it('should detect significant regressions (delta <= -2)', () => {
    const current = { clarity: 2, completeness: 4, actionability: 5, accuracy: 3, coherence: 4 };
    const baseline = { clarity: 5, completeness: 4, actionability: 5, accuracy: 3, coherence: 4 };

    const alerts = detectRegressions(current, baseline);
    assert.equal(alerts.length, 1, 'Should detect 1 regression');
    assert.equal(alerts[0].criterion, 'clarity');
    assert.equal(alerts[0].previousScore, 5);
    assert.equal(alerts[0].currentScore, 2);
    assert.equal(alerts[0].delta, -3);
  });

  it('should ignore minor drops (delta > -2)', () => {
    const current = { clarity: 4, completeness: 3 };
    const baseline = { clarity: 5, completeness: 4 };

    const alerts = detectRegressions(current, baseline);
    assert.equal(alerts.length, 0, 'Should not flag drops of only 1');
  });

  it('should handle improvements gracefully', () => {
    const current = { clarity: 5, completeness: 5 };
    const baseline = { clarity: 3, completeness: 2 };

    const alerts = detectRegressions(current, baseline);
    assert.equal(alerts.length, 0, 'No regressions when scores improve');
  });

  it('should handle missing baseline criteria', () => {
    const current = { clarity: 3, completeness: 4, newCriterion: 5 };
    const baseline = { clarity: 5 };

    const alerts = detectRegressions(current, baseline);
    assert.equal(alerts.length, 1, 'Should only compare matching criteria');
    assert.equal(alerts[0].criterion, 'clarity');
  });

  it('should handle empty baseline', () => {
    const current = { clarity: 3, completeness: 4 };
    const baseline = {};

    const alerts = detectRegressions(current, baseline);
    assert.equal(alerts.length, 0, 'No regressions with empty baseline');
  });
});

describe('Heuristic Scoring', () => {
  it('should score a well-structured skill higher', () => {
    const goodSkill = `---
name: good-skill
description: "A well-structured skill"
triggers: ["good"]
---

# /aing good-skill

Run this skill for good results.

## Step 1: Setup

1. Check environment
2. Load configuration

## Step 2: Execute

Use the Bash tool to run commands.
Use Read to inspect files.

\`\`\`bash
echo "hello"
\`\`\`

## Step 3: Verify

- Check results
- Report status
`;

    const badSkill = `No frontmatter here.

Just a paragraph.
`;

    const goodScores = computeHeuristicScore(goodSkill);
    const badScores = computeHeuristicScore(badSkill);

    const goodTotal = Object.values(goodScores).reduce((a, b) => a + b, 0);
    const badTotal = Object.values(badScores).reduce((a, b) => a + b, 0);

    assert.ok(goodTotal > badTotal, `Good skill (${goodTotal}) should score higher than bad (${badTotal})`);
  });

  it('should give maximum 5 per criterion', () => {
    const longContent = `---
name: long
description: "Long skill"
---

# Long Skill

${'Line of content.\n'.repeat(100)}

## Section 1

${'- Step item\n'.repeat(20)}

## Section 2

\`\`\`
code block
\`\`\`

## Section 3

More text with Bash and Read tool references.
`;

    const scores = computeHeuristicScore(longContent);
    for (const [criterion, score] of Object.entries(scores)) {
      assert.ok(score >= 1 && score <= 5, `${criterion} score ${score} should be 1-5`);
    }
  });

  it('should give minimum 1 per criterion for empty content', () => {
    const scores = computeHeuristicScore('');
    for (const [criterion, score] of Object.entries(scores)) {
      assert.ok(score >= 1, `${criterion} score ${score} should be at least 1`);
    }
  });

  it('should reward frontmatter presence', () => {
    const withFm = `---
name: test
description: "test"
---

# Heading

Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
Line 11
`;
    const withoutFm = `# Heading

Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
Line 11
`;

    const fmScores = computeHeuristicScore(withFm);
    const noFmScores = computeHeuristicScore(withoutFm);

    assert.ok(fmScores.clarity >= noFmScores.clarity, 'Frontmatter should help clarity');
    assert.ok(fmScores.accuracy >= noFmScores.accuracy, 'Frontmatter should help accuracy');
  });
});
