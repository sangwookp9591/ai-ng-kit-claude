/**
 * aing Design Compare
 * Compare and rank design system variants.
 * @module scripts/design/design-compare
 */

import { createLogger } from '../core/logger.js';
import type { DesignSystem, DesignScore } from './design-engine.js';

const log = createLogger('design-compare');

export interface ComparisonResult {
  variants: VariantRank[];
  winner: string;
  reasoning: string[];
  dimensions: DimensionComparison[];
}

export interface VariantRank {
  name: string;
  score: number;
  rank: number;
  strengths: string[];
  weaknesses: string[];
}

export interface DimensionComparison {
  dimension: string;
  scores: Record<string, number>;
  winner: string;
}

const DIMENSIONS: Array<keyof DesignScore> = [
  'contrast', 'consistency', 'spacing', 'typography', 'accessibility',
];

/**
 * Compare multiple design system variants and rank them.
 */
export function compareDesigns(
  variants: Array<{ name: string; system: DesignSystem }>,
): ComparisonResult {
  if (variants.length === 0) {
    throw new Error('Need at least one variant to compare');
  }

  if (variants.length === 1) {
    const v = variants[0];
    return {
      variants: [{
        name: v.name,
        score: v.system.score.overall,
        rank: 1,
        strengths: identifyStrengths(v.system.score),
        weaknesses: identifyWeaknesses(v.system.score),
      }],
      winner: v.name,
      reasoning: ['Only one variant provided'],
      dimensions: [],
    };
  }

  log.info(`Comparing ${variants.length} design variants`);

  // Score each dimension
  const dimensionComparisons: DimensionComparison[] = DIMENSIONS.map(dim => {
    const scores: Record<string, number> = {};
    let maxScore = -1;
    let winner = '';

    for (const v of variants) {
      const score = v.system.score[dim] as number;
      scores[v.name] = score;
      if (score > maxScore) {
        maxScore = score;
        winner = v.name;
      }
    }

    return { dimension: dim, scores, winner };
  });

  // Rank variants
  const ranked: VariantRank[] = variants
    .map(v => ({
      name: v.name,
      score: v.system.score.overall,
      rank: 0,
      strengths: identifyStrengths(v.system.score),
      weaknesses: identifyWeaknesses(v.system.score),
    }))
    .sort((a, b) => b.score - a.score)
    .map((v, i) => ({ ...v, rank: i + 1 }));

  // Generate reasoning
  const winner = ranked[0];
  const reasoning: string[] = [];
  reasoning.push(`${winner.name} ranked #1 with overall score ${winner.score}/10`);

  if (ranked.length > 1) {
    const margin = winner.score - ranked[1].score;
    reasoning.push(`Lead of ${margin.toFixed(1)} points over ${ranked[1].name}`);
  }

  if (winner.strengths.length > 0) {
    reasoning.push(`Key strengths: ${winner.strengths.join(', ')}`);
  }

  return {
    variants: ranked,
    winner: winner.name,
    reasoning,
    dimensions: dimensionComparisons,
  };
}

function identifyStrengths(score: DesignScore): string[] {
  const strengths: string[] = [];
  if (score.contrast >= 9) strengths.push('excellent contrast');
  if (score.consistency >= 9) strengths.push('high consistency');
  if (score.spacing >= 9) strengths.push('clean spacing');
  if (score.typography >= 9) strengths.push('strong typography');
  if (score.accessibility >= 9) strengths.push('great accessibility');
  return strengths;
}

function identifyWeaknesses(score: DesignScore): string[] {
  const weaknesses: string[] = [];
  if (score.contrast < 7) weaknesses.push('low contrast');
  if (score.consistency < 7) weaknesses.push('inconsistent tokens');
  if (score.spacing < 7) weaknesses.push('spacing issues');
  if (score.typography < 7) weaknesses.push('typography issues');
  if (score.accessibility < 7) weaknesses.push('accessibility gaps');
  return weaknesses;
}

/**
 * Format comparison as a readable table.
 */
export function formatComparison(result: ComparisonResult): string {
  const lines: string[] = [];

  lines.push('## Design Comparison Results\n');

  // Ranking table
  lines.push('| Rank | Variant | Score | Strengths | Weaknesses |');
  lines.push('|------|---------|-------|-----------|------------|');
  for (const v of result.variants) {
    lines.push(`| #${v.rank} | ${v.name} | ${v.score}/10 | ${v.strengths.join(', ') || '-'} | ${v.weaknesses.join(', ') || '-'} |`);
  }

  lines.push('');

  // Dimension breakdown
  if (result.dimensions.length > 0) {
    lines.push('### Dimension Breakdown\n');
    const names = result.variants.map(v => v.name);
    lines.push(`| Dimension | ${names.join(' | ')} | Winner |`);
    lines.push(`|-----------|${names.map(() => '---').join(' | ')} | ------|`);
    for (const d of result.dimensions) {
      const scores = names.map(n => String(d.scores[n] ?? '-'));
      lines.push(`| ${d.dimension} | ${scores.join(' | ')} | ${d.winner} |`);
    }
  }

  lines.push('');
  lines.push(`**Winner: ${result.winner}**`);
  for (const r of result.reasoning) {
    lines.push(`- ${r}`);
  }

  return lines.join('\n');
}
