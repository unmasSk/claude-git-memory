# UX Writing

Every word in an interface is a design decision. Bad copy creates support tickets, user errors, and lost conversions. Good copy is invisible — users understand immediately without noticing the words.

---

## Button Labels: The Formula

Never use "OK", "Submit", "Yes", or "No". These are ambiguous. The pattern is **verb + object** — describe what will happen.

| Bad | Good | Why |
|-----|------|-----|
| OK | Save changes | Describes the outcome |
| Submit | Create account | Outcome-focused |
| Yes | Delete message | Confirms the specific action |
| Cancel | Keep editing | Clarifies what "cancel" means |
| Click here | Download invoice | Describes the destination |
| Remove | Delete | "Delete" = permanent; "Remove" implies recoverable |

### Destructive Actions

Name the destruction specifically:

```
"Delete project"       — not "Delete"
"Delete 5 items"       — not "Delete selected" (show the count)
"Permanently delete"   — when there is no undo
"Remove from list"     — when the action IS recoverable
```

### Confirmation Dialog Pairs

Both buttons should name their action:

```
"Delete project"   /  "Keep project"       — not "Yes" / "No"
"Discard changes"  /  "Continue editing"   — not "OK" / "Cancel"
"Sign out"         /  "Stay signed in"     — not "Yes" / "No"
```

---

## Error Messages: The Three-Part Formula

Every error message answers three questions:
1. What happened?
2. Why?
3. How to fix it?

```
WRONG: "Invalid input"
RIGHT: "Email address needs an @ symbol. Try: you@example.com"

WRONG: "Error 403: Forbidden"
RIGHT: "You don't have permission to view this page. Contact your admin for access."

WRONG: "Something went wrong"
RIGHT: "We couldn't save your changes. Check your connection and try again."
```

### Error Message Templates

| Situation | Template |
|-----------|----------|
| Format error | "[Field] needs to be [format]. Example: [example]" |
| Missing required field | "Please enter [what's missing]" |
| Permission denied | "You don't have access to [thing]. [What to do instead]" |
| Network error | "We couldn't reach [thing]. Check your connection and [action]." |
| Server error | "Something went wrong on our end. We're looking into it. [Alternative action]" |
| Rate limiting | "You've made too many attempts. Wait [time] and try again." |
| Session expired | "You've been signed out. Sign back in to continue." |

### HTTP Status Code → User-Facing Copy

| Status | User-facing copy pattern |
|--------|--------------------------|
| 400 | Show inline validation errors near the problem fields |
| 401 | "You've been signed out. Sign in to continue." + redirect |
| 403 | "You don't have permission to [action]. Contact [owner] for access." |
| 404 | "We can't find that page. It may have moved or been deleted." + helpful links |
| 429 | "Too many requests. Wait [N] seconds and try again." |
| 500 | "Something went wrong on our end. We're working on it. [Support link]" |

### Do Not Blame the User

Reframe the sentence:

```
WRONG: "You entered an invalid date"
RIGHT: "Please enter a date in MM/DD/YYYY format"

WRONG: "You made an error"
RIGHT: "This field is required"

WRONG: "Invalid credentials"
RIGHT: "That email or password is incorrect. Try again or reset your password."
```

Active voice that names the system, not the user:

```
WRONG: "Your file could not be uploaded"
RIGHT: "We couldn't upload that file. Try a file smaller than 10MB."
```

---

## Empty States: Onboarding Opportunities

An empty state is the first experience for a new user in a feature. Treat it as onboarding.

