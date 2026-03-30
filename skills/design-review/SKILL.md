---
name: design-review
description: |
  Designer's eye QA: visual inconsistency, spacing issues, hierarchy problems,
  AI slop patterns, and slow interactions. Uses Willji agent and browse for
  screenshot evidence. Use when asked to "review the design", "check UI",
  or "design QA".
---

# /aing design-review — Visual QA Audit

## Checklist

### AI Slop Detection (10 patterns)
1. Vague copy ("Consider using modern design")
2. Unconstrained colors ("any shade of blue")
3. Placeholder states missing (no loading/empty/error states)
4. Default fonts (missing typeface specification)
5. Accessibility gaps (no contrast info)
6. Generic icons (placeholder.svg)
7. Inconsistent spacing (mix of arbitrary values)
8. Random border radii (not from scale)
9. Missing dark mode tokens
10. Orphaned hover states

### Litmus Tests (7 checks)
1. Color contrast minimum 4.5:1 (WCAG AA)
2. Font sizes >=12px mobile, >=14px desktop
3. Touch targets >=44x44px
4. Spacing on 8px grid
5. Animation duration <300ms
6. Semantic HTML usage
7. Keyboard navigation support

### Hard Rejections (7)
1. Text on image without overlay
2. Color-only status indicators
3. Auto-playing media
4. Horizontal scroll on mobile
5. >3 font families
6. Rainbow accent colors
7. Glassmorphism without fallback

## Evidence Collection
Use browse to capture screenshots at key breakpoints:
```bash
$B goto https://app.example.com
$B responsive /tmp/design-review
$B snapshot -a -o /tmp/annotated.png
```

## Output
Write to `.aing/reviews/design-review-{date}.md`
