# Conversion Rate Optimization Reference

Complete reference for optimizing marketing pages, forms, popups, and signup flows. Covers analysis frameworks, field-by-field optimization, trigger strategies, and experiment libraries across all CRO domains.

---

## Page CRO Analysis Framework

Analyze pages across seven dimensions in order of impact. Read `.agents/product-marketing-context.md` first.

### 1. Value Proposition Clarity (Highest Impact)

Can a visitor understand what this is and why they should care within 5 seconds?

**Check for**:
- Primary benefit is clear, specific, and differentiated
- Written in customer language, not company jargon
- Not feature-focused when it should be benefit-focused
- Not too vague or too clever

**Common issues**: trying to say everything instead of the most important thing, sacrificing clarity for cleverness, feature-dump instead of outcome-focus.

### 2. Headline Effectiveness

**Evaluate**:
- Does it communicate the core value proposition?
- Is it specific enough to be meaningful?
- Does it match the traffic source messaging?

**Strong patterns**: Outcome-focused ("Get [outcome] without [pain]"), Specificity (numbers, timeframes), Social proof ("Join 10,000+ teams who...")

### 3. CTA Placement, Copy, and Hierarchy

**Primary CTA assessment**:
- One clear primary action visible without scrolling
- Button copy communicates value, not just action
- Weak: "Submit," "Sign Up," "Learn More"
- Strong: "Start Free Trial," "Get My Report," "See Pricing"

**CTA hierarchy**: logical primary vs. secondary structure, CTAs repeated at key decision points.

### 4. Visual Hierarchy and Scannability

- Can someone scanning get the main message?
- Most important elements visually prominent?
- Sufficient white space?
- Do images support or distract?

### 5. Trust Signals and Social Proof

**Types**: customer logos (recognizable), testimonials (specific, attributed, with photos), case study snippets with real numbers, review scores and counts, security badges.

**Placement**: near CTAs and after benefit claims.

### 6. Objection Handling

**Common objections**: price/value concerns, "will this work for me?", implementation difficulty, "what if it doesn't work?"

**Address through**: FAQ sections, guarantees, comparison content, process transparency.

### 7. Friction Points

- Too many form fields
- Unclear next steps
- Confusing navigation
- Required information that should not be required
- Mobile experience issues
- Slow load times

### Page-Specific Frameworks

**Homepage CRO**: Clear positioning for cold visitors. Quick path to most common conversion. Handle both "ready to buy" and "still researching."

**Landing Page CRO**: Message match with traffic source. Single CTA (remove navigation if possible). Complete argument on one page.

**Pricing Page CRO**: Clear plan comparison. Recommended plan indication. Address "which plan is right for me?" anxiety.

**Feature Page CRO**: Connect feature to benefit to outcome. Use cases and examples. Clear path to try or buy.

**Blog Post CRO**: Contextual CTAs matching content topic. Inline CTAs at natural stopping points.

---

## Form Optimization

### Core Principles

**Every field has a cost**:
- 3 fields: baseline
- 4-6 fields: 10-25% reduction
- 7+ fields: 25-50%+ reduction

For each field ask: Is this absolutely necessary before helping them? Can this be obtained another way? Can this be asked later?

**Value must exceed effort**: clear value proposition above form, make what they get obvious, reduce perceived effort.

**Reduce cognitive load**: one question per field, conversational labels, logical grouping, smart defaults.

### Field-by-Field Optimization

**Email**: Single field, no confirmation. Inline validation. Typo detection (gmial.com to gmail.com). Proper mobile keyboard.

**Name**: Single "Name" vs. First/Last — test this. Single field reduces friction. Split only if personalization requires it.

**Phone**: Make optional if possible. If required, explain why. Auto-format as they type. Country code handling.

**Company/Organization**: Auto-suggest for faster entry. Enrichment after submission (Clearbit, etc.). Infer from email domain.

**Job Title/Role**: Dropdown if categories matter. Free text if wide variation. Consider making optional.

**Message/Comments**: Make optional. Reasonable character guidance. Expand on focus.

