/**
 * aing Plan Manager v1.1.0
 * Creates and manages plan documents in .aing/plans/
 * Integrates with Task Manager for checklist tracking.
 * @module scripts/task/plan-manager
 */
import { createTask } from './task-manager.js';
import { createLogger } from '../core/logger.js';
import { sanitizeFeature } from '../core/path-utils.js';
import { writeFileSync, readFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const log = createLogger('plan');
function getPlanDir(projectDir) {
    const dir = join(projectDir || process.cwd(), '.aing', 'plans');
    mkdirSync(dir, { recursive: true });
    return dir;
}
/**
 * Create a plan document from a task description.
 * Generates both a markdown plan file and a tracked task with subtasks.
 */
export function createPlan(params, projectDir) {
    const dir = getPlanDir(projectDir);
    const date = new Date().toISOString().slice(0, 10);
    const planPath = join(dir, `${date}-${sanitizeFeature(params.feature)}.md`);
    // Build header metadata line
    const metaParts = [`**Created**: ${date}`, `**Status**: Active`, `**PDCA Stage**: Plan`];
    if (params.complexityScore !== undefined) {
        metaParts.push(`**Complexity Score**: ${params.complexityScore}`);
    }
    if (params.complexityLevel !== undefined) {
        metaParts.push(`**Complexity Level**: ${params.complexityLevel}`);
    }
    // Generate markdown plan
    const md = [
        `# Plan: ${params.feature}`,
        ``,
        ...metaParts,
        ``,
        `## Goal`,
        params.goal,
        ``,
        `## Steps`,
        ``
    ];
    for (let i = 0; i < params.steps.length; i++) {
        md.push(`${i + 1}. [ ] ${params.steps[i]}`);
    }
    if (params.acceptanceCriteria && params.acceptanceCriteria.length > 0) {
        md.push(``, `## Acceptance Criteria`);
        for (const ac of params.acceptanceCriteria) {
            md.push(`- [ ] ${ac}`);
        }
    }
    if (params.risks && params.risks.length > 0) {
        md.push(``, `## Risks`);
        for (const risk of params.risks) {
            md.push(`- ${risk}`);
        }
    }
    if (params.options && params.options.length > 0) {
        md.push(``, `## Options`);
        for (const opt of params.options) {
            md.push(``, `### ${opt.name}`);
            if (opt.pros && opt.pros.length > 0) {
                md.push(`**Pros**`);
                for (const pro of opt.pros) {
                    md.push(`- ${pro}`);
                }
            }
            if (opt.cons && opt.cons.length > 0) {
                md.push(`**Cons**`);
                for (const con of opt.cons) {
                    md.push(`- ${con}`);
                }
            }
        }
    }
    // ── AING-DR Sections ──
    if (params.constraints && params.constraints.length > 0) {
        md.push(``, `## Constraints`);
        for (const c of params.constraints) {
            md.push(``, `### ${c.name}`);
            md.push(`- **Source**: ${c.source}`);
            md.push(`- **Evidence**: ${c.evidence}`);
            md.push(`- **Violation Impact**: ${c.violationImpact}`);
        }
    }
    if (params.preferences && params.preferences.length > 0) {
        md.push(``, `## Preferences`);
        for (const p of params.preferences) {
            md.push(``, `### ${p.name}`);
            md.push(`- **Priority**: ${p.priority}`);
            md.push(`- **Tradeoff Threshold**: ${p.tradeoffThreshold}`);
            md.push(`- **Why**: ${p.why}`);
        }
    }
    if (params.drivers && params.drivers.length > 0) {
        md.push(``, `## Drivers`);
        for (const d of params.drivers) {
            const statusTag = `[${d.status}]`;
            const sourcePart = d.source ? ` — source: ${d.source}` : '';
            md.push(`- ${statusTag} ${d.name}${sourcePart}`);
        }
    }
    if (params.steelman) {
        md.push(``, `## Steelman`);
        md.push(``, `**Antithesis**: ${params.steelman.antithesis}`);
        if (params.steelman.tradeoffs.length > 0) {
            md.push(``, `**Tradeoffs**`);
            for (const t of params.steelman.tradeoffs) {
                md.push(`- ${t}`);
            }
        }
        if (params.steelman.newDrivers.length > 0) {
            md.push(``, `**New Drivers**`);
            for (const nd of params.steelman.newDrivers) {
                md.push(`- ${nd}`);
            }
        }
        if (params.steelman.synthesisPath) {
            md.push(``, `**Synthesis Path**: ${params.steelman.synthesisPath}`);
        }
    }
    if (params.noaVerdict) {
        const pv = params.noaVerdict;
        md.push(``, `## Synthesis Verification`);
        md.push(``, `| Metric | Value |`);
        md.push(`|--------|-------|`);
        md.push(`| Verdict | ${pv.verdict} |`);
        md.push(`| ABSORBED | ${pv.absorbed} |`);
        md.push(`| REBUTTED | ${pv.rebutted} |`);
        md.push(`| ACKNOWLEDGED | ${pv.acknowledged} |`);
        md.push(`| IGNORED | ${pv.ignored} |`);
        md.push(`| Reflection Score | ${pv.reflectionScore}% |`);
        if (pv.deltaScore !== null) {
            md.push(`| Delta Score | ${pv.deltaScore} |`);
        }
        md.push(`| Confidence | ${pv.confidence} |`);
    }
    if (params.criticVerdict) {
        const cv = params.criticVerdict;
        md.push(``, `## Critic Assessment`);
        md.push(``, `| Metric | Value |`);
        md.push(`|--------|-------|`);
        md.push(`| Verdict | ${cv.verdict} |`);
        md.push(`| Mode | ${cv.mode} |`);
        md.push(`| CRITICAL | ${cv.critical} |`);
        md.push(`| MAJOR | ${cv.major} |`);
        md.push(`| MINOR | ${cv.minor} |`);
        md.push(`| Self-audit Downgrades | ${cv.selfAuditDowngrades} |`);
        md.push(`| Constraint Compliance | ${cv.constraintCompliance} |`);
        md.push(`| Criteria Testability | ${cv.criteriaTestability} |`);
        md.push(`| Evidence Coverage | ${cv.evidenceCoverage} |`);
    }
    if (params.adr) {
        md.push(``, `## ADR — Architecture Decision Record`);
        md.push(``, `**Decision**: ${params.adr.decision}`);
        md.push(`**Confidence**: ${params.adr.confidence}`);
        if (params.adr.constraintsHonored.length > 0) {
            md.push(``, `**Constraints Honored**`);
            for (const ch of params.adr.constraintsHonored) {
                md.push(`- ${ch}`);
            }
        }
        if (params.adr.alternativesRejected.length > 0) {
            md.push(``, `**Alternatives Rejected**`);
            for (const ar of params.adr.alternativesRejected) {
                md.push(`- ${ar}`);
            }
        }
        const cons = params.adr.consequences;
        if (cons.positive.length > 0 || cons.negative.length > 0) {
            md.push(``, `**Consequences**`);
            for (const p of cons.positive) {
                md.push(`- ✅ ${p}`);
            }
            for (const n of cons.negative) {
                md.push(`- ⚠️ ${n}`);
            }
        }
    }
    if (params.reviewNotes && params.reviewNotes.length > 0) {
        md.push(``, `## Review Notes`);
        for (const note of params.reviewNotes) {
            md.push(``, `### ${note.reviewer}`);
            md.push(`**Verdict**: ${note.verdict}`);
            if (note.highlights && note.highlights.length > 0) {
                md.push(`**Highlights**`);
                for (const hl of note.highlights) {
                    md.push(`- ${hl}`);
                }
            }
        }
    }
    if (params.complexityScore !== undefined || params.complexityLevel !== undefined) {
        md.push(``, `## Complexity`);
        if (params.complexityScore !== undefined) {
            md.push(`- **Score**: ${params.complexityScore}`);
        }
        if (params.complexityLevel !== undefined) {
            md.push(`- **Level**: ${params.complexityLevel}`);
        }
    }
    md.push(``, `---`, `*Generated by aing Plan Manager*`);
    try {
        writeFileSync(planPath, md.join('\n'), 'utf-8');
    }
    catch (err) {
        log.error('Failed to write plan', { error: err.message });
        return { ok: false, planPath: '', taskId: '' };
    }
    // Create tracked task with subtasks
    const taskResult = createTask({
        title: `[Plan] ${params.feature}`,
        feature: params.feature,
        description: params.goal,
        subtasks: params.steps.map((step) => ({ title: step }))
    }, projectDir);
    const taskId = taskResult?.taskId || '';
    if (!taskId) {
        log.error('Plan file created but task creation failed', { planPath });
    }
    log.info(`Plan created: ${params.feature}`, { steps: params.steps.length, taskId });
    return { ok: true, planPath, taskId };
}
/**
 * Get a plan document.
 */
export function getPlan(feature, projectDir) {
    const dir = getPlanDir(projectDir);
    try {
        const files = readdirSync(dir)
            .filter((f) => f.endsWith('.md') && f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '') === sanitizeFeature(feature))
            .sort()
            .reverse();
        if (files.length === 0)
            return null;
        return readFileSync(join(dir, files[0]), 'utf-8');
    }
    catch (_) {
        return null;
    }
}
/**
 * List all plans.
 */
export function listPlans(projectDir) {
    const dir = getPlanDir(projectDir);
    try {
        return readdirSync(dir)
            .filter((f) => f.endsWith('.md'))
            .map((f) => ({
            file: f,
            feature: f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', '')
        }));
    }
    catch (_) {
        return [];
    }
}
//# sourceMappingURL=plan-manager.js.map