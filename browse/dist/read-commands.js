import { readFileSync } from 'node:fs';
import path from 'node:path';
export async function handleReadCommand(cmd, args, bm) {
    const page = bm.getActivePage();
    try {
        switch (cmd) {
            case 'url': {
                return ok(page.url());
            }
            case 'text': {
                const text = await page.innerText('body');
                return ok(text);
            }
            case 'html': {
                const selector = args[0] || 'html';
                const html = await page.innerHTML(selector);
                return ok(html);
            }
            case 'links': {
                const links = await page.evaluate(() => {
                    const anchors = document.querySelectorAll('a[href]');
                    return Array.from(anchors).map((a) => {
                        const el = a;
                        return `${(el.textContent || '').trim()} → ${el.href}`;
                    });
                });
                return ok(links.join('\n') || '(no links found)');
            }
            case 'forms': {
                const forms = await page.evaluate(() => {
                    const allForms = document.querySelectorAll('form');
                    return Array.from(allForms).map((form, i) => {
                        const fields = Array.from(form.querySelectorAll('input, select, textarea')).map((el) => ({
                            tag: el.tagName.toLowerCase(),
                            type: el.type || undefined,
                            name: el.name || undefined,
                            id: el.id || undefined,
                            value: el.value || undefined,
                            placeholder: el.placeholder || undefined,
                        }));
                        return {
                            index: i,
                            action: form.action || undefined,
                            method: form.method || 'get',
                            fields,
                        };
                    });
                });
                return ok(JSON.stringify(forms, null, 2));
            }
            case 'accessibility': {
                const snapshot = await page.locator('body').ariaSnapshot({ timeout: 10_000 });
                return ok(snapshot || '(empty)');
            }
            case 'js': {
                const expr = args.join(' ');
                if (!expr)
                    return fail('Usage: js <expression>');
                const result = await page.evaluate(expr);
                const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result ?? 'undefined');
                return ok(output);
            }
            case 'css': {
                if (args.length < 2)
                    return fail('Usage: css <selector> <property>');
                const [selector, property] = [args[0], args.slice(1).join(' ')];
                const value = await page.evaluate(({ sel, prop }) => {
                    const el = document.querySelector(sel);
                    if (!el)
                        return null;
                    return getComputedStyle(el).getPropertyValue(prop);
                }, { sel: selector, prop: property });
                if (value === null)
                    return fail(`Element not found: ${selector}`);
                return ok(value);
            }
            case 'attrs': {
                if (args.length < 1)
                    return fail('Usage: attrs <selector|@ref>');
                const target = args[0];
                let selector = target;
                // If it's a @ref, resolve it and get attributes via evaluate
                if (target.startsWith('@')) {
                    try {
                        const locator = await bm.resolveRef(target);
                        const attrs = await locator.first().evaluate((el) => {
                            const result = {};
                            for (const attr of el.attributes) {
                                result[attr.name] = attr.value;
                            }
                            return result;
                        });
                        return ok(JSON.stringify(attrs, null, 2));
                    }
                    catch (e) {
                        return fail(e.message);
                    }
                }
                const attrs = await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (!el)
                        return null;
                    const result = {};
                    for (const attr of el.attributes) {
                        result[attr.name] = attr.value;
                    }
                    return result;
                }, selector);
                if (attrs === null)
                    return fail(`Element not found: ${selector}`);
                return ok(JSON.stringify(attrs, null, 2));
            }
            case 'console': {
                if (args.includes('--clear')) {
                    bm.clearConsole();
                    return ok('Console buffer cleared.');
                }
                const errorsOnly = args.includes('--errors');
                const entries = bm.getConsoleEntries(errorsOnly);
                if (entries.length === 0)
                    return ok('(no console messages)');
                const lines = entries.map((e) => `[${e.level}] ${e.message}${e.source ? ` (${e.source})` : ''}`);
                return ok(lines.join('\n'));
            }
            case 'network': {
                if (args.includes('--clear')) {
                    bm.clearNetwork();
                    return ok('Network buffer cleared.');
                }
                const entries = bm.getNetworkEntries();
                if (entries.length === 0)
                    return ok('(no network requests)');
                const lines = entries.map((e) => `${e.method} ${e.status} ${e.url}${e.duration ? ` (${e.duration}ms)` : ''}`);
                return ok(lines.join('\n'));
            }
            case 'cookies': {
                const ctx = bm.getContext();
                if (!ctx)
                    return fail('No browser context');
                const cookies = await ctx.cookies();
                return ok(JSON.stringify(cookies, null, 2));
            }
            case 'storage': {
                // storage set k v
                if (args[0] === 'set' && args.length >= 3) {
                    const key = args[1];
                    const value = args.slice(2).join(' ');
                    await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value });
                    return ok(`Set localStorage["${key}"] = "${value}"`);
                }
                const data = await page.evaluate(() => {
                    const ls = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        ls[k] = localStorage.getItem(k);
                    }
                    const ss = {};
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const k = sessionStorage.key(i);
                        ss[k] = sessionStorage.getItem(k);
                    }
                    return { localStorage: ls, sessionStorage: ss };
                });
                return ok(JSON.stringify(data, null, 2));
            }
            case 'perf': {
                const timings = await page.evaluate(() => {
                    const nav = performance.getEntriesByType('navigation')[0];
                    if (!nav)
                        return { error: 'No navigation timing available' };
                    return {
                        dnsLookup: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
                        tcpConnect: Math.round(nav.connectEnd - nav.connectStart),
                        ttfb: Math.round(nav.responseStart - nav.requestStart),
                        download: Math.round(nav.responseEnd - nav.responseStart),
                        domInteractive: Math.round(nav.domInteractive - nav.fetchStart),
                        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
                        loadComplete: Math.round(nav.loadEventEnd - nav.fetchStart),
                        transferSize: nav.transferSize,
                    };
                });
                return ok(JSON.stringify(timings, null, 2));
            }
            case 'is': {
                if (args.length < 2)
                    return fail('Usage: is <state> <selector>');
                const state = args[0];
                const sel = args.slice(1).join(' ');
                let locator = page.locator(sel);
                // Resolve @ref
                if (sel.startsWith('@')) {
                    locator = await bm.resolveRef(sel);
                }
                let result;
                switch (state) {
                    case 'visible':
                        result = await locator.first().isVisible({ timeout: 3_000 });
                        break;
                    case 'hidden':
                        result = !(await locator.first().isVisible({ timeout: 3_000 }));
                        break;
                    case 'enabled':
                        result = await locator.first().isEnabled({ timeout: 3_000 });
                        break;
                    case 'disabled':
                        result = await locator.first().isDisabled({ timeout: 3_000 });
                        break;
                    case 'checked':
                        result = await locator.first().isChecked({ timeout: 3_000 });
                        break;
                    case 'editable':
                        result = await locator.first().isEditable({ timeout: 3_000 });
                        break;
                    case 'focused':
                        result = await locator.first().evaluate((el) => el === document.activeElement);
                        break;
                    default:
                        return fail(`Unknown state: ${state}. Use: visible|hidden|enabled|disabled|checked|editable|focused`);
                }
                return ok(result ? 'true' : 'false');
            }
            case 'dialog': {
                if (args.includes('--clear')) {
                    bm.clearDialogs();
                    return ok('Dialog buffer cleared.');
                }
                const entries = bm.getDialogEntries();
                if (entries.length === 0)
                    return ok('(no dialogs)');
                const lines = entries.map((e) => `[${e.type}] ${e.message}${e.defaultValue ? ` (default: ${e.defaultValue})` : ''}`);
                return ok(lines.join('\n'));
            }
            case 'eval': {
                if (args.length < 1)
                    return fail('Usage: eval <file>');
                const filePath = args[0];
                const resolved = path.resolve(filePath);
                if (!resolved.startsWith('/tmp') && !resolved.startsWith(process.cwd())) {
                    return fail('eval only allows files under /tmp or current working directory');
                }
                const code = readFileSync(resolved, 'utf-8');
                const result = await page.evaluate(code);
                const output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result ?? 'undefined');
                return ok(output);
            }
            default:
                return fail(`Unknown read command: ${cmd}`);
        }
    }
    catch (e) {
        return fail(e.message);
    }
}
function ok(output) {
    return { success: true, output };
}
function fail(error) {
    return { success: false, output: '', error };
}
//# sourceMappingURL=read-commands.js.map