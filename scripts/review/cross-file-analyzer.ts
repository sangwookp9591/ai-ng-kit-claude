/**
 * aing Cross-File Analyzer — Import graph analysis, circular dep detection
 *
 * C1-ZeroDep: regex-only, no AST parser.
 * Timeout: 10s safety guard.
 *
 * @module scripts/review/cross-file-analyzer
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export interface ImportEdge {
  source: string;
  target: string;
  specifiers: string[];
}

export interface CrossFileResult {
  imports: ImportEdge[];
  circularDeps: string[][];
  unusedExports: Array<{ file: string; export: string }>;
  depth: number;
}

const IMPORT_REGEX = /import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
const EXPORT_REGEX = /export\s+(?:(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)|(?:\{([^}]+)\}))/g;

function resolveImportPath(source: string, importPath: string): string | null {
  if (!importPath.startsWith('.')) return null; // Skip node_modules / absolute
  const base = dirname(source);

  // ESM pattern: import './foo.js' → try ./foo.ts first
  if (importPath.endsWith('.js')) {
    const tsPath = resolve(base, importPath.replace(/\.js$/, '.ts'));
    if (existsSync(tsPath)) return tsPath;
    const tsxPath = resolve(base, importPath.replace(/\.js$/, '.tsx'));
    if (existsSync(tsxPath)) return tsxPath;
  }

  const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
  for (const ext of extensions) {
    const candidate = resolve(base, importPath + ext);
    if (existsSync(candidate)) return candidate;
    const indexCandidate = resolve(base, importPath, 'index' + ext);
    if (existsSync(indexCandidate)) return indexCandidate;
  }
  return resolve(base, importPath); // best-guess even if not found
}

function parseImports(filePath: string): Array<{ target: string; specifiers: string[] }> {
  if (!existsSync(filePath)) return [];
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const results: Array<{ target: string; specifiers: string[] }> = [];
  let match: RegExpExecArray | null;
  IMPORT_REGEX.lastIndex = 0;
  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const namedGroup = match[1];
    const starAlias = match[2];
    const defaultImport = match[3];
    const importPath = match[4];

    const specifiers: string[] = [];
    if (namedGroup) {
      specifiers.push(
        ...namedGroup
          .split(',')
          .map(s => s.trim().split(/\s+as\s+/)[0].trim())
          .filter(Boolean),
      );
    } else if (starAlias) {
      specifiers.push(`* as ${starAlias}`);
    } else if (defaultImport) {
      specifiers.push(defaultImport);
    }

    results.push({ target: importPath, specifiers });
  }
  return results;
}

function parseExports(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  const exports: string[] = [];
  let match: RegExpExecArray | null;
  EXPORT_REGEX.lastIndex = 0;
  while ((match = EXPORT_REGEX.exec(content)) !== null) {
    if (match[1]) {
      exports.push(match[1]);
    } else if (match[2]) {
      const named = match[2]
        .split(',')
        .map(s => s.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      exports.push(...named);
    }
  }
  return exports;
}

/**
 * Detect circular dependencies in import graph.
 */
export function detectCircularDeps(imports: ImportEdge[]): string[][] {
  const graph = new Map<string, Set<string>>();
  for (const edge of imports) {
    if (!graph.has(edge.source)) graph.set(edge.source, new Set());
    graph.get(edge.source)!.add(edge.target);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), node]);
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        dfs(neighbor, path);
      }
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Analyze import graph across given files.
 * BFS traversal up to maxDepth; visited set prevents infinite loops.
 */
export function analyzeImports(
  filePaths: string[],
  _projectDir: string,
  maxDepth: number = 3,
): CrossFileResult {
  const deadline = Date.now() + 10_000; // 10s safety guard

  const allImports: ImportEdge[] = [];
  const visited = new Set<string>();
  const queue: Array<{ file: string; depth: number }> = filePaths.map(f => ({
    file: f,
    depth: 0,
  }));
  let maxReachedDepth = 0;

  const fileExports = new Map<string, string[]>();
  const importedSymbols = new Map<string, Set<string>>();

  while (queue.length > 0) {
    if (Date.now() > deadline) break; // graceful timeout fallback

    const item = queue.shift()!;
    const { file, depth } = item;

    if (visited.has(file)) continue;
    visited.add(file);

    if (depth > maxReachedDepth) maxReachedDepth = depth;
    if (depth >= maxDepth) continue;

    const rawImports = parseImports(file);
    const exports = parseExports(file);
    fileExports.set(file, exports);

    for (const raw of rawImports) {
      const resolvedTarget = resolveImportPath(file, raw.target);
      if (!resolvedTarget) continue;

      const edge: ImportEdge = {
        source: file,
        target: resolvedTarget,
        specifiers: raw.specifiers,
      };
      allImports.push(edge);

      if (!importedSymbols.has(resolvedTarget)) {
        importedSymbols.set(resolvedTarget, new Set());
      }
      for (const spec of raw.specifiers) {
        importedSymbols.get(resolvedTarget)!.add(spec);
      }

      if (!visited.has(resolvedTarget)) {
        queue.push({ file: resolvedTarget, depth: depth + 1 });
      }
    }
  }

  const unusedExports: Array<{ file: string; export: string }> = [];
  for (const [file, exports] of fileExports.entries()) {
    const imported = importedSymbols.get(file) || new Set();
    for (const exp of exports) {
      if (!imported.has(exp)) {
        unusedExports.push({ file, export: exp });
      }
    }
  }

  const circularDeps = detectCircularDeps(allImports);

  return {
    imports: allImports,
    circularDeps,
    unusedExports,
    depth: maxReachedDepth,
  };
}
