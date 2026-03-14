# Color

## The OKLCH Color System

Stop using HSL. Use OKLCH (or LCH) instead.

HSL is not perceptually uniform: 50% lightness in yellow looks bright while 50% lightness in blue looks dark. Equal steps in HSL do not look equal. OKLCH is perceptually uniform — equal steps in lightness *look* equal.

OKLCH syntax: `oklch(lightness% chroma hue)`

- **Lightness**: 0–100%, where 0 is black and 100 is white
- **Chroma**: 0–0.4+, where 0 is neutral gray and higher values are more saturated
- **Hue**: 0–360 degrees

```css
/* Blue: base, light variant, dark variant — all perceptually coherent */
--color-primary:       oklch(55% 0.18 250);
--color-primary-light: oklch(85% 0.08 250);  /* same hue, lower chroma */
--color-primary-dark:  oklch(35% 0.12 250);
```

**Key insight:** As you move toward white or black, reduce chroma. High chroma at extreme lightness looks garish. A light blue at 85% lightness needs ~0.08 chroma, not the 0.18 of the base color. The formula: reduce chroma proportionally as lightness moves away from the 40–65% range.

---

## Tinted Neutrals: The 0.01 Chroma Trick

Pure gray is dead. Never use `oklch(X% 0 0)` for neutrals in a branded interface.

Add a subtle hint of your brand hue to all neutrals. The chroma is tiny (0.01) but perceptible. It creates subconscious cohesion between brand color and UI, and makes the interface feel like it belongs to a system.

```css
/* Dead grays — no personality, no cohesion */
--gray-100: oklch(95% 0 0);
--gray-900: oklch(15% 0 0);

/* Warm-tinted grays (brand with warm hue, e.g., terracotta) */
--gray-100: oklch(95% 0.01 60);
--gray-900: oklch(15% 0.01 60);

/* Cool-tinted grays (brand with cool hue, e.g., blue, violet) */
--gray-100: oklch(95% 0.01 250);
--gray-900: oklch(15% 0.01 250);
```

Apply the same hue as your primary color. 0.005–0.01 chroma is enough to feel natural without being obviously tinted. Pure black (`#000`) and pure white (`#fff`) do not exist in nature — real shadows and surfaces always have a color cast.

---

## Palette Structure

A complete functional palette needs four role categories:

| Role | Purpose | Scale |
|------|---------|-------|
| **Primary** | Brand, CTAs, key actions | 1 hue, 3–5 shades |
| **Neutral** | Text, backgrounds, borders | 9–11 shade scale |
| **Semantic** | Success, error, warning, info | 4 hues, 2–3 shades each |
| **Surface** | Cards, modals, overlays | 2–3 elevation levels |

Skip secondary and tertiary accent colors unless they are genuinely needed. Most interfaces work fine with one accent color. Adding more creates decision fatigue and visual noise.

**Neutral scale example (9 stops, cool-tinted):**

```css
--gray-50:  oklch(98% 0.005 250);
--gray-100: oklch(95% 0.008 250);
--gray-200: oklch(90% 0.010 250);
--gray-300: oklch(82% 0.010 250);
--gray-400: oklch(70% 0.012 250);
--gray-500: oklch(58% 0.012 250);
--gray-600: oklch(45% 0.012 250);
--gray-700: oklch(32% 0.012 250);
--gray-800: oklch(22% 0.010 250);
--gray-900: oklch(13% 0.008 250);
```

---

## The 60-30-10 Rule

This rule is about **visual weight**, not pixel count.

- **60%** — Neutral backgrounds, white space, base surfaces
- **30%** — Secondary colors: text, borders, inactive states
- **10%** — Accent: CTAs, highlights, focus states

The common mistake: using the accent color everywhere because it is "the brand color." Accent colors work because they are rare. Overuse kills their power.

When applying `colorize`, identify which elements belong to each tier before touching the code.

---

## Contrast and Accessibility

### WCAG Requirements

| Content Type | AA Minimum | AAA Target |
|--------------|------------|------------|
| Body text | 4.5:1 | 7:1 |
| Large text (18px+, or 14px bold) | 3:1 | 4.5:1 |
| UI components, icons | 3:1 | 4.5:1 |
| Non-essential decorations | None | None |

**Gotcha:** Placeholder text still needs 4.5:1. The light gray placeholder seen everywhere in AI-generated interfaces almost always fails WCAG.

Do not trust your eyes. Use tools: WebAIM Contrast Checker (`webaim.org/resources/contrastchecker/`), browser DevTools Rendering → Emulate vision deficiencies.