**Dropdown Selects**: "Select one..." placeholder. Searchable if many options. Radio buttons if fewer than 5 options. Include "Other" with text field.

**Checkboxes**: Clear parallel labels. Reasonable number. "Select all that apply" instruction.

### Form Layout

**Field order**: Start with easiest (name, email). Build commitment before asking more. Sensitive fields last (phone, company size). Logical grouping.

**Labels and placeholders**: Labels must stay visible (not placeholder-only — placeholders disappear when typing). Placeholders show examples, not labels. Help text only when genuinely helpful.

**Visual design**: Sufficient spacing, clear hierarchy, prominent CTA button, mobile-friendly tap targets (44px+).

**Column layout**: Single column for higher completion and mobile friendliness. Multi-column only for short related fields (First/Last name). When in doubt, single column.

### Multi-Step Forms

**When to use**: More than 5-6 fields, logically distinct sections, conditional paths, complex forms (applications, quotes).

**Best practices**: Progress indicator (step X of Y). Start easy, end sensitive. One topic per step. Allow back navigation. Save progress. Clear required vs. optional indication.

**Progressive commitment pattern**:
1. Low-friction start (just email)
2. More detail (name, company)
3. Qualifying questions
4. Contact preferences

### Error Handling

**Inline validation**: Validate on field exit, not while typing. Clear visual indicators (green check, red border).

**Error messages**: Specific to the problem. Suggest how to fix. Position near the field. Never clear their input.

Good: "Please enter a valid email address (e.g., name@company.com)"
Bad: "Invalid input"

**On submit**: Focus on first error field. Summarize if multiple errors. Preserve all entered data.

### Submit Button Optimization

**Button copy**: Weak = "Submit" or "Send." Strong = [Action] + [What they get]. Examples: "Get My Free Quote," "Download the Guide," "Request Demo."

**Placement**: Immediately after last field. Left-aligned with fields. Sufficient size and contrast. Mobile: sticky or clearly visible.

**Post-submit states**: Loading (disable button, show spinner). Success (clear next steps). Error (clear message, focus on issue).

### Trust and Friction Reduction

**Near the form**: Privacy statement ("We'll never share your info"), security badges, testimonial or social proof, expected response time.

**Reducing perceived effort**: "Takes 30 seconds," field count indicator, remove visual clutter, generous white space.

**Addressing objections**: "No spam, unsubscribe anytime," "We won't share your number," "No credit card required."

### Form Types: Specific Guidance

**Lead Capture (gated content)**: Minimum viable fields (often just email). Clear value proposition. Ask enrichment questions post-download. Test email-only vs. email + name.

**Contact Form**: Email/Name + Message essential. Phone optional. Set response time expectations. Offer alternatives (chat, phone).

**Demo Request**: Name, Email, Company required. Phone optional with "preferred contact" choice. Use case question helps personalize. Calendar embed increases show rate.

**Quote/Estimate Request**: Multi-step often works well. Start easy, technical details later. Save progress for complex forms.

**Survey Forms**: Progress bar essential. One question per screen. Skip logic for relevance. Consider completion incentive.

### Mobile Form Optimization

- 44px+ touch targets
- Appropriate keyboard types (email, tel, number)
- Autofill support
- Single column only
- Sticky submit button
- Minimize typing (dropdowns, buttons)

---

## Popup and Modal Optimization

### Core Principles

**Timing is everything**: Too early = annoying. Too late = missed. Right time = helpful offer at moment of need.

**Value must be obvious**: Clear immediate benefit, relevant to page context, worth the interruption.

**Respect the user**: Easy to dismiss, no trapping or tricks, remember preferences, do not ruin the experience.

### Trigger Strategies

**Time-based**: Not recommended at 5 seconds. Better at 30-60 seconds (proven engagement). Best for general visitors.

**Scroll-based**: 25-50% scroll depth. Indicates content engagement. Best for blog posts and long-form content. "You're halfway through — get more like this."

**Exit intent**: Detects cursor moving to close/leave. Last chance to capture. Best for e-commerce and lead gen. Mobile alternative: back button or scroll up.

**Click-triggered**: User initiates by clicking button/link. Zero annoyance. Best for lead magnets, gated content, demos. "Download PDF" opens popup form.

