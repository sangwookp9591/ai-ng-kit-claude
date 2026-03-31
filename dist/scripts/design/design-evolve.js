/**
 * aing Design Evolve
 * Evolutionary design system optimization.
 * Generate mutations, score, select the fittest.
 * @module scripts/design/design-evolve
 */
import { createLogger } from '../core/logger.js';
import { generateDesignSystem, scoreDesign, generateComponents } from './design-engine.js';
const log = createLogger('design-evolve');
const DEFAULT_CONFIG = {
    populationSize: 5,
    generations: 3,
    mutationRate: 0.3,
    eliteCount: 1,
};
// Color mutation helpers
const HEX_CHARS = '0123456789abcdef';
function mutateHexColor(hex, intensity) {
    // Remove # prefix
    const clean = hex.replace('#', '');
    if (clean.length !== 6)
        return hex;
    let result = '';
    for (let i = 0; i < 6; i++) {
        const charIdx = HEX_CHARS.indexOf(clean[i].toLowerCase());
        if (charIdx === -1) {
            result += clean[i];
            continue;
        }
        // Apply mutation
        if (Math.random() < intensity) {
            const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
            const newIdx = Math.max(0, Math.min(15, charIdx + delta));
            result += HEX_CHARS[newIdx];
        }
        else {
            result += clean[i];
        }
    }
    return `#${result}`;
}
function mutateTokens(tokens, rate) {
    const mutated = JSON.parse(JSON.stringify(tokens));
    // Mutate colors
    for (const color of mutated.colors) {
        if (Math.random() < rate) {
            color.value = mutateHexColor(color.value, 0.5);
        }
    }
    // Occasionally swap two colors
    if (Math.random() < rate * 0.3 && mutated.colors.length > 2) {
        const i = Math.floor(Math.random() * mutated.colors.length);
        const j = Math.floor(Math.random() * mutated.colors.length);
        if (i !== j) {
            const temp = mutated.colors[i].value;
            mutated.colors[i].value = mutated.colors[j].value;
            mutated.colors[j].value = temp;
        }
    }
    return mutated;
}
/**
 * Run evolutionary design optimization.
 */
export function evolveDesign(brief, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    log.info(`Evolving design: ${cfg.populationSize} population, ${cfg.generations} generations`);
    // Initialize population
    let population = [];
    for (let i = 0; i < cfg.populationSize; i++) {
        const system = generateDesignSystem({
            ...brief,
            darkMode: i % 2 === 0 ? brief.darkMode : !brief.darkMode,
        });
        population.push({ name: `gen0-v${i + 1}`, system });
    }
    const generations = [];
    const initialBestScore = Math.max(...population.map(p => p.system.score.overall));
    for (let gen = 0; gen < cfg.generations; gen++) {
        // Score and rank
        population.sort((a, b) => b.system.score.overall - a.system.score.overall);
        const scores = population.map(p => p.system.score.overall);
        generations.push({
            generation: gen + 1,
            bestScore: scores[0],
            avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            worstScore: scores[scores.length - 1],
            bestName: population[0].name,
        });
        // Select elite
        const elite = population.slice(0, cfg.eliteCount);
        // Generate mutations from elite
        const newPopulation = [...elite];
        while (newPopulation.length < cfg.populationSize) {
            const parent = elite[Math.floor(Math.random() * elite.length)];
            const mutatedTokens = mutateTokens(parent.system.tokens, cfg.mutationRate);
            const score = scoreDesign(mutatedTokens);
            const components = generateComponents(brief);
            const child = {
                brief,
                tokens: mutatedTokens,
                components,
                score,
                generatedAt: new Date().toISOString(),
            };
            newPopulation.push({
                name: `gen${gen + 1}-v${newPopulation.length + 1}`,
                system: child,
            });
        }
        population = newPopulation;
    }
    // Final sort
    population.sort((a, b) => b.system.score.overall - a.system.score.overall);
    const best = population[0].system;
    return {
        best,
        generations,
        totalVariants: cfg.populationSize * cfg.generations,
        improvement: best.score.overall - initialBestScore,
    };
}
/**
 * Format evolution result as readable report.
 */
export function formatEvolution(result) {
    const lines = [];
    lines.push('## Design Evolution Report\n');
    lines.push(`Total variants evaluated: ${result.totalVariants}`);
    lines.push(`Score improvement: ${result.improvement >= 0 ? '+' : ''}${result.improvement.toFixed(1)}`);
    lines.push(`Final best score: ${result.best.score.overall}/10\n`);
    lines.push('### Generation Progress\n');
    lines.push('| Gen | Best | Avg | Worst | Best Variant |');
    lines.push('|-----|------|-----|-------|-------------|');
    for (const g of result.generations) {
        lines.push(`| ${g.generation} | ${g.bestScore.toFixed(1)} | ${g.avgScore.toFixed(1)} | ${g.worstScore.toFixed(1)} | ${g.bestName} |`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=design-evolve.js.map