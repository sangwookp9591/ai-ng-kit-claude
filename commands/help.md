---
name: help
description: aing 도움말. 에이전트 팀, 5대 혁신, 커맨드 목록을 귀엽게 보여줍니다.
---

# /help — aing Help

aing의 에이전트 팀과 기능을 터미널에 시각적으로 표시합니다.

Display the aing banner, agent team with colors and names, 5 innovations, and all available commands. Use the display module at `scripts/core/display.mjs` — call `fullHelp()` and print the result.

When the user runs `/help` or `/aing help`, show the full colorful help output by running:
```bash
node -e "import('/path/to/scripts/core/display.mjs').then(m => console.log(m.fullHelp()))"
```
