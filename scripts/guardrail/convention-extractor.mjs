/**
 * sw-kit Convention Extractor v0.5.0
 * Auto-detect coding patterns from codebase structure.
 * Harness Engineering: Inform axis — auto-learn project rules.
 * @module scripts/guardrail/convention-extractor
 */

import { addMemoryEntry, loadMemory, saveMemory } from '../memory/project-memory.mjs';
import { createLogger } from '../core/logger.mjs';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const log = createLogger('convention-extractor');

/**
 * Detect conventions from project structure.
 * @param {string} [projectDir]
 * @returns {object} Detected conventions
 */
export function extractConventions(projectDir) {
  const dir = projectDir || process.cwd();
  const conventions = {
    language: null,
    moduleSystem: null,
    indent: null,
    naming: null,
    framework: null,
    packageManager: null,
    testFramework: null,
    linter: null,
    typescript: false
  };

  // Detect from config files
  conventions.packageManager = detectPackageManager(dir);
  conventions.framework = detectFramework(dir);
  conventions.typescript = existsSync(join(dir, 'tsconfig.json'));
  conventions.linter = detectLinter(dir);
  conventions.testFramework = detectTestFramework(dir);

  // Detect from package.json
  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      conventions.moduleSystem = pkg.type === 'module' ? 'ESM' : 'CommonJS';
      conventions.language = conventions.typescript ? 'TypeScript' : 'JavaScript';

      // Detect from dependencies
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (allDeps['react']) conventions.framework = conventions.framework || 'React';
      if (allDeps['next']) conventions.framework = 'Next.js';
      if (allDeps['vue']) conventions.framework = 'Vue';
      if (allDeps['svelte']) conventions.framework = 'Svelte';
      if (allDeps['express']) conventions.framework = conventions.framework || 'Express';
    } catch (_) { /* best effort */ }
  }

  // Detect from pom.xml (Java/Spring)
  if (existsSync(join(dir, 'pom.xml'))) {
    conventions.language = 'Java';
    conventions.framework = 'Spring Boot';
    conventions.moduleSystem = 'Maven';
  }

  // Detect from build.gradle
  if (existsSync(join(dir, 'build.gradle')) || existsSync(join(dir, 'build.gradle.kts'))) {
    conventions.language = conventions.language || 'Java/Kotlin';
    conventions.moduleSystem = 'Gradle';
  }

  // Detect from requirements.txt / pyproject.toml
  if (existsSync(join(dir, 'requirements.txt')) || existsSync(join(dir, 'pyproject.toml'))) {
    conventions.language = 'Python';
    if (existsSync(join(dir, 'pyproject.toml'))) {
      conventions.moduleSystem = 'pyproject';
    }
  }

  // Detect from go.mod
  if (existsSync(join(dir, 'go.mod'))) {
    conventions.language = 'Go';
    conventions.moduleSystem = 'Go Modules';
  }

  // Detect indent from .editorconfig or sample files
  conventions.indent = detectIndent(dir);

  // Detect naming from file structure
  conventions.naming = detectNaming(dir);

  return conventions;
}

/**
 * Extract conventions and save to project memory.
 * @param {string} [projectDir]
 * @returns {object} Extracted conventions
 */
export function extractAndSave(projectDir) {
  const conventions = extractConventions(projectDir);
  const memory = loadMemory(projectDir);

  memory.techStack = {
    language: conventions.language,
    framework: conventions.framework,
    moduleSystem: conventions.moduleSystem,
    typescript: conventions.typescript,
    packageManager: conventions.packageManager,
    testFramework: conventions.testFramework,
    linter: conventions.linter
  };

  memory.conventions = {
    indent: conventions.indent,
    naming: conventions.naming,
    extractedAt: new Date().toISOString()
  };

  saveMemory(memory, projectDir);
  log.info('Conventions extracted and saved', conventions);

  return conventions;
}

/**
 * Format conventions for context injection.
 * @param {object} conventions
 * @returns {string}
 */
