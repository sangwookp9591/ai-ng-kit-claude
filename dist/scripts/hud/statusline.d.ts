#!/usr/bin/env node
/**
 * aing Status Line v1.0.0
 *
 * Minimal HUD for Claude Code status line.
 * Shows blinking colored dots for active agents + context %.
 *
 * Stdin JSON from Claude Code:
 *   { transcript_path, cwd, model, context_window, workspace }
 */
/**
 * Returns a one-line team health summary, e.g.:
 *   "Team: 3 active, 1 stale, 2 done (score: 75)"
 * Reads .aing/state/team-health.json synchronously (HUD runs sync).
 * Returns null if no team health data exists.
 */
export declare function getTeamStatusLine(cwd: string): string | null;
//# sourceMappingURL=statusline.d.ts.map