/**
 * aing Design Gallery
 * Generate visual gallery views of design system variants.
 * @module scripts/design/design-gallery
 */
import type { DesignSystem, DesignTokens } from './design-engine.js';
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
export declare function createGallery(variants: Array<{
    name: string;
    system: DesignSystem;
    tags?: string[];
}>, sortBy?: 'score' | 'name' | 'date'): Gallery;
/**
 * Add a variant to the gallery.
 */
export declare function addToGallery(gallery: Gallery, name: string, system: DesignSystem, tags?: string[]): Gallery;
/**
 * Filter gallery by tags.
 */
export declare function filterGallery(gallery: Gallery, tags: string[]): GalleryEntry[];
/**
 * Generate HTML preview for a color palette.
 */
export declare function generatePalettePreview(tokens: DesignTokens): string;
/**
 * Generate markdown gallery view.
 */
export declare function formatGallery(gallery: Gallery): string;
//# sourceMappingURL=design-gallery.d.ts.map