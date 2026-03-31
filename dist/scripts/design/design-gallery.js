/**
 * aing Design Gallery
 * Generate visual gallery views of design system variants.
 * @module scripts/design/design-gallery
 */
import { createLogger } from '../core/logger.js';
const log = createLogger('design-gallery');
/**
 * Create a new gallery from design system variants.
 */
export function createGallery(variants, sortBy = 'score') {
    log.info(`Creating gallery with ${variants.length} variants`);
    const entries = variants.map(v => ({
        name: v.name,
        system: v.system,
        tags: v.tags ?? [v.system.brief.projectType, v.system.brief.darkMode ? 'dark' : 'light'],
        createdAt: v.system.generatedAt,
    }));
    sortGallery(entries, sortBy);
    return { entries, selectedIndex: 0, sortBy };
}
function sortGallery(entries, sortBy) {
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
export function addToGallery(gallery, name, system, tags) {
    const entry = {
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
export function filterGallery(gallery, tags) {
    if (tags.length === 0)
        return gallery.entries;
    return gallery.entries.filter(e => tags.some(t => e.tags.includes(t)));
}
/**
 * Generate HTML preview for a color palette.
 */
export function generatePalettePreview(tokens) {
    const rows = tokens.colors.map(c => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;">` +
        `<div style="width:32px;height:32px;border-radius:4px;background:${c.value};border:1px solid #333;"></div>` +
        `<code style="font-size:12px;color:#888;">${c.name}</code>` +
        `<span style="font-size:12px;color:#666;">${c.value}</span>` +
        `</div>`).join('\n');
    return `<div style="font-family:monospace;padding:16px;background:#111;border-radius:8px;">\n${rows}\n</div>`;
}
/**
 * Generate markdown gallery view.
 */
export function formatGallery(gallery) {
    const lines = [];
    lines.push(`## Design Gallery (${gallery.entries.length} variants)\n`);
    lines.push(`Sorted by: ${gallery.sortBy}\n`);
    lines.push('| # | Name | Type | Mode | Score | Colors | Components | Tags |');
    lines.push('|---|------|------|------|-------|--------|------------|------|');
    for (let i = 0; i < gallery.entries.length; i++) {
        const e = gallery.entries[i];
        const s = e.system;
        const selected = i === gallery.selectedIndex ? '→' : ' ';
        lines.push(`| ${selected}${i + 1} | ${e.name} | ${s.brief.projectType} | ` +
            `${s.brief.darkMode ? '🌙' : '☀️'} | ${s.score.overall}/10 | ` +
            `${s.tokens.colors.length} | ${s.components.length} | ${e.tags.join(', ')} |`);
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
        const grouped = new Map();
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
//# sourceMappingURL=design-gallery.js.map