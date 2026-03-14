# Design Principles

## Anti-AI-Slop Doctrine

The single most important quality check: if you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, start over.

### The 8 Tells of AI-Generated Interfaces

These are fingerprints of machine-generated work from 2024–2025. Avoid all of them:

1. **The AI color palette** — cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds. This combination signals "AI default" immediately.
2. **Gradient text on headings** — especially on metrics or hero numbers. Decorative, not meaningful.
3. **Default dark mode with glowing accents** — looks "designed" without requiring actual design decisions.
4. **Glassmorphism everywhere** — blur effects, glass cards, glow borders used decoratively rather than purposefully.
5. **The hero metric layout** — big number, small label, supporting stats, gradient accent. A template, not a design.
6. **Identical card grids** — same-sized cards with icon + heading + text, repeated endlessly.
7. **Generic fonts** — Inter, Roboto, Arial, Open Sans, system defaults. These make every interface indistinguishable.
8. **Rounded rectangles with generic drop shadows** — safe, forgettable, could be any AI output.

Secondary tells that compound the above:
- Gray text on colored backgrounds (looks washed out and dead)
- Large icons with rounded corners above every heading (templated, rarely adds value)
- Nested cards inside cards (visual noise)
- Sparklines as decoration (tiny charts that convey nothing)
- Bounce or elastic easing on animations (dated, tacky)
- Modals for everything (lazy default)
- Repeated information (headers restating intros)
- Centering everything (left-aligned text with asymmetric layouts feels more designed)

---

## Aesthetic Direction Philosophy

Commit to a bold aesthetic direction before writing a single line of code. Three questions to answer first:

**Purpose** — What problem does this interface solve? Who uses it? When and where?

**Tone** — Pick an extreme and execute it with precision. Options include: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian. These are not exhaustive — design one that is true to the context, not derivative of the list.

**Differentiation** — What makes this unforgettable? What is the one thing someone will remember? Bold maximalism and refined minimalism both work. The key is intentionality, not intensity.

Then execute working code that is: production-grade and functional, visually striking and memorable, cohesive with a clear aesthetic point-of-view, and meticulously refined in every detail.

**Vary every generation.** Never converge on common choices across projects. Vary between light and dark themes, different fonts, different aesthetics.

---

## Core Design Philosophy

### Simplicity Through Reduction

Identify the essential purpose and eliminate distractions. Begin with complexity, then deliberately remove until reaching the simplest effective solution. Every element must justify its existence.

### Material Honesty

Digital materials have unique properties — embrace them, do not simulate physical depth.

- Buttons communicate affordance through color, spacing, and typography — not shadows
- Cards use borders and background differentiation — not depth effects
- Hierarchy is created through scale, weight, and spacing — not elevation
- Clickable elements: distinct colors, hover state changes, cursor feedback
- Containers: subtle borders (1px), background color shifts, or generous padding

### Functional Layering

Create hierarchy through typography scale, color contrast, and spatial relationships. Layer information conceptually (primary → secondary → tertiary). Reject skeuomorphic shadows/gradients. Embrace functional depth: modals over content, dropdowns over UI.

### Coherent Design Language

Every element should visually communicate its function. Elements should feel part of a unified system. Nothing should feel arbitrary. The best technology disappears — users focus on content and goals, not on understanding the interface.

---

## Design System Generation: First Step

Before creating any interface, generate or discover the design system. This is not optional.

A design system has three tiers:

**Fixed (universal rules)** — WCAG contrast minimums, touch target sizes, reduced-motion support, semantic HTML structure.

**Project-specific (brand personality)** — Primary color and its OKLCH derivations, chosen typefaces and weights, spacing scale base unit, tone-of-voice.

**Adaptable (context-dependent)** — Component variants for different screen sizes, dark/light mode overrides, density modes (compact vs comfortable).

Use `python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py '<description>' --design-system -p '<project>'` to generate a design system scaffold.

Generate design tokens as CSS custom properties before writing any component CSS:

```css
/* Primitive tokens */
--blue-500: oklch(55% 0.18 250);
--gray-900: oklch(15% 0.01 250);

/* Semantic tokens (these are what components use) */
--color-primary: var(--blue-500);
--text-primary: var(--gray-900);
--surface-base: oklch(97% 0.01 250);
```

---

## DO / DON'T Rules by Category

### Typography