Three parts:
1. Acknowledge briefly (don't be dramatic about emptiness)
2. Explain the value of filling it
3. Provide a single clear action

```
WRONG: "No items"
WRONG: "Nothing to show here"
RIGHT: "No projects yet. Create your first project to start organizing your work."

WRONG: "Your inbox is empty"
RIGHT: "Nothing to review. New submissions from your team will appear here."

WRONG: "No results"
RIGHT: "No results for 'purple widgets'. Try different keywords or clear your filters."
```

Match the empty state action to the primary value proposition of the feature, not a generic "Get started" CTA.

---

## Confirmation Dialogs

Most confirmation dialogs are design failures. Users click through them by habit. Prefer undo patterns for reversible actions.

Use a confirmation dialog only when:
- The action is irreversible (account deletion, permanent data loss)
- The action is high-stakes (payment confirmation)
- The scope is non-obvious (bulk operations)

When you must use a dialog:

```
WRONG: "Are you sure?"
RIGHT: "Delete 'Project Alpha'? This can't be undone."

WRONG: "Confirm deletion"
RIGHT: "Delete account? Your data will be permanently removed in 30 days."
```

Checklist for confirmation dialogs:
- Name the specific object being acted on
- State the consequence (especially if irreversible)
- Use specific button labels that match the dialog body
- The cancel/keep action is the safe default — style it as secondary

---

## Tooltips

Tooltips provide context for non-obvious elements. They must add value — not repeat the label.

```
WRONG tooltip on "Export" button: "Export"
RIGHT tooltip on "Export" button: "Download as CSV"

WRONG tooltip on settings icon: "Settings"
RIGHT tooltip on settings icon: "Account settings"

WRONG: Tooltip showing full URL when hovering a link
RIGHT: Tooltip explaining what the link opens if it's not obvious
```

Rules:
- Tooltip text is supplemental — not required to complete a task
- Trigger on hover AND focus (keyboard users must also see tooltips)
- Maximum ~80 characters — longer content belongs in a help panel
- Never put interactive content (buttons, links) inside a tooltip

---

## Onboarding Copy

Onboarding copy should accelerate the user to their first value moment, not explain every feature.

**Principle:** Show the destination, not the map.

```
WRONG: "This is the dashboard. Here you can see your projects, tasks, and team activity."
RIGHT: "Create your first project to get your team working."
```

Progressive disclosure in onboarding:
- First: the single most important action
- Second: the next logical step after completing the first
- Never: a feature tour before the user has done anything

For empty onboarding states, show what the interface looks like when populated (with example or placeholder content) rather than a completely blank screen.

---

## Loading State Copy

Be specific. Tell the user what is happening.

```
WRONG: "Loading..."
WRONG: "Please wait..."
RIGHT: "Loading your projects..."
RIGHT: "Saving your changes..."
RIGHT: "Uploading file (2 of 5)..."
```

For long operations (> 3 seconds), set expectations:

```
"Analyzing your data... This usually takes 30–60 seconds."
"Generating your report... About 2 minutes remaining."
```

Offer an escape hatch when appropriate:

```
"Processing payment... [Cancel]"
"Importing contacts... [Cancel and go back]"
```

---

## Success Messages

Confirm what happened and explain what happens next when relevant.

```
WRONG: "Success"
WRONG: "Done"
RIGHT: "Changes saved."
RIGHT: "Settings saved. Your changes will take effect on next login."
RIGHT: "Account created. Check your email to confirm your address."
```

Calibrate celebration to the moment:
- Small action (form save): Brief, quiet confirmation
- Milestone (first publish, account created): Can be celebratory
- Automatic background action: Skip the message entirely if it's unsurprising

---

## Voice and Tone

**Voice** is your brand's personality — consistent everywhere.
**Tone** adapts to the user's emotional state in the moment.

| Moment | Tone |
|--------|------|
| Neutral navigation | Neutral, clear |
| Success / completion | Positive, brief |
| Error | Empathetic, helpful — never cute or jokey |
| Loading | Reassuring ("Saving your work...") |
| Destructive action | Serious, specific |
| Empty state | Welcoming, action-oriented |

**Never use humor for errors.** The user is already frustrated. Be helpful, not witty.

**Calibrate formality to context:**

| Context | Voice |
|---------|-------|
| Banking / healthcare / legal | Formal, clear, precise |
| Consumer apps | Conversational, friendly |
| Developer tools | Direct, technical when appropriate |
| Enterprise SaaS | Professional but not stiff |

---

## Writing for Accessibility

### Link Text

Must have standalone meaning — a screen reader user may hear links listed in isolation.

```
WRONG: "Click here for pricing"
RIGHT: "View pricing plans"

WRONG: "Read more"
RIGHT: "Read more about our security policy"
```

### Alt Text

Describes the information the image conveys, not the image itself.

```
WRONG: alt="chart"
WRONG: alt="bar chart image"
RIGHT: alt="Revenue increased 40% in Q4 2024"

Decorative images: alt="" (empty, not missing)
```

### Icon Buttons

Icon-only buttons require `aria-label`. The label should name the action, not the icon shape.

```tsx
<button aria-label="Delete comment">
  <TrashIcon aria-hidden="true" />
</button>
```

### ARIA Live Region Copy

Be concise. Screen readers announce this text — long copy is disruptive.

```
WRONG: "Your form has been successfully submitted and we will be in touch shortly"
RIGHT: "Form submitted. We'll be in touch."
```

---

## Writing for Translation

### Plan for Expansion

Design UI containers to accommodate translated strings that are longer than the English source.

| Language | Typical expansion vs English |
|----------|------------------------------|
| German | +30% |
| French | +20% |
| Finnish | +30–40% |
| Portuguese | +20–30% |
| Chinese | −30% (fewer characters, same visual width in some contexts) |

```tsx
{/* WRONG: assumes English length */}
<button className="w-24 truncate">Submit</button>

{/* RIGHT: adapts to content */}
<button className="px-4 py-2">Submit</button>
```

### Translation-Friendly Patterns

Separate dynamic values from strings:

```tsx
{/* WRONG: word order varies by language */}
<p>You have {count} new messages</p>

{/* RIGHT: translatable string with interpolated value */}
<p>{t('new_messages', { count })}</p>
{/* en: "New messages: 3"  |  de: "Neue Nachrichten: 3" */}
```

Avoid concatenated strings:

```tsx
{/* WRONG: breaks in languages with different word order */}
const msg = 'Hello, ' + username + '!';

{/* RIGHT: single translatable string */}
const msg = t('greeting', { username }); // "Hello, {{username}}!"
```

Do not abbreviate. "5 minutes ago" → "5 mins ago" creates translation edge cases and fails accessibility.

Give translators context:
- Where in the UI this string appears
- Maximum character length if constrained
- Whether it's a button, label, heading, or body copy

---

## Terminology Consistency

Pick one term per concept. Never vary for variety — inconsistency creates confusion.

| Avoid | Use one |
|-------|---------|
| Delete / Remove / Trash | Delete |
| Settings / Preferences / Options | Settings |
| Sign in / Log in / Enter | Sign in |
| Create / Add / New | Create |
| Team / Group / Organization | Team (or whichever fits the domain model) |
| Profile / Account | Profile (personal) / Account (billing/login) |

Maintain a terminology glossary. Add to it when introducing new concepts. Enforce it in review. One person inconsistency compounds into product-wide confusion.

---

## Avoid Redundant Copy

If the heading says it, the intro restates it, and the button repeats it — that is three words for a job that takes one.

```
WRONG:
  Heading: "Create account"
  Body: "Use this form to create your account."
  Button: "Create account"

RIGHT:
  Heading: "Create account"
  Body: [explanation of what you get, why it matters]
  Button: "Create account"
```

Rules:
- If a button label is self-explanatory, do not add a tooltip that just repeats it
- If a section heading describes the content, remove the first sentence of the content that says the same thing
- Progress labels ("Step 1 of 3: Account details") should not be followed by "In this step, you will enter your account details"

---

## Form Instructions

Show format expectations with a placeholder or helper text — not with dense instruction paragraphs above the form.

```
WRONG:
  Heading: "Please enter your date of birth in the format MM/DD/YYYY"
  Field: [input]

RIGHT:
  Label: Date of birth
  Placeholder: MM/DD/YYYY
  Field: [input]
```

For non-obvious fields, explain why you're asking (not what the field is):

```
Label: Phone number (optional)
Helper: We'll only use this to send order delivery updates by SMS.
```

Never explain constraints only after a validation error. Show them upfront so users know what to enter.

---

## What Not to Do

- "OK", "Submit", "Yes/No" as button labels
- Error messages that blame the user or omit the fix
- Empty states that just say "No items"
- Generic loading text ("Loading...")
- Varying terminology across the same product
- Humor for errors or frustrating states
- Abbreviations that create translation problems
- Fixed-width containers that clip translated strings
- Link text that only makes sense in context ("Click here", "Read more")
- Repeating the same information in heading, body, and button
- Tooltip text that just repeats the element's visible label
