import { readFileSync } from 'node:fs';
import type { BrowserManager } from './browser-manager.js';
import type { CommandResult } from './types.js';

export async function handleWriteCommand(
  cmd: string,
  args: string[],
  bm: BrowserManager,
): Promise<CommandResult> {
  const page = bm.getActivePage();

  try {
    switch (cmd) {
      case 'goto': {
        if (args.length < 1) return fail('Usage: goto <url>');
        const { sanitizeUrl } = await import('./url-validation.js');
        let url: string;
        try {
          url = sanitizeUrl(args[0]);
        } catch (e: any) {
          return fail(e.message);
        }
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        const status = response?.status() ?? 'unknown';
        const title = await page.title().catch(() => '');
        return ok(`Navigated to ${url} (${status})${title ? ` — ${title}` : ''}`);
      }

      case 'back': {
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 });
        return ok(`Back → ${page.url()}`);
      }

      case 'forward': {
        await page.goForward({ waitUntil: 'domcontentloaded', timeout: 15_000 });
        return ok(`Forward → ${page.url()}`);
      }

      case 'reload': {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 });
        return ok(`Reloaded → ${page.url()}`);
      }

      case 'click': {
        if (args.length < 1) return fail('Usage: click <selector|@ref>');
        const target = args.join(' ');
        if (target.startsWith('@')) {
          const locator = await bm.resolveRef(target);
          await locator.first().click({ timeout: 10_000 });
        } else {
          await page.click(target, { timeout: 10_000 });
        }
        return ok(`Clicked: ${target}`);
      }

      case 'fill': {
        if (args.length < 2) return fail('Usage: fill <selector|@ref> <value>');
        const target = args[0];
        const value = args.slice(1).join(' ');
        if (target.startsWith('@')) {
          const locator = await bm.resolveRef(target);
          await locator.first().fill(value, { timeout: 10_000 });
        } else {
          await page.fill(target, value, { timeout: 10_000 });
        }
        return ok(`Filled "${target}" with: ${value}`);
      }

      case 'select': {
        if (args.length < 2) return fail('Usage: select <selector|@ref> <value>');
        const target = args[0];
        const value = args.slice(1).join(' ');
        if (target.startsWith('@')) {
          const locator = await bm.resolveRef(target);
          await locator.first().selectOption(value, { timeout: 10_000 });
        } else {
          await page.selectOption(target, value, { timeout: 10_000 });
        }
        return ok(`Selected "${value}" in ${target}`);
      }

      case 'hover': {
        if (args.length < 1) return fail('Usage: hover <selector|@ref>');
        const target = args.join(' ');
        if (target.startsWith('@')) {
          const locator = await bm.resolveRef(target);
          await locator.first().hover({ timeout: 10_000 });
        } else {
          await page.hover(target, { timeout: 10_000 });
        }
        return ok(`Hovered: ${target}`);
      }

      case 'type': {
        if (args.length < 1) return fail('Usage: type <text>');
        const text = args.join(' ');
        await page.keyboard.type(text, { delay: 30 });
        return ok(`Typed: ${text}`);
      }

      case 'press': {
        if (args.length < 1) return fail('Usage: press <key>');
        const key = args.join('+');
        await page.keyboard.press(key);
        return ok(`Pressed: ${key}`);
      }

      case 'scroll': {
        if (args.length === 0) {
          // Scroll to bottom
          await page.evaluate(() => window.scrollBy(0, window.innerHeight));
          return ok('Scrolled down one viewport');
        }
        const target = args.join(' ');
        if (target === 'top') {
          await page.evaluate(() => window.scrollTo(0, 0));
          return ok('Scrolled to top');
        }
        if (target === 'bottom') {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          return ok('Scrolled to bottom');
        }
        if (target.startsWith('@')) {
          const locator = await bm.resolveRef(target);
          await locator.first().scrollIntoViewIfNeeded({ timeout: 10_000 });
        } else {
          await page.locator(target).first().scrollIntoViewIfNeeded({ timeout: 10_000 });
        }
        return ok(`Scrolled into view: ${target}`);
      }

      case 'wait': {
        if (args.length < 1) return fail('Usage: wait <selector|--networkidle|--load>');
        const target = args[0];
        if (target === '--networkidle') {
          await page.waitForLoadState('networkidle', { timeout: 30_000 });
          return ok('Network idle');
        }
        if (target === '--load') {
          await page.waitForLoadState('load', { timeout: 30_000 });
          return ok('Page loaded');
        }
        // Numeric = wait ms
        const ms = parseInt(target, 10);
        if (!isNaN(ms) && String(ms) === target) {
          await page.waitForTimeout(ms);
          return ok(`Waited ${ms}ms`);
        }
        // CSS selector
        await page.waitForSelector(target, { timeout: 30_000 });
        return ok(`Element appeared: ${target}`);
      }

      case 'upload': {
        if (args.length < 2) return fail('Usage: upload <selector> <file> [file2...]');
        const selector = args[0];
        const files = args.slice(1);
        const input = page.locator(selector);
        await input.setInputFiles(files, { timeout: 10_000 });
        return ok(`Uploaded ${files.length} file(s) to ${selector}`);
      }

      case 'viewport': {
        if (args.length < 1) return fail('Usage: viewport <WxH>');
        const match = args[0].match(/^(\d+)x(\d+)$/i);
        if (!match) return fail('Format: WxH (e.g., 1920x1080)');
        const width = parseInt(match[1], 10);
        const height = parseInt(match[2], 10);
        await page.setViewportSize({ width, height });
        return ok(`Viewport set to ${width}x${height}`);
      }

      case 'cookie': {
        if (args.length < 1) return fail('Usage: cookie <name>=<value>');
        const eqIdx = args[0].indexOf('=');
        if (eqIdx === -1) return fail('Format: name=value');
        const name = args[0].slice(0, eqIdx);
        const value = args[0].slice(eqIdx + 1);
        const ctx = bm.getContext();
        if (!ctx) return fail('No browser context');
        const url = page.url();
        await ctx.addCookies([{ name, value, url }]);
        return ok(`Cookie set: ${name}=${value}`);
      }

      case 'header': {
        if (args.length < 1) return fail('Usage: header <name>:<value>');
        const full = args.join(' ');
        const colonIdx = full.indexOf(':');
        if (colonIdx === -1) return fail('Format: name:value');
        const name = full.slice(0, colonIdx).trim();
        const value = full.slice(colonIdx + 1).trim();
        await bm.setCustomHeader(name, value);
        return ok(`Header set: ${name}: ${value}`);
      }

      case 'dialog-accept': {
        const text = args.length > 0 ? args.join(' ') : undefined;
        bm.setDialogBehavior('accept', text);
        return ok(`Next dialog will be accepted${text ? ` with text: ${text}` : ''}`);
      }

      case 'dialog-dismiss': {
        bm.setDialogBehavior('dismiss');
        return ok('Next dialog will be dismissed');
      }

      case 'useragent': {
        if (args.length < 1) return fail('Usage: useragent <string>');
        const ua = args.join(' ');
        await bm.setUserAgent(ua);
        return ok(`User agent set to: ${ua}`);
      }

      case 'cookie-import': {
        if (args.length < 1) return fail('Usage: cookie-import <json-path>');
        const filePath = args[0];
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        const cookies = Array.isArray(data) ? data : [data];
        await bm.importCookies(cookies);
        return ok(`Imported ${cookies.length} cookie(s)`);
      }

      case 'cookie-import-browser': {
        const { importCookiesFromBrowser, listAvailableBrowsers } = await import('./cookie-import-browser.js');

        let browserName = 'chrome';
        let domain: string | undefined;

        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--domain' && i + 1 < args.length) {
            domain = args[++i];
          } else {
            browserName = args[i];
          }
        }

        if (browserName === 'list') {
          const browsers = listAvailableBrowsers();
          return ok(`Available browsers:\n${browsers.map(b => `  - ${b}`).join('\n') || '  (none found)'}`);
        }

        try {
          const cookies = importCookiesFromBrowser(browserName, domain);
          if (cookies.length === 0) {
            return ok(`No cookies found${domain ? ` for ${domain}` : ''}`);
          }
          const ctx = bm.getContext();
          if (!ctx) return fail('No browser context');
          await ctx.addCookies(cookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            httpOnly: c.httpOnly,
            sameSite: c.sameSite,
            expires: c.expires,
          })));
          return ok(`Imported ${cookies.length} cookie(s) from ${browserName}${domain ? ` (domain: ${domain})` : ''}`);
        } catch (e: any) {
          return fail(e.message);
        }
      }

      case 'frame': {
        if (args.length < 1) return fail('Usage: frame <sel|@ref|--name n|--url pattern|main>');
        const target = args[0];
        if (target === 'main') {
          bm.switchToMainFrame();
          return ok('Switched to main frame');
        }
        if (target === '--name') {
          if (args.length < 2) return fail('Usage: frame --name <name>');
          await bm.switchToFrameByName(args[1]);
          return ok(`Switched to frame: ${args[1]}`);
        }
        if (target === '--url') {
          if (args.length < 2) return fail('Usage: frame --url <pattern>');
          await bm.switchToFrameByUrl(args[1]);
          return ok(`Switched to frame matching URL: ${args[1]}`);
        }
        await bm.switchToFrame(target);
        return ok(`Switched to frame: ${target}`);
      }

      default:
        return fail(`Unknown write command: ${cmd}`);
    }
  } catch (e: any) {
    return fail(e.message);
  }
}

function ok(output: string): CommandResult {
  return { success: true, output };
}

function fail(error: string): CommandResult {
  return { success: false, output: '', error };
}