**DO** — Use a modular type scale with fluid sizing (`clamp()`). Vary font weights and sizes to create clear visual hierarchy. Choose fonts that are beautiful, unique, and interesting. Pair a distinctive display font with a refined body font.

**DON'T** — Use Inter, Roboto, Arial, Open Sans, or system defaults for personality-driven interfaces. Use monospace typography as lazy shorthand for "technical/developer" vibes. Put large icons with rounded corners above every heading.

### Color

**DO** — Use modern CSS color functions (`oklch`, `color-mix`, `light-dark`) for perceptually uniform, maintainable palettes. Tint neutrals toward the brand hue — even 0.01 chroma creates subconscious cohesion.

**DON'T** — Use gray text on colored backgrounds. Use pure black (`#000`) or pure white (`#fff`). Use the AI color palette (cyan-on-dark, purple-to-blue gradients, neon accents). Use gradient text for impact.

### Layout

**DO** — Create visual rhythm through varied spacing — tight groupings, generous separations. Use asymmetry and unexpected compositions. Break the grid intentionally for emphasis. Use fluid spacing with `clamp()`.

**DON'T** — Wrap everything in cards. Nest cards inside cards. Use identical card grids. Use the hero metric layout template. Center everything. Use the same spacing everywhere.

### Visual Details

**DO** — Use intentional, purposeful decorative elements that reinforce brand.

**DON'T** — Use glassmorphism decoratively. Use rounded elements with a thick colored border on one side. Use sparklines as decoration. Use rounded rectangles with generic drop shadows. Use modals unless there is no better alternative.

### Motion

**DO** — Use motion to convey state changes: entrances, exits, feedback. Use exponential easing (`ease-out-quart`, `ease-out-quint`, `ease-out-expo`) for natural deceleration. Animate `transform` and `opacity` only. For height animations, use `grid-template-rows` transitions.

**DON'T** — Animate layout properties (width, height, padding, margin). Use bounce or elastic easing. Animate without purpose.

### Interaction

**DO** — Use progressive disclosure: basic options first, advanced behind expandable sections. Design empty states that teach the interface. Make every interactive surface feel intentional.

**DON'T** — Repeat the same information. Make every button primary.

---

## The 17 Design Commands

These are the workflow operations available in `unmassk-design`. Each is a distinct mode of working.

### Diagnostic Commands

**audit** — Systematic quality check across 5 dimensions: accessibility (contrast, ARIA, keyboard, semantic HTML, forms), performance (layout thrashing, expensive animations, missing optimization), theming (hard-coded colors, broken dark mode, inconsistent tokens), responsive design (fixed widths, touch targets, overflow), and anti-patterns. Produces a report with severity ratings. Does not fix — only documents. Run this before any fix commands.

