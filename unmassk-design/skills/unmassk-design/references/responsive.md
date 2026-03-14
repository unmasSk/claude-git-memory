# Responsive Design

Build for mobile first. Layer complexity upward. Detect input method, not just screen size. Test on real devices.

---

## Mobile-First: The Correct Approach

Write base styles for the narrowest context (mobile). Use `min-width` media queries to add complexity for wider screens.

```css
/* BASE: Mobile (no query needed) */
.container {
  padding: 1rem;
  font-size: 1rem;
}

/* TABLET: min-width query layers on top */
@media (min-width: 768px) {
  .container {
    padding: 1.5rem;
    font-size: 1.125rem;
  }
}

/* DESKTOP: another layer */
@media (min-width: 1024px) {
  .container {
    padding: 2rem;
    max-width: 1440px;
    margin-inline: auto;
  }
}
```

Desktop-first (`max-width` queries) forces mobile to load and override all desktop styles. Avoid it.

**Why mobile-first works:**
- Forces focus on essential content (mobile screen limits force prioritization)
- Progressive enhancement: start minimal, add features
- Mobile loads less CSS (no overrides needed)
- Aligns with usage patterns — majority of traffic is mobile

---

## Breakpoint Strategy

### Content-Driven Breakpoints

Do not chase device sizes. Let content tell you where to break. Start narrow, stretch until the design breaks, add a breakpoint there.

Three breakpoints usually suffice for most projects.

### Standard Breakpoints Reference

| Name | Min-width | Target devices | Layout strategy |
|------|-----------|----------------|-----------------|
| XS (base) | 0px | Small phones (iPhone SE) | Single column, large touch targets, stacked nav |
| SM | 480px | Large phones (iPhone 14+) | Single column, simplified UI |
| MD | 768px | Tablets (iPad) | 2 columns possible, side panels |
| LG | 1024px | Laptops, landscape tablets | Multi-column, full nav, desktop patterns |
| XL | 1440px+ | Desktop monitors | Max-width containers, multi-panel layouts |

### In Tailwind

Tailwind uses a mobile-first breakpoint system. Classes without prefix apply to all sizes; prefixed classes apply at that size and above.

```tsx
<div className="
  w-full          /* 0px+: full width */
  sm:w-1/2        /* 640px+: half width */
  md:w-1/3        /* 768px+: third */
  lg:w-1/4        /* 1024px+: quarter */
">
```

Common responsive layout patterns in Tailwind:

```tsx
{/* Stack on mobile, row on desktop */}
<div className="flex flex-col md:flex-row gap-6">
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>

{/* Responsive grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

{/* Mobile-only / desktop-only visibility */}
<div className="block md:hidden">Mobile only</div>
<div className="hidden md:block">Desktop only</div>
```

---

## Fluid Design with `clamp()`

`clamp(min, preferred, max)` creates fluid values that scale between breakpoints without media queries.

### Fluid Typography

```css
h1 {
  font-size: clamp(2rem, 5vw, 4rem);
  /* 32px at narrow → scales → 64px at wide */
  line-height: 1.2;
}

p {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  /* 16px minimum, never exceeds 20px */
  line-height: 1.6;
}
```

### Fluid Spacing

```css
.section {
  padding-block: clamp(2rem, 8vw, 6rem);
  /* 32px narrow → 96px wide */
}

.container {
  padding-inline: clamp(1rem, 5vw, 3rem);
  /* Fluid horizontal padding without breakpoints */
}
```

### When to Use `clamp()` vs Breakpoints

Use `clamp()` for: typography, spacing, padding that should scale continuously.
Use breakpoints for: layout changes (single to multi-column), navigation pattern changes (hamburger to full nav), component restructuring.

---

## Container Queries (Component-Level Responsiveness)

Container queries respond to the container's size, not the viewport. Essential for reusable components that appear in different contexts.

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* Default: vertical stack */
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Wide container: horizontal layout */
@container card (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
  }

  .card-image {
    width: 120px;
    flex-shrink: 0;
  }
}
```

In Tailwind (v3.2+, using `@tailwindcss/container-queries` plugin):

```tsx
<div className="@container">
  <div className="flex flex-col @md:flex-row gap-4">
    <img className="w-full @md:w-32" src={src} alt={alt} />
    <div>{content}</div>
  </div>
