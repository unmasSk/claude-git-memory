# Accessibility

Reference for WCAG 2.1 AA compliance. Every pattern here is the minimum bar —
not aspirational. Treat any violation as a bug, not a suggestion.

WCAG 2.2 AA is the aspirational target. Where 2.2 adds requirements beyond 2.1
(e.g., Focus Appearance, Dragging Movements), apply them.

---

## The Four Principles (POUR)

**Perceivable:** Information and UI components must be presentable in ways users
can perceive. No information may be conveyed through a single modality only.

**Operable:** UI components and navigation must be operable by all input methods
(keyboard, pointer, switch access, voice).

**Understandable:** Information and UI operation must be understandable. Error
messages must identify the problem and suggest a fix.

**Robust:** Content must be interpretable by a wide variety of user agents,
including current and future assistive technologies. Use semantic HTML first.

---

## Color Contrast

### Minimum ratios (WCAG AA)

| Text type | Minimum ratio |
|---|---|
| Normal text (< 18pt or < 14pt bold) | 4.5:1 |
| Large text (≥ 18pt or ≥ 14pt bold) | 3:1 |
| UI components (borders, icons, focus indicators) | 3:1 |
| Decorative elements | No requirement |

### Passing examples

```tsx
// 21:1 — slate-900 on white
<p className="text-slate-900 bg-white">Excellent contrast</p>

// 8:1 — slate-700 on white — passes comfortably
<p className="text-slate-700 bg-white">Good contrast</p>

// 4.5:1 — blue-600 on white — passes at minimum bar
<button className="bg-blue-600 text-white hover:bg-blue-700">
  Action
</button>
```

### Failing examples — never ship these

```tsx
// 2.8:1 — fails WCAG AA
<p className="text-gray-400 bg-white">Fails contrast check</p>

// Color alone conveys state — fails Perceivable
<button className="bg-red-500 text-white">Error</button>

// Fix: pair color with icon
<button className="bg-red-500 text-white flex items-center gap-2">
  <AlertCircle size={20} aria-hidden="true" />
  Error: Fix Issues
</button>
```

### Dark mode contrast

Dark mode requires recalibration. Do not invert light mode values.

```tsx
// Light mode: #0F172A on #FFFFFF = 21:1
// Dark mode: #E2E8F0 on #0F172A = 15.8:1 (still passes, less harsh)
// Never use pure white (#FFFFFF) on dark backgrounds — too harsh for reading
```

---

## Semantic HTML

Use the element that matches the semantic meaning. Never use a `<div>` where a
semantic element exists. ARIA supplements — it does not replace — semantics.

### Page structure

```tsx
<header>                          {/* Site header */}
  <nav>                           {/* Primary navigation */}
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>

<main>                            {/* Primary content — one per page */}
  <article>                       {/* Self-contained content */}
    <h1>Article Title</h1>
    <p>Content...</p>
  </article>
  <aside>Related content</aside>
</main>

<footer>
  <p>&copy; 2025 Company Name</p>
</footer>
```

### Heading hierarchy

Never skip heading levels. Screen readers use heading structure as an outline.

```tsx
// Correct
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>

// Wrong — skips levels
<h1>Page Title</h1>
  <h4>Section</h4>   {/* Screen reader skips h2 and h3 */}
```

---

## Keyboard Navigation

### Focus management

All interactive elements must be keyboard-reachable and activatable.

```tsx
// Native button — keyboard accessible by default
<button
  className="px-4 py-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2"
  onClick={handleClick}
>
  Accessible Button
</button>

// Custom interactive element — must add tabIndex and keyboard handler
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  className="cursor-pointer focus:ring-4 focus:ring-blue-500 focus:outline-none"
>
  Custom Button
</div>
```

Prefer native elements over custom implementations. `<button>` handles keyboard
activation, focus ring, and ARIA role automatically.

### Skip links

Provide skip links for keyboard users to bypass repeated navigation blocks.

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
             focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
             focus:rounded-lg focus:outline-none"
