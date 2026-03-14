# Typography

## Core Principles

Set body text before anything else. Four decisions determine everything else in the layout: font, point size, line spacing, line length. All other elements calibrate against these four.

### Vertical Rhythm

Line-height should be the base unit for ALL vertical spacing. If body text has `line-height: 1.5` on `16px` type (= 24px), spacing values should be multiples of 24px. This creates subconscious harmony — text and space share a mathematical foundation.

### Modular Scale and Hierarchy

The common mistake: too many font sizes that are too close together (14px, 15px, 16px, 18px...). This creates muddy hierarchy.

Use fewer sizes with more contrast. A 5-size system covers most needs:

| Role | Typical Ratio | Use Case |
|------|---------------|----------|
| xs | 0.75rem | Captions, legal |
| sm | 0.875rem | Secondary UI, metadata |
| base | 1rem | Body text |
| lg | 1.25–1.5rem | Subheadings, lead text |
| xl+ | 2–4rem | Headlines, hero text |

Popular ratios: **1.25** (major third) for moderate contrast, **1.333** (perfect fourth) for dramatic contrast, **1.5** (perfect fifth) for editorial. Pick one and commit.

Extended scale at 1.25× ratio:

```
xs:   0.64rem  (~10px)  — captions, legal
sm:   0.80rem  (~13px)  — secondary UI
base: 1.00rem  (16px)   — body text
lg:   1.25rem  (20px)   — subheadings
xl:   1.56rem  (25px)   — section headings
2xl:  1.95rem  (31px)   — page headings
3xl:  2.44rem  (39px)   — display headings
4xl:  3.05rem  (49px)   — hero headings
5xl:  3.81rem  (61px)   — massive display
```

---

## Font Selection

### Avoid the Invisible Defaults

Inter, Roboto, Open Sans, Lato, Montserrat, Arial, system-ui — these are everywhere, making every interface feel generic. They are fine for documentation or tools where personality is not the goal, but if you want distinctive design, look elsewhere.

**Better alternatives:**

- Instead of Inter → **Instrument Sans**, **Plus Jakarta Sans**, **Outfit**
- Instead of Roboto → **Onest**, **Figtree**, **Urbanist**
- Instead of Open Sans → **Source Sans 3**, **Nunito Sans**, **DM Sans**
- For editorial or premium feel → **Fraunces**, **Newsreader**, **Lora**

**System fonts are underrated:** `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui` looks native, loads instantly, and is highly readable. Consider this for apps where performance > personality.

### Font Selection Rules

No goofy fonts (novelty, script, handwriting, circus) in professional work. No monospaced fonts for body text — code only. Prefer serif for print body text; both serif and sans-serif work on modern screens. Max 2–3 font families per project.

Limit to 3 weights per typeface (e.g., Regular 400, Medium 500, Bold 700). Prefer variable fonts for fine-tuned control and performance.

### Font Version Usage

- **Display version** — Headlines and hero text only
- **Text version** — Paragraphs and long-form content
- **Caption/Micro** — Small UI labels (1–2 lines, non-critical info)

---

## Font Pairing

The non-obvious truth: you often do not need a second font. One well-chosen font family in multiple weights creates cleaner hierarchy than two competing typefaces. Only add a second font when you need genuine contrast (e.g., display headlines + body serif).

When pairing, create contrast on multiple axes:

- **Category contrast** — Serif + Sans-serif (structure contrast)
- **Geometric + Humanist** — personality contrast (modern + warm)
- **Condensed display + Wide body** — proportion contrast

Pairing patterns:

- Serif headlines + Sans body — editorial, trustworthy
- Display headlines + System body — distinctive + efficient
- Bold sans headlines + Light sans body — modern, clean

**Never pair fonts that are similar but not identical** (e.g., two geometric sans-serifs). They create visual tension without clear hierarchy. Lower contrast between typefaces is often more effective than high contrast.

