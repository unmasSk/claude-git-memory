# Motion

## The 80ms Perceptual Threshold

The human brain buffers sensory input for ~80ms to synchronize perception. Anything under 80ms feels instant and simultaneous. This is the target for micro-interactions — button presses, toggles, immediate feedback states. Anything that crosses the 80ms threshold feels like it has a delay; design intentionally for that delay.

---

## Duration Table

Timing matters more than easing. These durations feel right for most UI:

| Duration | Use Case | Examples |
|----------|----------|----------|
| **100–150ms** | Instant feedback | Button press, toggle, color change, checkbox |
| **200–300ms** | State changes | Menu open, tooltip appear, hover states, tab switch |
| **300–500ms** | Layout changes | Accordion expand, modal open, drawer, sheet slide-in |
| **500–800ms** | Entrance animations | Page load, hero reveals, scroll-triggered reveals |

**Exit animations are faster than entrances.** Use ~75% of the enter duration. A modal that opens in 300ms should close in ~225ms.

### Duration by Element Weight

| Element Weight | Duration | Example |
|----------------|----------|---------|
| Lightweight (<100px) | 150ms | Icons, badges, chips, small UI |
| Standard (100–500px) | 300ms | Cards, panels, list items |
| Weighty (>500px) | 500ms | Modals, full-page transitions |

### Duration by Interaction Type

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Button press | 100ms | ease-out |
| Hover state | 150ms | ease-out |
| Checkbox toggle | 150ms | ease-out |
| Tooltip appear | 200ms | ease-out |
| Tab switch | 250ms | ease-in-out |
| Accordion expand | 300ms | ease-out |
| Modal open | 300ms | ease-out |
| Modal close | 250ms | ease-in |
| Page transition | 400ms | ease-in-out |
| Sheet slide-in | 300ms | ease-out |
| Toast notification | 300ms | ease-out |

---

## Easing Curves

Do not use `ease`. It is a compromise that is rarely optimal.

### Standard Curves

```css
/* Entrances — elements entering view, expanding, appearing */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);

/* Exits — elements leaving view, collapsing, disappearing */
--ease-in: cubic-bezier(0.7, 0, 0.84, 0);

/* State toggles — transitions that go both ways */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);

/* Continuous loops — loading spinners, marquee, infinite animations */
linear
```

### Exponential Curves (Recommended for Micro-interactions)

These mimic real physics — friction and deceleration — and feel natural:

```css
/* Quart out — smooth, refined. Recommended default for most interactions */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);

/* Quint out — slightly more dramatic */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);

/* Expo out — snappy, confident */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);

/* Sharp — mechanical interactions, precise movements */
--ease-sharp: cubic-bezier(0.4, 0.0, 0.6, 1);
```

### Spring Easing (Restricted Use)

```css
/* Spring — cubic-bezier(0.68, -0.55, 0.265, 1.55) */
```

**Use spring easing only for explicitly playful brand contexts: games, children's apps, entertainment products where overshoot is intentional.** Default to `cubic-bezier(0.4, 0, 0.2, 1)` for all standard interactions.

Spring easing is NOT appropriate for: business software, dashboards, data-heavy interfaces, professional tools, medical applications, banking, anything where the user is in task mode.

### No Bounce or Elastic by Default

Bounce and elastic easing were trendy in 2015 but now feel tacky and amateurish. Real objects do not bounce when they stop — they decelerate smoothly. Overshoot effects draw attention to the animation itself rather than the content.

---

## The Only Two Properties You Should Animate

Animate `transform` and `opacity` only. Everything else causes layout recalculation (reflow), which is expensive and causes jank.

```css
/* Correct — GPU-accelerated, 60fps */
.element {
  transform: translateX(100px);
  opacity: 0.5;
}

/* Wrong — causes reflow on every frame */
.element {
  left: 100px;
  width: 300px;
}
```

**Height animations** are the common exception. For accordions and expand/collapse, do not animate `height` directly. Use `grid-template-rows` instead:

```css
.accordion-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms cubic-bezier(0.25, 1, 0.5, 1);
}

.accordion-body.open {
  grid-template-rows: 1fr;
}

.accordion-body > * {
  overflow: hidden;
}
```

---

## Staggered Animations

Use CSS custom properties for cleaner stagger patterns:

```css
/* CSS-only stagger using custom property */
.list-item {
  animation: slide-up 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 50ms);
}
```

```html
<ul>
  <li style="--i: 0">Item 1</li>
  <li style="--i: 1">Item 2</li>
  <li style="--i: 2">Item 3</li>
</ul>
```