>
  Skip to main content
</a>

<main id="main-content">
  {/* Primary content */}
</main>
```

### Tab order

Tab order must follow the visual reading order. Use `tabIndex` only to remove
elements from the tab sequence or to enable programmatic focus.

```tsx
// tabIndex={-1}: removes from natural tab order but allows programmatic focus
// Use for error containers you want to focus() on validation failure
<div tabIndex={-1} id="error-summary" ref={errorRef}>
  Error summary...
</div>

// Avoid positive tabIndex values — they override natural order unpredictably
// BAD:
<input tabIndex={3} />
<input tabIndex={1} />  // Focuses before the first input above
```

---

## Focus Indicators

Never remove the visible focus indicator. `outline: none` without a replacement
is a WCAG failure (2.4.7 Focus Visible).

```tsx
// Ring pattern — always pair focus:outline-none with focus:ring
<button className="
  px-4 py-2 rounded-lg bg-blue-600 text-white
  focus:outline-none
  focus:ring-4 focus:ring-blue-500 focus:ring-offset-2
">
  Click Me
</button>

// Link with custom focus
<a
  href="/page"
  className="underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:rounded"
>
  Link Text
</a>

// Container that highlights when a child has focus (input groups)
<div className="
  p-4 border border-slate-300 rounded-lg
  focus-within:ring-4 focus-within:ring-blue-500 focus-within:border-blue-500
">
  <input type="text" className="w-full focus:outline-none" />
</div>
```

---

## ARIA Roles, States, and Properties

### Landmark roles

```tsx
<nav role="navigation" aria-label="Main navigation">…</nav>
<header role="banner">…</header>
<main role="main">…</main>
<aside role="complementary" aria-label="Related articles">…</aside>
<footer role="contentinfo">…</footer>
<form role="search" aria-label="Site search">
  <input type="search" aria-label="Search query" />
  <button type="submit">Search</button>
</form>
```

### Labels

```tsx
// aria-label: when no visible text label exists
<button aria-label="Close dialog">
  <X size={24} aria-hidden="true" />
</button>

// aria-labelledby: references another element as the label
<div role="dialog" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirm Action</h2>
  <p>Are you sure?</p>
</div>

// aria-describedby: supplementary description (not the label)
<input
  type="password"
  aria-describedby="password-requirements"
/>
<p id="password-requirements">
  Password must be at least 8 characters
</p>
```

### States

```tsx
// aria-expanded: for accordions, dropdowns, drawers
<button
  aria-expanded={isOpen}
  aria-controls="dropdown-menu"
  onClick={() => setIsOpen(!isOpen)}
>
  Menu {isOpen ? <ChevronUp /> : <ChevronDown />}
</button>
<div id="dropdown-menu" hidden={!isOpen}>
  {/* Dropdown content */}
</div>

// aria-pressed: for toggle buttons
<button
  aria-pressed={isPressed}
  onClick={() => setIsPressed(!isPressed)}
>
  {isPressed ? 'On' : 'Off'}
</button>

// aria-selected: for tabs, option lists
<div role="tab" aria-selected={isActive} tabIndex={isActive ? 0 : -1}>
  Tab Label
</div>

// aria-checked: for custom checkboxes
<div
  role="checkbox"
  aria-checked={isChecked}
  tabIndex={0}
  onClick={() => setIsChecked(!isChecked)}
  onKeyDown={(e) => {
    if (e.key === ' ') { e.preventDefault(); setIsChecked(!isChecked); }
  }}
>
  Custom Checkbox
</div>

// aria-invalid + aria-describedby: for form validation
<input
  type="email"
  aria-invalid={hasError}
  aria-describedby={hasError ? 'email-error' : undefined}
/>
{hasError && (
  <p id="email-error" role="alert">
    Please enter a valid email address
  </p>
)}
```

### Live regions

```tsx
// Polite: announces after current speech finishes (status updates, confirmations)
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Assertive: interrupts current speech (errors, urgent alerts)
<div role="alert" aria-live="assertive" aria-atomic="true">
  {errorMessage}
