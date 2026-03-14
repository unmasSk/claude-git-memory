# Design System Kickoff

Reference for starting a new design system. Covers the trifurcation framework,
design token structure, component extraction, project questionnaire, and how to
generate a design system with `search.py`.

---

## The Trifurcation Framework

Every element in a design system belongs to exactly one of three categories.
Classify before you build. Misclassifying (e.g. treating brand color as fixed, or
treating spacing as project-specific) is the root cause of design system inconsistency.

### Fixed Elements

Fixed elements never change across projects. They express universal principles of
visual cognition and ergonomic interaction, not brand personality.

**Spacing scale**

Use a base-4 scale exclusively:

```
4px  8px  12px  16px  24px  32px  48px  64px  96px
```

Every margin, padding, and gap must be a value from this list. No exceptions.
Mathematical relationships between values create visual rhythm without effort.

**Grid system**

- 12-column grid for most layouts (divisible by 2, 3, 4, 6)
- 16-column grid for data-heavy interfaces (dashboards, analytics)
- Gutters: 16px mobile / 24px tablet / 32px desktop

Grid provides structural order. Brand personality is expressed through color,
typography, and content — never through grid deviation.

**Accessibility baseline**

Non-negotiable. These are not style choices:

- WCAG 2.1 AA minimum compliance (WCAG 2.2 AA aspirational)
- Normal text contrast: 4.5:1
- Large text contrast (18pt+ or 14pt+ bold): 3:1
- UI component and focus indicator contrast: 3:1
- Touch targets: 44×44px minimum
- Keyboard navigation: all interactive elements reachable
- Screen readers: semantic HTML, ARIA labels where needed

**Typography hierarchy logic**

Scale using one of two mathematical ratios:
- 1.25× (Major Third): compact UIs, data-dense apps
- 1.333× (Perfect Fourth): editorial, marketing, content-heavy apps

Levels: Display → H1 → H2 → H3 → Body → Small → Caption

Line heights:
- Body text: 1.5×
- Headlines: 1.2–1.3×
- Optimal line length: 45–75 characters

Specific fonts change per project. The mathematical logic is fixed.

**Component architecture**

The state machine for each component type is fixed:

- Buttons: Default / Hover / Active / Focus / Disabled
- Form fields: Default / Focus / Filled / Error / Disabled
- Modals: Overlay + centered content + close mechanism + focus trap
- Cards: Container → Header → Body → Footer (Footer optional)

Appearance is project-specific. The state inventory is not.

**Animation timing physics**

Three duration profiles, each tied to the perceived weight of the element:

| Profile | Duration | Apply to |
|---|---|---|
| Lightweight | 150ms | Icons, chips, badges, toggles |
| Standard | 300ms | Cards, panels, dropdowns |
| Weighty | 500ms | Modals, page transitions, drawers |

Easing rules:
- Ease-out: entrances (fast start, slow end — element decelerates into place)
- Ease-in: exits (slow start, fast end — element accelerates away)
- Ease-in-out: transitions between states

These physics profiles apply regardless of brand. A playful brand still uses
150ms for icon interactions — they may use a bouncier curve, but not a longer duration.

---

### Project-Specific Elements

Fill these in per project. They express the brand's unique personality, emotional
goals, and target context. There is no default.

**Brand color system template**

```
NEUTRALS (4–5 values):
- Background lightest: _______  (e.g., slate-50 for cool, warm-white for warm)
- Surface:            _______  (e.g., slate-100)
- Border / divider:   _______  (e.g., slate-300)
- Text secondary:     _______  (e.g., slate-600)
- Text primary:       _______  (e.g., slate-900)

ACCENTS (1–3 values):
- Primary (main CTA):           _______
- Secondary (alternative action): _______ (optional)

STATUS:
- Success: _______ (green family)
- Warning: _______ (amber family)
- Error:   _______ (red family)
- Info:    _______ (blue family)
```

Questions to resolve before filling the template:
1. What emotion does this brand need to evoke? (Trust / excitement / calm / urgency)
2. Warm or cool neutrals?
3. Conservative or bold accent?

**Filled examples by product type**

B2B SaaS:
```
Neutrals: Cool greys (slate-50 → slate-900)
Primary:  Deep blue #0A2463 — trust, professionalism
Success:  Muted green #10B981
Why:      Financial and enterprise products require trust over personality.
          Cool greys signal precision. Deep blue signals authority.
```

