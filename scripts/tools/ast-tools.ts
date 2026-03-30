/**
 * AST-based structural code search and replace using @ast-grep/napi.
 * Supports pattern matching with meta-variables ($VAR, $$$VARS).
 * @module scripts/tools/ast-tools
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

// ---------------------------------------------------------------------------
// Module loading — graceful degradation if @ast-grep/napi is unavailable
// ---------------------------------------------------------------------------

let sgModule: typeof import('@ast-grep/napi') | null = null;
let sgLoadFailed = false;
let sgLoadError = '';

async function getSg(): Promise<typeof import('@ast-grep/napi') | null> {
  if (sgLoadFailed) return null;
  if (sgModule) return sgModule;

  try {
    const req = createRequire(import.meta.url);
    sgModule = req('@ast-grep/napi') as typeof import('@ast-grep/napi');
  } catch {
    try {
      sgModule = await import('@ast-grep/napi');
    } catch (err) {
      sgLoadFailed = true;
      sgLoadError = err instanceof Error ? err.message : String(err);
      return null;
    }
  }
  return sgModule;
}

// ---------------------------------------------------------------------------
// Language support
// ---------------------------------------------------------------------------

const SUPPORTED_LANGS = [
  'typescript', 'javascript', 'tsx', 'jsx', 'css', 'html',
] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const EXT_TO_LANG: Record<string, SupportedLang> = {
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.tsx': 'tsx',
  '.jsx': 'jsx',
  '.css': 'css',
  '.html': 'html',
  '.htm': 'html',
};

function toLangEnum(
  sg: typeof import('@ast-grep/napi'),
  lang: string,
): import('@ast-grep/napi').Lang {
  const map: Record<string, import('@ast-grep/napi').Lang> = {
    typescript: sg.Lang.TypeScript,
    javascript: sg.Lang.JavaScript,
    tsx: sg.Lang.Tsx,
    jsx: sg.Lang.JavaScript, // ast-grep treats jsx as JS
    css: sg.Lang.Css,
    html: sg.Lang.Html,
  };
  const resolved = map[lang];
  if (!resolved) throw new Error(`Unsupported language: ${lang}`);
  return resolved;
}

function detectLang(filePath: string): SupportedLang | null {
  return EXT_TO_LANG[extname(filePath).toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv']);

function collectFiles(searchPath: string, lang: SupportedLang, maxFiles = 1000): string[] {
  const extensions = Object.entries(EXT_TO_LANG)
    .filter(([, l]) => l === lang)
    .map(([ext]) => ext);

  const resolved = resolve(searchPath);
  const stat = statSync(resolved);
  if (stat.isFile()) return [resolved];

  const results: string[] = [];

  function walk(dir: string): void {
    if (results.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= maxFiles) return;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile() && extensions.includes(extname(entry.name).toLowerCase())) {
        results.push(full);
      }
    }
  }

  walk(resolved);
  return results;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AstMatch {
  filePath: string;
  line: number;
  column: number;
  matchedText: string;
  surroundingCode: string;
}

export interface ReplaceResult {
  dryRun: boolean;
  totalReplacements: number;
  filesChanged: number;
  changes: Array<{
    filePath: string;
    line: number;
    before: string;
    after: string;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function surroundingLines(content: string, startLine: number, endLine: number, ctx = 3): string {
  const lines = content.split('\n');
  const from = Math.max(0, startLine - ctx - 1);
  const to = Math.min(lines.length, endLine + ctx);
  return lines
    .slice(from, to)
    .map((l, i) => {
      const num = from + i + 1;
      const marker = num >= startLine && num <= endLine ? '>' : ' ';
      return `${marker} ${String(num).padStart(4)}: ${l}`;
    })
    .join('\n');
}

// ---------------------------------------------------------------------------
// astGrepSearch
// ---------------------------------------------------------------------------

/**
 * Search code using ast-grep structural patterns.
 *
 * Meta-variables:
 *   $NAME  — matches any single AST node
 *   $$$    — matches multiple nodes (spread)
 *
 * Examples:
 *   "console.log($MSG)"            — all console.log calls
 *   "function $NAME($$$ARGS) {}" — all function declarations
 */