</div>
```

---

## Screen Reader Patterns

### Screen reader-only content

```css
/* Tailwind includes sr-only by default. If using plain CSS: */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

```tsx
// Icon button — visible icon, SR-readable label
<button>
  <Heart aria-hidden="true" />
  <span className="sr-only">Add to favorites</span>
</button>

// Badge with count — visual and SR versions
<button aria-label="Notifications (3 unread)">
  <Bell aria-hidden="true" />
  <span aria-hidden="true" className="badge">3</span>
</button>
```

### Images

```tsx
// Informative image — alt describes the content and purpose
<img
  src="chart.png"
  alt="Bar chart showing Q4 2025 sales increased 40% year-over-year"
/>

// Decorative image — empty alt, role="presentation" removes it from SR tree
<img src="decoration.png" alt="" role="presentation" />

// Complex diagram — extended description via figcaption
<figure>
  <img
    src="architecture.png"
    alt="System architecture diagram"
    aria-describedby="architecture-description"
  />
  <figcaption id="architecture-description">
    Three-component architecture: React frontend communicates with Express API
    via REST over HTTPS. API connects to PostgreSQL for persistence and Redis
    for session cache.
  </figcaption>
</figure>
```

### Icons

```tsx
import { MagnifyingGlass, Bell } from '@phosphor-icons/react';

// Decorative icon (text adjacent) — hide from SR
<button className="flex items-center gap-2">
  <MagnifyingGlass aria-hidden="true" />
  Search
</button>

// Functional icon (no adjacent text) — label the button, not the icon
<button aria-label="Search">
  <MagnifyingGlass />
</button>
```

---

## Forms

### Labels and grouping

```tsx
// Every input must have an associated label
<div>
  <label htmlFor="email" className="block mb-1 font-medium">
    Email Address
  </label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    className="w-full px-4 py-2 border rounded-lg"
  />
</div>

// Indicate required fields — do not rely on color alone
<label htmlFor="name" className="block mb-1 font-medium">
  Full Name
  <span className="text-red-600" aria-label="required"> *</span>
</label>

// Group related checkboxes/radios with fieldset + legend
<fieldset>
  <legend className="font-medium mb-2">Contact Preferences</legend>
  <label className="flex items-center gap-2">
    <input type="checkbox" name="email" /> Email
  </label>
  <label className="flex items-center gap-2">
    <input type="checkbox" name="sms" /> SMS
  </label>
</fieldset>
```

### Error handling

```tsx
<div>
  <label htmlFor="password" className="block mb-1 font-medium">
    Password
  </label>
  <input
    id="password"
    type="password"
    aria-invalid={hasError}
    aria-describedby="password-requirements password-error"
    className={`w-full px-4 py-2 border rounded-lg ${
      hasError ? 'border-red-500' : 'border-slate-300'
    }`}
  />
  <p id="password-requirements" className="text-sm text-slate-600 mt-1">
    Must be at least 8 characters
  </p>
  {hasError && (
    <p id="password-error" role="alert" className="text-sm text-red-600 mt-1 flex items-center gap-1">
      <AlertCircle size={16} aria-hidden="true" />
      Password is too short
    </p>
  )}
</div>
```

Rules for form error handling:
- Validate on blur (after user leaves field) — not on every keystroke
- Display error inline below the field, not in a separate banner
- Link error message to input via `aria-describedby`
- Use `aria-invalid="true"` on the input when an error is present
- Announce errors immediately via `role="alert"` or `aria-live="assertive"`
- Clear the error when the user fixes the value (on input or on blur)

---

## Accessible Modal with Full Focus Trap

