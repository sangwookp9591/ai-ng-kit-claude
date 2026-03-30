/**
 * Connect Chrome — Launch or connect to a headed Chromium browser.
 * Enables real Chrome control for debugging, user takeover, and visual testing.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';

interface ChromeInfo {
  execPath: string;
  name: string;
}

/**
 * Find installed Chrome/Chromium executables on macOS.
 */
export function findChrome(): ChromeInfo | null {
  if (platform() !== 'darwin') {
    // Linux fallback
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    for (const p of linuxPaths) {
      if (existsSync(p)) return { execPath: p, name: 'Chrome' };
    }
    return null;
  }

  // macOS app paths
  const apps = [
    { path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', name: 'Chrome' },
    { path: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary', name: 'Chrome Canary' },
    { path: '/Applications/Chromium.app/Contents/MacOS/Chromium', name: 'Chromium' },
    { path: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', name: 'Edge' },
    { path: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', name: 'Brave' },
    { path: '/Applications/Arc.app/Contents/MacOS/Arc', name: 'Arc' },
  ];

  for (const app of apps) {
    if (existsSync(app.path)) return { execPath: app.path, name: app.name };
  }

  // Check user Applications
  const home = homedir();
  for (const app of apps) {
    const userPath = app.path.replace('/Applications/', join(home, 'Applications') + '/');
    if (existsSync(userPath)) return { execPath: userPath, name: app.name };
  }

  return null;
}

/**
 * Launch Chrome with remote debugging enabled.
 * Returns the CDP (Chrome DevTools Protocol) endpoint URL.
 *
 * Note: Uses execSync with shell deliberately — needs background process launch (&)
 * and curl for CDP endpoint discovery. All arguments are internal constants, not user input.
 */
export function launchChromeWithDebug(
  port: number = 9223,
  url?: string,
): { pid: number; wsEndpoint: string } {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error('No Chrome/Chromium browser found. Install Google Chrome.');
  }

  const args = [
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    url || 'about:blank',
  ];

  try {
    // Launch in background — requires shell for & operator
    const cmd = `"${chrome.execPath}" ${args.map(a => `"${a}"`).join(' ')} &`;
    execSync(cmd, { stdio: 'ignore', timeout: 5000 });
  } catch {
    // spawn may throw but the process still starts
  }

  // Wait for debugging port
  for (let i = 0; i < 20; i++) {
    try {
      const result = execSync(
        `curl -s http://127.0.0.1:${port}/json/version`,
        { stdio: 'pipe', timeout: 2000 },
      ).toString();
      const info = JSON.parse(result);
      return {
        pid: 0, // CDP doesn't expose PID directly
        wsEndpoint: info.webSocketDebuggerUrl || `ws://127.0.0.1:${port}`,
      };
    } catch {
      // Not ready yet
      execSync('sleep 0.5', { stdio: 'pipe' });
    }
  }

  throw new Error(`Chrome did not respond on port ${port} within 10 seconds`);
}

/**
 * Bring the Chrome window to the foreground (macOS).
 */
export function focusChrome(): boolean {
  if (platform() !== 'darwin') return false;

  try {
    execSync(
      `osascript -e 'tell application "Google Chrome" to activate'`,
      { stdio: 'pipe', timeout: 3000 },
    );
    return true;
  } catch {
    return false;
  }
}
