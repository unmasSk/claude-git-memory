---
name: unmassk-design
description: >
  Use when the user asks to "design a UI", "build a landing page",
  "create a dashboard", "design system", "choose colors", "pick fonts",
  "typography", "animate", "add motion", "make it bolder", "make it quieter",
  "audit the design", "critique the UI", "polish the interface",
  "responsive design", "dark mode", "accessibility", "WCAG",
  "UX writing", "onboarding flow", "agentic UX", "AI interface",
  "design tokens", "component library", "Tailwind config", "shadcn",
  or mentions any of: design system, color palette, type scale, spacing,
  layout, grid, z-index, motion, transitions, easing, breakpoints,
  mobile-first, container queries, focus states, keyboard nav, ARIA,
  forms, button labels, error messages, empty states, loading states,
  screen readers, contrast ratio, color blindness, font pairing, visual
  hierarchy, white space, brand identity, component variants, dark theme,
  light theme, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion.
  Covers complete frontend design from first principles through production:
  design system generation, aesthetic direction, color and typography,
  purposeful motion, accessible interaction, responsive layout, UX writing,
  design tokens, component library setup, and AI-native interface patterns.
  Includes 10 steering commands (audit, critique, polish, bolder, quieter,
  animate, colorize, distill, harden, normalize) mapped to expert references.
  Includes 1 Python search script for design system generation and domain
  search. Applies the AI Slop Test to prevent generic, lifeless output.
  Based on Impeccable by Paul Bakaus (Apache 2.0), UI/UX Pro Max by
  nextlevelbuilder (MIT), and plugins by bencium.io (MIT).
version: 1.0.0
---

# Design -- Frontend Design Toolkit

Complete frontend design toolkit combining five expert sources. Produce
design systems, component specs, motion blueprints, accessibility audits,
and UX copy from a single skill. Use the routing table to load references
on-demand and the search script to generate design systems programmatically.

Based on Impeccable by Paul Bakaus (Apache 2.0), UI/UX Pro Max by
nextlevelbuilder (MIT), and plugins by bencium.io (MIT).

## Purpose

This skill combines five expert sources into one coherent workflow:

1. **Impeccable** (Paul Bakaus) -- aesthetic direction, design commands,
   the AI Slop Test, and the principle that boring is worse than wrong.
2. **UI/UX Pro Max** (nextlevelbuilder) -- interaction design, WCAG
   compliance, responsive patterns, and component-level rigor.
3. **bencium.io plugins** -- design token generation, Tailwind config
   scaffolding, shadcn integration, and agentic UX patterns.
4. **Accessibility canon** -- WCAG 2.1 AA as the minimum bar (WCAG 2.2 AA aspirational)
   and ARIA authoring practices as the aspirational target.
5. **UX writing discipline** -- every visible string is a design decision.
   Labels, errors, empty states, and onboarding copy are part of the design.

Do not treat these as separate concerns. A design decision about color is
also a contrast decision. A motion decision is also an accessibility
decision. A component decision is also a UX writing decision. Route through
the right references and let them inform each other.

## First Step: Design System

Before any design work, generate a design system. Run:

```
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py '<product description>' --design-system -p '<project name>'
```

This returns: recommended visual pattern, style direction, color palette
with hex values, typography stack with scale, spacing system, effects
(shadows, borders, radii), and anti-patterns to avoid for this product
category.

Use this output as the foundation for all subsequent design decisions. Do
not skip this step and hand-pick values without it -- the script surfaces
pattern-matching from the reference corpus, not arbitrary preferences.

If the user has an existing design system (Tailwind config, tokens file,
Figma variables), read it first and treat it as the source of truth. Only
generate a new system if none exists.

## Request Routing

Map user intent to the correct reference file and script. Load references
on-demand. Do not load all at startup.

