/**
 * aing Design Gallery
 * Generate visual gallery views of design system variants.
 * @module scripts/design/design-gallery
 */

import { createLogger } from '../core/logger.js';
import type { DesignSystem, DesignTokens } from './design-engine.js';

const log = createLogger('design-gallery');

export interface GalleryEntry {
  name: string;
  system: DesignSystem;
  thumbnail?: string;
  tags: string[];
  createdAt: string;
}

export interface Gallery {
  entries: GalleryEntry[];
  selectedIndex: number;
  sortBy: 'score' | 'name' | 'date';
}

/**
 * Create a new gallery from design system variants.
 */
export function createGallery(
  variants: Array<{ name: string; system: DesignSystem; tags?: string[] }>,
  sortBy: 'score' | 'name' | 'date' = 'score',
): Gallery {
  log.info(`Creating gallery with ${variants.length} variants`);

  const entries: GalleryEntry[] = variants.map(v => ({
    name: v.name,
    system: v.system,
    tags: v.tags ?? [v.system.brief.projectType, v.system.brief.darkMode ? 'dark' : 'light'],
    createdAt: v.system.generatedAt,
  }));

  sortGallery(entries, sortBy);

  return { entries, selectedIndex: 0, sortBy };
}

function sortGallery(entries: GalleryEntry[], sortBy: 'score' | 'name' | 'date'): void {
  switch (sortBy) {
    case 'score':
      entries.sort((a, b) => b.system.score.overall - a.system.score.overall);
      break;
    case 'name':
      entries.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'date':
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }
}

/**
 * Add a variant to the gallery.
 */
export function addToGallery(
  gallery: Gallery,
  name: string,
  system: DesignSystem,
  tags?: string[],
): Gallery {
  const entry: GalleryEntry = {
    name,
    system,
    tags: tags ?? [system.brief.projectType],
    createdAt: system.generatedAt,
  };
  const entries = [...gallery.entries, entry];
  sortGallery(entries, gallery.sortBy);
  return { ...gallery, entries };
}

/**
 * Filter gallery by tags.
 */
export function filterGallery(gallery: Gallery, tags: string[]): GalleryEntry[] {
  if (tags.length === 0) return gallery.entries;
  return gallery.entries.filter(e =>
    tags.some(t => e.tags.includes(t)),
  );
}

/**
 * Generate HTML preview for a color palette.
 */
export function generatePalettePreview(tokens: DesignTokens): string {
  const rows = tokens.colors.map(c =>
    `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">` +
    `<div style="width:32px;height:32px;border-radius:4px;background:${c.value};border:1px solid #333;"></div>` +
    `<code style="font-size:12px;color:#888;">${c.name}</code>` +
    `<span style="font-size:12px;color:#666;">${c.value}</span>` +
    `</div>`,
  ).join('\n');

  return `<div style="font-family:monospace;padding:16px;background:#111;border-radius:8px;">\n${rows}\n</div>`;
}

/**
 * Generate markdown gallery view.
 */
export function formatGallery(gallery: Gallery): string {
  const lines: string[] = [];
  lines.push(`## Design Gallery (${gallery.entries.length} variants)\n`);
  lines.push(`Sorted by: ${gallery.sortBy}\n`);

  lines.push('| # | Name | Type | Mode | Score | Colors | Components | Tags |');
  lines.push('|---|------|------|------|-------|--------|------------|------|');

  for (let i = 0; i < gallery.entries.length; i++) {
    const e = gallery.entries[i];
    const s = e.system;
    const selected = i === gallery.selectedIndex ? '→' : ' ';
    lines.push(
      `| ${selected}${i + 1} | ${e.name} | ${s.brief.projectType} | ` +
      `${s.brief.darkMode ? '🌙' : '☀️'} | ${s.score.overall}/10 | ` +
      `${s.tokens.colors.length} | ${s.components.length} | ${e.tags.join(', ')} |`,
    );
  }

  // Detail section for selected entry
  if (gallery.entries.length > 0) {
    const selected = gallery.entries[gallery.selectedIndex];
    lines.push('');
    lines.push(`### Selected: ${selected.name}`);
    lines.push('');
    lines.push('**Color Palette:**');
    for (const c of selected.system.tokens.colors.slice(0, 8)) {
      lines.push(`- \`${c.name}\`: ${c.value} — ${c.usage}`);
    }
    if (selected.system.tokens.colors.length > 8) {
      lines.push(`  ... and ${selected.system.tokens.colors.length - 8} more`);
    }
    lines.push('');
    lines.push('**Components:**');
    const grouped = new Map<string, string[]>();
    for (const comp of selected.system.components) {
      const list = grouped.get(comp.category) ?? [];
      list.push(comp.name);
      grouped.set(comp.category, list);
    }
    for (const [cat, names] of grouped) {
      lines.push(`- ${cat}: ${names.join(', ')}`);
    }
  }

  return lines.join('\n');
}
