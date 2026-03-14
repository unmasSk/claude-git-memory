# Interaction Design

Every interactive element requires eight states. Every keyboard path must work. Every focus indicator must be visible. These are requirements, not preferences.

---

## The Eight Interactive States

Design all eight before shipping. Missing states are defects, not polish tasks.

| State | Trigger | Visual Treatment |
|-------|---------|------------------|
| **Rest** | Default, no interaction | Base styling |
| **Hover** | Pointer over element | Subtle lift or color shift — mouse/trackpad only |
| **Active** | Being pressed | Pressed-in appearance, darker fill |
| **Focus** | Keyboard or programmatic focus | Visible ring — see Focus Rings section |
| **Disabled** | Not interactive | Reduced opacity (50–60%), `cursor: not-allowed`, no pointer events |
| **Loading** | Processing | Spinner or skeleton inside component |
| **Error** | Invalid state | Red/destructive border, icon, inline message |
| **Success** | Completed action | Green/confirmation treatment, check icon or confirmation message |

**Critical miss:** Designing hover without focus, or vice versa. Keyboard users never see hover states. Touch users never see hover states. Design them separately.

---

## Focus Rings: The Correct Approach

Never `outline: none` without a replacement. Removing focus indicators without alternatives is an accessibility violation (WCAG 2.4.7).

Use `:focus-visible` — shows only for keyboard navigation, suppressed for mouse/touch:

```css
/* Suppress default ring for mouse/touch */
button:focus {
  outline: none;
}

/* Show visible ring for keyboard navigation */
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

**Focus ring requirements:**
- Minimum 3:1 contrast ratio against adjacent colors
- 2–3px thick
- Offset from the element (not inside it)
- Consistent across all interactive elements

In Tailwind:

```tsx
<button className="
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-blue-500
  focus-visible:ring-offset-2
  rounded-lg
">
  Action
</button>
```

---

## React/JSX State Patterns

### Rest + Hover + Active

```tsx
<button className="
  px-4 py-2 rounded-lg font-medium
  bg-blue-600 text-white
  hover:bg-blue-700
  active:bg-blue-800 active:scale-[0.98]
  focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
  focus:outline-none
  transition-all duration-150
">
  Save Changes
</button>
```

### Disabled State

```tsx
<button
  disabled={isDisabled}
  className="
    px-4 py-2 rounded-lg font-medium
    bg-blue-600 text-white
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    hover:bg-blue-700
    transition-colors duration-150
  "
>
  Save Changes
