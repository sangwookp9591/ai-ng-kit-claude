/**
 * aing 3-Tier Notepad System
 * Priority (permanent), Working (7-day TTL), Manual (permanent, user-managed).
 * @module scripts/memory/notepad
 */
export interface NotepadEntry {
    content: string;
    createdAt: string;
    updatedAt: string;
}
export interface Notepad {
    priority: NotepadEntry[];
    working: NotepadEntry[];
    manual: NotepadEntry[];
}
/**
 * Read notepad from disk. Returns empty tiers if file is missing or corrupt.
 */
export declare function readNotepad(projectDir?: string): Promise<Notepad>;
/**
 * Write priority note. Max 500 chars per entry, max 10 entries (oldest dropped).
 */
export declare function writePriority(content: string, projectDir?: string): Promise<void>;
/**
 * Write working note. Timestamped. Auto-prunes entries older than 7 days on read.
 */
export declare function writeWorking(content: string, projectDir?: string): Promise<void>;
/**
 * Write manual note. Permanent, no auto-prune.
 */
export declare function writeManual(content: string, projectDir?: string): Promise<void>;
/**
 * Remove working entries older than 7 days. Returns count removed.
 */
export declare function pruneWorking(projectDir?: string): Promise<number>;
/**
 * Returns formatted summary of all tiers for context injection.
 */
export declare function getNotepadSummary(projectDir?: string): Promise<string>;
//# sourceMappingURL=notepad.d.ts.map