**critique** — Holistic design evaluation from a UX director perspective. Evaluates: AI slop detection (most important — check all DON'T guidelines), visual hierarchy, information architecture, emotional resonance, discoverability and affordance, composition and balance, typography as communication, color with purpose, states and edge cases, microcopy and voice. Produces a prioritized findings report with concrete fix suggestions.

### Fix Commands

**polish** — Final quality pass before shipping. Works through: visual alignment and spacing (pixel-perfect to grid), typography refinement (hierarchy consistency, line length, widows/orphans), color and contrast (WCAG ratios, token usage, tinted neutrals), interaction states (default/hover/focus/active/disabled/loading/error/success for every element), micro-interactions and transitions (smooth, appropriate easing, no bounce), content and copy (consistent terminology, capitalization, punctuation), icons and images, forms and inputs, edge cases and error states, responsiveness, performance, code quality. Uses a 20-item checklist.

**normalize** — Aligns a feature to the project design system. Discovers the design system first, then addresses: typography tokens, color tokens, spacing tokens, component replacements, motion patterns, responsive behavior, accessibility. Removes one-off implementations. Never creates components when design system equivalents exist.

**harden** — Improves interface resilience. Tests with: extreme inputs (very long text, empty states, special characters, large numbers), error scenarios (network failures, API errors, permission errors), internationalization (long translations, RTL, CJK, date/number formats). Adds text overflow handling, i18n support, error handling, edge case management.

**optimize** — Performance improvements: loading (images, JavaScript bundle, CSS, fonts, loading strategy), rendering (layout thrashing, DOM size, paint), animation (GPU acceleration, 60fps), React-specific optimizations, network (request reduction, API optimization, slow connection handling). Measures Core Web Vitals before and after.

### Direction Commands

**bolder** — Amplifies safe or generic designs. Gather context (target audience, brand personality) before proceeding. Strategy: identify the focal point (one hero moment), choose a personality direction, increase hierarchy contrast. Techniques: extreme type scale (3×–5× jumps), dominant color strategy (60% bold color), spatial drama (extreme scale, asymmetry, generous space), visual effects (dramatic shadows, texture, custom elements), entrance choreography. Warning: bold means distinctive, not "more AI effects." Never: cyan/purple gradients, glassmorphism, neon on dark, gradient text.

**quieter** — Reduces visual intensity in overstimulating designs. Gather context first. Techniques: reduce saturation to 70–85%, soften palette, reduce color variety, increase white space, reduce font weights, remove decorative elements, shorten animation distances and durations. Quiet design is confident design — not boring.

**distill** — Strips to essence through ruthless simplification. Gather context first. Find the primary user goal (there should be ONE). Simplify: information architecture (reduce scope, progressive disclosure, clear hierarchy), visual (1–2 colors, one font family, remove unnecessary borders/shadows/containers), layout (linear flow, generous white space), interaction (fewer buttons, smart defaults, inline actions), content (cut every sentence in half, active voice, remove redundancy). Never remove necessary functionality.

**colorize** — Adds strategic color to monochromatic designs. Gather context and brand colors first. Plan: choose 2–4 colors beyond neutrals, define dominant (60%), secondary (30%), and accent (10%) roles. Apply: semantic states (success/error/warning/info), accent on primary actions, tinted backgrounds, data visualization. Use OKLCH. Never: gray text on colored backgrounds, pure black/white, purple-blue gradients.

**animate** — Adds purposeful motion. Gather context (brand personality, performance constraints) first. Plan: hero moment (one signature animation), feedback layer, transition layer, delight layer. Implement: entrance animations (staggered reveals), micro-interactions (button feedback, form interactions, toggles), state transitions (show/hide, expand/collapse, loading, success/error), navigation flow. Always implement `prefers-reduced-motion`.

**delight** — Adds moments of joy and personality. Gather context (brand personality, appropriate domain) first. Add: satisfying micro-interactions, loading personality (rotating messages instead of just spinners), success celebrations (appropriate scale), hover surprises (icons that animate), personality in copy (playful error messages for appropriate brands), illustrations (custom, not stock icons for empty states), easter eggs (hidden discoveries). Rule: delight amplifies, never blocks. Never delay core functionality.

**extract** — Extracts reusable components and design tokens from existing implementations. Discovers the design system first. Identifies: repeated components (used 3+ times), hard-coded values that should be tokens, inconsistent variations of the same concept. Builds improved reusable versions with clear props API, proper variants, accessibility built in. Migrates existing uses to the shared versions.

**onboard** — Designs or improves first-time user experiences. Assess: what users need to learn, where they get stuck, what the "aha moment" is. Principles: show don't tell, make it optional (provide Skip), get to value as fast as possible, teach features in context not upfront, respect user intelligence. Implements: empty states that teach, contextual tooltips at point of use, welcome flows with honest time estimates. Never force users through long onboarding before they can use the product.

**adapt** — Adapts designs across screen sizes, devices, and platforms. Assess source context assumptions and target context constraints. Mobile adaptation: single column, vertical stacking, 44×44px touch targets, bottom navigation, progressive disclosure. Tablet: two-column, hybrid touch/pointer. Desktop: multi-column, hover states, keyboard shortcuts. Print: remove navigation, logical page breaks. Email: 600px max, single column, inline CSS. Tests on real devices.

**clarify** — Improves UX copy, error messages, labels, and instructions. Finds: jargon, ambiguity, passive voice, length issues, tone mismatch. Improves: error messages (explain what went wrong, suggest fix, never blame user), form labels (specific not generic, show format), button text (verb + noun, "Create account" not "Submit"), empty states ("No projects yet. Create your first..." not "No items"), success messages (confirm what happened, what's next). Rules: specific, concise, active voice, human, helpful, consistent.

---

## Ask-First Protocol (Opt-In)

The ask-first protocol is appropriate when the agent lacks explicit context and must infer. For the `bolder`, `quieter`, `distill`, `colorize`, `animate`, and `delight` commands, attempt to gather context from the current thread or codebase first.

Apply the protocol in two cases:

1. You found context but had to infer (not explicit) — confirm before proceeding: present your inference and ask whether it is correct.
2. You could not find enough context to proceed confidently — ask the specific questions needed: target audience, brand personality/tone, desired use-cases, constraints.

Do not proceed until answers are available. Guessing leads to generic AI slop.

For `audit`, `critique`, `polish`, `normalize`, `harden`, `optimize`, `extract`, `onboard`, `adapt`, and `clarify` — these commands are diagnostic or system-aligned and do not require the ask-first protocol. Read the codebase and proceed.

---

## Visual Hierarchy

### The Squint Test

Blur your eyes (or screenshot and apply a blur). You should still be able to identify: the most important element, the second most important, and clear groupings. If everything looks the same visual weight blurred, you have a hierarchy problem.

### Hierarchy Through Multiple Dimensions

Do not rely on size alone. Combine at least 2–3 dimensions simultaneously:

| Tool | Strong Hierarchy | Weak Hierarchy |
|------|------------------|----------------|
| **Size** | 3:1 ratio or more | <2:1 ratio |
| **Weight** | Bold vs Regular | Medium vs Regular |
| **Color** | High contrast | Similar tones |
| **Position** | Top/left (primary) | Bottom/right |
| **Space** | Surrounded by white space | Crowded |

The best hierarchy uses 2–3 dimensions at once: a heading that is larger, bolder, AND has more space above it. Size alone is the weakest signal.

### Cards Are Not Required

Cards are the most overused pattern in AI-generated work. Spacing and alignment create visual grouping naturally. Use cards only when:
- Content is truly distinct and actionable (items need comparison in a grid)
- Content needs clear interaction boundaries

Never nest cards inside cards — use spacing, typography, and subtle dividers for hierarchy within a card. Not everything needs a container.

---

## Layout and Spatial Design

### Spacing System

Use a 4pt base unit, not 8pt. An 8pt system is too coarse — you will frequently need 12px (between 8 and 16). Functional scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px.

Name spacing tokens semantically — by relationship, not by value:

```css
/* Wrong — names by value */
--spacing-8: 8px;
--spacing-16: 16px;

/* Correct — names by relationship */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 48px;
--space-2xl: 96px;
```

Use `gap` instead of margins for sibling spacing — it eliminates margin collapse and cleanup hacks.

### Visual Rhythm Through Varied Spacing

Do not use the same spacing everywhere. Without rhythm, layouts feel monotonous. Create intentional variety:
- Tight groupings (8–12px) for related elements
- Standard gaps (16–24px) for sibling components
- Generous separations (48–96px) for distinct sections

### Breaking the Grid

Asymmetry and unexpected compositions feel more designed than centered, balanced layouts. Break the grid intentionally for emphasis:
- Let hero elements escape containers and cross section boundaries
- Use 70/30 or 80/20 proportional splits instead of equal columns
- Let one bold element own a disproportionate amount of space

The key: breaks must feel intentional, not accidental. Every deviation from the grid should have a reason.

### Fluid Spacing

Use `clamp()` for spacing that breathes on larger screens:

```css
.section {
  padding: clamp(2rem, 6vw, 6rem);
}

.content-gap {
  gap: clamp(1rem, 3vw, 2rem);
}
```

### Self-Adjusting Grids

Use `repeat(auto-fit, minmax(280px, 1fr))` for responsive grids without breakpoints. Columns are at least 280px, as many as fit per row, leftovers stretch to fill.

For complex layouts, use named grid areas:

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 280px 1fr;
}

@media (max-width: 768px) {
  .layout {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
    grid-template-columns: 1fr;
  }
}
```

### Container Queries

Viewport queries are for page layouts. Container queries are for components. A card in a narrow sidebar stays compact; the same card in a main content area expands — automatically, without viewport hacks.

```css
.card-container {
  container-type: inline-size;
}

.card {
  display: grid;
  gap: var(--space-md);
}

@container (min-width: 400px) {
  .card {
    grid-template-columns: 120px 1fr;
  }
}
```

### Depth and Elevation

Create semantic z-index scales instead of arbitrary numbers:

```css
:root {
  --z-dropdown:        100;
  --z-sticky:          200;
  --z-modal-backdrop:  300;
  --z-modal:           400;
  --z-toast:           500;
  --z-tooltip:         600;
}
```

For shadows: subtle elevation scale. If you can clearly see a shadow, it is probably too strong. Shadows in dark mode are replaced by lighter surface colors.

---

## Interaction Design

### States Every Interactive Element Needs

Every button, link, input, or custom interactive surface must implement all eight states:

1. **Default** — resting state
2. **Hover** — subtle feedback (color shift, slight scale, shadow increase)
3. **Focus** — keyboard focus indicator (never remove without replacement, must be visible)
4. **Active** — click/tap feedback (scale down slightly: 0.98)
5. **Disabled** — clearly non-interactive (opacity 40–50%, cursor not-allowed, no hover effects)
6. **Loading** — async action feedback (spinner or pulse)
7. **Error** — validation or error state
8. **Success** — successful completion confirmation

Missing states create confusion and broken experiences.

### Progressive Disclosure

Start simple, reveal sophistication through interaction:
- Basic options visible by default
- Advanced options behind an expandable section or "Show advanced"
- Hover states that reveal secondary actions
- Accordion: start collapsed, expand on click

This reduces cognitive load on first encounter while preserving power-user access.

### Optimistic UI

Update the interface immediately, sync later. This makes interactions feel fast regardless of actual network speed. Use for low-stakes actions (likes, toggles, preferences). Avoid for payments, destructive operations, or anything with irreversible consequences.

### Direct Manipulation

Users interact directly with content, not through abstract controls:
- Drag and drop to reorder (not up/down buttons)
- Inline editing (click to edit, not a separate form)
- Sliders for ranges (not numeric input with +/–)
- Pinch/zoom gestures on mobile (not +/– buttons)

### Immediate Feedback

Every interaction provides instantaneous visual feedback within 100ms. If an operation takes longer than 300ms, show a loading state.

---

## Design Process

### Design Decision Checklist

Before presenting any design, verify:

1. **Purpose** — Does every element serve a clear function?
2. **Hierarchy** — Is visual importance aligned with content importance?
3. **Consistency** — Do similar elements look and behave similarly?
4. **Accessibility** — Does it meet WCAG AA? (contrast, touch targets, keyboard nav)
5. **Responsiveness** — Does it work on mobile, tablet, desktop?
6. **Uniqueness** — Does this break from generic SaaS patterns?
7. **Anti-slop** — Would someone immediately recognize this as AI-generated?

### When to Present Options

For major design decisions (color direction, layout architecture, type pairing), present 2–3 alternative approaches with explicit trade-offs. Do not present a single "correct" solution. Make the trade-offs visible:

```
Direction 1: Warm Earth Tones
- Base: Warm gray (#E8E2DC)
- Accent: Terracotta (#C86E4B)
- For: Organic, trustworthy feel

Direction 2: Cool Midnight
- Base: Deep navy (#1A2332)
- Accent: Cyan (#4ECDC4)
- For: Modern, tech-forward feel
```

### Validation

After implementing, validate against:
- Using it yourself — actually interact with the feature
- Testing on real devices — not just browser DevTools
- Checking all states — not just the happy path
- Comparing to the original design intent

---

## Accessibility Standards

Every interface must meet WCAG 2.1 AA at minimum. These are not optional:

- **Text contrast** — 4.5:1 minimum (body text)
- **Large text** (18px+, or 14px bold) — 3:1 minimum
- **UI components and icons** — 3:1 minimum
- **Touch targets** — 44×44px minimum
- **Keyboard navigability** — all interactive elements reachable and operable
- **`prefers-reduced-motion`** — support in all animations
- **Semantic HTML** — use correct elements for correct purposes
- **Focus indicators** — visible and never removed without replacement
- **Alt text** — all images have descriptive alt text
- **Never `user-scalable=no`** — layouts that break at 200% zoom need to be fixed

### Event Handler Naming Convention

```tsx
// Prefix with "handle" for event handlers
handleClick
handleKeyDown
handleSubmit
handleBlur

// Custom interactive elements
<div
  role="button"
  tabIndex={0}
  aria-label="Close dialog"
  onClick={handleClose}
  onKeyDown={(e) => e.key === 'Enter' && handleClose()}
/>
```

---

## Implementation Principles

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No interface should look like another. Never converge on common choices across generations.

**Implementation technology (when applicable):**
- Prefer shadcn components (v4) over custom implementations where they exist
- Use Tailwind utility classes; adhere to theme variables in `index.css` via CSS custom properties
- Use `@phosphor-icons/react` for buttons and inputs
- Use `sonner` for toast notifications
- Use `framer-motion` for complex interaction sequences; prefer CSS transitions for simple hover/focus states
- Always add loading states, spinners, placeholder animations; use skeletons until content renders
- Conditional styling: `clsx` or `classnames` utilities for conditional class application