Consumer social app:
```
Neutrals: Warm greys with beige undertones
Primary:  Coral #FF6B6B — energy, creativity, warmth
Success:  Teal #06D6A0 — fresh, unexpected, not corporate
Why:      Social spaces must feel human and welcoming.
          Warm neutrals soften the interface.
          Coral rejects corporate blue.
```

Healthcare platform:
```
Neutrals: Pure greys (no color temperature)
Primary:  Soft blue #4A90E2 — calm, clinical, trustworthy
Success:  Medical green #38A169
Why:      Healthcare interfaces must minimize cognitive load and maximize clarity.
          No warm tones — warmth implies informality, which erodes clinical trust.
          System fonts (SF Pro / Segoe) preferred: no font render variance across devices.
```

**Typography pairing template**

```
HEADLINE FONT: _______
- Weight:     _______ (e.g., Bold 700)
- Use case:   H1, H2, display text
- Personality: _______ (geometric / humanist / serif / slab)

BODY FONT: _______
- Weight:     _______ (e.g., Regular 400, Medium 500)
- Use case:   Paragraphs, UI labels, captions
- Personality: _______ (neutral / readable / efficient)

ACCENT FONT (optional): _______
- Weight:     _______
- Use case:   Special callouts, pull quotes, brand moments
```

Pairing logic:
- Serif headline + sans-serif body: editorial authority
- Geometric sans + humanist sans: modern precision meets warmth
- Display font + system font: personality at headline scale, efficiency at body scale

Filled examples:
- Editorial platform: Playfair Display (Bold 700) + Inter (Regular 400)
- Tech startup: DM Sans throughout (Bold 700 headlines, Regular 400 body)
- Luxury brand: Cormorant Garamond (Light 300) + Lato (Regular 400)

**Tone of voice template**

```
BRAND PERSONALITY (1–10 scales):
- Formal ↔ Casual:              ___ / 10
- Professional ↔ Friendly:      ___ / 10
- Serious ↔ Playful:            ___ / 10
- Authoritative ↔ Conversational: ___ / 10

MICROCOPY:
- Button label (submit form):  _______
- Error (invalid email):       _______
- Success (data saved):        _______
- Empty state:                 _______

ANIMATION PERSONALITY:
- Speed:  _______ (quick / moderate / slow)
- Feel:   _______ (precise / smooth / bouncy)
```

Filled examples:
- Banking app: Formal 8, Professional 9, Serious 8 / "Submit Application" / "Email address format is invalid" / "Application submitted successfully" / Animation: quick, precise
- Social app: Casual 8, Friendly 9, Playful 7 / "Let's go!" / "Hmm, that email doesn't look right" / "You're all set" / Animation: moderate, smooth

**Animation speed and feel template**

```
SPEED PREFERENCE:
- UI interactions:   _______ (100–150ms / 150–200ms / 200–300ms)
- State changes:     _______ (200ms / 300ms / 400ms)
- Page transitions:  _______ (300ms / 500ms / 700ms)

ANIMATION STYLE:
- Easing preference: _______ (sharp / standard / bouncy)
- Movement type:     _______ (minimal / smooth / expressive)
```

Filled examples:
- Trading platform: Fast (100ms UI, 200ms states, 300ms pages) / Sharp easing, minimal movement — traders need speed, not spectacle
- Wellness app: Slow (200ms UI, 400ms states, 500ms pages) / Smooth easing, gentle movement — calm matches the brand

---

### Adaptable Elements

Context-dependent. Choose the appropriate variant based on the use case at hand.

**Button variants**

| Variant | Usage |
|---|---|
| Primary (full color) | Main CTA — one per screen section maximum |
| Secondary (outline) | Alternative actions with equal visual weight to primary |
| Tertiary (text only) | Lower-priority actions — multiple per section acceptable |
| Destructive (red family) | Irreversible actions: delete, remove, revoke |
| Ghost (minimal) | Navigation, toolbars, compact layouts |

**Responsive breakpoints**

Fixed ranges:

| Name | Range | Typical layout |
|---|---|---|
| XS | 0–479px | Single column |
| SM | 480–767px | Single column, larger tap targets |
| MD | 768–1023px | 2 columns or sidebar + content |
| LG | 1024–1439px | Full multi-column |
| XL | 1440px+ | Max-width container centered |

Adapt layout per content type:
- Simple content site: 1 col → 2 col → 3 col max (do not over-grid content)
- Dashboard / data app: collapsed stack → simplified sidebar → full sidebar + main + right panel

**Dark mode**

Dark mode is not color inversion. Contrast must be recalibrated:

```
Light mode:
  Background: #FFFFFF
  Text:       #0F172A (slate-900) → 21:1 contrast

Dark mode:
  Background: #0F172A (slate-900)
  Text:       #E2E8F0 (slate-200) → 15.8:1 contrast
```

Use slate-200 or equivalent, not pure white (#FFFFFF), on dark backgrounds.
Pure white on pure black is too harsh for extended reading. Slightly lower
contrast (still well above AA) reduces eye strain.

**Loading states**

| Duration | Pattern |
|---|---|
| < 300ms | No indicator (feels instant) |
| 300ms – 1s | Subtle spinner or skeleton screen |
| 1s – 2s | Skeleton screen with content placeholder |
| > 2s | Progress bar with percentage or estimated time |
| Interactive operations | Spinner inside the button — do not disable, show state |

**Error handling**

| Error type | Pattern |
|---|---|
| Form validation | Validate on blur; show error inline below field; clear on fix |
| Network / transient | Show retry button |
| 404 / permanent | Show helpful message + next steps |
| 500 / critical | Show error boundary + contact support path |
| Missing data | Empty state with call to action |
| Corrupt data | Error boundary with reload option |

---

## Generating a Design System with search.py

Run this before any design work on a new project:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py \
  '<product description>' \
  --design-system \
  -p '<project name>'
```

This returns: recommended visual pattern, style direction, color palette with hex
values, typography stack with scale, spacing system, effects (shadows, borders,
radii), and anti-patterns to avoid for this product category.

To persist to a file (Master + Overrides pattern):

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py \
  '<product description>' \
  --design-system \
  -p '<project name>' \
  --persist \
  --output-dir ./design-system
```

This creates:
```
design-system/<project-slug>/MASTER.md       # Global source of truth
design-system/<project-slug>/pages/<page>.md # Page-specific overrides (optional)
```

To create a page-level override alongside the master:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py \
  '<product description>' \
  --design-system \
  -p '<project name>' \
  --persist \
  --page dashboard \
  --output-dir ./design-system
```

Precedence rule: when building a specific page, check `pages/<page>.md` first.
If it exists, its rules override `MASTER.md`. Otherwise, use `MASTER.md` alone.

Domain-specific searches:

```bash
# Color only
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py \
  'fintech dark mode' --domain color

# Typography only
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py \
  'editorial serif pairing' --domain typography
```

Available domains: `style`, `prompt`, `color`, `chart`, `landing`, `product`,
`ux`, `typography`, `google-fonts`

Do not hand-pick tokens without running the script first. The script surfaces
pattern-matching from the reference corpus — it is not a style generator, it is
a constraint engine.

---

## Component Extraction Patterns

Use the extract workflow when a feature introduces components that will appear
in 3+ places or when hardcoded values should become tokens.

**Criteria for extraction**

Extract when:
- A UI pattern appears 3+ times or is likely to recur
- Systematizing the pattern improves consistency
- The pattern is general, not context-specific
- The maintenance cost of tokens/components is lower than divergence cost

Do not extract:
- One-off, context-specific implementations
- Components so generic they carry no design opinion
- Values that carry no semantic meaning

**Extraction steps**

1. Find the design system — locate `ui/`, `components/`, or `design-system/`.
   Understand naming conventions, token structure, import/export conventions.
   If no system exists, ask where it should live before creating it.

2. Identify patterns:
   - Repeated components: similar UI patterns used in multiple locations
   - Hardcoded values: colors, spacing, shadows as raw values instead of tokens
   - Inconsistent variations: multiple implementations of the same concept
   - Reusable layout or interaction patterns worth systematizing

3. Plan extraction:
   - Which UI elements become reusable components?
   - Which hardcoded values become design tokens (named with semantic meaning)?
   - What variants does each component need?
   - What naming convention matches the existing system?
   - What is the migration path for existing usages?

4. Build improved versions:
   - Clear props API with sensible defaults
   - All required states documented (see fixed component architecture above)
   - Accessibility built in: ARIA, keyboard navigation, focus management
   - TypeScript types and prop documentation
   - Usage examples

5. Token naming — use a two-tier structure:

   ```css
   /* Primitive tokens (raw values) */
   --color-blue-600: #2563EB;
   --spacing-4: 1rem;

   /* Semantic tokens (intent-named, reference primitives) */
   --color-action-primary: var(--color-blue-600);
   --spacing-component-padding: var(--spacing-4);
   ```

   Semantic tokens are what components consume. Primitive tokens are the source
   of truth for values. Changing a primitive updates everything downstream.

6. Migrate: find all instances, replace systematically, test for visual and
   functional parity, delete old implementations.

7. Document: update component library, document token usage and intent, add
   examples, update Storybook or component catalog.

Design systems grow incrementally. Extract what is clearly reusable now. Do not
pre-extract for hypothetical future use.

---

## Project Kickoff Questionnaire

Run this questionnaire at the start of every new project. Fill every field before
generating the design system or writing any tokens.

```
PROJECT NAME: ___________________________
PURPOSE:      ___________________________
TARGET USERS: ___________________________

BRAND PERSONALITY:
- Primary emotion to evoke:    _______
- Warm or cool:                _______
- Formal or casual:            _______
- Conservative or bold:        _______

USER CONTEXT:
- Who uses this? What are they doing when they open it?
- What job are they trying to get done?
- What emotions should the interface evoke?

REFERENCE AND ANTI-REFERENCE:
- Reference products (captures the right feel): _______
- Anti-references (explicitly NOT this look):    _______

COLORS:
- Neutral base:    _______
- Primary accent:  _______
- Status colors:   Success _______ / Warning _______ / Error _______

TYPOGRAPHY:
- Headline font:     _______
- Body font:         _______
- Pairing rationale: _______

TONE:
- Button label style: _______ (formal: "Submit Application" / casual: "Let's go!")
- Error message style: _______ (clinical: "Invalid format" / human: "That doesn't look right")
- Success message style: _______

ANIMATION:
- Speed preference: _______ (fast / moderate / slow)
- Feel preference:  _______ (sharp / smooth / bouncy)

TARGET DEVICES:
- Primary:   _______ (mobile / desktop / both)
- Secondary: _______

ACCESSIBILITY:
- WCAG level required: _______ (AA minimum, AAA aspirational)
- Known user needs: _______
- Reduced motion: must support? _______
```

Run `search.py --design-system` with the project description after completing
the questionnaire. Let the script surface pattern matches before committing to
token values.

---

## Complete System Examples

### B2B SaaS (Conservative)

**Fixed:** Standard 4px spacing, 12-column grid, WCAG AA, Major Third type scale (1.25×)

**Project-Specific:**
- Colors: Cool greys (slate-50 → slate-900) + corporate blue
- Typography: DM Sans Bold (headlines) + DM Sans Regular (body) — single family
- Tone: Professional, formal — "Submit Application", "Email address format is invalid"
- Animation: Quick (150ms), precise easing

**Adaptable:**
- Dashboard gets multi-panel layout (sidebar + main + right panel at LG+)
- Forms use progressive disclosure (long forms split into steps)
- Errors show detailed technical information (technical users expect specificity)
- Loading: skeleton screens for data tables, spinners for form submission

### Consumer Social App (Playful)

**Fixed:** Same spacing, grid, accessibility, and type hierarchy logic

**Project-Specific:**
- Colors: Warm greys + vibrant coral #FF6B6B + teal success #06D6A0
- Typography: Poppins Bold (headlines) + Inter Regular (body)
- Tone: Casual, friendly, playful — "Let's go!", "Hmm, that doesn't look right", "You're all set"
- Animation: Moderate (200ms), smooth easing — not bouncy (reserved for explicit delight moments)

**Adaptable:**
- Mobile-first layout (single column, bottom nav for primary actions)
- Forms are minimal (progressive profiling — collect what you need, when you need it)
- Errors use friendly language, no technical codes
- Empty states have illustration + encouraging CTA

### Healthcare Platform (Clinical)

**Fixed:** Same foundations

**Project-Specific:**
- Colors: Pure greys (no color temperature) + medical blue #4A90E2
- Typography: System fonts (SF Pro / Segoe UI) — no font loading delay, consistent rendering
- Tone: Clear, authoritative, calm — "Continue", "Enter a valid date of birth", "Record saved"
- Animation: Slow (300ms), smooth — reduces perceived urgency, matches clinical environment

**Adaptable:**
- Desktop-first (clinical workstations, keyboard-driven workflows)
- Forms are complex and multi-step (HIPAA compliance requires field-level disclosure)
- Errors are precise with explicit next steps ("Please enter a date in MM/DD/YYYY format")
- Loading states use progress indicators with estimated time for long operations

---

## Design Tokens: Structure and Naming

Design tokens are named values that replace hardcoded values across a codebase.
Structure them in two tiers.

### Tier 1: Primitive Tokens

Raw values. Source of truth. Consumed by semantic tokens, never directly by
components.

```css
/* Color primitives */
--color-slate-50: #F8FAFC;
--color-slate-100: #F1F5F9;
--color-slate-300: #CBD5E1;
--color-slate-600: #475569;
--color-slate-900: #0F172A;
--color-blue-600: #2563EB;
--color-blue-700: #1D4ED8;
--color-green-600: #16A34A;
--color-red-600: #DC2626;
--color-amber-500: #F59E0B;

/* Spacing primitives */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;

/* Typography primitives */
--font-size-xs: 0.75rem;     /* 12px */
--font-size-sm: 0.875rem;    /* 14px */
--font-size-base: 1rem;      /* 16px */
--font-size-lg: 1.25rem;     /* 20px — Major Third step */
--font-size-xl: 1.5625rem;   /* 25px */
--font-size-2xl: 1.953rem;   /* 31px */
--font-size-3xl: 2.441rem;   /* 39px */
--font-size-4xl: 3.052rem;   /* 49px */

/* Radius primitives */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

### Tier 2: Semantic Tokens

Intent-named. Reference primitive tokens. These are what components consume.
Changing a primitive updates every semantic token that references it.

```css
/* Color semantics */
--color-bg-base:       var(--color-slate-50);
--color-bg-surface:    var(--color-slate-100);
--color-border:        var(--color-slate-300);
--color-text-muted:    var(--color-slate-600);
--color-text-primary:  var(--color-slate-900);

--color-action-primary:       var(--color-blue-600);
--color-action-primary-hover: var(--color-blue-700);

--color-status-success: var(--color-green-600);
--color-status-error:   var(--color-red-600);
--color-status-warning: var(--color-amber-500);

/* Spacing semantics */
--space-component-padding-x: var(--space-4);
--space-component-padding-y: var(--space-2);
--space-section-gap:         var(--space-8);
--space-page-padding:        var(--space-6);

/* Typography semantics */
--font-size-body:    var(--font-size-base);
--font-size-label:   var(--font-size-sm);
--font-size-caption: var(--font-size-xs);
--font-size-heading-sm: var(--font-size-lg);
--font-size-heading-md: var(--font-size-xl);
--font-size-heading-lg: var(--font-size-2xl);
--font-size-display:    var(--font-size-4xl);
```

### Tailwind Config Integration

Map semantic tokens into a Tailwind config so component classes use the design
system rather than Tailwind's default palette.

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
        },
        border: 'var(--color-border)',
        text: {
          primary: 'var(--color-text-primary)',
          muted: 'var(--color-text-muted)',
        },
        action: {
          primary: 'var(--color-action-primary)',
          'primary-hover': 'var(--color-action-primary-hover)',
        },
        status: {
          success: 'var(--color-status-success)',
          error: 'var(--color-status-error)',
          warning: 'var(--color-status-warning)',
        },
      },
      spacing: {
        'component-x': 'var(--space-component-padding-x)',
        'component-y': 'var(--space-component-padding-y)',
        section: 'var(--space-section-gap)',
        page: 'var(--space-page-padding)',
      },
    },
  },
};
```

Components then use: `bg-bg-base`, `text-text-primary`, `text-status-error` —
instead of: `bg-slate-50`, `text-slate-900`, `text-red-600`. The design system
token name communicates intent; the primitive value is invisible at the component level.

### Dark Mode Token Pattern

Override semantic tokens in a `.dark` class or `@media (prefers-color-scheme: dark)`:

```css
:root {
  --color-bg-base:      #FFFFFF;
  --color-bg-surface:   #F1F5F9;
  --color-border:       #CBD5E1;
  --color-text-muted:   #475569;
  --color-text-primary: #0F172A;
}