### Dangerous Color Combinations

- Light gray text on white (the #1 accessibility failure)
- **Gray text on any colored background** — gray looks washed out and dead on color; use a darker shade of the background color or a transparency instead
- Red text on green background (8% of men cannot distinguish these)
- Blue text on red background (vibrates visually)
- Yellow text on white (almost always fails)
- Thin light text on images (unpredictable contrast)

---

## Color Semantics

Assign consistent semantic meaning to colors and never deviate within a product:

- **Success** — Green tones: emerald, forest, mint (`oklch(55% 0.15 145)`)
- **Error** — Red/pink tones: rose, crimson, coral (`oklch(50% 0.20 25)`)
- **Warning** — Orange/amber tones (`oklch(65% 0.18 60)`)
- **Info** — Blue tones: sky, ocean, indigo (`oklch(58% 0.14 250)`)
- **Neutral/inactive** — Gray/slate

Status badges, progress indicators, and validation states must use these semantic colors consistently. Do not use error-red for decoration. Do not use success-green as an accent color unrelated to success states.

Never rely on color alone to convey information — pair with icons, labels, or patterns.

---

## Dark Mode Design

Dark mode is not inverted light mode. It requires different design decisions.

| Light Mode | Dark Mode |
|------------|-----------|
| Shadows for depth | Lighter surfaces for depth (no shadows) |
| Dark text on light | Light text on dark (reduce font weight slightly) |
| Vibrant accents | Desaturate accents slightly |
| White backgrounds | Never pure black — use dark gray (oklch 12–18%) |

Dark mode depth comes from surface color levels, not shadow:

```css
:root[data-theme="dark"] {
  --surface-1: oklch(15% 0.01 250);  /* base background */
  --surface-2: oklch(20% 0.01 250);  /* cards, panels */
  --surface-3: oklch(25% 0.01 250);  /* elevated modals */

  /* Reduce text weight slightly — dark bg makes text appear heavier */
  --body-weight: 350;  /* instead of 400 */
}
```

Increase line-height for light text on dark backgrounds. The perceived weight is lighter, so text needs more breathing room. Add 0.05–0.10 to your normal line-height.

---

## Token Hierarchy

Use two layers: primitive tokens and semantic tokens.

**Primitive tokens** — raw values, named by value:

```css
:root {
  --blue-400: oklch(65% 0.18 250);
  --blue-500: oklch(55% 0.18 250);
  --blue-600: oklch(45% 0.18 250);
  --gray-50:  oklch(98% 0.005 250);
  --gray-900: oklch(13% 0.008 250);
}
```

**Semantic tokens** — named by role, reference primitives:

```css
:root {
  --color-primary:        var(--blue-500);
  --color-primary-hover:  var(--blue-600);
  --color-primary-subtle: var(--blue-400);

  --text-primary:         var(--gray-900);
  --text-secondary:       var(--gray-600);
  --surface-base:         var(--gray-50);
  --border-default:       var(--gray-200);
}
```

For dark mode, only redefine the semantic layer — primitives stay the same:

```css
:root[data-theme="dark"] {
  --text-primary:   var(--gray-50);
  --surface-base:   var(--gray-900);
  --border-default: var(--gray-700);
}
```

Components only consume semantic tokens, never primitives directly.

---

## Palette Generation Process

Use this process when generating a new palette:

1. **Choose the primary hue** — Pick a hue value on the 0–360 scale. Consider: warm hues (0–60, 300–360) feel approachable and energetic; cool hues (180–270) feel professional and modern; mid-range hues (60–180) feel natural and organic.

2. **Determine brand temperature** — Warm brand: neutrals at hue ~30–60 with chroma 0.01. Cool brand: neutrals at hue ~220–260 with chroma 0.01.

3. **Generate the neutral scale** — 9–11 stops from oklch(98%...) to oklch(12%...), all with the same hue and 0.005–0.012 chroma.

4. **Generate the primary scale** — 5 stops: subtle (85% lightness), light (72%), base (55%), dark (40%), darker (28%). Reduce chroma at extremes.

5. **Generate semantic colors** — 4 hues (success ~145, error ~25, warning ~60, info ~250), each with 3 stops (subtle, base, dark).

6. **Create the semantic token layer** — Map all component roles to semantic token names.

7. **Verify contrast** — Check all text/background combinations against WCAG AA minimums before writing any component code.

**Unique strategy to avoid AI-slop aesthetics:** Test combinations against "does this look AI-generated?" Avoid default SaaS blue (`oklch(55% 0.20 250)` or `#3B82F6`). Consider unexpected accents: terracotta + charcoal (`oklch(50% 0.14 40)` + `oklch(20% 0.01 250)`), sage + navy, coral + slate.

---

## Alpha Is a Design Smell

Heavy use of transparency (`rgba`, `hsla`, opacity) usually means an incomplete palette. Alpha creates unpredictable contrast when backgrounds change, performance overhead from compositing layers, and inconsistency across different surface colors.

Define explicit overlay colors for each context instead of relying on alpha. Exception: focus rings and interactive states where see-through is genuinely needed.

---

## Color Application Rules

**Backgrounds** — Lightest neutral (gray-50 or equivalent)
**Text primary** — Darkest neutral (gray-900 or equivalent)
**Text secondary** — Mid-tone neutral (gray-600 or equivalent)
**Buttons (primary)** — Accent color with white text, verify contrast
**Buttons (secondary)** — Neutral with border and dark text
**Status indicators** — Semantic colors (green = success, red = error, amber = warning, blue = info)

**Interactive states:**

- Hover: Darken by 10–15% in lightness (`--color-primary-hover`) or shift hue slightly
- Focus: Use ring/outline in accent color, never remove focus indicators
- Disabled: Reduce opacity to 40–50% and remove hover effects
- Active/pressed: Darken further than hover

**Never:** Use gray text on colored backgrounds. Use the accent color for more than 10% of the visual weight. Use color as the only indicator of state or meaning.

---

## Colorizing a Monochromatic Interface

When an interface is too gray or lacks personality, add color systematically — never randomly. Follow this process:

### 1. Assess the Opportunity

Before touching code, identify where color adds value:
- **Semantic meaning** — success, error, warning, info
- **Hierarchy** — drawing attention to important elements
- **Categorization** — different sections, types, or states
- **Emotional tone** — warmth, energy, trust, creativity
- **Wayfinding** — helping users navigate and understand structure
- **Delight** — moments of visual interest and personality

### 2. Plan Before Applying

Choose 2–4 colors beyond neutrals. More than 4 accent colors creates chaos.

Define roles before applying:
- **Dominant (60%)** — which color owns the primary brand elements
- **Secondary (30%)** — which color supports and provides variety
- **Accent (10%)** — which color creates high-contrast key moments

### 3. Apply Systematically

**Semantic states:**

```css
/* State indicators — always consistent meaning */
--color-success:  oklch(52% 0.15 145);  /* green */
--color-error:    oklch(50% 0.20 25);   /* red */
--color-warning:  oklch(62% 0.18 60);   /* amber */
--color-info:     oklch(56% 0.14 250);  /* blue */
```

**Tinted backgrounds (replace pure gray with warmth):**

```css
/* Dead — pure gray */
background: #f5f5f5;

/* Alive — warm-tinted neutral */
background: oklch(97% 0.01 60);

/* Alive — cool-tinted neutral */
background: oklch(97% 0.01 250);
```

**Accent borders for sections:**

```css
.featured-card {
  border-left: 3px solid var(--color-primary);
}

.success-banner {
  border-top: 2px solid var(--color-success);
}
```

**Typography color:**

```css
/* Section headings in brand color */
.section-title {
  color: var(--color-primary);
}

/* Status labels */
.label-active  { color: var(--color-success); }
.label-pending { color: var(--color-warning); }
.label-error   { color: var(--color-error);   }
```

**Decorative background elements (use purposefully, not everywhere):**

```css
/* Mesh gradient background — warm brand */
.hero {
  background:
    radial-gradient(ellipse at 20% 50%, oklch(75% 0.12 40 / 0.3) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, oklch(70% 0.10 280 / 0.2) 0%, transparent 50%),
    oklch(97% 0.01 60);
}
```

**Data visualization — color encodes meaning:**

```css
/* Category colors for charts */
--chart-1: oklch(55% 0.18 250);  /* blue */
--chart-2: oklch(55% 0.16 145);  /* green */
--chart-3: oklch(58% 0.18 60);   /* amber */
--chart-4: oklch(52% 0.18 0);    /* red */
--chart-5: oklch(55% 0.16 300);  /* purple */
```

### 4. Verify

After colorizing, check:
- Better hierarchy — does color guide attention to the right things?
- Clearer meaning — does color help users understand states and categories?
- More engaging — does the interface feel warmer and more inviting?
- Still accessible — do all combinations meet WCAG standards?
- Not overwhelming — is color balanced and purposeful?

---

## Color and the Design System

### Warm vs Cool Intentionality

Choose warm or cool grays intentionally based on brand:
- **Warm grays** (beige/brown undertones, hue ~30–60) — organic, approachable, trustworthy
- **Cool grays** (blue undertones, hue ~220–260) — modern, tech-forward, professional

Never mix warm and cool within the same neutral scale. Pick one temperature and commit across all neutrals.

### Accent Color Independence from Neutrals

Accent colors must work against both:
- Light backgrounds (for buttons on white)
- Dark text on accented backgrounds (if accent is used as a surface color)

Test both combinations before finalizing any accent color.

### When to Use `color-mix()`

For hover/active states, use `color-mix()` instead of hardcoding separate shades:

```css
.button:hover {
  background-color: color-mix(in oklch, var(--color-primary) 85%, black);
}

.button:active {
  background-color: color-mix(in oklch, var(--color-primary) 70%, black);
}
```

### When to Use `light-dark()`

For components that must adapt to both light and dark mode without media queries:

```css
.card {
  background-color: light-dark(
    oklch(98% 0.005 250),   /* light mode */
    oklch(22% 0.010 250)    /* dark mode */
  );
}
```

Requires `color-scheme: light dark` on the root element.

---

## Full Worked Example: Complete Palette

Starting from brand decision: a fintech product with a trustworthy, modern character.

**Brand decisions:**
- Temperature: cool (blue undertones)
- Primary: indigo-blue, hue 255
- Character: professional, reliable, not cold

**Step 1 — Primary scale (5 stops):**

```css
--primary-subtle: oklch(88% 0.06 255);   /* tints, subtle backgrounds */
--primary-light:  oklch(72% 0.12 255);   /* icons, accents */
--primary:        oklch(55% 0.18 255);   /* CTAs, key actions */
--primary-dark:   oklch(40% 0.15 255);   /* hover, pressed */
--primary-darker: oklch(28% 0.12 255);   /* focus ring on light bg */
```

**Step 2 — Neutral scale (11 stops, cool-tinted):**

```css
--gray-50:  oklch(98.5% 0.004 255);
--gray-100: oklch(96%   0.006 255);
--gray-200: oklch(91%   0.008 255);
--gray-300: oklch(83%   0.009 255);
--gray-400: oklch(72%   0.010 255);
--gray-500: oklch(60%   0.010 255);
--gray-600: oklch(48%   0.010 255);
--gray-700: oklch(36%   0.009 255);
--gray-800: oklch(25%   0.008 255);
--gray-900: oklch(16%   0.006 255);
--gray-950: oklch(10%   0.004 255);
```

**Step 3 — Semantic colors:**

```css
--success:        oklch(52% 0.15 145);
--success-subtle: oklch(90% 0.05 145);
--error:          oklch(50% 0.20 25);
--error-subtle:   oklch(92% 0.06 25);
--warning:        oklch(62% 0.18 60);
--warning-subtle: oklch(92% 0.06 60);
--info:           oklch(56% 0.14 250);
--info-subtle:    oklch(90% 0.05 250);
```

**Step 4 — Semantic layer (what components use):**

```css
/* Text */
--text-primary:   var(--gray-900);
--text-secondary: var(--gray-600);
--text-disabled:  var(--gray-400);
--text-on-dark:   var(--gray-50);

/* Surfaces */
--surface-base:     var(--gray-50);
--surface-raised:   oklch(100% 0 0);  /* pure white for cards on gray bg */
--surface-overlay:  oklch(100% 0 0);  /* modals */
--surface-sunken:   var(--gray-100);  /* inputs, code blocks */

/* Borders */
--border-default: var(--gray-200);
--border-strong:  var(--gray-300);
--border-focus:   var(--primary);

/* Actions */
--color-primary:        var(--primary);
--color-primary-hover:  var(--primary-dark);
--color-primary-subtle: var(--primary-subtle);
```

**Step 5 — Dark mode overrides (semantic layer only):**

```css
:root[data-theme="dark"] {
  --text-primary:    var(--gray-50);
  --text-secondary:  var(--gray-400);
  --text-disabled:   var(--gray-600);

  --surface-base:    var(--gray-950);
  --surface-raised:  var(--gray-900);
  --surface-overlay: var(--gray-800);
  --surface-sunken:  oklch(8% 0.003 255);

  --border-default:  var(--gray-800);
  --border-strong:   var(--gray-700);
}
```

**Contrast verification (required before use):**

| Combination | Ratio | WCAG |
|-------------|-------|------|
| `--text-primary` on `--surface-base` | ~16:1 | AAA |
| `--text-secondary` on `--surface-base` | ~5.5:1 | AA |
| White on `--primary` | ~4.8:1 | AA |
| `--primary` on white | ~4.8:1 | AA |
| `--text-disabled` on `--surface-base` | ~2.5:1 | Fails (by design for disabled) |

---

## Unique Color Strategy

To avoid the AI-slop aesthetic, avoid default SaaS blue (`#3B82F6` or `oklch(55% 0.20 250)`). Consider unexpected pairings:

**Warm earth tones:**
- Base: warm gray `oklch(95% 0.01 60)`
- Accent: terracotta `oklch(50% 0.14 40)`
- For: organic, trustworthy feel — food, health, craft

**Midnight navy:**
- Base: deep navy `oklch(18% 0.02 250)`
- Accent: warm amber `oklch(72% 0.14 60)`
- For: sophisticated, premium — finance, legal, enterprise

**Sage and slate:**
- Base: warm off-white `oklch(97% 0.01 100)`
- Accent: sage green `oklch(58% 0.10 155)`
- For: calm, approachable — wellness, productivity, education

**Coral and stone:**
- Base: cool stone `oklch(90% 0.008 220)`
- Accent: coral `oklch(60% 0.16 25)`
- For: energetic but warm — consumer apps, creative tools

Test every proposed palette against the question: "Does this look like it came from an AI-generated design system?" If yes, adjust the hue, chroma, or combination.

---

## Interactive State Colors

Define explicit state colors rather than relying on opacity or darken/lighten heuristics:

```css
/* Primary button states */
.btn-primary {
  background: var(--color-primary);              /* default */
}
.btn-primary:hover {
  background: var(--color-primary-dark);         /* -15% lightness */
}
.btn-primary:active {
  background: color-mix(in oklch, var(--color-primary) 70%, black);
}
.btn-primary:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}
.btn-primary:disabled {
  background: var(--gray-300);
  color: var(--gray-500);
  cursor: not-allowed;
}

/* Input focus state */
.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px oklch(from var(--color-primary) l c h / 0.2);
}

/* Input error state */
.input.error {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px oklch(from var(--color-error) l c h / 0.2);
}
```

---

## Color and Data Visualization

When encoding data with color:

1. **Categorical data** — use perceptually distinct hues spaced at least 30° apart on the OKLCH hue wheel
2. **Sequential data** — vary lightness along a single hue (100% → 30%)
3. **Diverging data** — use two hues meeting at a neutral midpoint (red → gray → blue)
4. **Always test for colorblindness** — 8% of men have red-green colorblindness; avoid red/green as the only distinguishing factor

```css
/* Categorical palette — perceptually distinct, colorblind-safe */
--data-blue:    oklch(55% 0.16 250);
--data-orange:  oklch(62% 0.16 50);
--data-purple:  oklch(52% 0.16 295);
--data-teal:    oklch(55% 0.14 195);
--data-yellow:  oklch(72% 0.14 85);
```

---

## Color Anti-Patterns

**Never:**
- Use every color in the rainbow (choose 2–4 beyond neutrals)
- Apply color without semantic meaning
- Put gray text on colored backgrounds (use a darker shade of that color instead)
- Use pure gray for neutrals (add the brand hue at 0.005–0.012 chroma)
- Use pure black (`#000`) or pure white (`#fff`) for large areas
- Violate WCAG contrast requirements
- Use color as the only indicator of state (accessibility issue — pair with icons or labels)
- Make everything colorful (defeats the purpose of the 60-30-10 rule)
- Default to purple-to-blue gradients (the AI-slop aesthetic)
- Use the AI color palette (cyan-on-dark, neon on dark, glowing accents)

---

## Color Testing Checklist

Before finalizing any palette:

- [ ] Every text/background combination verified against WCAG AA (4.5:1 body, 3:1 large/UI)
- [ ] Placeholder text verified (commonly fails at light gray on white)
- [ ] Semantic colors (success/error/warning/info) do not overlap visually
- [ ] Red/green combinations tested with simulated colorblindness
- [ ] Dark mode surfaces use lightness levels, not shadows
- [ ] No pure gray (`chroma: 0`) in neutrals — all tinted with brand hue
- [ ] No pure black (#000) or pure white (#fff) for large background areas
- [ ] Accent color at no more than 10% visual weight
- [ ] All interactive states (default/hover/active/focus/disabled) have distinct colors
- [ ] "Does this look AI-generated?" test passed

---

## Search

To find color-related reference content in the knowledge base:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py "<query>" --domain color
```

Examples:
- `python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py "oklch dark mode surfaces" --domain color`
- `python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py "contrast ratio accessibility" --domain color`
- `python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py "palette generation brand hue" --domain color`