**Page count / Session-based**: After visiting X pages. Indicates research behavior. "Been comparing? Here's a summary..."

**Behavior-based**: Cart abandonment, pricing page visitors, repeat visits. Best for high-intent segments.

### Popup Types

**Email Capture**: Clear value prop (not just "Subscribe"). Specific benefit. Single field (email). Consider incentive.

**Lead Magnet**: Show what they get (cover, preview). Specific tangible promise. Minimal fields. Instant delivery expectation.

**Discount/Promotion**: Clear discount amount. Deadline creates urgency. Single use per visitor. Easy code application.

**Exit Intent**: Acknowledge leaving. Different offer than entry popup. Address common objections. Formats: "Wait! Before you go...", "Forget something?", "Get 10% off first order", "Questions? Chat with us."

**Announcement Banner**: Top of page (sticky or static). Single clear message. Dismissable. Links to more info. Time-limited.

**Slide-In**: Enters from corner/bottom. Does not block content. Easy to dismiss/minimize. Good for chat, support, secondary CTAs.

### Design Best Practices

**Visual hierarchy**: 1. Headline (largest), 2. Value prop/offer, 3. Form/CTA, 4. Close option (easy to find).

**Sizing**: Desktop 400-600px wide. Never cover entire screen. Mobile: full-width bottom or center, not full-screen. Leave space to close.

**Close button**: Visible top right. Large enough for mobile tap. "No thanks" text as alternative. Click outside to close. Users who cannot find the close button bounce entirely.

**Mobile**: Cannot detect exit intent. Full-screen overlays feel aggressive. Bottom slide-ups work well. Larger touch targets. Easy dismiss gestures.

### Copy Formulas

**Headlines**: Benefit-driven ("Get [result] in [timeframe]"), Question ("Want [outcome]?"), Command ("Don't miss [thing]"), Social proof ("Join [X] people who..."), Curiosity ("The one thing [audience] always gets wrong about [topic]")

**Subheadlines**: Expand on promise, address objection ("No spam, ever"), set expectations ("Weekly tips in 5 min")

**CTA Buttons**: First person works ("Get My Discount" vs. "Get Your Discount"). Specific over generic ("Send Me the Guide" vs. "Submit"). Value-focused ("Claim My 10% Off" vs. "Subscribe").

**Decline options**: Polite, not guilt-trippy. "No thanks" / "Maybe later" / "I'm not interested." AVOID manipulative: "No, I don't want to save money."

### Frequency and Rules

**Frequency capping**: Maximum once per session. Remember dismissals (cookie/localStorage). 7-30 days before showing again.

**Audience targeting**: New vs. returning visitors (different needs). By traffic source. By page type. Exclude converted users. Exclude recently dismissed.

**Page rules**: Exclude checkout/conversion flows. Match offer to page context.

### Compliance and Accessibility

**GDPR/Privacy**: Clear consent language. Link to privacy policy. No pre-checked opt-ins. Honor preferences.

**Accessibility**: Keyboard navigable (Tab, Enter, Esc). Focus trap while open. Screen reader compatible. Sufficient contrast. Do not rely on color alone.

**Google Guidelines**: Intrusive interstitials hurt SEO, especially on mobile. Allow cookie notices, age verification, reasonable banners. Avoid full-screen before content on mobile.

### Popup Benchmarks

- Email popup: 2-5% conversion typical
- Exit intent: 3-10% conversion
- Click-triggered: 10%+ (self-selected audience)

### Common Popup Strategies by Business Type

**E-commerce**: 1. Entry/scroll: first-purchase discount. 2. Exit intent: bigger discount or reminder. 3. Cart abandonment: complete your order.

**B2B SaaS**: 1. Click-triggered: demo request, lead magnets. 2. Scroll: newsletter/blog subscription. 3. Exit intent: trial reminder or content offer.

**Content/Media**: 1. Scroll-based: newsletter after engagement. 2. Page count: subscribe after multiple visits. 3. Exit intent: don't miss future content.