export async function astGrepSearch(
  pattern: string,
  options: { lang?: SupportedLang; path?: string } = {},
): Promise<AstMatch[]> {
  const sg = await getSg();
  if (!sg) {
    throw new Error(`@ast-grep/napi is not available: ${sgLoadError}`);
  }

  const searchPath = options.path ?? '.';
  const lang = options.lang ?? detectLang(searchPath) ?? 'typescript';

  const files = collectFiles(searchPath, lang);
  const results: AstMatch[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    let root;
    try {
      root = sg.parse(toLangEnum(sg, lang), content).root();
    } catch {
      continue;
    }

    let matches;
    try {
      matches = root.findAll(pattern);
    } catch {
      continue;
    }

    for (const m of matches) {
      const range = m.range();
      const startLine = range.start.line + 1;
      const endLine = range.end.line + 1;
      results.push({
        filePath,
        line: startLine,
        column: range.start.column,
        matchedText: m.text(),
        surroundingCode: surroundingLines(content, startLine, endLine),
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// astGrepReplace
// ---------------------------------------------------------------------------

/**
 * Structural search-and-replace using ast-grep patterns.
 *
 * Meta-variables captured in `pattern` are substituted into `replacement`.
 * Default: dryRun=true (preview only). Pass dryRun=false to write files.
 */
export async function astGrepReplace(
  pattern: string,
  replacement: string,
  options: { lang?: SupportedLang; path?: string; dryRun?: boolean } = {},
): Promise<ReplaceResult> {
  const sg = await getSg();
  if (!sg) {
    throw new Error(`@ast-grep/napi is not available: ${sgLoadError}`);
  }

  const searchPath = options.path ?? '.';
  const lang = options.lang ?? detectLang(searchPath) ?? 'typescript';
  const dryRun = options.dryRun ?? true;

  const files = collectFiles(searchPath, lang);

  const result: ReplaceResult = {
    dryRun,
    totalReplacements: 0,
    filesChanged: 0,
    changes: [],
  };

  for (const filePath of files) {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    let root;
    try {
      root = sg.parse(toLangEnum(sg, lang), content).root();
    } catch {
      continue;
    }

    let matches;
    try {
      matches = root.findAll(pattern);
    } catch {
      continue;
    }

    if (matches.length === 0) continue;

    // Collect edits sorted end→start to apply without index drift
    type Edit = { start: number; end: number; after: string; line: number; before: string };
    const edits: Edit[] = [];

    for (const m of matches) {
      const range = m.range();
      let finalReplacement = replacement;

      // Substitute captured meta-variables
      const metaVars = replacement.match(/\$\$?\$?[A-Z_][A-Z0-9_]*/g) ?? [];
      for (const mv of metaVars) {
        const varName = mv.replace(/^\$+/, '');
        try {
          const captured = m.getMatch(varName);
          if (captured) {
            const safe = captured.text().replace(/\$/g, '$$$$');
            finalReplacement = finalReplacement.replaceAll(mv, safe);
          }
        } catch {
          // leave meta-var as-is if capture fails
        }
      }

      edits.push({
        start: range.start.index,
        end: range.end.index,
        after: finalReplacement,
        line: range.start.line + 1,
        before: m.text(),
      });
    }

    edits.sort((a, b) => b.start - a.start);

    let newContent = content;
    for (const edit of edits) {
      newContent = newContent.slice(0, edit.start) + edit.after + newContent.slice(edit.end);
      result.changes.push({ filePath, line: edit.line, before: edit.before, after: edit.after });
      result.totalReplacements++;
    }

    if (!dryRun) {
      writeFileSync(filePath, newContent, 'utf-8');
    }
    result.filesChanged++;
  }

  return result;
}
