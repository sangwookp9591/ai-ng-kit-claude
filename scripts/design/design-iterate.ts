/**
 * aing Design Iterate
 * Iterative design refinement based on feedback.
 * @module scripts/design/design-iterate
 */

import { createLogger } from '../core/logger.js';
import type { DesignSystem, DesignTokens } from './design-engine.js';
import { scoreDesign, generateComponents } from './design-engine.js';

const log = createLogger('design-iterate');

export interface DesignFeedback {
  type: 'color' | 'spacing' | 'typography' | 'component' | 'general';
  action: 'adjust' | 'replace' | 'add' | 'remove';
  target?: string;
  value?: string;
  reason: string;
}

export interface IterationResult {
  system: DesignSystem;
  changes: ChangeRecord[];
  iteration: number;
  previousScore: number;
  newScore: number;
  improved: boolean;
}

export interface ChangeRecord {
  what: string;
  from: string;
  to: string;
  reason: string;
}

/**
 * Apply feedback to a design system and produce an improved version.
 */
export function iterateDesign(
  system: DesignSystem,
  feedback: DesignFeedback[],
  iteration: number = 1,
): IterationResult {
  log.info(`Design iteration #${iteration} with ${feedback.length} feedback items`);

  const changes: ChangeRecord[] = [];
  const tokens: DesignTokens = JSON.parse(JSON.stringify(system.tokens));

  for (const fb of feedback) {
    switch (fb.type) {
      case 'color': {
        if (fb.action === 'adjust' && fb.target && fb.value) {
          const idx = tokens.colors.findIndex(c => c.name === fb.target);
          if (idx !== -1) {
            const old = tokens.colors[idx].value;
            tokens.colors[idx].value = fb.value;
            changes.push({ what: `color.${fb.target}`, from: old, to: fb.value, reason: fb.reason });
          }
        } else if (fb.action === 'add' && fb.target && fb.value) {
          tokens.colors.push({ name: fb.target, value: fb.value, usage: fb.reason });
          changes.push({ what: `color.${fb.target}`, from: '(none)', to: fb.value, reason: fb.reason });
        } else if (fb.action === 'remove' && fb.target) {
          const idx = tokens.colors.findIndex(c => c.name === fb.target);
          if (idx !== -1) {
            const old = tokens.colors[idx].value;
            tokens.colors.splice(idx, 1);
            changes.push({ what: `color.${fb.target}`, from: old, to: '(removed)', reason: fb.reason });
          }
        }
        break;
      }
      case 'spacing': {
        if (fb.action === 'add' && fb.target && fb.value) {
          const px = parseInt(fb.value, 10);
          if (!isNaN(px)) {
            tokens.spacing.push({ name: fb.target, value: `${px / 16}rem`, px });
            tokens.spacing.sort((a, b) => a.px - b.px);
            changes.push({ what: `spacing.${fb.target}`, from: '(none)', to: `${px}px`, reason: fb.reason });
          }
        }
        break;
      }
      case 'typography': {
        if (fb.action === 'adjust' && fb.target) {
          const idx = tokens.typography.findIndex(t => t.name === fb.target);
          if (idx !== -1 && fb.value) {
            const old = tokens.typography[idx].fontSize;
            tokens.typography[idx].fontSize = fb.value;
            changes.push({ what: `typography.${fb.target}.fontSize`, from: old, to: fb.value, reason: fb.reason });
          }
        }
        break;
      }
    }
  }

  const previousScore = system.score.overall;
  const newScoreResult = scoreDesign(tokens);
  const components = generateComponents(system.brief);

  const newSystem: DesignSystem = {
    brief: system.brief,
    tokens,
    components,
    score: newScoreResult,
    generatedAt: new Date().toISOString(),
  };

  return {
    system: newSystem,
    changes,
    iteration,
    previousScore,
    newScore: newScoreResult.overall,
    improved: newScoreResult.overall >= previousScore,
  };
}

/**
 * Auto-fix common design issues detected by scoring.
 */
export function autoFixDesign(system: DesignSystem): IterationResult {
  const feedback: DesignFeedback[] = [];

  for (const issue of system.score.issues) {
    if (issue.severity === 'critical') {
      if (issue.category === 'color' && issue.message.includes('Missing background')) {
        feedback.push({
          type: 'color',
          action: 'add',
          target: 'background',
          value: '#09090b',
          reason: 'Auto-fix: missing background color',
        });
        feedback.push({
          type: 'color',
          action: 'add',
          target: 'foreground',
          value: '#fafafa',
          reason: 'Auto-fix: missing foreground color',
        });
      }
    }
    if (issue.category === 'spacing' && issue.message.includes('Large gap')) {
      // Add intermediate spacing
      feedback.push({
        type: 'spacing',
        action: 'add',
        target: 'space-14',
        value: '56',
        reason: 'Auto-fix: fill spacing scale gap',
      });
    }
  }

  if (feedback.length === 0) {
    return {
      system,
      changes: [],
      iteration: 0,
      previousScore: system.score.overall,
      newScore: system.score.overall,
      improved: false,
    };
  }

  return iterateDesign(system, feedback);
}

/**
 * Format iteration result as readable report.
 */
export function formatIteration(result: IterationResult): string {
  const lines: string[] = [];
  lines.push(`## Design Iteration #${result.iteration}\n`);
  lines.push(`Score: ${result.previousScore}/10 → ${result.newScore}/10 ${result.improved ? '✅ Improved' : '⚠️ No improvement'}\n`);

  if (result.changes.length > 0) {
    lines.push('### Changes\n');
    lines.push('| Token | From | To | Reason |');
    lines.push('|-------|------|----|--------|');
    for (const c of result.changes) {
      lines.push(`| ${c.what} | ${c.from} | ${c.to} | ${c.reason} |`);
    }
  } else {
    lines.push('No changes applied.');
  }

  return lines.join('\n');
}