**Lead Generation**: 1. Time-delayed: general list building. 2. Click-triggered: specific lead magnets. 3. Exit intent: final capture attempt.

---

## Signup Flow Optimization

### Core Principles

**Minimize required fields**: Every field reduces conversion. For each, ask: needed before product use? Collectible later? Inferable from other data?

Field priority: Essential (email/phone, password) > Often needed (name) > Usually deferrable (company, role, team size, phone, address).

**Show value before commitment**: What can be shown before requiring signup? Can they experience the product first? Reverse the order: value first, signup second.

**Reduce perceived effort**: Show progress if multi-step, group related fields, smart defaults, pre-fill when possible.

**Remove uncertainty**: Clear expectations ("Takes 30 seconds"), show what happens after, no surprises.

### Field-by-Field Optimization

**Email**: Single field, no confirmation. Inline format validation. Typo detection (gmial.com to gmail.com).

**Password**: Show/hide toggle (eye icon). Requirements visible upfront, not after failure. Real-time strength meter. Allow paste. Consider passwordless options.

**Name**: Single "Full name" vs. First/Last — test. Only require if immediately used for personalization. Consider making optional.

**Social Auth**: Place prominently (often higher conversion than email). Show relevant options: B2C = Google, Apple, Facebook. B2B = Google, Microsoft, SSO. Clear visual separation. Consider "Sign up with Google" as primary.

**Phone**: Defer unless essential (SMS verification). Explain why if required. Proper input with country code. Format as they type.

**Company**: Defer if possible. Auto-suggest. Infer from email domain.

**Use Case / Role**: Defer to onboarding if possible. Keep to one question if needed at signup. Progressive disclosure.

### Single-Step vs. Multi-Step

**Single-step works**: 3 or fewer fields, simple B2C products, high-intent visitors.

**Multi-step works**: More than 3-4 fields, complex B2B needing segmentation, different info types.

**Multi-step best practices**: Progress indicator. Easy questions first (name, email), harder later (after psychological commitment). Each step completable in seconds. Back navigation. Save progress.

**Progressive commitment**: 1. Email only (lowest barrier). 2. Password + name. 3. Customization questions (optional).

### Trust and Friction Reduction

**At form level**: "No credit card required" (if true), "Free forever" or "14-day free trial," privacy note, security badges, testimonial near form.

**Error handling**: Inline validation, specific messages ("Email already registered" + recovery path), never clear form on error, focus on problem field.

**Microcopy**: Placeholders for examples (not labels), labels stay visible, help text close to field.

### Mobile Signup

- 44px+ touch targets
- Proper keyboard types
- Autofill support
- Reduce typing (social auth, pre-fill)
- Single column
- Sticky CTA button
- Test on actual devices

### Post-Submit Experience

**Success state**: Clear confirmation, immediate next step. If email verification required: explain what to do, easy resend, check spam reminder, option to change email.

**Verification flows**: Consider delaying verification until necessary. Magic link as password alternative. Let users explore while awaiting verification.

### Common Signup Patterns

**B2B SaaS Trial**: Email + Password (or Google auth) > Name + Company > Onboarding flow

**B2C App**: Google/Apple auth OR Email > Product experience > Profile completion later

**Waitlist/Early Access**: Email only > Optional role/use case question > Confirmation

**E-commerce Account**: Guest checkout as default > Account creation optional post-purchase > OR Social auth

---

## Experiment Ideas Library

### Page CRO Experiments

**Hero Section**:
- Headline variations (specific vs. abstract)
- Subheadline clarity
- CTA above fold (include/exclude)
- Hero visual format (screenshot vs. GIF vs. illustration vs. video)
- CTA button color, text variations
- Interactive demo in hero

**Trust and Social Proof**:
- Logo placement (hero vs. below fold)
- Case study in hero section
- Trust badges (security, compliance, awards)
- Social proof in headline ("Join 10,000+ teams")
- Testimonial placement (above fold vs. dedicated section)
- Video testimonials vs. text

**Features and Content**:
- Feature presentation format (icons vs. detailed sections)
- Section ordering (move high-value up)
- Secondary CTAs throughout
- Benefit vs. feature focus
- Comparison section (vs. competitors or status quo)