```tsx
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function Modal({ isOpen, onClose, title, description, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store element that had focus before modal opened
    previousFocusRef.current = document.activeElement;

    // Focus the modal container
    modalRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTORS
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that triggered the modal
      (previousFocusRef.current as HTMLElement | null)?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Backdrop — click closes modal
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      aria-hidden="true"
    >
      {/* Dialog container — stop click propagation */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        tabIndex={-1}
        className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className="text-xl font-bold mb-2">
          {title}
        </h2>
        <p id="modal-description" className="text-slate-600 mb-4">
          {description}
        </p>
        {children}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1 rounded
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
```

Key requirements:
- `role="dialog"` + `aria-modal="true"` on the dialog container
- `aria-labelledby` pointing to the dialog title
- `aria-describedby` pointing to the dialog description
- `tabIndex={-1}` on the container so it can receive programmatic focus
- Focus is trapped within the modal while open (Tab and Shift+Tab wrap)
- Escape key closes the modal
- Focus returns to the trigger element when the modal closes
- Backdrop click closes the modal but does not propagate to dialog

---

## Accessible Tabs (Roving tabIndex)

```tsx
import { useState, useRef, KeyboardEvent } from 'react';

interface Tab { label: string; content: React.ReactNode; }

function Tabs({ tabs }: { tabs: Tab[] }) {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    let nextIndex = index;

    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    setActiveTab(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Content sections">
        {tabs.map((tab, index) => (
          <button
            key={index}
            ref={(el) => { tabRefs.current[index] = el; }}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`panel-${index}`}
            id={`tab-${index}`}
            // Roving tabIndex: only active tab is in the tab sequence
            tabIndex={activeTab === index ? 0 : -1}
            onClick={() => setActiveTab(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-4 py-2 border-b-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              activeTab === index
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`panel-${index}`}
          aria-labelledby={`tab-${index}`}
          hidden={activeTab !== index}
          className="p-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

Keyboard behavior for tabs:
- Tab / Shift+Tab: move focus into and out of the tab list
- Arrow Right / Arrow Left: move between tabs within the tab list
- Home: jump to first tab
- End: jump to last tab
- Only the active tab has `tabIndex={0}` (roving tabIndex pattern)

---

## Accessible Tooltip

```tsx
import { useState, useId } from 'react';

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <div className="relative inline-block">
      {/* Trigger — show/hide on mouse and keyboard events */}
      <div
        aria-describedby={isVisible ? tooltipId : undefined}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className="
            absolute z-10 px-3 py-2 text-sm
            bg-slate-900 text-white rounded-lg
            bottom-full left-1/2 -translate-x-1/2 mb-2
            whitespace-nowrap pointer-events-none
          "
        >
          {text}
        </div>
      )}
    </div>
  );
}
```

Requirements:
- `role="tooltip"` on the tooltip container
- `aria-describedby` on the trigger element, pointing to the tooltip
- Tooltip appears on both `mouseenter` and `focus` (keyboard users must be able to trigger it)
- Tooltip disappears on both `mouseleave` and `blur`
- `pointer-events-none` prevents tooltip from interfering with mouse events

---

## Pointer and Touch Accessibility

Touch targets must be at minimum 44×44px (iOS HIG) or 48×48dp (Material Design).
This applies to all interactive elements, not just buttons.

```tsx
// Minimum touch target — use padding to expand the tap area without
// changing the visual size of the element
<button
  className="
    p-2                          // padding expands hit area
    min-h-[44px] min-w-[44px]   // enforces minimum touch target
    flex items-center justify-center
    focus:outline-none focus:ring-2 focus:ring-blue-500
  "
>
  <Icon size={20} aria-hidden="true" />
</button>

// Small-looking button with full touch area
// Visual: 24px icon. Actual tap area: 44×44px
<button
  className="relative p-[10px] -m-[10px]"
  aria-label="Dismiss"
>
  <X size={24} aria-hidden="true" />
</button>
```

Ensure adjacent touch targets have at least 8px spacing to prevent mis-taps.

---

## Pointer Events and Hover Behavior

Do not rely on hover-only interactions. Touch devices have no hover state.

```tsx
// Bad: information only visible on hover
<div className="group relative">
  <button>Settings</button>
  <div className="hidden group-hover:block absolute">
    Save, Export, Delete  {/* Never visible on touch */}
  </div>
