# Retention Reference

Complete reference for user retention: onboarding activation, churn prevention, involuntary churn recovery, paywall/upgrade optimization, and pricing strategy.

---

## Onboarding Flow Design

### Defining Activation

The activation event is the single action that correlates most strongly with long-term retention. Identify it by comparing retained users against churned users: what do retained users do that churned users do not?

**Examples by product type:**

| Product Type | Activation Event |
|--------------|-----------------|
| Project management | Create first project + add team member |
| Analytics | Install tracking + see first report |
| Design tool | Create first design + export or share |
| Marketplace | Complete first transaction |
| Content platform | Follow or customize + consume + create |

**Activation metrics to track:**
- Percentage of signups reaching activation
- Time to activation (hours or days)
- Steps to activation (count)
- Activation rate by cohort and acquisition source

### The Aha Moment

Remove every step between signup and experiencing core value. Focus the first session on one successful outcome. Interactive experiences beat tutorials. Progress creates motivation -- show advancement and celebrate completions.

### Immediate Post-Signup (First 30 Seconds)

| Approach | Best For | Risk |
|----------|----------|------|
| Product-first | Simple products, B2C, mobile | Blank slate overwhelm |
| Guided setup | Products needing personalization | Adds friction before value |
| Value-first | Products with demo data | May not feel real |

Whatever approach you choose: present one clear next action, create no dead ends, show progress indication if multi-step.

### Onboarding Flow Types

**Common patterns by product type:**

| Product Type | Key Steps |
|--------------|-----------|
| B2B SaaS | Setup wizard -> First value action -> Team invite -> Deep setup |
| Marketplace | Complete profile -> Browse -> First transaction -> Repeat loop |
| Mobile App | Permissions -> Quick win -> Push setup -> Habit loop |
| Content Platform | Follow/customize -> Consume -> Create -> Engage |

### Onboarding Checklist Pattern

Use when multiple setup steps are required, the product has several features to discover, or it is a self-serve B2B product.

**Best practices:**
- Include 3-7 items (not overwhelming)
- Order by value (most impactful first)
- Start with quick wins to build momentum
- Show progress bar or completion percentage
- Celebrate on completion
- Include a dismiss option (do not trap users)
- Start the progress bar at 20% rather than 0% (tested improvement)

### Empty States

Empty states are onboarding opportunities, not dead ends. A good empty state explains what this area is for, shows what it looks like with data, presents a clear primary action to add the first item, and optionally pre-populates with example data.

### Tooltips and Guided Tours

Use when the UI is complex, features are not self-evident, or power features might be missed. Limit tours to 3-5 steps maximum. Make them dismissable at any time. Do not repeat for returning users.

### Multi-Channel Onboarding

Coordinate email with in-app onboarding. Email reinforces in-app actions rather than duplicating them. Drive back to product with a specific CTA. Personalize based on actions taken.

**Trigger-based email schedule:**
- Welcome email: immediate
- Incomplete onboarding reminder: 24h and 72h
- Activation achieved: celebration + next step
- Feature discovery: days 3, 7, 14

### Handling Stalled Users

Define stalled criteria (X days inactive, incomplete setup). Re-engagement tactics in order of escalation:

1. **Email sequence** -- reminder of value, address blockers, offer help
2. **In-app recovery** -- welcome back message, pick up where left off
3. **Human touch** -- for high-value accounts, personal outreach

### Onboarding Measurement

| Metric | Description |
|--------|-------------|
| Activation rate | Percentage reaching activation event |
| Time to activation | How long to first value |
| Onboarding completion | Percentage completing setup |
| Day 1/7/30 retention | Return rate by timeframe |

Track drop-off at each step to identify the biggest drops: Signup -> Step 1 -> Step 2 -> Activation -> Retention.

### Onboarding Experiments

Key experiment categories to test:

**Flow simplification:** Email verification timing, empty states vs dummy data, pre-filled templates, required step count, skip options.

**Progress and motivation:** Progress bars, checklist length (3-5 vs 5-7 items), gamification badges, completion messaging, starting point (begin at 20% vs 0%), celebration moments.

**Personalization:** Role-based onboarding paths, goal-based paths, role-specific dashboards, use-case question routing, industry-specific paths, experience-based paths (beginner vs expert).

**Support availability:** Free onboarding calls, contextual help, chat support during onboarding, proactive outreach for stuck users.