| User Request | Reference | Scripts |
|---|---|---|
| Design philosophy, aesthetic direction, what makes good design | `references/design-principles.md` | -- |
| Colors, palettes, dark mode, light mode, contrast ratios | `references/color.md` | `search.py --domain color` |
| Fonts, type scale, font pairing, typographic correctness | `references/typography.md` | `search.py --domain typography` |
| Animation, transitions, easing curves, micro-interactions | `references/motion.md` | -- |
| Spacing, grids, layout systems, z-index stacking | `references/layout-and-space.md` | -- |
| Forms, focus states, keyboard navigation, ARIA roles | `references/interaction.md` | -- |
| Breakpoints, mobile-first, container queries, fluid type | `references/responsive.md` | -- |
| Button labels, error messages, empty states, onboarding copy | `references/ux-writing.md` | -- |
| Starting a new project, design tokens, Tailwind config, shadcn | `references/design-system-kickoff.md` | `search.py --design-system` |
| WCAG compliance, accessibility audit, screen reader support | `references/accessibility.md` | -- |
| AI-first interfaces, memory UI, trust signals, agentic flows | `references/agentic-ux.md` | -- |

## Design Commands

These steering verbs come from Impeccable. When the user says one of these
words, treat it as a precise instruction -- not a vague request. Each command
has a defined scope and a defined set of references to load.

| Command | What It Does | References to Load |
|---|---|---|
| `audit` | Technical quality checks: contrast ratios, spacing consistency, type scale correctness, ARIA coverage, touch target sizes, motion safety | `references/design-principles.md` + `references/accessibility.md` |
| `critique` | UX review focused on hierarchy, clarity, emotional tone, and whether the design communicates its intent | `references/design-principles.md` |
| `polish` | Final pass before shipping: tighten spacing, fix orphaned text, verify alignment, confirm hover states, check empty states | `references/design-principles.md` + `references/typography.md` |
| `bolder` | Amplify a design that is too safe, too neutral, or too forgettable -- increase contrast, add color, add weight, add motion | `references/design-principles.md` + `references/color.md` + `references/motion.md` |
| `quieter` | Tone down a design that is overly loud, visually cluttered, or emotionally exhausting -- reduce contrast, desaturate, simplify | `references/design-principles.md` + `references/color.md` |
| `animate` | Add purposeful motion: define what moves, when, how fast, and why -- always justify motion against user benefit | `references/motion.md` |
| `colorize` | Introduce strategic color into a neutral or monochrome design -- expand palette, establish hierarchy through color | `references/color.md` |
| `distill` | Strip the design to its essential elements -- remove decorative noise, collapse redundant structure, increase signal-to-noise | `references/design-principles.md` + `references/layout-and-space.md` |
| `harden` | Add error handling, validation states, loading states, i18n-safe layouts, and edge cases that the happy path hides | `references/interaction.md` + `references/ux-writing.md` |
| `normalize` | Align a component or screen with the project's design system -- standardize tokens, replace one-offs, enforce grid | `references/design-system-kickoff.md` |

Apply these commands exactly as specified. Do not collapse them into general
"improvements." If the user says `bolder`, do not quietly desaturate anything.

## Scripts

Scripts are tools, not optional helpers. Run them via Bash. Do not replicate
their logic manually.

| Script | Purpose | Usage |
|---|---|---|
| `search.py` | Query the design reference corpus for patterns, tokens, or a full design system | `python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py '<query>' [--design-system] [--domain <domain>] [-p '<project>']` |
| `core.py` | Internal library used by search.py — BM25 search engine, CSV config, domain routing. Do not invoke directly. Do not delete. | _(imported by search.py)_ |
| `design_system.py` | Internal library used by search.py — design system generation from search results. Do not invoke directly. Do not delete. | _(imported by search.py)_ |

### search.py Flags

| Flag | What It Does |
|---|---|
| `--design-system` | Generate a complete design system: pattern, style, colors, typography, spacing, effects, anti-patterns |
| `--domain color` | Search color reference only: palettes, dark mode strategies, contrast values |
| `--domain typography` | Search typography reference only: font stacks, type scales, pairing rules |
| `-p '<project name>'` | Scope recommendations to a specific product name and category |

