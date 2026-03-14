# Layout and Space

Spatial design governs rhythm, hierarchy, and structural clarity. Apply these rules to every layout decision.

---

## Spacing System: 4pt Base

Use a 4pt base scale. 8pt systems are too coarse — 12px falls between steps and forces off-scale values.

**Scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96px

```css
:root {
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  --space-4xl: 96px;
}
```

### Token Naming

Name tokens semantically, not by value.

```css
/* WRONG */
--spacing-8: 8px;
--spacing-16: 16px;

/* RIGHT */
--space-sm: 8px;
--space-md: 16px;
```

Semantic names survive scale changes. Value-based names break when you adjust the system.

### `gap` Over Margins for Siblings

Use `gap` for spacing between siblings in flex/grid layouts. It eliminates margin collapse, double-margin bugs, and selector hacks.

```css
/* WRONG: margin on siblings */
.card + .card { margin-top: 16px; }

/* RIGHT: gap on container */
.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}
```

---

## Modular Scale for Typography

Apply mathematical ratios to type hierarchy. Two standard choices:

| Ratio | Name | Multiplier |
|-------|------|------------|
| Major Third | Moderate contrast | 1.25x |
| Perfect Fourth | Strong contrast | 1.333x |

With Perfect Fourth starting at 16px base:

```
Caption:  12px
Body:     16px
H3:       21px
H2:       28px
H1:       37px
Display:  50px
```

Line height: 1.5× for body text, 1.2–1.3× for headings. Optimal line length: 45–75 characters.

---

## Grid Systems

### 12-Column Grid (Standard)

Divisible by 2, 3, 4, and 6 — covers nearly every layout need.

**Gutters:** 16px (mobile), 24px (tablet), 32px (desktop)

```css
.layout {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: clamp(16px, 3vw, 32px);
  max-width: 1440px;
  margin-inline: auto;
  padding-inline: var(--space-md);
}
```

### 16-Column Grid (Data Interfaces)

Use for dashboards, data tables, and dense information layouts that need finer column control.

### Self-Adjusting Grid (No Breakpoints)

For repeating content (cards, tiles, gallery items):

```css
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
}
```

Columns are at least 280px, as many as fit, leftovers stretch to fill. No breakpoints required.

### Named Grid Areas (Complex Layouts)

```css
.app-shell {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .app-shell {
    grid-template-areas:
      "header"
      "main"
      "footer";
    grid-template-columns: 1fr;
  }
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

---

## Container Queries

Viewport media queries are for page layouts. Container queries are for components — they respond to the space a component occupies, not the viewport.

```css
/* Declare a containment context */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Default: stacked layout (narrow containers) */
.card {
  display: grid;
  gap: var(--space-md);
}

/* Wide container: side-by-side layout */
@container card (min-width: 400px) {
  .card {
    grid-template-columns: 120px 1fr;
  }
}
```

**Why this matters:** The same `<Card>` component in a narrow sidebar stays compact. In a wide main area it expands. No viewport breakpoints needed on the component itself.

Use `container-type: inline-size` (horizontal containment) unless you need both axes. Name containers when nesting containment contexts.

---

## Visual Hierarchy Through Space

### The Squint Test

Blur your eyes (or Gaussian-blur a screenshot at ~10px). Verify:

1. The primary element is visually dominant.
2. The secondary element is distinct but subordinate.
3. Clear groupings are visible.

If everything looks equal weight when blurred, you have a hierarchy problem.

### Combine Multiple Hierarchy Dimensions

Never rely on size alone. Effective hierarchy uses 2–3 signals simultaneously.

| Dimension | Strong | Weak |
|-----------|--------|------|
| Size | 3:1 ratio or more | < 2:1 ratio |
| Weight | Bold vs Regular | Medium vs Regular |
| Color | High contrast | Similar tones |
| Position | Top-left (primary) | Bottom-right |
| Space | Surrounded by whitespace | Crowded |

A heading that is larger, bolder, AND has 32px above it beats a heading that is only larger.

### Spacing Creates Grouping

Elements close together read as a group (Gestalt proximity). Control this deliberately:

```css
/* Tight: label and its input belong together */
.field-label { margin-bottom: 4px; }

/* Loose: separate fields from each other */
.form-field + .form-field { margin-top: 24px; }