---

## Fluid Type Scales

Use `clamp(min, preferred, max)` for fluid typography. The middle value controls the scaling rate — higher `vw` = faster scaling. Add a `rem` offset so it does not collapse to 0 on small screens.

```css
h1 { font-size: clamp(2rem, 5vw + 1rem, 4rem); }
h2 { font-size: clamp(1.5rem, 3.5vw + 0.75rem, 2.5rem); }
h3 { font-size: clamp(1.25rem, 2.5vw + 0.5rem, 1.75rem); }
body { font-size: clamp(16px, 2.5vw, 20px); }
```

**When NOT to use fluid type:** Button text and labels (should be consistent), very short text, or when precise breakpoint control is needed.

---

## CSS Baseline Template

Copy-paste starting point. Every property maps to a specific typographic rule.

```css
/* =============================================
   TYPOGRAPHY BASELINE
   ============================================= */

*, *::before, *::after { box-sizing: border-box; }

html {
  font-size: clamp(16px, 2.5vw, 20px);       /* 15–25px range, fluid */
  -webkit-text-size-adjust: 100%;              /* prevent iOS resize */
}

body {
  font-family: /* your-font, */ Georgia, 'Times New Roman', serif;
  line-height: 1.38;                           /* 120–145% sweet spot */
  color: #1a1a1a;                              /* never pure #000 */
  background: #fefefe;                         /* never pure #fff */
  text-rendering: optimizeLegibility;          /* enables kern + liga */
  font-feature-settings: "kern" 1, "liga" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ---- TEXT CONTAINER: LINE LENGTH CONTROL ---- */

main, article, .prose {
  max-width: min(65ch, 90vw);                  /* 45–90 chars enforced */
  margin: 0 auto;
  padding: 0 clamp(1rem, 4vw, 2rem);
}

/* ---- PARAGRAPHS ---- */
/* Choose ONE: space-between OR first-line-indent. Never both. */

/* Option A: Space between (default for web) */
p { margin: 0 0 0.75em 0; }                   /* 50–100% of font size */

/* Option B: First-line indent (uncomment to use instead)
p { margin: 0; }
p + p { text-indent: 1.5em; }
*/

/* ---- HEADINGS ---- */

h1, h2, h3, h4 {
  line-height: 1.15;                           /* tighter than body */
  hyphens: none;                               /* never hyphenate headings */
  page-break-after: avoid;
  font-weight: 700;                            /* bold, not italic */
}
h1 {
  font-size: clamp(1.75rem, 4vw + 0.5rem, 3rem);
  margin: 2.5em 0 0.5em;                       /* space above > below */
}
h2 {
  font-size: clamp(1.375rem, 3vw + 0.25rem, 2rem);
  margin: 2em 0 0.4em;
}
h3 {
  font-size: clamp(1.125rem, 2vw + 0.25rem, 1.5rem);
  margin: 1.5em 0 0.3em;
}

/* ---- EMPHASIS ---- */

em { font-style: italic; }
strong { font-weight: 700; }
/* NEVER: strong em, em strong, or u for emphasis */

/* ---- ALL CAPS: ALWAYS LETTERSPACED ---- */

.caps {
  text-transform: uppercase;
  letter-spacing: 0.06em;                      /* 5–12% range */
  font-feature-settings: "kern" 1;
}

/* ---- SMALL CAPS: REAL ONLY ---- */

.small-caps {
  font-variant-caps: small-caps;               /* requires font with smcp */
  letter-spacing: 0.05em;
  font-feature-settings: "smcp" 1, "kern" 1;
}

/* ---- BLOCK QUOTES ---- */

blockquote {
  margin: 1.5em 2em;
  font-size: 0.92em;
  line-height: 1.3;
}

/* ---- TABLES: CLEAN, NOT CLUTTERED ---- */

table { border-collapse: collapse; width: 100%; }
th, td {
  padding: 0.5em 1em;
  text-align: left;
  vertical-align: top;
  border: none;
}
thead th {
  border-bottom: 1.5px solid currentColor;
  font-weight: 600;
}

/* Numeric data: tabular lining figures */
.data-table td {
  font-feature-settings: "tnum" 1, "lnum" 1;
  font-variant-numeric: tabular-nums lining-nums;
}

/* ---- LISTS ---- */

ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
li { margin-bottom: 0.3em; }

/* ---- HORIZONTAL RULES ---- */

hr {
  border: none;
  border-top: 1px solid currentColor;
  opacity: 0.3;
  margin: 2em 0;
}

/* ---- LINKS ---- */

a {
  color: inherit;
  text-decoration-line: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
a:hover { opacity: 0.8; }

/* ---- CODE ---- */

code {
  font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
  font-size: 0.88em;
  padding: 0.1em 0.3em;
  border-radius: 3px;
  background: rgba(0,0,0,0.04);
}
pre code {
  display: block;
  padding: 1em;
  overflow-x: auto;
  line-height: 1.5;
}

/* ---- RESPONSIVE ---- */

@media (max-width: 600px) {
  blockquote { margin: 1em 1em; }
  table { font-size: 0.9em; }
  th, td { padding: 0.4em 0.6em; }
}

/* ---- DARK MODE ---- */

@media (prefers-color-scheme: dark) {
  body {
    color: #e0e0e0;
    background: #1a1a1a;
    font-weight: 350;               /* slightly lighter — dark bg makes text appear heavier */
    -webkit-font-smoothing: auto;
  }
}

/* ---- PRINT ---- */

@media print {
  body { font-size: 11pt; line-height: 1.3; }
  main { max-width: none; }
  h1, h2, h3 { page-break-after: avoid; }
  p { orphans: 2; widows: 2; }
}
```