</div>
```

The same component in a narrow sidebar stays compact; in a wide main area it expands — no viewport hacks.

---

## Detect Input Method, Not Just Screen Size

Screen size does not reveal input method. A Surface Pro with touchscreen, a large phone with Bluetooth keyboard — screen size is the wrong signal.

### Pointer and Hover Media Queries

```css
/* Fine pointer: mouse or trackpad */
@media (pointer: fine) {
  .button {
    padding: 8px 16px;
  }
}

/* Coarse pointer: touch or stylus */
@media (pointer: coarse) {
  .button {
    padding: 12px 20px; /* Larger tap target */
    min-height: 44px;
    min-width: 44px;
  }
}

/* Device supports hover (mouse/trackpad) */
@media (hover: hover) {
  .card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

/* Device cannot hover (touch) */
@media (hover: none) {
  .card:active {
    transform: scale(0.98); /* Use active instead */
  }
}
```

**Critical:** Do not rely on hover for any functional behavior. Touch users cannot hover. Hover is decoration only.

---

## Safe Areas (Notch, Home Indicator)

Modern phones have notches, Dynamic Islands, rounded corners, and home indicators. Without safe area handling, content is obscured.

Enable `viewport-fit=cover` in your HTML meta tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Apply safe area insets with `env()`:

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* With fallback for non-notched devices */
.sticky-footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

In Tailwind, use the `safe-*` padding variants if configured, or apply via `style` prop:

```tsx
<footer style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
```

---

## Responsive Images

### `srcset` with Width Descriptors

```html
<img
  src="hero-800.jpg"
  srcset="
    hero-400.jpg 400w,
    hero-800.jpg 800w,
    hero-1200.jpg 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Hero image"
  loading="lazy"
/>
```

`sizes` tells the browser the intended display width. The browser selects the best file based on viewport AND device pixel ratio (a 2x Retina display loads the 800w image for a 400px slot).

### Art Direction with `<picture>`

Use when you need different crops at different sizes:

```html
<picture>
  <source media="(min-width: 1024px)" srcset="hero-wide.jpg" />
  <source media="(min-width: 768px)" srcset="hero-medium.jpg" />
  <img src="hero-mobile.jpg" alt="Hero" />
</picture>
```

### Next.js Image Component

```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority   /* above-the-fold: skip lazy loading */
  className="w-full h-auto"
/>
```

Use `priority` only for above-the-fold images. All others lazy-load by default.

---

## Layout Adaptation Patterns

### Navigation

```tsx
function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <button
        className="md:hidden p-2 rounded-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation"
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
      >
        {isOpen ? <X size={24} /> : <List size={24} />}
      </button>

      {/* Mobile: full-screen overlay */}
      <div
        id="mobile-nav"
        className={`fixed inset-0 z-50 bg-white p-6 md:hidden ${isOpen ? 'block' : 'hidden'}`}
      >
        <nav className="space-y-4">{/* nav items */}</nav>
      </div>

      {/* Desktop: inline horizontal nav */}
      <nav className="hidden md:flex items-center gap-6">
        {/* nav items */}
      </nav>
    </>
  );
}
```

### Sticky Header

```tsx
<header className="
  sticky top-0 z-[--z-sticky]
  bg-white/80 backdrop-blur-md
  border-b border-slate-200
">
  <div className="container mx-auto px-4 py-4 flex items-center justify-between">
    {/* header content */}
  </div>
</header>
```

### Tables as Cards on Mobile

```css
@media (max-width: 767px) {
  table, thead, tbody, tr, th, td {
    display: block;
  }

  thead tr { position: absolute; top: -9999px; left: -9999px; } /* hide column headers */

  tr { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 1rem; }

  td::before {
    content: attr(data-label);
    font-weight: 600;
    display: block;
    color: var(--text-secondary);
  }
}
```

```html
<td data-label="Name">John Smith</td>
<td data-label="Email">john@example.com</td>
```

### Progressive Disclosure on Mobile

```html
<details class="md:hidden">
  <summary class="cursor-pointer py-2 font-medium">Advanced filters</summary>
  <div class="mt-2 space-y-3">
    <!-- Filters hidden by default on mobile, always visible on desktop -->
  </div>
