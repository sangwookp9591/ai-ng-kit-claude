/**
 * Cookie Import from Chromium browsers
 * Reads cookies from installed browser profiles on macOS.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

interface BrowserProfile {
  name: string;
  cookiePath: string;
}

export interface ImportedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  expires?: number;
}

const HOME = homedir();

// macOS Chromium browser cookie paths
const BROWSER_PROFILES: BrowserProfile[] = [
  {
    name: 'Chrome',
    cookiePath: join(HOME, 'Library/Application Support/Google/Chrome/Default/Cookies'),
  },
  {
    name: 'Chrome Canary',
    cookiePath: join(HOME, 'Library/Application Support/Google/Chrome Canary/Default/Cookies'),
  },
  {
    name: 'Chromium',
    cookiePath: join(HOME, 'Library/Application Support/Chromium/Default/Cookies'),
  },
  {
    name: 'Edge',
    cookiePath: join(HOME, 'Library/Application Support/Microsoft Edge/Default/Cookies'),
  },
  {
    name: 'Brave',
    cookiePath: join(HOME, 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies'),
  },
  {
    name: 'Arc',
    cookiePath: join(HOME, 'Library/Application Support/Arc/User Data/Default/Cookies'),
  },
];

/**
 * List installed browsers that have accessible cookie databases.
 */
export function listAvailableBrowsers(): string[] {
  return BROWSER_PROFILES
    .filter(p => existsSync(p.cookiePath))
    .map(p => p.name);
}

/**
 * Find browser profile by name (case-insensitive partial match).
 */
function findBrowser(name: string): BrowserProfile | null {
  const lower = name.toLowerCase();
  return BROWSER_PROFILES.find(p =>
    p.name.toLowerCase().includes(lower) && existsSync(p.cookiePath)
  ) ?? null;
}

/**
 * Import cookies from a browser's SQLite database.
 * Uses sqlite3 CLI tool (ships with macOS).
 *
 * NOTE: The browser must be closed for the cookie DB to be readable,
 * or we copy it first to avoid locking issues.
 */
export function importCookiesFromBrowser(
  browserName: string,
  domain?: string,
): ImportedCookie[] {
  const browser = findBrowser(browserName);
  if (!browser) {
    const available = listAvailableBrowsers();
    throw new Error(
      `Browser "${browserName}" not found. Available: ${available.join(', ') || 'none'}`,
    );
  }

  // Copy the database to avoid lock contention with running browser
  const tmpDb = `/tmp/aing-cookies-${Date.now()}.db`;
  try {
    execFileSync('cp', [browser.cookiePath, tmpDb], { stdio: 'pipe' });
  } catch {
    throw new Error(
      `Cannot read cookie database for ${browser.name}. ` +
      `The browser may be using an encrypted format. Try closing the browser first.`,
    );
  }

  try {
    // Build query
    let query = `SELECT host_key, name, value, path, is_secure, is_httponly, samesite, expires_utc FROM cookies`;
    if (domain) {
      // Match domain and subdomains
      const cleanDomain = domain.startsWith('.') ? domain : `.${domain}`;
      query += ` WHERE host_key = '${cleanDomain}' OR host_key = '${cleanDomain.slice(1)}'`;
    }
    query += ` LIMIT 1000;`;

    const result = execFileSync(
      'sqlite3',
      ['-json', tmpDb, query],
      { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 },
    ).toString().trim();

    if (!result || result === '[]') {
      return [];
    }

    const rows = JSON.parse(result) as Array<{
      host_key: string;
      name: string;
      value: string;
      path: string;
      is_secure: number;
      is_httponly: number;
      samesite: number;
      expires_utc: number;
    }>;

    return rows.map(row => ({
      name: row.name,
      value: row.value || '',  // encrypted cookies will have empty value
      domain: row.host_key,
      path: row.path || '/',
      secure: row.is_secure === 1,
      httpOnly: row.is_httponly === 1,
      sameSite: row.samesite === 0 ? undefined :
                row.samesite === 1 ? 'Lax' as const :
                row.samesite === 2 ? 'Strict' as const : 'None' as const,
      expires: row.expires_utc > 0
        ? Math.floor((row.expires_utc / 1000000) - 11644473600) // Chrome epoch -> Unix epoch
        : undefined,
    })).filter(c => c.value.length > 0); // Filter out encrypted/empty cookies
  } catch (e: any) {
    if (e.message?.includes('not found')) {
      throw new Error('sqlite3 not found. Install it or use macOS which includes it.');
    }
    throw new Error(`Failed to read cookies: ${e.message}`);
  } finally {
    // Clean up temp file
    try { execFileSync('rm', ['-f', tmpDb], { stdio: 'pipe' }); } catch { /* ignore */ }
  }
}
