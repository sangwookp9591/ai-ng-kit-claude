/**
 * aing Harness Gallery — Pattern DB + recommendation engine
 * Stores, searches, and recommends harness patterns.
 * @module scripts/harness/harness-gallery
 */
import { type ComplexitySignals } from '../routing/complexity-scorer.js';
import type { GalleryEntry } from './harness-types.js';
export declare function initGallery(projectDir: string): void;
export declare function getPatterns(projectDir: string): GalleryEntry[];
export declare function registerPattern(entry: GalleryEntry, projectDir: string): void;
export declare function updateMetrics(patternId: string, success: boolean, metrics: {
    quality?: number;
    tokens?: number;
    duration?: number;
}, projectDir: string): void;
export declare function searchPatterns(query: string, projectDir: string): GalleryEntry[];
export declare function recommendPattern(taskDescription: string, signals: ComplexitySignals, projectDir: string): GalleryEntry[];
export declare function formatGallery(entries: GalleryEntry[]): string;
//# sourceMappingURL=harness-gallery.d.ts.map