</details>
<div class="hidden md:block space-y-3">
  <!-- Same filters, always visible on desktop -->
</div>
```

---

## Responsive Video

```tsx
<div className="relative aspect-video">
  <video
    className="absolute inset-0 w-full h-full object-cover"
    poster="thumbnail.jpg"
    controls
    preload="metadata"
  >
    <source src="video.mp4" type="video/mp4" />
  </video>
</div>
```

`aspect-video` (16:9) maintains ratio as width changes. `preload="metadata"` loads dimensions/duration without loading full video on mobile.

---

## Internationalisation Resilience in Responsive Layouts

German text is ~30% longer than English. French is ~20% longer. Fixed-width containers on translated UIs will overflow.

```tsx
{/* WRONG: assumes English length */}
<button className="w-24">Submit</button>

{/* RIGHT: adapts to content */}
<button className="px-4 py-2">Submit</button>
```

Use logical CSS properties for RTL language support:

```css
/* Physical properties — break in RTL */
margin-left: 1rem;
padding-right: 1.5rem;
border-right: 1px solid;

/* Logical properties — work in all directions */
margin-inline-start: 1rem;
padding-inline-end: 1.5rem;
border-inline-end: 1px solid;
```

---

## Testing with Playwright MCP

Use Playwright to automate responsive testing across breakpoints:

```typescript
// Test mobile layout
await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
await page.goto('/');
await page.screenshot({ path: 'mobile.png', fullPage: true });

// Test tablet layout
await page.setViewportSize({ width: 768, height: 1024 }); // iPad
await page.screenshot({ path: 'tablet.png', fullPage: true });

// Test desktop layout
await page.setViewportSize({ width: 1440, height: 900 }); // Desktop
await page.screenshot({ path: 'desktop.png', fullPage: true });

// Check element visibility at each size
await page.setViewportSize({ width: 375, height: 667 });
const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
await expect(mobileMenu).toBeVisible();

await page.setViewportSize({ width: 1024, height: 768 });
await expect(mobileMenu).not.toBeVisible();
```

Run Playwright through the MCP tool — it provides a real browser, not a polyfill. Use `page.emulate` for device-specific testing including touch events.

**DevTools emulation misses:**
- Real touch interactions and gesture recognition
- CPU and memory constraints of low-end hardware
- Network latency patterns
- Font rendering differences between platforms
- Browser chrome (address bar) affecting available height
- Virtual keyboard behavior

Always test on at least one real iOS device, one real Android device (low-end model preferred — reveals performance issues), and a tablet.

---

## Performance on Mobile Networks

Mobile users may be on slow 3G or constrained data plans.

```tsx
{/* Lazy load below-fold images */}
<img src="image.jpg" loading="lazy" alt="Description" />

{/* Native lazy loading for videos */}
<video preload="metadata" />

{/* Lazy load heavy components */}
const HeavyChart = lazy(() => import('./HeavyChart'));

<Suspense fallback={<SkeletonChart />}>
  <HeavyChart />
</Suspense>
```

Avoid `display: none` for hiding content on mobile when the content is still downloaded. Use conditional rendering (`&&`) or lazy imports for content that should not load on mobile.

---

## What Not to Do

- Desktop-first design (start mobile, enhance upward)
- Device detection instead of feature detection (`navigator.userAgent` — fragile and wrong)
- Hover-dependent functionality (touch users cannot hover)
- Fixed pixel widths on layout containers
- Separate mobile/desktop codebases
- Ignoring landscape orientation on mobile and tablet
- Assuming mobile = low-power (a tablet may outperform a laptop)
- Assuming desktop = mouse input (many desktop devices have touch)
- Hiding core functionality on mobile (if it matters, make it work)
- Same navigation information architecture on mobile and desktop using completely different patterns (confuses returning users)