export function formatConventions(conventions) {
  const parts = [];
  if (conventions.language) parts.push(`Lang: ${conventions.language}`);
  if (conventions.framework) parts.push(`Framework: ${conventions.framework}`);
  if (conventions.moduleSystem) parts.push(`Modules: ${conventions.moduleSystem}`);
  if (conventions.indent) parts.push(`Indent: ${conventions.indent}`);
  if (conventions.naming) parts.push(`Naming: ${conventions.naming}`);
  if (conventions.packageManager) parts.push(`PM: ${conventions.packageManager}`);
  if (conventions.testFramework) parts.push(`Test: ${conventions.testFramework}`);
  if (conventions.linter) parts.push(`Lint: ${conventions.linter}`);

  return parts.length > 0 ? `[Conventions] ${parts.join(' | ')}` : '';
}

// --- Detection helpers ---

function detectPackageManager(dir) {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(dir, 'bun.lockb'))) return 'bun';
  if (existsSync(join(dir, 'package-lock.json'))) return 'npm';
  return null;
}

function detectFramework(dir) {
  if (existsSync(join(dir, 'next.config.ts')) || existsSync(join(dir, 'next.config.js')) || existsSync(join(dir, 'next.config.mjs'))) return 'Next.js';
  if (existsSync(join(dir, 'nuxt.config.ts'))) return 'Nuxt';
  if (existsSync(join(dir, 'svelte.config.js'))) return 'SvelteKit';
  if (existsSync(join(dir, 'astro.config.mjs'))) return 'Astro';
  if (existsSync(join(dir, 'vite.config.ts')) || existsSync(join(dir, 'vite.config.js'))) return 'Vite';
  if (existsSync(join(dir, 'pubspec.yaml'))) return 'Flutter';
  return null;
}

function detectLinter(dir) {
  if (existsSync(join(dir, 'eslint.config.js')) || existsSync(join(dir, 'eslint.config.mjs')) || existsSync(join(dir, '.eslintrc.json')) || existsSync(join(dir, '.eslintrc.js'))) return 'ESLint';
  if (existsSync(join(dir, 'biome.json'))) return 'Biome';
  if (existsSync(join(dir, '.prettierrc')) || existsSync(join(dir, '.prettierrc.json'))) return 'Prettier';
  return null;
}

function detectTestFramework(dir) {
  if (existsSync(join(dir, 'jest.config.js')) || existsSync(join(dir, 'jest.config.ts'))) return 'Jest';
  if (existsSync(join(dir, 'vitest.config.ts')) || existsSync(join(dir, 'vitest.config.js'))) return 'Vitest';
  if (existsSync(join(dir, 'playwright.config.ts'))) return 'Playwright';
  if (existsSync(join(dir, 'cypress.config.ts')) || existsSync(join(dir, 'cypress.config.js'))) return 'Cypress';
  if (existsSync(join(dir, 'pytest.ini')) || existsSync(join(dir, 'conftest.py'))) return 'pytest';
  return null;
}

function detectIndent(dir) {
  const editorconfig = join(dir, '.editorconfig');
  if (existsSync(editorconfig)) {
    try {
      const content = readFileSync(editorconfig, 'utf-8');
      if (content.includes('indent_style = tab')) return 'tabs';
      const sizeMatch = content.match(/indent_size\s*=\s*(\d+)/);
      if (sizeMatch) return `${sizeMatch[1]} spaces`;
    } catch (_) {}
  }
  return null;
}

function detectNaming(dir) {
  const srcDir = join(dir, 'src');
  if (!existsSync(srcDir)) return null;

  try {
    const files = readdirSync(srcDir).filter(f => {
      const stat = statSync(join(srcDir, f));
      return stat.isFile() && /\.(ts|js|tsx|jsx)$/.test(f);
    }).slice(0, 10);

    const hasKebab = files.some(f => f.includes('-'));
    const hasCamel = files.some(f => /^[a-z][a-zA-Z]+\./.test(f));
    const hasPascal = files.some(f => /^[A-Z][a-zA-Z]+\./.test(f));

    if (hasPascal && hasKebab) return 'PascalCase (components) + kebab-case (utils)';
    if (hasPascal) return 'PascalCase';
    if (hasCamel) return 'camelCase';
    if (hasKebab) return 'kebab-case';
  } catch (_) {}

  return null;
}