</div>

// Good: always-accessible action, tooltip supplements but does not replace
<div className="flex gap-2">
  <button onClick={handleSave}>Save</button>
  <button onClick={handleExport}>Export</button>
  <button onClick={handleDelete}>Delete</button>
</div>
```

For pointer-specific enhancements, use the CSS media query:

```css
@media (hover: hover) and (pointer: fine) {
  /* Hover-only enhancements — pure decoration, never information-bearing */
  .card:hover {
    transform: translateY(-2px);
  }
}
```

---

## Prefers-Reduced-Motion

All animations must respect the `prefers-reduced-motion: reduce` media query.
This is a WCAG 2.3 requirement (Seizures and Physical Reactions).

```tsx
// CSS approach — apply motion only when preferred
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tailwind approach
<div className="transition-transform duration-300 motion-reduce:transition-none">
  …
</div>

// Framer Motion approach
import { useReducedMotion } from 'framer-motion';

function AnimatedCard() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    >
      Content
    </motion.div>
  );
}

// Global CSS fallback
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Prefers-Color-Scheme

```tsx
// CSS custom properties with color-scheme
:root {
  --bg: #ffffff;
  --text: #0f172a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a;
    --text: #e2e8f0;
  }
}

// React hook for reading the preference
function useColorScheme() {
  const [isDark, setIsDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDark ? 'dark' : 'light';
}
```

---

## axe-core Integration

Integrate automated accessibility testing into the test suite.

```bash
npm install --save-dev @axe-core/react jest-axe
```

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <button onClick={() => {}}>Submit</button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Modal accessibility', () => {
  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test">
        Content
      </Modal>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

For development-time checking:

```tsx
// In development, mount axe-core to report violations to the browser console
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(({ default: axeReact }) => {
    axeReact(React, ReactDOM, 1000);
  });
}
```

---

## Color Independence

Never convey meaning through color alone. Color is a supplement, never the sole
signal. This requirement protects users with color vision deficiencies (8% of
males, 0.5% of females have some form of color blindness).

```tsx
// Bad: error state communicated by color alone
<input className={hasError ? 'border-red-500' : 'border-slate-300'} />

// Good: error state communicated by color + icon + text
<div>
  <input
    className={hasError ? 'border-red-500' : 'border-slate-300'}
    aria-invalid={hasError}
    aria-describedby={hasError ? 'field-error' : undefined}
  />
  {hasError && (
    <p id="field-error" className="flex items-center gap-1 text-red-600 text-sm mt-1">
      <AlertCircle size={14} aria-hidden="true" />
      This field is required
    </p>
  )}
</div>

// Bad: link vs. non-link distinguished by color alone
<span className="text-blue-600">Click here</span>  // Only blue = link

// Good: underline distinguishes links from colored text
<a className="text-blue-600 underline hover:text-blue-800">
  Click here
</a>

// Bad: status badges rely solely on green/red
<span className={`badge ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
  {isActive ? 'Active' : 'Inactive'}
</span>