Install dependencies before first run:

```
pip install -r ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/requirements.txt
```

Note that `${CLAUDE_PLUGIN_ROOT}` is auto-resolved by Claude Code. Use it
as written in all script invocations.

## The AI Slop Test

Before delivering any design output, run this mental checklist. Fail on any
item and revise.

These patterns indicate a generic, unthoughtful AI-generated design. Do not
produce them:

- **Inter font as default** -- Inter is the new Arial. Use it only when
  the product explicitly calls for neutral UI legibility. Otherwise, make a
  typographic choice.
- **Purple gradients** -- The default AI color story. If the palette drifts
  toward purple-to-blue or purple-to-pink gradients, reconsider.
- **Cards inside cards** -- Nested surface elevation creates visual mud.
  If content is inside a card inside a card, collapse the hierarchy.
- **Gray text on colored backgrounds** -- Color contrast fails silently.
  Muted gray on a colored card background is almost always a contrast
  failure. Check every combination.
- **Bounce and elastic easing (except playful products)** -- Spring easing
  reads as unpolished in professional contexts. Reserve for apps where
  delight is the explicit goal.
- **Glassmorphism overuse** -- One frosted panel is an effect. Five frosted
  panels are a problem. Limit glass to intentional focal points.
- **Identical card grids** -- A grid of eight identical cards with icon,
  title, and two lines of body copy is the AI slop default for feature
  pages. Break the grid, vary the content density, add hierarchy.