---

## OpenType Features

Most developers do not use these. They add significant polish:

```css
/* Body text — always on */
.body {
  font-feature-settings:
    "kern" 1,       /* kerning pairs */
    "liga" 1,       /* standard ligatures */
    "calt" 1;       /* contextual alternates */
}

/* Prose — with oldstyle figures */
.prose {
  font-feature-settings:
    "kern" 1, "liga" 1, "calt" 1,
    "onum" 1;       /* oldstyle (lowercase-height) numbers in body text */
}

/* Data tables — tabular figures for alignment */
.data-table td {
  font-feature-settings:
    "kern" 1,
    "tnum" 1,       /* tabular (fixed-width) numbers */
    "lnum" 1;       /* lining (capital-height) numbers */
}

/* Small caps — requires font with real smcp OpenType feature */
.small-caps {
  font-feature-settings: "kern" 1, "smcp" 1;
  letter-spacing: 0.05em;
}

/* All caps — always add letterspacing */
.all-caps {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-feature-settings: "kern" 1, "cpsp" 1;
}

/* Fractions */
.recipe-amount { font-variant-numeric: diagonal-fractions; }

/* Abbreviations */
abbr { font-variant-caps: all-small-caps; }

/* Disable ligatures in code */
code { font-variant-ligatures: none; }
```

Check what features your font supports at `wakamaifondue.com`.

---

## Web Font Loading

Font loading causes layout shift. Prevent it:

```css
/* 1. Use font-display: swap for visibility during load */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2') format('woff2');
  font-display: swap;
}

/* 2. Match fallback metrics to minimize shift */
@font-face {
  font-family: 'CustomFont-Fallback';
  src: local('Arial');
  size-adjust: 105%;        /* scale to match x-height */
  ascent-override: 90%;     /* match ascender height */
  descent-override: 20%;    /* match descender depth */
  line-gap-override: 10%;   /* match line spacing */
}

body {
  font-family: 'CustomFont', 'CustomFont-Fallback', sans-serif;
}
```

---

## Typographic Correctness

