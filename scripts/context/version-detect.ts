/**
 * aing Version Detect v1.0.0
 * Detects project tech stack versions from package.json, requirements.txt, etc.
 * Used by worker prompts to ensure version-appropriate code generation.
 * @module scripts/context/version-detect
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLogger } from '../core/logger.js';

const log = createLogger('version-detect');

export interface TechStackVersion {
  name: string;       // e.g. "next", "react", "vue"
  version: string;    // e.g. "16.0.0", "19.2.0"
  major: number;
}

export interface DetectedStack {
  versions: TechStackVersion[];
  summary: string;   // 1-line summary for prompt injection
}

/**
 * Detect tech stack versions from the project directory.
 */
export function detectVersions(projectDir: string): DetectedStack {
  const versions: TechStackVersion[] = [];

  // package.json
  const pkgPath = join(projectDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      const KEY_PACKAGES = [
        'next', 'react', 'react-dom', 'vue', 'nuxt', 'svelte', '@sveltejs/kit',
        'angular', '@angular/core', 'typescript', 'tailwindcss',
        'express', 'fastify', 'hono', 'nestjs', '@nestjs/core',
        'prisma', '@prisma/client', 'drizzle-orm', 'mongoose',
        'vitest', 'jest', 'playwright', 'cypress',
        'vite', 'webpack', 'turbopack', 'rolldown',
      ];

      for (const pkg of KEY_PACKAGES) {
        const ver = deps[pkg];
        if (ver) {
          const clean = ver.replace(/^[\^~>=<]+/, '');
          const major = parseInt(clean.split('.')[0], 10);
          if (!isNaN(major)) {
            versions.push({ name: pkg, version: clean, major });
          }
        }
      }
    } catch (e) {
      log.info('Failed to parse package.json', { error: String(e) });
    }
  }

  // requirements.txt (Python)
  const reqPath = join(projectDir, 'requirements.txt');
  if (existsSync(reqPath)) {
    try {
      const content = readFileSync(reqPath, 'utf-8');
      const pyPackages = ['django', 'flask', 'fastapi', 'sqlalchemy', 'pydantic'];
      for (const line of content.split('\n')) {
        const match = line.match(/^([\w-]+)==([\d.]+)/);
        if (match && pyPackages.includes(match[1].toLowerCase())) {
          const major = parseInt(match[2].split('.')[0], 10);
          versions.push({ name: match[1], version: match[2], major });
        }
      }
    } catch { /* best-effort */ }
  }

  // Build summary
  const summary = versions.length > 0
    ? versions.map(v => `${v.name}@${v.version}`).join(', ')
    : 'no versions detected';

  log.info('Stack detected', { count: versions.length, summary });
  return { versions, summary };
}

/**
 * Generate a version-aware prompt snippet for agent workers.
 * Includes version warnings and doc lookup instructions.
 */
export function generateVersionContext(projectDir: string): string {
  const { versions, summary } = detectVersions(projectDir);
  if (versions.length === 0) return '';

  const lines: string[] = [
    `PROJECT TECH STACK: ${summary}`,
    `이 프로젝트의 정확한 버전에 맞는 API/패턴을 사용하세요.`,
    `레거시 방식이나 deprecated API는 사용하지 마세요.`,
  ];

  // Version-specific warnings
  for (const v of versions) {
    if (v.name === 'next' && v.major >= 15) {
      lines.push(`⚠ Next.js ${v.version}: App Router 기본. pages/ 대신 app/ 사용. Server Components 우선.`);
    }
    if (v.name === 'react' && v.major >= 19) {
      lines.push(`⚠ React ${v.version}: use() hook, Server Components, Actions API 사용 가능. class components 금지.`);
    }
    if (v.name === 'typescript' && v.major >= 5) {
      lines.push(`⚠ TypeScript ${v.version}: satisfies, const type params, decorators 사용 가능.`);
    }
    if (v.name === 'tailwindcss' && v.major >= 4) {
      lines.push(`⚠ Tailwind ${v.version}: v4 CSS-first config. tailwind.config.js 대신 CSS @theme 사용.`);
    }
    if (v.name === 'vue' && v.major >= 3) {
      lines.push(`⚠ Vue ${v.version}: Composition API 우선. Options API 지양.`);
    }
  }

  // Doc lookup instruction
  lines.push('');
  lines.push('DOC LOOKUP: 버전별 API가 불확실하면 반드시 공식 문서를 확인하세요:');
  lines.push('- context7 MCP 사용 가능 시: resolve-library-id → query-docs 순서로 조회');
  lines.push('- context7 없으면: WebSearch로 "{package} {version} docs {keyword}" 검색');
  lines.push('- 추측으로 API를 사용하지 마세요. 문서에서 확인 후 사용하세요.');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] && /version-detect\.(mjs|js)$/.test(process.argv[1])) {
  const dir = process.argv[2] || process.cwd();
  const result = detectVersions(dir);
  console.log(JSON.stringify(result, null, 2));
}