// Good: status text is self-describing; color reinforces
<span className={`badge flex items-center gap-1 ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
  <span aria-hidden="true">{isActive ? '●' : '○'}</span>
  {isActive ? 'Active' : 'Inactive'}
</span>
```

For charts and data visualizations:
- Use distinct shapes (circle, square, triangle) alongside color coding
- Use patterns (solid, dashed, dotted) for line charts
- Provide a data table as an alternative to complex charts
- Ensure sufficient contrast between adjacent data series

---

## Accessible Data Tables

```tsx
<table>
  <caption className="sr-only">
    Q4 2025 sales data by region
  </caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Revenue</th>
      <th scope="col">Growth</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North</th>
      <td>$1.2M</td>
      <td>
        <span aria-label="positive 12 percent">
          <span aria-hidden="true">▲</span> 12%
        </span>
      </td>
    </tr>
  </tbody>
</table>
```

- `scope="col"` on column headers: identifies the header as applying to the column
- `scope="row"` on row headers: identifies the header as applying to the row
- `<caption>`: provides an accessible title for the table
- For complex tables with merged cells, use `id` + `headers` attributes instead of `scope`

---

## Loading and Progress States

```tsx
// Spinner — accessible
<div
  role="status"
  aria-label="Loading"
  className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
/>

// With text label
<div role="status" className="flex items-center gap-2">
  <div
    className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
    aria-hidden="true"
  />
  <span>Loading results...</span>
</div>

// Progress bar
<div>
  <label htmlFor="upload-progress" className="block text-sm mb-1">
    Uploading file — 64%
  </label>
  <progress
    id="upload-progress"
    value={64}
    max={100}
    className="w-full"
  >
    64%
  </progress>
</div>

// Skeleton loader — hide from screen readers (content is not meaningful yet)
<div aria-hidden="true" className="space-y-2">
  <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
  <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
  <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6" />
</div>
// Provide a visible loading announcement for screen readers alongside skeletons
<span role="status" className="sr-only">Loading article content</span>
```

---

## Announcements on Dynamic Content

When content updates dynamically without a page load, screen readers need explicit
notification. Use live regions for this.

```tsx
// Toast notifications
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white ${
        type === 'error' ? 'bg-red-600' : 'bg-green-600'
      }`}
    >
      {message}
    </div>
  );
}

// Search results count
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {resultCount === 0
    ? 'No results found'
    : `${resultCount} result${resultCount === 1 ? '' : 's'} found`}
</div>

// Cart count update
<button aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
  <ShoppingCart aria-hidden="true" />
  <span aria-hidden="true" className="badge">{cartCount}</span>
</button>
// When cartCount changes, re-render the button — the aria-label update is
// announced by screen readers because the attribute changed on the focused element
```

Live region rules:
- `aria-live="polite"`: announces after current speech — for non-urgent updates (save confirmed, search results loaded)
- `aria-live="assertive"`: interrupts current speech — for errors and urgent notifications only
- `aria-atomic="true"`: announces the entire region, not just the changed portion
- Live regions must exist in the DOM before content appears in them — inject the region on mount, populate it later

---

## Testing Checklist

### Keyboard navigation

- [ ] Navigate the entire interface using Tab only
- [ ] Activate all interactive elements with Enter or Space
- [ ] Focus indicators are clearly visible at all focus points
- [ ] No keyboard traps (Tab always moves forward, Shift+Tab always moves backward)
- [ ] Tab order matches visual reading order
- [ ] Modals trap focus when open and release focus on close
- [ ] Tabs respond to Arrow keys with roving tabIndex

### Screen reader

- [ ] Test with NVDA (Windows) or VoiceOver (macOS / iOS)
- [ ] All images have appropriate alt text or are marked decorative
- [ ] Headings create a logical, navigable document outline
- [ ] All form inputs have associated labels
- [ ] Dynamic content changes (status messages, errors) are announced
- [ ] Modals are announced as dialogs with title and description
- [ ] Icon-only buttons have accessible labels

### Visual

- [ ] Normal text meets 4.5:1 contrast
- [ ] Large text meets 3:1 contrast
- [ ] UI components (borders, icons) meet 3:1 contrast
- [ ] Interface is usable at 200% browser zoom (no content clipped)
- [ ] Content reflows at 400% zoom without horizontal scrolling (single-column)
- [ ] No information is conveyed by color alone
- [ ] Focus indicators are visible in both light and dark modes

### Automated

- [ ] axe-core reports zero violations in all components
- [ ] Lighthouse accessibility score ≥ 90 on production build
- [ ] WAVE browser extension shows no errors

### Motion and reduced motion

- [ ] All animations disabled or minimized with `prefers-reduced-motion: reduce`
- [ ] No animation lasts more than 500ms on interactive feedback
- [ ] No content flashes more than 3 times per second