**Navigation and UX**:
- Sticky navigation with CTA
- Nav menu order (priority at edges)
- Nav CTA button
- Support widget (live chat vs. AI chatbot)
- Footer optimization
- Exit intent popup

**Pricing Page**:
- Annual vs. monthly display
- Price points ($99 vs. $100 vs. $97)
- "Most Popular" badge
- Number of visible tiers (2 vs. 3 vs. 4)
- Price anchoring order
- Pricing calculator for usage-based
- Guided pricing wizard vs. comparison table
- Monthly/annual toggle with savings
- Plan recommendation quiz
- FAQ addressing pricing objections
- ROI calculator
- Money-back guarantee prominence
- Customer logos near pricing
- Review scores (G2/Capterra)

**Demo Request Page**:
- Field count reduction
- Multi-step vs. single form
- Form placement (above fold vs. after content)
- Phone field (include/exclude)
- Field enrichment (auto-fill)
- Benefits above form
- Demo preview (video/GIF)
- "What You'll Learn" expectations
- Calendar integration (inline vs. external)
- Qualification routing (self-serve vs. sales)

**Landing Page**:
- Headline matching ad copy
- Visual matching ad creative
- Audience-specific pages per segment
- Navigation removal (single-focus)
- CTA repetition throughout
- Form vs. button (direct capture vs. click-through)
- Urgency/scarcity messaging (if genuine)
- Short vs. long page
- Section ordering

**Feature Page**:
- Demo/screenshot showing feature
- Use case examples
- Before/after visualization
- Video walkthrough
- Interactive demo
- Feature-specific trial offer
- Comparison vs. competitors

**Cross-Page**:
- Chat widget impact
- Cookie consent UX
- Page load speed vs. features
- Mobile responsive optimization
- Personalization by segment
- Menu structure
- Search placement
- CTA in navigation
- Breadcrumbs

### Form CRO Experiments

**Layout and Flow**:
- Single-step vs. multi-step with progress bar
- 1-column vs. 2-column
- Embedded on page vs. separate page
- Form above fold vs. after content

**Field Optimization**:
- Reduce to minimum viable fields
- Add/remove phone number
- Add/remove company field
- Required vs. optional balance
- Field enrichment to auto-fill
- Hide fields for returning visitors

**Smart Forms**:
- Real-time validation
- Progressive profiling (ask more over time)
- Conditional fields based on earlier answers
- Auto-suggest for company names

**Labels and Microcopy**:
- Label clarity and length
- Placeholder text optimization
- Help text: show vs. hide vs. hover
- Error message tone (friendly vs. direct)

**CTAs and Buttons**:
- Button text ("Submit" vs. "Get My Quote" vs. specific)
- Button color and size
- Placement relative to fields

**Trust Elements**:
- Privacy assurance near form
- Trust badges next to submit
- Testimonial near form
- Expected response time display

**Demo Request Forms**:
- With/without phone requirement
- "Preferred contact method" choice
- "Biggest challenge?" question
- Calendar embed vs. form submission

**Lead Capture Forms**:
- Email-only vs. email + name
- Value proposition messaging above form
- Gated vs. ungated strategies
- Post-submission enrichment questions

**Contact Forms**:
- Department/topic routing dropdown
- With/without message requirement
- Alternative contact methods
- Response time messaging

**Mobile**:
- Larger touch targets
- Keyboard type testing
- Sticky submit button
- Auto-focus first field
- Form container styling

### Popup CRO Experiments

**Placement and Format**:
- Top bar vs. below header banner
- Sticky vs. static banner
- Full-width vs. contained banner
- Banner with/without countdown timer
- Center modal vs. slide-in
- Full-screen vs. smaller modal
- Bottom bar vs. corner popup
- Popup sizes on desktop and mobile

**Triggers**:
- Exit intent vs. 30s delay vs. 50% scroll
- Time delay (10s vs. 30s vs. 60s)
- Scroll depth (25% vs. 50% vs. 75%)
- Page count trigger
- Intent prediction
- Specific page visit triggers
- Return vs. new visitor targeting
- Referral source targeting
- Click-triggered for lead magnets
- In-content vs. sidebar triggers