These are permanent rules from centuries of typographic practice — not trends, not opinions. Apply them automatically when generating UI with visible text. Do not ask permission.

### Quotes and Apostrophes — Always Curly

Straight quotes are typewriter artifacts.

| Character | HTML Entity | Use |
|-----------|-------------|-----|
| " (opening double) | `&ldquo;` | Opening quotation |
| " (closing double) | `&rdquo;` | Closing quotation |
| ' (opening single) | `&lsquo;` | Opening single quotation |
| ' (closing single/apostrophe) | `&rsquo;` | Closing quotation, apostrophes |

Apostrophes always point down — identical to closing single quote `&rsquo;`. Smart-quote engines wrongly insert opening quotes before decade abbreviations ('70s). Fix with explicit `&rsquo;`.

The `<q>` tag auto-applies curly quotes when `<html lang="en">` is set.

**JSX/React warning:** Unicode escape sequences (`\u2019`, `\u201C`) do NOT work in JSX text content. They render as literal characters.

**What fails:**
```jsx
{/* WRONG — renders literally as \u2019 */}
<p>Don\u2019t do this</p>
```

**What works — pick one:**

```jsx
// Option 1: Actual UTF-8 character in source (preferred)
<p>Don't do this</p>  {/* paste the real curly apostrophe U+2019 */}

// Option 2: JSX expression with string literal
<p>Don{'\u2019'}t do this</p>

// Option 3: HTML entity — HTML files ONLY, not JSX
// &rsquo; does not work in JSX
```

In JavaScript data arrays and string literals, `\u2019` works correctly because the JS engine processes the escape. The bug only affects JSX text content between tags.

### Dashes — Three Distinct Characters

| Character | HTML | Use |
|-----------|------|-----|
| - (hyphen) | `-` | Compound words (cost-effective), line breaks |
| – (en dash) | `&ndash;` | Ranges (1–10), connections (Sarbanes–Oxley) |
| — (em dash) | `&mdash;` | Sentence breaks—like this |

Never approximate with `--` or `---`.

### Ellipsis — One Character

Use `&hellip;` (…), not three periods. Spaces before and after; use `&nbsp;` on the text-adjacent side. For interrupted dialogue, prefer em dash over ellipsis.

### Math and Measurement

- Multiplication: `&times;` (×) — `12 &times; 4`
- Subtraction: `&minus;` (−) — `56 &minus; 12`
- Foot and inch marks: the ONE exception to curly quotes. Use straight marks: `&#39;` (foot), `&quot;` (inch)
- Use `&nbsp;` between values: `6&#39;&nbsp;10&quot;`

### Trademark and Copyright

Use real symbols: `&copy;` `&trade;` `&reg;`, never (c) (TM) (R).

```html
<footer>&copy;&nbsp;2025 Company&trade;</footer>
```

"Copyright ©" is redundant — word OR symbol, not both.

---

## HTML Entities Reference

### Quick Substitution Table

| If you see | Replace with | Entity | Rule |
|------------|-------------|--------|------|
| "straight double" | "curly double" | `&ldquo;` `&rdquo;` | Always curly |
| 'straight single' | 'curly single' | `&lsquo;` `&rsquo;` | Always curly |
| it's (straight) | it's (curly) | `&rsquo;` | Apostrophe = closing single |
| -- | – | `&ndash;` | En dash for ranges |
| --- | — | `&mdash;` | Em dash for breaks |
| ... | … | `&hellip;` | Single ellipsis character |
| (c) | © | `&copy;` | Real copyright symbol |
| (TM) | ™ | `&trade;` | Real trademark |
| (R) | ® | `&reg;` | Real registered trademark |
| 12 x 34 | 12 × 34 | `&times;` | Real multiplication sign |
| 56 - 12 (math) | 56 − 12 | `&minus;` | Real minus sign |

### Complete Entity Table

**Quotes and Apostrophes**

```
&ldquo;   "   U+201C   opening double quote
&rdquo;   "   U+201D   closing double quote
&lsquo;   '   U+2018   opening single quote
&rsquo;   '   U+2019   closing single quote / apostrophe
&quot;    "   U+0022   straight double quote (inch mark only)
&#39;     '   U+0027   straight single quote (foot mark only)
```

**Dashes**

```
-              U+002D   hyphen (compound words, line breaks)
&ndash;   –   U+2013   en dash (ranges: 1–10, connections)
&mdash;   —   U+2014   em dash (sentence breaks—like this)
&shy;          U+00AD   soft/optional hyphen (invisible break suggestion)
```

**Symbols**

```
&hellip;  …   U+2026   ellipsis
&times;   ×   U+00D7   multiplication sign
&minus;   −   U+2212   minus sign
&divide;  ÷   U+00F7   division sign
&plusmn;  ±   U+00B1   plus-minus sign
&copy;    ©   U+00A9   copyright
&trade;   ™   U+2122   trademark
&reg;     ®   U+00AE   registered trademark
&para;    ¶   U+00B6   paragraph mark (pilcrow)
&sect;    §   U+00A7   section mark
&amp;     &   U+0026   ampersand
&deg;     °   U+00B0   degree sign
```

**Spaces**

```
&nbsp;         U+00A0   nonbreaking space (prevents line break)
&thinsp;       U+2009   thin space (half word-space width)
&ensp;         U+2002   en space (half em width)
&emsp;         U+2003   em space (full em width)
```

**Arrows and Misc**

```
&larr;    ←   U+2190   left arrow
&rarr;    →   U+2192   right arrow
&uarr;    ↑   U+2191   up arrow
&darr;    ↓   U+2193   down arrow
&bull;    •   U+2022   bullet
&laquo;   «   U+00AB   left guillemet
&raquo;   »   U+00BB   right guillemet
```

**Common Accented Characters**

```
&eacute;  é     &Eacute;  É
&egrave;  è     &Egrave;  È
&aacute;  á     &Aacute;  Á
&agrave;  à     &Agrave;  À
&iacute;  í     &Iacute;  Í
&oacute;  ó     &Oacute;  Ó
&uacute;  ú     &Uacute;  Ú
&uuml;    ü     &Uuml;    Ü
&ouml;    ö     &Ouml;    Ö
&ccedil;  ç     &Ccedil;  Ç
&ntilde;  ñ     &Ntilde;  Ñ
&szlig;   ß     (Eszett — or use ss)
```

---

## Contextual Usage Patterns

```html
<!-- Quoted text -->
<p>&ldquo;She said &lsquo;hello&rsquo; to me,&rdquo; he reported.</p>

<!-- Decade abbreviations (apostrophe pointing down) -->
<p>In the &rsquo;70s, rock &rsquo;n&rsquo; roll dominated.</p>

<!-- Ranges and connections -->
<p>Pages 4&ndash;8</p>
<p>The Sarbanes&ndash;Oxley Act</p>

<!-- Em dash -->
<p>The em dash puts a nice pause in text&mdash;and is underused.</p>

<!-- Legal references -->
<p>Under &sect;&nbsp;1782, the seller may offer a refund.</p>

<!-- Copyright and trademark -->
<footer>&copy;&nbsp;2025 MegaCorp&trade;</footer>

<!-- Measurements -->
<p>The room is 12&#39;&nbsp;6&quot; &times; 8&#39;&nbsp;10&quot;.</p>

<!-- Math -->
<p>12 &times; 34 &minus; 56 = 352</p>
```

---

## Text Formatting Rules

**Bold or italic — never combined.** Serif: italic for gentle emphasis, bold for strong. Sans-serif: bold only — italic sans barely stands out. Never bold entire paragraphs.

**Underlining** — Never underline in UI. For web links: `text-decoration-thickness: 1px; text-underline-offset: 2px`.

**All caps** — Harder to read (homogeneous rectangles vs varied lowercase contour). Suitable for short headings and labels only. Always add 5–12% letterspacing: `letter-spacing: 0.06em`. Never capitalize whole paragraphs.

**One space after punctuation.** Always exactly one. Never two.

---

## Readability and Measure

Line length is the #1 readability factor designers get wrong. Target 45–90 characters per line. Use `max-width: 65ch` on text containers.

Line spacing: `line-height: 1.2` to `1.45`. Single-spaced (~1.17) is too tight. Double (~2.33) is too loose.

Increase line-height for light text on dark backgrounds. Add 0.05–0.10 to your normal value.

Use `rem`/`em` for font sizes — this respects user browser settings. Never `px` for body text. Minimum 16px body text on mobile. Never disable zoom (`user-scalable=no`).

---

## Print Typography

Body text: 10–12pt. Line spacing: 120–145% of point size. Page margins: 1.5–2.0" at 12pt. Widows and orphans: `orphans: 2; widows: 2`. Headings: `page-break-after: avoid`.

Choose ONE paragraph separation method: first-line indent (`text-indent: 1.5em`) OR space between paragraphs (`margin-bottom: 0.75em`). Never both.

---

## Typography System Architecture

Name tokens semantically — by role, not by value. Include font stacks, size scale, weights, line-heights, and letter-spacing in your token system:

```css
:root {
  /* Font stacks */
  --font-display: 'Fraunces', Georgia, serif;
  --font-body:    'Instrument Sans', system-ui, sans-serif;
  --font-mono:    'SF Mono', 'Fira Code', Consolas, monospace;

  /* Size scale (major third — 1.25×) */
  --text-xs:   0.64rem;
  --text-sm:   0.80rem;
  --text-base: 1.00rem;
  --text-lg:   1.25rem;
  --text-xl:   1.56rem;
  --text-2xl:  1.95rem;
  --text-3xl:  2.44rem;
  --text-4xl:  3.05rem;

  /* Weights */
  --weight-regular: 400;
  --weight-medium:  500;
  --weight-bold:    700;

  /* Line heights */
  --leading-tight:  1.15;  /* headings */
  --leading-snug:   1.30;  /* subheadings */
  --leading-normal: 1.38;  /* body */
  --leading-loose:  1.60;  /* small text */

  /* Letter spacing */
  --tracking-tight:  -0.02em;  /* large headlines */
  --tracking-normal:  0;
  --tracking-wide:    0.06em;  /* all-caps labels */
}
```

Never name tokens `--font-size-16` or `--font-weight-700`. Always name by semantic role: `--text-body`, `--text-heading`, `--text-caption`.

## Typography Anti-Patterns

**Never:**
- Use more than 2–3 font families per project
- Skip fallback font definitions (layout shift on load)
- Ignore font loading performance (FOUT/FOIT)
- Use decorative or script fonts for body text
- Use monospaced fonts outside of code contexts
- Disable user zoom (`user-scalable=no`)
- Use `px` units for body text (breaks user font size preferences)
- Use straight quotes (`"` `'`) anywhere in visible text
- Use `--` or `---` for dashes
- Combine bold and italic on the same text

---

## Maxims

1. **Body text first** — its 4 properties determine everything
2. **Smallest visible increments** — half-point differences matter
3. **Consistency** — same things look the same
4. **When in doubt, try both** — make samples, do not theorize
5. **Keep it simple** — 3 colors and 5 fonts? Think again

---

## Search

To find typography-related reference content in the knowledge base:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py "<query>" --domain typography
```

Examples:
- `python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py "fluid type scale clamp" --domain typography`
- `python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py "curly quotes JSX" --domain typography`
- `python3 ${CLAUDE_PLUGIN_ROOT}/skills/unmassk-design/scripts/search.py "font pairing serif sans" --domain typography`