**Cap total stagger time.** 10 items at 50ms = 500ms total — acceptable. For longer lists, reduce per-item delay or cap the staggered count at 6–8 items and animate remaining items together.

---

## Reduced Motion

This is not optional. Vestibular disorders affect ~35% of adults over 40. Implementing `prefers-reduced-motion` is an accessibility requirement.

```css
/* Define animations normally */
.card {
  animation: slide-up 500ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Provide alternative for reduced motion — preserve fade, remove spatial movement */
@media (prefers-reduced-motion: reduce) {
  .card {
    animation: fade-in 200ms ease-out;
  }
}

/* Nuclear option — disable all animation globally */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**What to preserve for reduced motion users:** Functional animations like progress bars, loading spinners (slowed down), and focus indicators should still work — just without spatial movement. Cross-fades are acceptable; translate/scale animations are not.

### React/Framer Motion Implementation

```tsx
import { useReducedMotion } from 'framer-motion';

function AnimatedCard() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.01 : 0.3,
        ease: "easeOut"
      }}
    >
      Content
    </motion.div>
  );
}
```

---

## Framer Motion Code Examples

### Entrance Animations

```tsx
// Slide up + fade — standard card/content entrance
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}  // ease-out-quart
>
  Content
</motion.div>

// Scale + fade — modal
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
>
  Modal Content
</motion.div>

// Slide from edge — drawer, sheet
<motion.div
  initial={{ x: "100%" }}
  animate={{ x: 0 }}
  exit={{ x: "100%" }}
  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
>
  Drawer Content
</motion.div>
```

### Stagger Children

```tsx
// Parent orchestrates stagger timing
<motion.ul
  initial="hidden"
  animate="visible"
  variants={{
    visible: {
      transition: { staggerChildren: 0.08 }
    }
  }}
>
  {items.map(item => (
    <motion.li
      key={item.id}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] } }
      }}
    >
      {item.name}
    </motion.li>
  ))}
</motion.ul>
```

### Button Micro-interactions

```tsx
// Hover lift + press down
<motion.button
  whileHover={{ scale: 1.02, y: -2 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
>
  Click me
</motion.button>

// Tailwind CSS alternative for simple hover
<button className="
  transition-all duration-150
  hover:shadow-lg hover:scale-[1.02]
  active:scale-[0.98]
  focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2
">
  Click me
</button>
```

### State Transitions

```tsx
// Success feedback — checkmark reveal
<motion.div
  initial={{ opacity: 0, scale: 0.5 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
>
  <CheckCircle className="text-green-600" size={48} />
</motion.div>

// Toast notification
<motion.div
  initial={{ y: -100, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: -100, opacity: 0 }}
  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
  className="bg-green-600 text-white p-4 rounded-lg"
>
  Success! Changes saved.
</motion.div>

// Error shake
<motion.div
  animate={{ x: [0, -4, 4, -4, 4, 0] }}
  transition={{ duration: 0.3, ease: "easeInOut" }}
  className="border-2 border-red-500"
>
  <input type="text" />
</motion.div>

// Warning pulse
<motion.div
  animate={{ scale: [1, 1.04, 1] }}
  transition={{ duration: 0.6, ease: "easeInOut", repeat: Infinity }}
  className="border-2 border-amber-500"
>
  Warning Content
</motion.div>
```

### Loading States

```tsx
// Skeleton — CSS pulse animation
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
</div>

// CSS keyframes alternative
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

// Spinner
<div className="
  w-8 h-8 border-4 border-slate-300
  border-t-blue-600 rounded-full
  animate-spin
" />
```

---

## Gestalt and Motion

Reinforce visual relationships with motion:

**Proximity** — Elements near each other move together. Animate a card and its children as a unit, not separately.

**Similarity** — Similar elements have identical animation characteristics. Define a shared animation object:

```tsx
const buttonVariants = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15, ease: [0.25, 1, 0.5, 1] }
};

<motion.button {...buttonVariants}>Button 1</motion.button>
<motion.button {...buttonVariants}>Button 2</motion.button>
```

**Continuity** — Movement follows natural, smooth paths. Use `ease-out` curves, not linear.

**Figure-ground** — Important elements animate; backgrounds stay stable. Background fades as modal animates in:

```tsx
<>
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.5 }}
    className="fixed inset-0 bg-black"
  />
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
    className="fixed inset-0 flex items-center justify-center"
  >
    Modal Content
  </motion.div>