**Email experiments:** Founder welcome email vs generic, behavior-based triggers, email timing, video in email, plain text vs designed.

---

## Churn Prevention

Churn has two types requiring different strategies:

| Type | Cause | Typical Share | Solution |
|------|-------|--------------|----------|
| Voluntary | Customer chooses to cancel | 50-70% | Cancel flows, save offers, exit surveys |
| Involuntary | Payment fails | 30-50% | Dunning emails, smart retries, card updaters |

### Cancel Flow Design

Every cancel flow follows this sequence:

```
Trigger -> Exit Survey -> Dynamic Save Offer -> Confirmation -> Post-Cancel
```

**Step 1: Trigger.** Customer clicks Cancel subscription in account settings.

**Step 2: Exit Survey.** Ask why they are cancelling. This determines which save offer to show.

**Step 3: Dynamic Save Offer.** Present a targeted offer based on their reason.

**Step 4: Confirmation.** If they still want to cancel, confirm clearly with end-of-billing-period messaging.

**Step 5: Post-Cancel.** Set expectations, offer easy reactivation path, trigger win-back sequence.

### Exit Survey Design

Use 1 question, single-select with optional free text. Include 5-8 reason options maximum. Put most common reasons first (review data quarterly). Frame as "Help us improve" rather than "Why are you leaving?"

| Reason | What It Tells You |
|--------|-------------------|
| Too expensive | Price sensitivity -- may respond to discount or downgrade |
| Not using it enough | Low engagement -- may respond to pause or onboarding help |
| Missing a feature | Product gap -- show roadmap or workaround |
| Switching to competitor | Competitive pressure -- understand what they offer |
| Technical issues / bugs | Product quality -- escalate to support |
| Temporary / seasonal need | Usage pattern -- offer pause |
| Business closed / changed | Unavoidable -- learn and let go gracefully |
| Other | Catch-all with free text field |

### Dynamic Save Offers

Match the offer to the reason. A discount will not save someone who is not using the product. A feature roadmap will not save someone who cannot afford it.

| Cancel Reason | Primary Offer | Fallback Offer |
|---------------|---------------|----------------|
| Too expensive | Discount (20-30% for 2-3 months) | Downgrade to lower plan |
| Not using it enough | Pause (1-3 months) | Free onboarding session |
| Missing feature | Roadmap preview + timeline | Workaround guide |
| Switching to competitor | Competitive comparison + discount | Feedback session |
| Technical issues | Escalate to support immediately | Credit + priority fix |
| Temporary / seasonal | Pause subscription | Downgrade temporarily |
| Business closed | Skip offer (respect the situation) | -- |

### Save Offer Types

**Discount:**
- 20-30% off for 2-3 months is the sweet spot
- Avoid 50%+ discounts (trains customers to cancel for deals)
- Time-limit the offer ("This offer expires when you leave this page")
- Show the dollar amount saved, not just the percentage
- Maximum 2 discount offers per cancel session
- Never exceed 30% total
- Track discount accepters -- if they cancel again at full price, do not re-offer

**Pause subscription:**
- 1-3 month pause maximum (longer pauses rarely reactivate)
- 60-80% of pausers eventually return to active
- Auto-reactivation with 7 day advance notice email
- Keep their data and settings intact
- Allow 1 pause per 12-month period

**Pause reactivation sequence:**
- Day -7: "Your pause ends in 7 days. We have been busy -- here is what is new."
- Day -1: "Welcome back tomorrow! Here is what is waiting for you."
- Day 0: "You are back! Here is a quick tour of what is new."

**Plan downgrade:**
- Offer a lower tier instead of full cancellation
- Show exactly what they keep vs what they lose (checkmarks and X marks)
- Position as "right-size your plan" not "downgrade"
- Preserve their data on the lower plan
- If they downgrade, do not show upgrade prompts for at least 30 days

**Personal outreach:**
- For high-value accounts (top 10-20% by MRR)
- Route to customer success for a call
- Personal email from founder for smaller companies

### Cancel Flow by Business Type

**B2C / Self-Serve SaaS:** Fully automated, 2-3 screens maximum, one offer plus one fallback, mobile-optimized. Typical save rate: 20-30%.

**B2B / Team Plans:** Route accounts above MRR threshold to customer success. Show team impact ("Your 8 team members will lose access"). MRR-based routing:

| Account MRR | Cancel Flow |
|-------------|-------------|
| <$100/mo | Automated flow with offers |
| $100-$500/mo | Automated + flag for CS follow-up |
| $500-$2,000/mo | Route to CS before cancel completes |
| $2,000+/mo | Block self-serve cancel, require CS call |

**Freemium / Free-to-Paid:** Lead with the free tier as the first option (not a save offer). Show what they keep on free vs what they lose. Track free-tier users for future re-upgrade campaigns.

### Cancel Flow UI Principles

- Keep the "continue cancelling" option visible at every step (no dark patterns)
- One primary offer plus one fallback, not a wall of options
- Show specific dollar savings, not abstract percentages
- Use the customer's name and account data when possible
- Mobile-friendly (many cancellations happen on mobile)

### Post-Cancel Experience

| Timing | Action |
|--------|--------|
| Immediately | Confirmation email with access end date |
| Day 1 | Nothing -- do not be desperate |
| Day 7 | NPS/satisfaction survey about overall experience |
| Day 30 | "What is new" email with recent improvements |
| Day 60 | Address their specific cancel reason if resolved |
| Day 90 | Final win-back with special offer |

### Compliance

**FTC Click-to-Cancel Rule (US):** Cancellation must be as easy as signup. Cannot require a phone call if signup was online. Save offers are allowed but "continue cancelling" must be clear.

**GDPR / Data Retention (EU):** Inform users about data retention period. Offer data export before account deletion. Honor deletion requests within 30 days.

---

## Churn Prediction and Proactive Retention

The best save happens before the customer ever clicks Cancel.

### Risk Signals

| Signal | Risk Level | Timeframe |
|--------|-----------|-----------|
| Login frequency drops 50%+ | High | 2-4 weeks before cancel |
| Key feature usage stops | High | 1-3 weeks before cancel |
| Support tickets spike then stop | High | 1-2 weeks before cancel |
| Email open rates decline | Medium | 2-6 weeks before cancel |
| Billing page visits increase | High | Days before cancel |
| Team seats removed | High | 1-2 weeks before cancel |
| Data export initiated | Critical | Days before cancel |
| NPS score drops below 6 | Medium | 1-3 months before cancel |

### Health Score Model

Build a simple health score (0-100) from weighted signals:

```
Health Score = (
  Login frequency score   x 0.30 +
  Feature usage score     x 0.25 +
  Support sentiment       x 0.15 +
  Billing health          x 0.15 +
  Engagement score        x 0.15
)
```

| Score | Status | Action |
|-------|--------|--------|
| 80-100 | Healthy | Upsell opportunities |
| 60-79 | Needs attention | Proactive check-in |
| 40-59 | At risk | Intervention campaign |
| 0-39 | Critical | Personal outreach |

### Proactive Interventions

| Trigger | Intervention |
|---------|-------------|
| Usage drop >50% for 2 weeks | "We noticed you have not used [feature]. Need help?" email |
| Approaching plan limit | Upgrade nudge (not a wall) |
| No login for 14 days | Re-engagement email with recent product updates |
| NPS detractor (0-6) | Personal follow-up within 24 hours |
| Support ticket unresolved >48h | Escalation + proactive status update |
| Annual renewal in 30 days | Value recap email + renewal confirmation |

---

## Involuntary Churn: Payment Recovery

Failed payments cause 30-50% of all churn but are the most recoverable. Effective dunning recovers 50-60% of failed payments.

### The Dunning Stack

```
Pre-dunning -> Smart retry -> Dunning emails -> Grace period -> Hard cancel
```

### Pre-Dunning (Prevent Failures)

**Card expiry alerts:**
- 30 days before expiry: "Your card ending in 4242 expires next month"
- 15 days before expiry: "Update your payment method to avoid interruption"
- 7 days before expiry: "Your card expires in 7 days -- update now"
- 3 days before expiry: In-app banner

**Card updater services:** Visa Account Updater (VAU), Mastercard Automatic Billing Updater (ABU), Amex Cardrefresher. Reduces hard declines from expired/replaced cards by 30-50%. Stripe enables this automatically.

**Backup payment method:** Prompt after first successful payment ("Protect your account with a backup card") or after a failed payment is recovered (best timing -- they felt the pain).

**Pre-billing notification:** Email 7 days before renewal for annual plans with amount and date. Include link to update payment method. Required by some regulations for auto-renewals.

### Smart Retry Logic

Not all failures are the same. Retry strategy by decline type:

| Decline Type | Examples | Retry Strategy |
|-------------|----------|----------------|
| Soft decline (temporary) | Insufficient funds, processor timeout | Retry 3-5 times over 7-10 days |
| Hard decline (permanent) | Card stolen, account closed | Do not retry -- ask for new card |
| Authentication required | 3D Secure, SCA | Send customer to update payment |

**Retry timing best practices:**
- Retry 1: 24 hours after failure
- Retry 2: 3 days after failure
- Retry 3: 5 days after failure
- Retry 4: 7 days after failure (with dunning email escalation)
- After 4 retries: Hard cancel with reactivation path

Retry on the day of the month the payment originally succeeded. Retry after common paydays (1st and 15th). Avoid retrying on weekends (lower approval rates). Morning retries (8-10am local time) perform slightly better.

**Stripe Smart Retries** handles retry timing automatically using ML. Enable in Dashboard -> Settings -> Billing -> Subscriptions and emails. Recovers approximately 15% more than fixed-schedule retries.

### Dunning Email Sequence

| Email | Timing | Tone | Content |
|-------|--------|------|---------|
| 1 | Day 0 (failure) | Friendly alert | "Your payment did not go through. Update your card." |
| 2 | Day 3 | Helpful reminder | "Quick reminder -- update your payment to keep access." |
| 3 | Day 7 | Urgency | "Your account will be paused in 3 days. Update now." |
| 4 | Day 10 | Final warning | "Last chance to keep your account active." |