**Messaging and Content**:
- Attention-grabbing vs. informational headlines
- "Limited-time offer" vs. "New feature alert"
- Urgency-focused vs. value-focused copy
- Headline length and specificity
- CTA button text variations
- Button color for contrast
- Primary + secondary CTA vs. single
- Decline text (friendly vs. neutral)
- Countdown timers
- With/without images
- Product preview vs. generic imagery
- Social proof in popup

**Personalization**:
- Visitor data personalization
- Industry-specific content
- Pages-visited tailoring
- Progressive profiling

**Frequency and Rules**:
- Frequency capping (per session vs. per week)
- Cool-down after dismissal
- Dismiss behavior testing
- Escalating offers over visits

### Signup Flow CRO Experiments

**Layout and Structure**:
- Single-step vs. multi-step
- Progress bar vs. without
- 1-column vs. 2-column
- Embedded vs. separate page

**Field Optimization**:
- Minimum fields (email + password only)
- Add/remove phone
- Single "Name" vs. First/Last
- Add/remove company
- Required vs. optional balance

**Authentication**:
- Add SSO (Google, Microsoft, GitHub, LinkedIn)
- SSO prominent vs. email prominent
- Which SSO options resonate
- SSO-only vs. SSO + email

**Visual Design**:
- Button colors and sizes
- Background (plain vs. product visuals)
- Form container styling
- Mobile-optimized layout

**Headlines and CTAs**:
- Headline variations above form
- CTA text ("Create Account" vs. "Start Free Trial" vs. "Get Started")
- Trial length clarity in CTA
- Value proposition emphasis

**Microcopy**:
- Minimal vs. descriptive labels
- Placeholder optimization
- Error message clarity
- Password requirements (upfront vs. on error)

**Trust Elements**:
- Social proof next to form
- Trust badges (security, compliance)
- "No credit card required" messaging
- Privacy assurance copy

**Trial and Commitment**:
- Credit card required vs. not for trial
- Trial length (7 vs. 14 vs. 30 days)
- Freemium vs. free trial
- Limited features vs. full access trial

**Friction Points**:
- Email verification (required vs. delayed vs. removed)
- CAPTCHA impact on completion
- Terms checkbox vs. implicit acceptance
- Phone verification for high-value

**Post-Submit**:
- Next steps messaging
- Instant access vs. email confirmation first
- Personalized welcome based on signup data
- Auto-login vs. require login

---

## Measurement Framework

### Page CRO Metrics
- Bounce rate by traffic source
- Scroll depth
- CTA click rate
- Conversion rate by page type
- Time on page

### Form Metrics
- **Form start rate**: page views to started form
- **Completion rate**: started to submitted
- **Field drop-off**: which fields lose people
- **Error rate**: by field
- **Time to complete**: total and per field
- **Mobile vs. desktop**: completion by device

Track: form views, first field focus, each field completion, errors by field, submit attempts, successful submissions.

### Popup Metrics
- **Impression rate**: visitors who see popup
- **Conversion rate**: impressions to submissions
- **Close rate**: immediate dismissals
- **Engagement rate**: interaction before close
- **Time to close**: dismissal timing

Track: popup views, form focus, submission attempts, successful submissions, close button clicks, outside clicks, escape key.

### Signup Metrics
- Form start rate (landed to started)
- Completion rate (started to submitted)
- Field-level drop-off
- Time to complete
- Error rate by field
- Social auth vs. email ratio
- Mobile vs. desktop completion

---

## Output Format: CRO Recommendations

Structure all CRO recommendations in three tiers:

### Quick Wins (Implement Now)
Easy changes with likely immediate impact. Low effort, high confidence.

### High-Impact Changes (Prioritize)
Bigger changes requiring more effort but significantly improving conversions.

### Test Ideas
Hypotheses worth A/B testing rather than assuming. Include expected outcome for each.

For form audits, additionally provide per issue:
- **Issue**: What is wrong
- **Impact**: Estimated effect on conversions
- **Fix**: Specific recommendation
- **Priority**: High / Medium / Low