</>
```

---

## Perceived Performance

**Active vs passive time.** Passive waiting (staring at a spinner) feels longer than active engagement. Shift the balance:

- **Preemptive start** — Begin transitions immediately while loading. iOS app zoom, skeleton UI. Users perceive work happening.
- **Early completion** — Show content progressively. Do not wait for everything. Progressive images, streaming HTML.
- **Optimistic UI** — Update the interface immediately, handle failures gracefully. Instagram likes work offline — the UI updates instantly, syncs later. Use for low-stakes actions; avoid for payments or destructive operations.

**Easing affects perceived duration.** Ease-in (accelerating toward completion) makes tasks feel shorter because the peak-end effect weights final moments heavily. Ease-out feels satisfying for entrances, but ease-in toward a task's end compresses perceived time.

**Caution:** Too-fast responses can decrease perceived value. Users may distrust instant results for complex operations (search, analysis). A brief delay can signal that real work is happening.

---

## Performance

**Use `will-change` only when animation is imminent** — `:hover`, `.animating` class, or just before programmatic animation starts. Never add it preemptively to all animated elements; it creates new layers and consumes GPU memory.

```css
/* Correct — add will-change only when needed */
.card:hover {
  will-change: transform;
}

/* Wrong — adds GPU layer to every card all the time */
.card {
  will-change: transform;
}
```

For scroll-triggered animations, use Intersection Observer instead of scroll events. Unobserve elements after they animate once:

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animated');
      observer.unobserve(entry.target);  // stop observing after animation
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
```

---

## Motion Tokens

Define motion tokens as CSS custom properties for consistency across the system:

```css
:root {
  /* Durations */
  --duration-instant:  100ms;
  --duration-fast:     200ms;
  --duration-standard: 300ms;
  --duration-slow:     500ms;
  --duration-enter:    800ms;

  /* Easings */
  --ease-out:          cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:           cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out:       cubic-bezier(0.65, 0, 0.35, 1);
  --ease-out-quart:    cubic-bezier(0.25, 1, 0.5, 1);
  --ease-standard:     cubic-bezier(0.4, 0, 0.2, 1);

  /* Common transitions */
  --transition-colors: color var(--duration-fast) var(--ease-out),
                       background-color var(--duration-fast) var(--ease-out),
                       border-color var(--duration-fast) var(--ease-out);
  --transition-transform: transform var(--duration-fast) var(--ease-out-quart);
}
```

---

## CSS Animation Patterns (Without Framer Motion)

For simple, declarative animations, prefer CSS over JavaScript:

### Fade In

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.fade-in {
  animation: fadeIn 300ms cubic-bezier(0.25, 1, 0.5, 1) both;
}
```

### Slide Up

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-up {
  animation: slideUp 300ms cubic-bezier(0.25, 1, 0.5, 1) both;
}
```

### Scale Entrance (Modal, Popover)

```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.scale-in {
  animation: scaleIn 250ms cubic-bezier(0.25, 1, 0.5, 1) both;
}
```

### Shake (Form Validation Error)

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60%  { transform: translateX(-4px); }
  40%, 80%  { transform: translateX(4px); }
}

.shake {
  animation: shake 300ms ease-in-out;
}
```

### Pulse (Loading, Warning)

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Spin (Loading Spinner)

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

---

## Page Load Choreography

A well-orchestrated page load creates more delight than scattered micro-interactions. Focus on one hero moment with staggered reveals.

**Pattern: staggered content entrance**

```css
/* Each element gets an index variable */
.hero-title    { --i: 0; }
.hero-subtitle { --i: 1; }
.hero-cta      { --i: 2; }
.hero-image    { --i: 3; }

[class^="hero-"] {
  animation: slideUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i) * 100ms);
}

@media (prefers-reduced-motion: reduce) {
  [class^="hero-"] {
    animation: fadeIn 200ms ease-out both;
    animation-delay: 0ms;  /* no stagger when reducing motion */
  }
}
```

**Pattern: scroll-triggered reveal**

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);  // fire once
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
);

document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
```

```css
[data-animate] {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 500ms cubic-bezier(0.25, 1, 0.5, 1),
    transform 500ms cubic-bezier(0.25, 1, 0.5, 1);
}

[data-animate].is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  [data-animate],
  [data-animate].is-visible {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

---

## Hover State Patterns

### Button Hover

```css
/* CSS transition — preferred for simple hover */
.btn {
  transition:
    background-color 150ms cubic-bezier(0.25, 1, 0.5, 1),
    transform 150ms cubic-bezier(0.25, 1, 0.5, 1),
    box-shadow 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px oklch(55% 0.18 255 / 0.3);
}