**Dunning email best practices:**
- Direct link to payment update page (no login required if possible)
- Show what they will lose (their data, their team's access)
- Do not blame ("your payment failed" not "you failed to pay")
- Include support contact for help
- Plain text performs better than designed emails for dunning

### In-App Dunning

Do not rely on email alone. Show a banner on every page load during dunning period with direct link to payment update. Allow dismiss but show again next session. Do not block the product. For final warning, use a modal showing the specific date access will end and what will be lost.

### Grace Period

| Setting | Recommendation |
|---------|---------------|
| Duration | 7-14 days after final retry |
| Access | Degraded (read-only) for B2C, full access for B2B |
| Visibility | In-app banner: "Payment past due -- update to continue" |
| Retry | Continue background retries during grace |

### Recovery Benchmarks

| Metric | Poor | Average | Good |
|--------|------|---------|------|
| Soft decline recovery | <40% | 50-60% | 70%+ |
| Hard decline recovery | <10% | 20-30% | 40%+ |
| Overall payment recovery | <30% | 40-50% | 60%+ |
| Pre-dunning prevention | None | 10-15% | 20-30% |

### Involuntary Churn by Company Stage

| Stage | Typical Involuntary Churn | Target After Optimization |
|-------|--------------------------|--------------------------|
| Early (< $1M ARR) | 3-5% of MRR/month | 1-2% |
| Growth ($1-10M ARR) | 2-4% of MRR/month | 0.5-1.5% |
| Scale ($10M+ ARR) | 1-3% of MRR/month | 0.3-0.8% |

---

## Paywall and Upgrade Optimization

### Core Principles

1. **Value before ask** -- user must have experienced real value first. Upgrade should feel like the natural next step. Timing: after the aha moment, not before.
2. **Show, do not just tell** -- demonstrate the value of paid features with previews, before/after, and concrete examples.
3. **Friction-free path** -- easy to upgrade when ready. Do not make them hunt for pricing.
4. **Respect the no** -- do not trap or pressure. Make it easy to continue free. Maintain trust for future conversion.

### Paywall Trigger Points

**Feature gates:** When user clicks a paid-only feature. Show clear explanation of why it is paid, what the feature does, a quick path to unlock, and option to continue without.

**Usage limits:** When user hits a limit. Show clear indication of limit reached and what upgrading provides. Do not block abruptly.

**Trial expiration:** Early warnings at 7, 3, and 1 day. Clear "what happens" on expiration. Summarize value received during trial.

**Time-based prompts:** After X days of free use. Gentle upgrade reminder highlighting unused paid features. Easy to dismiss.

### Paywall Types

**Feature lock paywall:** Lock icon, feature preview/screenshot, capability bullets, upgrade CTA, "Maybe Later" escape.

**Usage limit paywall:** Progress bar at 100%, show free limit vs paid limit, upgrade CTA with alternative action (e.g., "Delete a project").

**Trial expiration paywall:** Countdown of days remaining, what they will lose, what they have accomplished, upgrade CTA with "Remind me later" and "Downgrade" options.

### Paywall Screen Components

1. **Headline** -- focus on what they get: "Unlock [Feature] to [Benefit]"
2. **Value demonstration** -- preview, before/after, "With Pro you could..."
3. **Feature comparison** -- highlight key differences, current plan marked
4. **Pricing** -- clear, simple, annual vs monthly options
5. **Social proof** -- customer quotes, "X teams use this"
6. **CTA** -- specific and value-oriented: "Start Getting [Benefit]"
7. **Escape hatch** -- clear "Not now" or "Continue with Free"

### Timing and Frequency

**When to show:** After value moment and before frustration. After activation/aha moment. When hitting genuine limits.

**When NOT to show:** During onboarding (too early). When they are in a flow. Repeatedly after dismissal.

**Frequency rules:** Limit prompts per session. Cool-down of days (not hours) after dismiss. Track annoyance signals. Escalate urgency over time rather than using consistent messaging.

### Anti-Patterns

**Dark patterns to avoid:** Hiding the close button, confusing plan selection, guilt-trip copy.

**Conversion killers:** Asking before value delivered, too frequent prompts, blocking critical flows, complicated upgrade process.

### Paywall Experiments

**Trigger and timing:** Test trigger timing after aha moment vs at feature attempt. Hard gate vs soft gate (preview + prompt). In-context modal vs dedicated upgrade page.

**Pricing presentation:** Show monthly vs annual vs both with toggle. Highlight annual savings (dollar amount vs percentage). Price per day framing. Display price after trial vs emphasize "Start Free."

**Copy and messaging:** Benefit-focused vs feature-focused headlines. First person CTAs ("Start My Trial") vs second person. Include price in CTA vs separate display. Money-back guarantee messaging.

**Personalization:** Personalize copy based on features used. Highlight most-used premium features. Show usage stats. Recommend plan based on behavior.

---

## Pricing Strategy

### The Three Pricing Axes

1. **Packaging** -- what is included at each tier (features, limits, support level)
2. **Pricing metric** -- what you charge for (per user, per usage, flat fee)
3. **Price point** -- the actual dollar amounts

### Value-Based Pricing

Price based on value delivered, not cost to serve:
- **Customer's perceived value** -- the ceiling
- **Your price** -- between alternatives and perceived value
- **Next best alternative** -- the floor for differentiation
- **Your cost to serve** -- only a baseline, not the basis

### Value Metrics

The value metric is what you charge for. It should scale with the value customers receive.

| Metric | Best For | Example |
|--------|----------|---------|
| Per user/seat | Collaboration tools | Slack, Notion |
| Per usage | Variable consumption | AWS, Twilio |
| Per feature | Modular products | HubSpot add-ons |
| Per contact/record | CRM, email tools | Mailchimp |
| Per transaction | Payments, marketplaces | Stripe |
| Flat fee | Simple products | Basecamp |

Ask: "As a customer uses more of [metric], do they get more value?" If yes, it is a good value metric.

### Good-Better-Best Framework

**Good tier (Entry):** Core features, limited usage, low price. Purpose: remove barriers to entry. Target: small teams, try before you buy.

**Better tier (Recommended):** Full features, reasonable limits, anchor price. Purpose: where most customers land. Target: growing teams, serious users.

**Best tier (Premium):** Everything, advanced features, 2-3x Better price. Purpose: capture high-value customers. Target: larger teams, power users, enterprises.

### Tier Differentiation Strategies

- **Feature gating** -- basic vs advanced features
- **Usage limits** -- same features, different limits
- **Support level** -- email -> priority -> dedicated
- **Access** -- API, SSO, custom branding

### Packaging for Personas

| Persona | Size | Needs | WTP | Example Price |
|---------|------|-------|-----|--------------|
| Freelancer | 1 person | Basic features | Low | $19/mo |
| Small Team | 2-10 | Collaboration | Medium | $49/mo |
| Growing Co | 10-50 | Scale, integrations | Higher | $149/mo |
| Enterprise | 50+ | Security, support | High | Custom |

### Freemium vs Free Trial

**Freemium works when:** Product has viral/network effects, free users provide value (content, data, referrals), large market, low marginal cost to serve free users, clear upgrade trigger.

**Free trial works when:** Product needs time to demonstrate value, onboarding/setup investment required, B2B with buying committees, higher price points, product is sticky once configured.

**Trial best practices:** 7-14 days for simple products. 14-30 days for complex products. Full access (not feature-limited). Credit card upfront yields 40-50% trial-to-paid conversion vs 15-25% without.

**Hybrid approaches:** Freemium with trial of premium features. Reverse trial: start with full access, then downgrade to free tier after trial.

### Pricing Research Methods

**Van Westendorp Price Sensitivity Meter:** Four questions identifying acceptable price range:
1. At what price would you consider it so expensive you would not buy? (Too expensive)
2. At what price would you question its quality? (Too cheap)
3. At what price is it starting to get expensive but you might consider? (Expensive/high)
4. At what price is it a bargain? (Cheap/good value)

Analyze intersections: Point of Marginal Cheapness (PMC), Optimal Price Point (OPP), Indifference Price Point (IDP), Point of Marginal Expensiveness (PME). The acceptable range is PMC to PME. Need 100-300 respondents.

**MaxDiff Analysis:** Show respondents sets of 4-5 features. Ask most important and least important. Results inform tier packaging. Top 20% utility = include in all tiers (table stakes). 20-50% = use to differentiate tiers. Bottom 20% = consider cutting or premium add-on.

**Willingness to Pay Surveys:** Gabor-Granger method ("Would you buy at $X?" Yes/No, vary price) or conjoint analysis (show product bundles at different prices).

**Usage-Value Correlation:** Track which usage patterns predict retention and expansion. Identify value thresholds at which customers "get it" and at which they should pay more.

### When to Raise Prices

**Market signals:** Competitors have raised prices, prospects do not flinch at price, "It is so cheap!" feedback.

**Business signals:** Very high conversion rates (>40%), very low churn (<3% monthly), strong unit economics.

**Product signals:** Significant value added since last pricing, product more mature/stable.

**Price increase strategies:**
1. Grandfather existing customers -- new price for new customers only
2. Delayed increase -- announce 3-6 months out
3. Tied to value -- raise price but add features
4. Plan restructure -- change plans entirely

### Pricing Page Psychology

- **Anchoring:** Show higher-priced option first
- **Decoy effect:** Middle tier should be best value
- **Charm pricing:** $49 vs $50 (for value-focused segments)
- **Round pricing:** $50 vs $49 (for premium positioning)
- Recommended tier highlighted
- Monthly/annual toggle with 17-20% annual discount callout
- Money-back guarantee and customer logos for trust

### Enterprise Pricing

Add "Contact Sales" when deal sizes exceed $10k+ ARR, customers need custom contracts, or security/compliance requirements exist.

**Enterprise tier elements:** SSO/SAML, audit logs, admin controls, uptime SLA, security certifications, dedicated support, custom onboarding, training sessions.

**Enterprise pricing strategies:** Per-seat at scale (volume discounts for large teams), platform fee + usage (base fee + per-unit above threshold), value-based contracts (tied to customer revenue/outcomes).

---

## Churn Metrics and Measurement

| Metric | Formula | Target |
|--------|---------|--------|
| Monthly churn rate | Churned customers / Start-of-month customers | <5% B2C, <2% B2B |
| Revenue churn (net) | (Lost MRR - Expansion MRR) / Start MRR | Negative (net expansion) |
| Cancel flow save rate | Saved / Total cancel sessions | 25-35% |
| Offer acceptance rate | Accepted offers / Shown offers | 15-25% |
| Pause reactivation rate | Reactivated / Total paused | 60-80% |
| Dunning recovery rate | Recovered / Total failed payments | 50-60% |

**Segment churn by:** Acquisition channel (which bring stickier customers?), plan type, tenure (30/60/90 day spikes?), cancel reason (which are growing?), save offer type (which work for which segments?).

---

## CLI Scripts for Retention

All CLI tools are zero-dependency Node.js scripts (Node 18+). Set environment variables for auth and run directly.

### stripe.js

Manage subscriptions, dunning configuration, and payment retries.

```bash
# Environment
export STRIPE_API_KEY=sk_live_xxx

# List subscriptions
node stripe.js subscriptions list

# Get subscription details
node stripe.js subscriptions get --id sub_xxx

# Cancel subscription
node stripe.js subscriptions cancel --id sub_xxx

# Create subscription
node stripe.js subscriptions create --customer cus_xxx --price price_xxx

# List invoices
node stripe.js invoices list

# Preview without sending
node stripe.js subscriptions list --dry-run
```

### paddle.js

Subscription management with built-in tax handling.

```bash
# Environment
export PADDLE_API_KEY=pdl_xxx
export PADDLE_SANDBOX=true  # optional, for sandbox environment

# List subscriptions
node paddle.js subscriptions list

# Get subscription
node paddle.js subscriptions get --id sub_xxx

# List products
node paddle.js products list

# Create product
node paddle.js products create --name "Pro Plan" --tax-category saas

# List transactions
node paddle.js transactions list
```

### customer-io.js

Dunning email sequences, retention campaigns, and behavior-based messaging.

```bash
# Environment (Track API)
export CUSTOMERIO_SITE_ID=xxx
export CUSTOMERIO_API_KEY=xxx
# Environment (App API)
export CUSTOMERIO_APP_KEY=xxx

# Identify/update a customer
node customer-io.js customers identify user_123 --email user@example.com --plan pro

# Get customer attributes
node customer-io.js customers get user_123

# Track a custom event (e.g., payment_failed, subscription_cancelled)
node customer-io.js customers track-event user_123 --name payment_failed --data '{"amount": 29, "reason": "card_declined"}'

# Delete a customer
node customer-io.js customers delete user_123

# Manage segments
node customer-io.js segments list
node customer-io.js segments get 5

# Manage campaigns
node customer-io.js campaigns list
node customer-io.js campaigns get 12

# Send transactional message
node customer-io.js messages send --transactional-message-id 5 --to user@example.com --data '{"name": "John"}'
```

### intercom.js

In-app messaging, proactive support, and product tours for retention.

```bash
# Environment
export INTERCOM_API_KEY=xxx

# List contacts
node intercom.js contacts list

# Get contact
node intercom.js contacts get --id xxx

# Create contact
node intercom.js contacts create --email user@example.com --name "John Doe"

# Update contact
node intercom.js contacts update --id xxx --name "Jane Doe"

# List conversations
node intercom.js conversations list

# Create a message (for proactive outreach)
node intercom.js messages create --from admin_id --to user_id --body "Need help with anything?"

# Tag a contact
node intercom.js tags create --name "at-risk"
```

---

## Composio MCP for CRM Data

Composio provides MCP access to CRM and retention tools that lack native MCP servers.

**Setup:**
```bash
npx @composio/mcp@latest setup
```

Verify in Claude Code with `/mcp` -- confirm `composio` appears. Authenticate tools via Connect Link in browser on first use.

**Available CRM toolkits:**

| Tool | Composio Toolkit | Auth | Use For |
|------|-----------------|------|---------|
| HubSpot | `HUBSPOT` | OAuth 2.0 | Contacts, deals, companies, churn signals |
| Salesforce | `SALESFORCE` | OAuth 2.0 | SOQL queries, leads, opportunities, account health |
| ActiveCampaign | `ACTIVECAMPAIGN` | API Key | Contacts, lists, automations, retention flows |
| Klaviyo | `KLAVIYO` | API Key | Profiles, lists, campaigns, churn segments |

**Example workflows:**

Pull at-risk customer data:
```
"Get all HubSpot contacts with lifecycle stage 'customer' and last activity more than 30 days ago"
```

Cross-reference CRM with billing:
```
"Compare Salesforce opportunities with Stripe subscriptions to find accounts approaching renewal"
```

Composio handles OAuth token management, refresh, and storage. Prefer native MCP servers (Stripe, Mailchimp) when available for deeper coverage. Use Composio for OAuth-heavy tools without native MCP.

---

## Retention Platforms

| Tool | Best For | Key Feature |
|------|----------|-------------|
| Churnkey | Full cancel flow + dunning | AI-powered adaptive offers, 34% avg save rate |
| ProsperStack | Cancel flows with analytics | Advanced rules engine, Stripe/Chargebee integration |
| Raaft | Simple cancel flow builder | Easy setup, good for early-stage |
| Chargebee Retention | Chargebee customers | Native integration |

### Billing Provider Dunning Capabilities

| Provider | Smart Retries | Dunning Emails | Card Updater |
|----------|:------------:|:--------------:|:------------:|
| Stripe | Built-in | Built-in | Automatic |
| Chargebee | Built-in | Built-in | Via gateway |
| Paddle | Built-in | Built-in | Managed |
| Recurly | Built-in (ML) | Built-in | Built-in |
| Braintree | Manual config | Manual | Via gateway |