- **Hero metric layouts** -- Three big numbers in a row (e.g., "10x faster,
  99.9% uptime, 500+ customers") is the most overused SaaS pattern. Earn
  the metrics with context or find a stronger visual argument.

If any of these appear in a design being reviewed under `audit` or
`critique`, flag them explicitly as pattern violations.

## Anti-Patterns by Category

Beyond the AI Slop Test, apply category-specific anti-patterns from the
reference files. Key examples:

**Color** -- Never rely on color alone to convey meaning (accessibility).
Never place warm and cool grays together without deliberate intent. Never
use more than five distinct hues in a single view.

**Typography** -- Never mix more than two typeface families. Never set body
text below 16px on mobile. Never use all-caps for body copy. Never set line
height below 1.4 for paragraph text.

**Motion** -- Never animate for decoration alone. Never use motion that
cannot be disabled for users who prefer reduced motion. Never animate
durations above 500ms for interactive feedback.

**Layout** -- Never break a grid without a reason. Never use z-index values
above 100 without a documented stacking context. Never nest flexbox and
grid more than three levels deep without naming the layers.

**Interaction** -- Never remove the visible focus indicator. Never rely on
placeholder text to communicate input requirements. Never use icon-only
buttons without an accessible label.

## Accessibility Baseline

Every design output must meet WCAG 2.1 AA. WCAG 2.2 AA is aspirational. This is not optional.

- Text contrast: 4.5:1 minimum for normal text, 3:1 for large text.
- UI component contrast: 3:1 for interactive elements and focus indicators.
- Touch targets: 44x44px minimum (iOS), 48x48dp (Material).
- Focus order: logical, predictable, matches visual reading order.
- Motion: all animations must respect `prefers-reduced-motion`.
- Color independence: no meaning conveyed by color alone.

Load `references/accessibility.md` for the full checklist and ARIA
implementation patterns.

## Reference Files

All paths relative to the skill root (`skills/unmassk-design/`).

| File | Domain | Load When |
|---|---|---|
| `references/design-principles.md` | Aesthetic philosophy, visual hierarchy, contrast, whitespace, the Impeccable framework | Any design direction, audit, critique, or polish request |
| `references/color.md` | Color theory, palette construction, dark mode implementation, semantic color tokens, contrast ratios | Color selection, dark mode, contrast audit, `colorize` command |
| `references/typography.md` | Font stacks, type scales (fluid and fixed), font pairing rules, OpenType features, typographic correctness | Font selection, type scale, heading hierarchy, `polish` command |
| `references/motion.md` | Motion principles, easing curves, duration guidelines, reduced motion, Framer Motion patterns | Animation, transitions, micro-interactions, `animate` command |
| `references/layout-and-space.md` | Spacing systems, 8pt grid, CSS Grid and Flexbox patterns, z-index scale, visual rhythm | Layout structure, spacing audit, grid setup, `distill` command |
| `references/interaction.md` | Focus management, keyboard navigation, form design, ARIA patterns, error states, loading states | Form design, interactive components, `harden` command |
| `references/responsive.md` | Breakpoint systems, mobile-first approach, container queries, fluid typography, responsive images | Responsive design, mobile audit, breakpoint planning |
| `references/ux-writing.md` | Microcopy principles, button labels, error messages, empty states, onboarding copy, voice and tone | Any visible string, `harden` command, onboarding flows |
| `references/design-system-kickoff.md` | Design token structure, Tailwind config scaffolding, shadcn setup, component naming conventions | New project setup, design token generation, `normalize` command |
| `references/accessibility.md` | WCAG 2.1 AA checklist (2.2 aspirational), ARIA roles and properties, screen reader behavior, keyboard interaction patterns | Accessibility audit, `audit` command, any WCAG question |
| `references/agentic-ux.md` | AI-native interface patterns, memory UI, trust signals, progressive disclosure for AI, error recovery in agentic flows | AI interface design, chatbot UI, agentic product design |

Load references on-demand. Do not load all at startup.

## Output Format

Design output should be actionable and precise. Adapt format to the request
type.

**For design system generation:** Return tokens as structured data (CSS
custom properties or Tailwind config format). Include palette with hex
values, type scale with rem values, spacing scale, and named effects.

**For component specs:** Describe every state (default, hover, focus,
active, disabled, error, loading). Include motion behavior. Include
accessibility requirements. Reference design tokens by name, not raw values.

**For audits and critiques:** List findings by severity (Critical, Warning,
Suggestion). For each finding: what is wrong, why it matters, and the
specific fix. Include the AI Slop Test results as a separate section.

**For UX writing:** Deliver final copy, not placeholder text. Label every
string with its context (button label, error message, empty state heading).
Include rationale for non-obvious choices.

**For motion specs:** Define the element, property, duration, easing,
trigger, and reduced-motion fallback for every animation.

## User Interaction and Refinement

### Initial Design Direction

Before executing any design work, present 2-3 design system options to the
user in plain language. Run `search.py --design-system` with the project
description, then translate each result into non-technical terms:

- Describe the visual feeling, not the style name ("elegant and calm" not "Soft UI Evolution")
- Show the color palette as a simple list with descriptive names
- Explain the typography choice by mood ("sophisticated serif" not "Cormorant Garamond")
- Offer to generate quick HTML mockups if the user wants to see the options visually

Proceed only after the user selects a direction.

### Refinement Patterns

| User Request Type | Action |
|-------------------|--------|
| Subjective (colors, style, vibes) | Present 2-3 options with plain descriptions, offer mockups |
| Technical (animation, responsive, accessibility) | Execute directly, no options needed |
| Explicit (specific color, specific font) | Execute without asking |
| Partial change ("same style, different colors") | Re-run search.py for the changed domain only, present options, keep everything else |
| Full reset ("start over") | Return to initial design direction step |
| Rejection ("none of these") | Ask what specifically does not fit (too bold? too calm? wrong vibe?), re-run search.py with adjusted keywords based on feedback, present new options |

### Mockup Generation

When the user asks to see options visually, generate a minimal HTML file per
option demonstrating: header, hero section, one content block, and footer.
Use inline styles matching the proposed design system. Save to the project
directory as `mockup-option-a.html`, `mockup-option-b.html`, etc.

## Attribution

Based on Impeccable by Paul Bakaus (Apache 2.0), UI/UX Pro Max by
nextlevelbuilder (MIT), and plugins by bencium.io (MIT).
