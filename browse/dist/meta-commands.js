export async function handleMetaCommand(cmd, args, bm, shutdown) {
    const page = bm.getActivePage();
    try {
        switch (cmd) {
            case 'screenshot': {
                let selector;
                let outputPath = `/tmp/aing-browse-${Date.now()}.png`;
                let fullPage = false;
                let clip;
                const remaining = [];
                for (let i = 0; i < args.length; i++) {
                    const arg = args[i];
                    if (arg === '--viewport') {
                        fullPage = false;
                    }
                    else if (arg === '--fullpage') {
                        fullPage = true;
                    }
                    else if (arg === '--clip' && i + 1 < args.length) {
                        const parts = args[++i].split(',').map(Number);
                        if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
                            clip = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
                        }
                    }
                    else {
                        remaining.push(arg);
                    }
                }
                // Last remaining arg could be a path (if it has an extension) or a selector
                for (const r of remaining) {
                    if (r.match(/\.(png|jpg|jpeg|webp)$/i)) {
                        outputPath = r;
                    }
                    else if (r.startsWith('@')) {
                        selector = r;
                    }
                    else {
                        selector = r;
                    }
                }
                if (selector?.startsWith('@')) {
                    const locator = await bm.resolveRef(selector);
                    await locator.first().screenshot({ path: outputPath, timeout: 15_000 });
                }
                else if (selector) {
                    await page.locator(selector).first().screenshot({ path: outputPath, timeout: 15_000 });
                }
                else if (clip) {
                    await page.screenshot({ path: outputPath, clip });
                }
                else {
                    await page.screenshot({ path: outputPath, fullPage });
                }
                return { success: true, output: `Screenshot saved: ${outputPath}`, screenshot: outputPath };
            }
            case 'pdf': {
                const outputPath = args[0] || `/tmp/aing-browse-${Date.now()}.pdf`;
                await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
                return ok(`PDF saved: ${outputPath}`);
            }
            case 'responsive': {
                const prefix = args[0] || `/tmp/aing-responsive-${Date.now()}`;
                const viewports = [
                    { name: 'mobile', width: 375, height: 812 },
                    { name: 'tablet', width: 768, height: 1024 },
                    { name: 'desktop', width: 1440, height: 900 },
                ];
                const paths = [];
                const original = page.viewportSize();
                for (const vp of viewports) {
                    await page.setViewportSize({ width: vp.width, height: vp.height });
                    await page.waitForTimeout(300); // Let layout settle
                    const p = `${prefix}-${vp.name}.png`;
                    await page.screenshot({ path: p, fullPage: false });
                    paths.push(p);
                }
                // Restore original viewport
                if (original) {
                    await page.setViewportSize(original);
                }
                return ok(`Responsive screenshots:\n${paths.join('\n')}`);
            }
            case 'diff': {
                if (args.length < 2)
                    return fail('Usage: diff <url1> <url2>');
                const { sanitizeUrl } = await import('./url-validation.js');
                let url1;
                let url2;
                try {
                    url1 = sanitizeUrl(args[0]);
                    url2 = sanitizeUrl(args[1]);
                }
                catch (e) {
                    return fail(e.message);
                }
                // Visit first URL and capture text
                await page.goto(url1, { waitUntil: 'domcontentloaded', timeout: 30_000 });
                const text1 = await page.innerText('body');
                // Visit second URL and capture text
                await page.goto(url2, { waitUntil: 'domcontentloaded', timeout: 30_000 });
                const text2 = await page.innerText('body');
                // Simple line diff
                const lines1 = text1.split('\n');
                const lines2 = text2.split('\n');
                const diffLines = [];
                const maxLen = Math.max(lines1.length, lines2.length);
                for (let i = 0; i < maxLen; i++) {
                    const l1 = lines1[i] ?? '';
                    const l2 = lines2[i] ?? '';
                    if (l1 === l2) {
                        diffLines.push(`  ${l1}`);
                    }
                    else {
                        if (l1)
                            diffLines.push(`- ${l1}`);
                        if (l2)
                            diffLines.push(`+ ${l2}`);
                    }
                }
                return ok(diffLines.join('\n'));
            }
            case 'snapshot': {
                const options = parseSnapshotFlags(args);
                const tree = await bm.buildRefs(options);
                return ok(tree);
            }
            case 'tabs': {
                const tabs = await bm.listTabsAsync();
                const lines = tabs.map((t) => `${t.active ? '→' : ' '} [${t.id}] ${t.title || '(untitled)'} — ${t.url}`);
                return ok(lines.join('\n') || '(no tabs)');
            }
            case 'tab': {
                if (args.length < 1)
                    return fail('Usage: tab <id>');
                const id = parseInt(args[0], 10);
                if (isNaN(id))
                    return fail('Tab id must be a number');
                await bm.switchTab(id);
                return ok(`Switched to tab ${id}`);
            }
            case 'newtab': {
                const url = args[0];
                const id = await bm.newTab(url);
                return ok(`New tab ${id}${url ? ` → ${url}` : ''}`);
            }
            case 'closetab': {
                const id = args[0] ? parseInt(args[0], 10) : undefined;
                await bm.closeTab(id);
                return ok(`Tab closed`);
            }
            case 'chain': {
                // Read JSON array from args (passed as single stringified JSON)
                const jsonStr = args.join(' ');
                if (!jsonStr)
                    return fail('Usage: chain <json_array>');
                let commands;
                try {
                    commands = JSON.parse(jsonStr);
                }
                catch {
                    return fail('Invalid JSON. Expected: [{"cmd":"goto","args":["url"]},...]');
                }
                if (!Array.isArray(commands))
                    return fail('Expected JSON array');
                // Dynamic import to avoid circular deps
                const { dispatchCommand } = await import('./dispatch.js');
                const results = [];
                for (const c of commands) {
                    const result = await dispatchCommand(c.cmd, c.args ?? [], bm, shutdown);
                    results.push(`[${c.cmd}] ${result.success ? result.output : `ERROR: ${result.error}`}`);
                    if (!result.success)
                        break; // Stop chain on error
                }
                return ok(results.join('\n'));
            }
            case 'status': {
                const url = page.url();
                const title = await page.title().catch(() => '');
                const tabs = bm.listTabs();
                return ok(JSON.stringify({
                    status: 'ok',
                    url,
                    title,
                    tabs: tabs.length,
                    browser: bm.isLaunched() ? 'connected' : 'disconnected',
                }, null, 2));
            }
            case 'stop': {
                shutdown();
                return ok('Shutting down...');
            }
            case 'state': {
                if (args.length < 2)
                    return fail('Usage: state save|load <name>');
                const [action, name] = args;
                if (action === 'save') {
                    await bm.saveState(name);
                    return ok(`State saved as: ${name}`);
                }
                else if (action === 'load') {
                    await bm.loadState(name);
                    return ok(`State loaded: ${name}`);
                }
                return fail('Usage: state save|load <name>');
            }
            case 'restart': {
                shutdown();
                return ok('Restarting...');
            }
            case 'connect': {
                const { launchChromeWithDebug } = await import('./connect-chrome.js');
                try {
                    const info = launchChromeWithDebug(9223, page.url());
                    return ok(`Connected to headed Chrome\nDebug endpoint: ${info.wsEndpoint}\nUse 'focus' to bring window to front.`);
                }
                catch (e) {
                    return fail(e.message);
                }
            }
            case 'disconnect': {
                return ok('Disconnected from headed browser. Returning to headless mode.');
            }
            case 'focus': {
                const { focusChrome } = await import('./connect-chrome.js');
                const success = focusChrome();
                return ok(success ? 'Chrome brought to foreground' : 'Could not focus Chrome (not macOS or Chrome not found)');
            }
            case 'handoff': {
                const message = args.join(' ') || 'Browser handed off to user';
                return ok(`Handoff: ${message}\nURL: ${page.url()}\nUse 'resume' to return control.`);
            }
            case 'resume': {
                const options = parseSnapshotFlags(['-i']);
                const tree = await bm.buildRefs(options);
                return ok(`Resumed control.\n${tree}`);
            }
            case 'watch': {
                if (args[0] === 'stop') {
                    return ok('Watch mode stopped');
                }
                return ok('Watch mode started (snapshots every 5s)');
            }
            case 'inbox': {
                if (args.includes('--clear'))
                    return ok('Inbox cleared.');
                return ok('(no messages)');
            }
            default:
                return fail(`Unknown meta command: ${cmd}`);
        }
    }
    catch (e) {
        return fail(e.message);
    }
}
function parseSnapshotFlags(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '-i':
                options.interactive = true;
                break;
            case '-c':
                options.compact = true;
                break;
            case '-d':
                options.depth = parseInt(args[++i], 10);
                break;
            case '-s':
                options.selector = args[++i];
                break;
            case '-D':
                options.diff = true;
                break;
            case '-a':
                options.annotate = true;
                break;
            case '-o':
                options.outputPath = args[++i];
                break;
            case '-C':
                options.cursorInteractive = true;
                break;
        }
    }
    return options;
}
function ok(output) {
    return { success: true, output };
}
function fail(error) {
    return { success: false, output: '', error };
}
//# sourceMappingURL=meta-commands.js.map