.dark, @media (prefers-color-scheme: dark) {
  --color-bg-base:      #0F172A;
  --color-bg-surface:   #1E293B;
  --color-border:       #334155;
  --color-text-muted:   #94A3B8;
  --color-text-primary: #E2E8F0;
}
```

Every component using semantic tokens automatically adapts to dark mode without
any component-level changes.

---

## Tooling Conventions

**CSS custom properties:** Use for project-specific semantic tokens. Native cascade
and inheritance make them the right primitive for runtime theming.

**Tailwind config:** Extend (not replace) Tailwind's default scale. Add the semantic
tokens as named classes. Keep the default utility classes — they cover micro-adjustments
that semantic tokens would over-engineer.

**Figma variables:** Mirror the two-tier structure. Primitive collection feeds the
Semantic collection. Components in Figma reference semantic variables, not primitive
colors.

**Storybook:** Each component story should demonstrate all states (default, hover,
focus, active, disabled, error, loading where applicable). Use semantic token names
in story controls.

**Type checking:** Export tokens as TypeScript constants for type-safe consumption
in components:

```typescript
export const tokens = {
  color: {
    bgBase: 'var(--color-bg-base)',
    actionPrimary: 'var(--color-action-primary)',
    statusError: 'var(--color-status-error)',
  },
  space: {
    componentX: 'var(--space-component-padding-x)',
    sectionGap: 'var(--space-section-gap)',
  },
} as const;
```

---

## Maintaining Consistency Over Time

**Document the why, not just the what.** Every token naming decision should have
a comment explaining the intent. "Border color" is not enough — "Subtle divider
for separating sections within the same surface elevation" survives longer and
guides future decisions correctly.

**Auditing new work against the system:**
- Does it use spacing scale values? (No raw pixel values in component styles)
- Does it reference semantic tokens? (No primitive colors directly in components)
- Does it follow component architecture? (All states present)
- Does it express fixed elements as fixed? (No per-component spacing inventions)

**Reviewing system evolution:**
- Before adding a new token, check if an existing token covers the intent
- Before adding a new component, check if composition of existing components achieves the goal
- Before deviating from fixed elements, document why the deviation is necessary and time-bound

**Communication pattern:**
- Share with designers: "Here is what varies (project-specific) versus what is
  fixed (never changes). We can express brand personality in colors, type, and
  animation feel. We cannot invent new spacing values."
- Share with developers: "Always consume semantic tokens. Never use primitive
  tokens in components. Never hardcode raw values."

---

## Decision Tree for Any New Element

Ask in order:

1. Does this affect structure, accessibility, or universal UX patterns?
   → Fixed. Use the fixed system without variation.

2. Does this express brand personality, voice, or purpose?
   → Project-specific. Fill the template for this project.

3. Does this depend on content type, context, or use case?
   → Adaptable. Choose the appropriate variant based on context.

If the answer is unclear, default to the most constrained category.
Flexibility creates inconsistency. Earn every deviation.

---

## Validation Checklist

Before finalizing any design:

**Fixed elements**
- [ ] All spacing values are from the 4px scale
- [ ] Layout uses 12- or 16-column grid
- [ ] Normal text meets 4.5:1 contrast minimum
- [ ] Large text meets 3:1 contrast minimum
- [ ] UI components meet 3:1 contrast minimum
- [ ] Touch targets are 44×44px minimum
- [ ] Typography uses the mathematical scale
- [ ] Components include all required states

**Project-specific elements**
- [ ] Brand colors are filled in and intentional (not defaults)
- [ ] Typography pairing is chosen and justified
- [ ] Tone of voice is defined and consistent across all copy
- [ ] Animation speed matches brand personality

**Adaptable elements**
- [ ] Component variants match the context (primary/secondary/ghost/etc.)
- [ ] Responsive behavior fits the content type and primary device
- [ ] Loading states match the operation duration
- [ ] Error handling fits the error type and user sophistication
