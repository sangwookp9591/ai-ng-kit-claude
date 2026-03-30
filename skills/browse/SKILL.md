---
name: browse
description: "Browser QA via MCP Playwright. Navigate, snapshot, interact, verify."
triggers: ["browse", "qa browser", "browser test", "화면 테스트"]
---

# /aing browse — Browser QA via MCP Playwright

Uses MCP Playwright tools (mcp__playwright__*) for browser-based QA testing.
No separate daemon needed — Claude Code's built-in Playwright MCP handles the browser.

## Usage

Agent uses these MCP tools directly:
- `mcp__playwright__browser_navigate` — go to URL
- `mcp__playwright__browser_snapshot` — get ARIA tree with refs
- `mcp__playwright__browser_click` — click element
- `mcp__playwright__browser_fill_form` — fill input
- `mcp__playwright__browser_take_screenshot` — capture screen
- `mcp__playwright__browser_console_messages` — check for errors
- `mcp__playwright__browser_network_requests` — check failed requests

## QA Workflow

1. Navigate to target URL
2. Take snapshot for ARIA refs
3. Interact (click, fill, select) using refs
4. Verify via screenshot + console check
5. Record evidence to chain via browser-evidence.mjs

## Integration with PDCA

Browser QA results auto-feed into the evidence chain.
In the CHECK stage, agents run browser-evidence.orchestrateBrowserQA()
which returns a test plan. Agents execute each test using MCP tools,
then record results via addScreenshotEvidence/addConsoleEvidence.
