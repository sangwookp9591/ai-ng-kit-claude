---
name: design-consultation
description: |
  Design consultation: understands your product, researches the landscape,
  proposes a complete design system (aesthetic, typography, color, spacing,
  components). Uses Willji agent. Use when asked to "design this",
  "what should it look like", "design system", or starting a new UI project.
---

# /aing design-consultation — Design System Proposal

## Process

### Phase 1: Understand
1. What is the product? (type, audience, purpose)
2. What's the competitive landscape?
3. Are there existing brand guidelines?
4. Dark mode or light mode? (default: dark for dev tools)
5. What frameworks are you using?

### Phase 2: Research
1. Analyze similar products in the space
2. Identify design patterns that work for this product type
3. Note accessibility requirements
4. Check device targets (desktop-first vs mobile-first)

### Phase 3: Propose
Generate a complete design system using the design engine:
1. Color palette (dark + light variants)
2. Typography scale (heading, body, code)
3. Spacing scale (4px/8px grid)
4. Border radius scale
5. Shadow scale
6. Component inventory (project-type-specific)

### Phase 4: Deliver
Output formats:
- CSS custom properties
- Tailwind config partial
- Component spec list with variants + accessibility notes
- Design score report

## Design Principles
- **Zinc/neutral palette** as base, one accent color
- **Geist Sans** for UI, **Geist Mono** for code
- **8px grid** for spacing consistency
- **Dark mode first** for dashboards and dev tools
- **No AI slop**: every value must be specific (no "beautiful blue")

## Integration
Uses `scripts/design/design-engine.ts` for programmatic generation.
Uses `scripts/design/design-compare.ts` for variant comparison.
Willji agent provides design taste and judgment.
