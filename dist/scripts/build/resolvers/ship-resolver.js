/**
 * aing Ship Resolver
 * Generates dynamic ship-related content for SKILL.md templates.
 *
 * @module scripts/build/resolvers/ship-resolver
 */
/**
 * Generate the ship pipeline steps table.
 */
export function resolveShipSteps() {
    const steps = [
        ['1', 'preflight', 'Review Dashboard CLEARED + Evidence PASS + clean branch'],
        ['2', 'merge-base', 'git fetch + merge origin/{baseBranch}'],
        ['3', 'run-tests', 'Test suite parallel execution + failure triage'],
        ['4', 'pre-landing-review', 'Milla security review (SQL, LLM boundary, scope drift)'],
        ['5', 'version-bump', 'Auto-detect bump type → major/minor/patch'],
        ['6', 'changelog', 'Conventional commits → categorized CHANGELOG.md'],
        ['7', 'push-and-pr', 'git push + gh pr create with auto-generated body'],
    ];
    const lines = [
        '| Step | Name | Description |',
        '|------|------|-------------|',
    ];
    for (const [num, name, desc] of steps) {
        lines.push(`| ${num} | ${name} | ${desc} |`);
    }
    return lines.join('\n');
}
/**
 * Generate ship prerequisites checklist.
 */
export function resolveShipPrerequisites() {
    return `### Prerequisites
- [ ] Review Readiness Dashboard: CLEARED (Eng Review 필수)
- [ ] Evidence chain: PASS (test + build + lint)
- [ ] PDCA stage: review (완료 단계)
- [ ] Feature branch에 있어야 함 (base branch 아님)
- [ ] Uncommitted changes 없음`;
}
//# sourceMappingURL=ship-resolver.js.map