</button>
```

Do not show hover/active states on disabled elements. `pointer-events-none` prevents hover triggers.

### Loading State

```tsx
function SubmitButton({ isLoading, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className="
        relative px-4 py-2 rounded-lg font-medium
        bg-blue-600 text-white
        disabled:opacity-70 disabled:cursor-wait
        hover:bg-blue-700
        transition-colors duration-150
      "
    >
      {isLoading ? (
        <>
          <span className="sr-only">Loading...</span>
          <svg className="animate-spin h-4 w-4 mx-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </>
      ) : children}
    </button>
  );
}
```

Prevent double-submission: disable immediately on click, re-enable only after response.

### Error State

```tsx
function EmailInput({ error, ...props }) {
  return (
    <div>
      <input
        type="email"
        aria-invalid={!!error}
        aria-describedby={error ? 'email-error' : undefined}
        className={`
          w-full px-4 py-2 rounded-lg border
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
          ${error
            ? 'border-red-500 focus-visible:ring-red-500 bg-red-50'
            : 'border-slate-300 focus-visible:ring-blue-500'
          }
        `}
        {...props}
      />
      {error && (
        <p id="email-error" role="alert" className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
```

### Success State

```tsx
function SaveStatus({ status }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`
        flex items-center gap-2 text-sm
        ${status === 'saved' ? 'text-green-600' : 'text-slate-500'}
      `}
    >
      {status === 'saved' && <CheckCircle size={16} aria-hidden="true" />}
      {status === 'saved' ? 'Saved' : 'Unsaved changes'}
    </div>
  );
}
```

---

## Keyboard Navigation

### Roving Tabindex (Tabs, Menus, Radio Groups)

Only one item in a group is in the tab sequence at a time. Arrow keys move within the group. Tab moves to the next component entirely.

```tsx
function TabList({ tabs, activeIndex, onActivate }) {
  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      const next = (index + 1) % tabs.length;
      onActivate(next);
      document.getElementById(`tab-${next}`)?.focus();
    }
    if (e.key === 'ArrowLeft') {
      const prev = (index - 1 + tabs.length) % tabs.length;
      onActivate(prev);
      document.getElementById(`tab-${prev}`)?.focus();
    }
    if (e.key === 'Home') { onActivate(0); document.getElementById('tab-0')?.focus(); }
    if (e.key === 'End') {
      const last = tabs.length - 1;
      onActivate(last);
      document.getElementById(`tab-${last}`)?.focus();
    }
  };

  return (
    <div role="tablist">
      {tabs.map((tab, index) => (
        <button
          key={index}
          id={`tab-${index}`}
          role="tab"
          aria-selected={activeIndex === index}
          aria-controls={`panel-${index}`}
          tabIndex={activeIndex === index ? 0 : -1}
          onClick={() => onActivate(index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### Skip Links

Provide a skip link as the first focusable element in the document. Hidden off-screen; appears on focus.

```tsx
<a
  href="#main-content"
  className="
    sr-only focus:not-sr-only
    focus:absolute focus:top-4 focus:left-4
    focus:z-[--z-toast] focus:px-4 focus:py-2
    focus:bg-blue-600 focus:text-white focus:rounded-lg
    focus:shadow-md
  "
>
  Skip to main content
</a>
```

### Custom Interactive Elements

When using non-button elements as controls (required when `role="button"` is unavoidable):

```tsx
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
  className="cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus:outline-none"
>
  Custom Control
</div>
```

Prefer native `<button>` whenever possible. Native elements get keyboard handling for free.

---

## Focus Management

### Modal Focus Trap (Manual)

```tsx
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
      className="fixed inset-0 z-[--z-modal] flex items-center justify-center bg-black/50"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
```

### Native `<dialog>` Element (Preferred)

The native `<dialog>` element provides focus trapping and Escape-to-close for free:

```tsx
import { useEffect, useRef } from 'react';

function NativeDialog({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal(); // Opens with focus trap + Escape handling built-in
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="
        rounded-lg p-6 max-w-md w-full
        backdrop:bg-black/50
      "
    >
      <h2 id="dialog-title" className="text-xl font-bold mb-4">{title}</h2>
      {children}
      <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 rounded-lg">
        Close
      </button>
    </dialog>
  );
}
```

`showModal()` creates a top-layer modal with native focus trap. No z-index management needed.

### `inert` Attribute for Background Content

When a modal is open, apply `inert` to background content to prevent focus and interaction leakage:

```html
<main inert>
  <!-- Background content — cannot be focused or clicked while inert -->
</main>

<dialog open>
  <h2>Modal Title</h2>
  <!-- Focus stays here -->
</dialog>
```

In React:

```tsx
<main inert={isModalOpen ? '' : undefined}>
  {/* Page content */}
</main>
```

---

## Popover API (Non-Modal Overlays)

Use the Popover API for tooltips, dropdowns, and non-modal overlays. Built-in light-dismiss, top-layer stacking, and accessibility.

```html
<button popovertarget="settings-menu" popovertargetaction="toggle">
  Settings
</button>

<div id="settings-menu" popover>
  <button>Account</button>
  <button>Notifications</button>
  <button>Sign out</button>
</div>
```

Benefits over custom implementations:
- Click outside automatically closes (light-dismiss)
- Appears in top layer — no z-index conflicts
- Accessible by default

For CSS positioning relative to the trigger:

```css
#settings-menu {
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(left);
}
```

---

## Form Patterns

### Label Above Input (Always)

Placeholders disappear when the user types. Never use placeholder as the sole label.

```tsx
<div className="flex flex-col gap-1">
  <label htmlFor="email" className="text-sm font-medium text-slate-700">
    Email address
    <span className="text-red-500 ml-0.5" aria-label="required">*</span>
  </label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    placeholder="you@example.com"
    className="px-4 py-2 border border-slate-300 rounded-lg
      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
  />
</div>
```

### Validate on Blur, Not on Keystroke

Validate when the user leaves a field. Keystroke validation while typing is disruptive. Exception: password strength meters (real-time feedback is the point).

```tsx
const [touched, setTouched] = useState(false);
const error = touched && !isValid ? 'Please enter a valid email' : null;

<input
  onBlur={() => setTouched(true)}
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && <p id="email-error" role="alert">{error}</p>}
```

### Group Related Inputs with `<fieldset>`

```tsx
<fieldset>
  <legend className="text-sm font-medium text-slate-700 mb-2">
    Notification preferences
  </legend>
  <label className="flex items-center gap-2">
    <input type="checkbox" name="email" />
    Email
  </label>
  <label className="flex items-center gap-2">
    <input type="checkbox" name="sms" />
    SMS
  </label>
</fieldset>
```

---

## Loading and Skeleton States

### When to Show What

| Operation duration | Loading treatment |
|--------------------|------------------|
| < 300ms | No indicator (feels instant) |
| 300ms – 1s | Subtle spinner |
| 1s – 3s | Skeleton screen or spinner |
| > 3s | Progress bar + estimated time |

### Skeleton Screens

Skeleton screens preview content shape and feel faster than generic spinners. Match the skeleton structure to the actual content layout.

```tsx
function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200 p-4 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
      <div className="h-24 bg-slate-200 rounded" />
    </div>
  );
}
```

### Optimistic Updates

Show success immediately; roll back on failure. Use for low-stakes, reversible actions.

```tsx
async function handleLike(postId) {
  // Optimistic: update UI immediately
  setLiked(true);
  setLikeCount(c => c + 1);

  try {
    await api.like(postId);
  } catch {
    // Rollback on failure
    setLiked(false);
    setLikeCount(c => c - 1);
    toast.error('Failed to like post. Try again.');
  }
}
```

Do not use optimistic updates for payments, destructive actions, or any operation that cannot be safely rolled back.

---

## Destructive Actions: Undo Over Confirm

Confirmation dialogs are skipped by habitual users. Prefer undo patterns.

```tsx
async function handleDelete(item) {
  // Remove immediately from UI
  removeFromList(item.id);

  // Show undo toast
  const undone = await toast.promise(
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(), 5000);
      // Undo button cancels the timer
      onUndo = () => { clearTimeout(timer); reject('undone'); };
    }),
    {
      loading: `Deleting "${item.name}"... Undo?`,
      success: 'Deleted',
      error: 'Undo successful',
    }
  );

  if (!undone) {
    await api.delete(item.id); // Only actually delete after toast expires
  } else {
    restoreToList(item); // Restore to UI
  }
}
```

Use a confirmation dialog only for:
- Truly irreversible actions (account deletion, data export purge)
- High-cost actions (payment confirmation)
- Batch operations where the scope is non-obvious

When a dialog is required, name the specific action in both the body and the confirm button. Never "Are you sure?" + "Yes/No".

---

## Touch Targets

All interactive elements must meet 44×44px minimum touch target size (WCAG 2.5.5).

Visual size can be smaller than the touch target. Expand via padding or pseudo-elements:

```tsx
{/* Padding approach */}
<button className="p-3 rounded-lg">
  <Icon size={18} />
</button>

{/* Pseudo-element approach (visual size unchanged) */}
<button className="relative w-6 h-6">
  <Icon size={24} />
  <span className="absolute inset-[-10px]" aria-hidden="true" />
</button>
```

Add `touch-manipulation` to interactive elements on mobile to eliminate the 300ms tap delay:

```css
.interactive { touch-manipulation: manipulation; }
```

In Tailwind: `touch-manipulation` class.

---

## Error Boundaries

Wrap independent feature sections in error boundaries. A broken sidebar should not crash the entire page.

```tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 rounded-lg border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            Something went wrong in this section.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-sm text-red-600 underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Never block the entire interface when one component errors.

---

## ARIA Live Regions

Announce dynamic changes to screen readers without moving focus.

```tsx
{/* Polite: waits for user to finish current task */}
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {statusMessage}
</div>

{/* Assertive: interrupts — use only for critical errors */}
<div role="alert" aria-live="assertive" aria-atomic="true">
  {criticalError}
</div>
```

`aria-atomic="true"` reads the entire region content when any part changes. Without it, screen readers may read only the changed portion.

---

## What Not to Do

- Remove focus indicators without a replacement
- Use placeholder text as the only label for form fields
- Touch targets smaller than 44×44px
- Generic error messages ("An error occurred")
- Custom controls without ARIA roles and keyboard handlers
- Hover-only interactions (touch users cannot hover)
- Validate form fields on every keystroke
- Confirmation dialogs for reversible actions
- `tabindex` values greater than 0 (breaks natural tab order)
