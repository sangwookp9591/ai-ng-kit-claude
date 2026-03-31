const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
    'menuitem', 'option', 'slider', 'spinbutton', 'switch', 'tab',
    'searchbox', 'menuitemcheckbox', 'menuitemradio', 'treeitem',
]);
const STRUCTURAL_ROLES = new Set([
    'generic', 'group', 'presentation', 'none', 'paragraph',
]);
export async function buildSnapshot(page, options, previousSnapshot = '') {
    const refs = new Map();
    let cRefs;
    // Scope to selector if provided
    const rootLocator = options.selector
        ? page.locator(options.selector)
        : page.locator('body');
    // Get ARIA snapshot
    let ariaText;
    try {
        ariaText = await rootLocator.ariaSnapshot({ timeout: 10_000 });
    }
    catch {
        return {
            tree: '(empty page — no ARIA tree available)',
            rawTree: '',
            refs,
        };
    }
    if (!ariaText || ariaText.trim().length === 0) {
        return {
            tree: '(empty ARIA tree)',
            rawTree: '',
            refs,
        };
    }
    const rawTree = ariaText;
    const lines = ariaText.split('\n');
    const outputLines = [];
    let eRefCounter = 1;
    let cRefCounter = 1;
    if (options.cursorInteractive) {
        cRefs = new Map();
    }
    for (const line of lines) {
        const indent = line.match(/^(\s*)/)?.[1] ?? '';
        const level = indent.length / 2; // ARIA snapshot uses 2-space indent
        const content = line.trimStart();
        // Depth filter
        if (options.depth !== undefined && level > options.depth) {
            continue;
        }
        // Parse role and name: "- role "name"" or "- role: text"
        const roleMatch = content.match(/^-\s+(\w+)(?:\s+"([^"]*)")?(?::\s*(.*))?/);
        if (!roleMatch) {
            // Text node or other
            if (options.compact && content.trim() === '-')
                continue;
            outputLines.push(line);
            continue;
        }
        const role = roleMatch[1];
        const name = roleMatch[2] ?? roleMatch[3] ?? '';
        // Compact mode: skip empty structural nodes
        if (options.compact && STRUCTURAL_ROLES.has(role) && !name) {
            continue;
        }
        // Interactive-only filter
        if (options.interactive && !INTERACTIVE_ROLES.has(role)) {
            // Still include if it has meaningful text
            if (!name)
                continue;
        }
        // Build locator for this element
        const locator = buildLocatorForRole(page, role, name, options.selector);
        // Assign @e ref
        const eRef = `@e${eRefCounter++}`;
        refs.set(eRef, { locator, role, name });
        let refLabel = ` ${eRef}`;
        // Cursor-interactive @c refs
        if (options.cursorInteractive && INTERACTIVE_ROLES.has(role)) {
            const cRef = `@c${cRefCounter++}`;
            cRefs.set(cRef, { locator, role, name });
            refLabel += ` ${cRef}`;
        }
        outputLines.push(`${indent}- ${role}${name ? ` "${name}"` : ''}${refLabel}`);
    }
    let tree = outputLines.join('\n');
    // Diff mode
    if (options.diff && previousSnapshot) {
        tree = buildDiff(previousSnapshot, rawTree, tree);
    }
    // Annotated screenshot
    if (options.annotate) {
        const screenshotPath = options.outputPath ?? '/tmp/aing-browse-annotated.png';
        await captureAnnotatedScreenshot(page, refs, screenshotPath);
        tree = `[Annotated screenshot saved: ${screenshotPath}]\n\n${tree}`;
    }
    return { tree, rawTree, refs, cRefs };
}
function buildLocatorForRole(page, role, name, scopeSelector) {
    const root = scopeSelector ? page.locator(scopeSelector) : page;
    // Use ARIA role-based locator with name matching
    try {
        if (name) {
            return root.getByRole(role, { name, exact: false });
        }
        return root.getByRole(role);
    }
    catch {
        // Fallback to generic locator
        return page.locator(`[role="${role}"]`);
    }
}
function buildDiff(previousRaw, currentRaw, formattedTree) {
    const prevLines = new Set(previousRaw.split('\n').map((l) => l.trim()));
    const currLines = currentRaw.split('\n');
    const diffLines = [];
    for (const line of currLines) {
        const trimmed = line.trim();
        if (!prevLines.has(trimmed)) {
            diffLines.push(`+ ${line}`);
        }
        else {
            diffLines.push(`  ${line}`);
        }
    }
    // Find removed lines
    const currSet = new Set(currLines.map((l) => l.trim()));
    for (const prev of prevLines) {
        if (!currSet.has(prev)) {
            diffLines.push(`- ${prev}`);
        }
    }
    return `[DIFF mode — + added, - removed]\n${diffLines.join('\n')}\n\n---\nFull tree:\n${formattedTree}`;
}
async function captureAnnotatedScreenshot(page, refs, outputPath) {
    // Inject overlay boxes via JavaScript
    const boxes = [];
    for (const [ref, info] of refs) {
        try {
            const box = await info.locator.first().boundingBox({ timeout: 2_000 });
            if (box) {
                boxes.push({
                    ref,
                    role: info.role,
                    name: info.name,
                    rect: box,
                });
            }
        }
        catch {
            // Element not visible or gone
        }
    }
    // Draw overlay
    await page.evaluate((boxData) => {
        const overlay = document.createElement('div');
        overlay.id = '__aing_annotation_overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;pointer-events:none;';
        for (const box of boxData) {
            if (!box.rect)
                continue;
            const r = box.rect;
            const el = document.createElement('div');
            el.style.cssText = `position:absolute;left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px;border:2px solid red;background:rgba(255,0,0,0.08);`;
            const label = document.createElement('span');
            label.textContent = box.ref;
            label.style.cssText = 'position:absolute;top:-16px;left:0;background:red;color:white;font-size:10px;padding:1px 3px;font-family:monospace;';
            el.appendChild(label);
            overlay.appendChild(el);
        }
        document.body.appendChild(overlay);
    }, boxes);
    await page.screenshot({ path: outputPath, fullPage: false });
    // Remove overlay
    await page.evaluate(() => {
        document.getElementById('__aing_annotation_overlay')?.remove();
    });
}
//# sourceMappingURL=snapshot.js.map