.btn:active {
  transform: translateY(0);
  box-shadow: none;
  transition-duration: 100ms;
}
```

### Card Hover

```css
.card {
  transition: transform 200ms cubic-bezier(0.25, 1, 0.5, 1),
              box-shadow 200ms cubic-bezier(0.25, 1, 0.5, 1);
}

.card:hover {
  transform: translateY(-2px) scale(1.01);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
}
```

### Link Hover

```css
.link {
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
  transition: color 150ms ease-out,
              text-decoration-color 150ms ease-out;
}

.link:hover {
  color: var(--color-primary-dark);
}
```

### Focus States

```css
/* Focus visible (keyboard only — not mouse) */
.interactive:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
  transition: outline-offset 150ms cubic-bezier(0.25, 1, 0.5, 1);
}

/* Remove default focus ring (only when replacing it) */
.interactive:focus:not(:focus-visible) {
  outline: none;
}
```

---

## Motion as Communication

Motion is not decoration. Every animation must serve one of these purposes:

**Orientation** — Show users where they are. Route transitions that slide in the direction of navigation communicate spatial structure. Expanding from the source button tells the user "this content came from that action."

**Relationship** — Show how elements connect. An accordion expanding from a heading communicates that the content belongs to that heading. Shared element transitions between states communicate continuity.

**Feedback** — Confirm that an action happened. A button press animation says "I received your click." A shake animation says "that input was wrong." Without feedback, users repeat actions or feel uncertain.

**Guidance** — Direct attention. A subtle shimmer on an empty state CTA says "interact here." A notification badge animation says "look at this."

If you cannot articulate which of these four purposes an animation serves, remove it.

---

## Rules

**Animate only `transform` and `opacity`.** Everything else causes layout recalculation.

**Never use bounce or elastic easing** for standard product interactions. Spring easing (`cubic-bezier(0.68, -0.55, 0.265, 1.55)`) is permitted only for explicitly playful brand contexts (games, children's apps). Default to `cubic-bezier(0.4, 0, 0.2, 1)` for all standard interactions.

**Always implement `prefers-reduced-motion`.** This is an accessibility requirement, not optional.

**Never use durations over 500ms for UI feedback** — it feels laggy.

**Never animate without purpose** — every animation needs a reason (orientation, relationship, feedback, guidance).

**Never animate everything** — animation fatigue makes interfaces exhausting. Focus on high-impact moments.

**Never block interaction during animations** unless intentional.

---

## Motion in Dark Mode and High Contrast

In dark mode, animations generally feel more dramatic at the same duration and distance. Reduce animation distances slightly (from 20px to 12px for slide-up) to compensate for increased perceived contrast.

In `forced-colors` mode (Windows high contrast), animations still work but some visual effects (box-shadows, color transitions) are removed by the browser. Design motion so that the animation's purpose is communicated by transform and opacity alone — not by color change:

```css
/* Works in forced-colors because it uses transform */
.toast {
  animation: slideDown 300ms cubic-bezier(0.25, 1, 0.5, 1);
}

@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
```

---

## When to Choose CSS vs JavaScript Animation

| Use Case | CSS | JavaScript (Framer Motion) |
|----------|-----|---------------------------|
| Simple hover/focus states | Preferred | Unnecessary |
| Single-step entrances | Preferred | Unnecessary |
| Multi-step keyframe sequences | Both work | Preferred for complex |
| Physics-based spring motion | Not available | Framer Motion |
| Choreographed list stagger | Both work | Framer Motion `staggerChildren` |
| Shared element transitions | Not available | Framer Motion `layoutId` |
| Scroll-triggered reveals | CSS + Intersection Observer | Both work |
| Interrupting animations mid-play | Not ideal | Preferred |
| Cancel on unmount | Not available | Framer Motion handles automatically |

CSS animations run on the compositor thread when using `transform` and `opacity` — they are typically smoother than JavaScript animations at the same task. Use JavaScript for choreography and interruptability, not for basic transitions.

---

## Performance Checklist

- [ ] Only animate `transform` and `opacity`
- [ ] Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding`
- [ ] For height: use `grid-template-rows` transition
- [ ] Test on mobile devices (target 60fps)
- [ ] Use `will-change` only for complex animations, only when imminent
- [ ] Implement `prefers-reduced-motion` media query
- [ ] Keep UI interaction durations under 500ms
- [ ] Use CSS animations for simple transitions
- [ ] Use Framer Motion for complex choreographed sequences
- [ ] Stagger cap: no more than 8 staggered items at 80ms delay each
- [ ] Exit animations at ~75% of enter duration
- [ ] Use Intersection Observer for scroll-triggered animations, unobserve after firing