/* Section break: distinct groups */
.form-section + .form-section { margin-top: 48px; }
```

### Cards Are Not Required

Cards are overused. Spacing and alignment create visual grouping naturally. Use cards only when:

- Content is distinct and actionable (each item is a navigation target)
- Items need visual comparison in a grid
- Content needs clear interaction boundaries (the border is interactive)

Never nest cards inside cards. Use spacing, typography, and subtle dividers for hierarchy within a card.

---

## Content Density Spectrum

Match density to context. No single density is universally correct.

| Context | Density | Spacing approach |
|---------|---------|-----------------|
| Marketing pages | Low | Large whitespace, `--space-3xl` sections |
| Consumer apps | Medium | Comfortable `--space-lg` between elements |
| Dashboards / data | High | Compact `--space-sm`/`--space-md`, maximize data per screen |
| Mobile (touch) | Medium-Low | Extra padding for touch targets |

Adjust density through spacing tokens, not by breaking the scale. Compact layout = smaller token steps; spacious layout = larger steps.

---

## Z-Index Management

Arbitrary z-index values create conflicts. Use a semantic scale:

```css
:root {
  --z-base:           0;
  --z-raised:         10;   /* Elevated cards, sticky content */
  --z-dropdown:       100;  /* Dropdowns, context menus */
  --z-sticky:         200;  /* Sticky headers */
  --z-modal-backdrop: 300;  /* Modal overlays */
  --z-modal:          400;  /* Modal content */
  --z-toast:          500;  /* Notifications */
  --z-tooltip:        600;  /* Tooltips (highest — always readable) */
}
```

When using the Popover API or native `<dialog>`, these elements use the top layer and bypass z-index entirely — no stacking context issues.

---

## Depth and Elevation (Shadows)

Create a consistent elevation scale. Shadow intensity should convey logical height above the surface, not decorative emphasis.

```css
:root {
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -2px rgb(0 0 0 / 0.04);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 10px 10px -5px rgb(0 0 0 / 0.03);
}
```

**Rule:** If the shadow is clearly visible as a shape, it is too strong. Shadows should define edges, not dominate. Test on both light and dark backgrounds.

Elevation usage:
- `sm`: Subtle card lift, input focus
- `md`: Dropdowns, raised cards
- `lg`: Modals, drawers
- `xl`: System dialogs, popovers above modals

---

## Optical Adjustments

Math is not perception. Apply optical corrections where needed.

### Text Optical Alignment

Text at `margin-left: 0` looks indented due to letterform whitespace. Optically align flush elements:

```css
.optically-aligned-heading {
  margin-left: -0.05em;
}
```

### Icon Centering

Geometrically centered icons often look off-center. Play icons need +2px rightward nudge (visual weight is on the left). Arrows shift toward their direction.

```css
.play-icon {
  transform: translateX(2px); /* Optical correction for triangle shape */
}
```

### Touch Targets vs Visual Size

Buttons can look small but must meet the 44px touch target minimum. Expand the tap area without changing visual size:

```css
.icon-button {
  width: 24px;
  height: 24px;
  position: relative;
}

.icon-button::before {
  content: '';
  position: absolute;
  inset: -10px; /* Expands tap area to 44px */
}
```

In Tailwind:

```tsx
<button className="relative w-6 h-6 before:absolute before:inset-[-10px] before:content-['']">
  <IconHere />
</button>
```

---

## Animation Timing Framework

Apply physics-based timing profiles. Duration is not decoration — it signals the weight of the transition.

| Profile | Duration | Use for |
|---------|----------|---------|
| Lightweight | 150ms | Icons, chips, toggles, hover states |
| Standard | 300ms | Cards, panels, menus opening |
| Weighty | 500ms | Modals, page transitions, drawers |

Easing:
- **Ease-out** (`cubic-bezier(0, 0, 0.2, 1)`): Entrances — fast start, slow arrival
- **Ease-in** (`cubic-bezier(0.4, 0, 1, 1)`): Exits — slow start, fast departure
- **Ease-in-out** (`cubic-bezier(0.4, 0, 0.2, 1)`): State changes — smooth both ends

Always respect reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

---

## What Not to Do

- Off-scale spacing values (e.g., 10px, 15px, 22px) — always use the 4pt scale
- Equal spacing everywhere — variety communicates hierarchy
- Hierarchy through size alone — combine size, weight, color, and space
- Arbitrary z-index values (1, 99, 9999) — use semantic tokens
- Margin on grid/flex siblings — use `gap`
- Viewport media queries on component internals — use container queries
