# Ads Reference

Complete reference for paid advertising: platform selection, campaign structure, ad copy frameworks, audience targeting, creative best practices, bulk generation, platform specs, retargeting, and ad platform tooling.

---

## Platform Selection Guide

| Platform | Best For | Use When | Typical CPC |
|----------|----------|----------|-------------|
| **Google Ads** | High-intent search traffic | People actively search for your solution | $1-5 (search) |
| **Meta (Facebook/Instagram)** | Demand generation, visual products | Creating demand, strong creative assets | $0.50-3 |
| **LinkedIn** | B2B, decision-makers | Job title/company targeting matters, higher price points | $8-15+ |
| **Twitter/X** | Tech audiences, thought leadership | Audience is active on X, timely content | $0.50-4 |
| **TikTok** | Younger demographics, viral creative | Audience skews 18-34, video capacity | $0.50-2 |

---

## Campaign Structure

### Account Organization

```
Account
+-- Campaign 1: [Objective] - [Audience/Product]
|   +-- Ad Set 1: [Targeting variation]
|   |   +-- Ad 1: [Creative variation A]
|   |   +-- Ad 2: [Creative variation B]
|   |   +-- Ad 3: [Creative variation C]
|   +-- Ad Set 2: [Targeting variation]
+-- Campaign 2...
```

### Naming Conventions

```
[Platform]_[Objective]_[Audience]_[Offer]_[Date]

Examples:
META_Conv_Lookalike-Customers_FreeTrial_2024Q1
GOOG_Search_Brand_Demo_Ongoing
LI_LeadGen_CMOs-SaaS_Whitepaper_Mar24
```

### Budget Allocation

**Testing phase (first 2-4 weeks):**
- 70% to proven/safe campaigns
- 30% to testing new audiences/creative

**Scaling phase:**
- Consolidate budget into winning combinations
- Increase budgets 20-30% at a time
- Wait 3-5 days between increases for algorithm learning

---

## Ad Copy Frameworks

### Problem-Agitate-Solve (PAS)

```
[Problem statement]
[Agitate the pain]
[Introduce solution]
[CTA]
```

Example: "Spending hours on manual reporting every week? While you are buried in spreadsheets, your competitors are making decisions. [Product] automates your reports in minutes. Start your free trial."

### Before-After-Bridge (BAB)

```
[Current painful state]
[Desired future state]
[Your product as the bridge]
```

Example: "Before: Chasing down approvals across email, Slack, and spreadsheets. After: Every approval tracked, automated, and on time. [Product] connects your tools and keeps projects moving."

### Social Proof Lead

```
[Impressive stat or testimonial]
[What you do]
[CTA]
```

Example: "'We cut our reporting time by 75%.' -- Sarah K., Marketing Director. [Product] automates the reports you hate building. See how it works."

### Feature-Benefit Bridge

```
[Feature]
[So that...]
[Which means...]
```

Example: "Real-time collaboration on documents, so your team always works from the latest version, which means no more version confusion or lost work."

### Direct Response

```
[Bold claim/outcome]
[Proof point]
[CTA with urgency if genuine]
```

Example: "Cut your reporting time by 80%. Join 5,000+ marketing teams already using [Product]. Start free -- first month 50% off."

### Headline Formulas for Search Ads

| Formula | Example |
|---------|---------|
| [Keyword] + [Benefit] | "Project Management That Teams Actually Use" |
| [Action] + [Outcome] | "Automate Reports \| Save 10 Hours Weekly" |
| [Question] | "Tired of Manual Data Entry?" |
| [Number] + [Benefit] | "500+ Teams Trust [Product] for [Outcome]" |
| [Keyword] + [Differentiator] | "CRM Built for Small Teams" |
| [Price/Offer] + [Keyword] | "Free Project Management \| No Credit Card" |

### Headline Formulas for Social Ads

| Type | Example |
|------|---------|
| Outcome hook | "How we 3x'd our conversion rate" |
| Curiosity hook | "The reporting hack no one talks about" |
| Contrarian hook | "Why we stopped using [common tool]" |
| Specificity hook | "The exact template we use for..." |
| Question hook | "What if you could cut your admin time in half?" |
| Number hook | "7 ways to improve your workflow today" |
| Story hook | "We almost gave up. Then we found..." |

### CTA Variations

**Soft CTAs (awareness/consideration):** Learn More, See How It Works, Watch Demo, Get the Guide, Explore Features, Read the Case Study.

**Hard CTAs (conversion):** Start Free Trial, Get Started Free, Book a Demo, Claim Your Discount, Buy Now, Sign Up Free, Get Instant Access.

**Urgency CTAs (use when genuine):** Limited Time: 30% Off, Offer Ends [Date], Only X Spots Left, Early Bird Pricing Ends Soon.

**Action-Oriented CTAs:** Start Saving Time Today, Get Your Free Report, See Your Score, Calculate Your ROI, Build Your First Project.

### Copy Testing Priority

Test in order of impact:
1. Hook/angle (biggest impact)
2. Headline
3. Primary benefit
4. CTA
5. Supporting proof points

Test one element at a time for clean data.

---

## Audience Targeting

### Google Ads Audiences

**Search campaign targeting:**
- Exact match: [keyword] -- most precise, lower volume
- Phrase match: "keyword" -- moderate precision and volume
- Broad match: keyword -- highest volume, use with smart bidding
- Layer audiences in "observation" mode first, then switch to "targeting" for high performers
- RLSA: bid higher on past visitors searching your terms

**Display/YouTube targeting:**
- Custom intent audiences (based on recent search behavior, from your converting keywords)
- In-market audiences (people actively researching solutions)
- Affinity audiences (interests and habits, better for awareness)
- Customer match (upload email lists)
- Similar/lookalike audiences (based on customer match)

### Meta Audiences

**Core audiences (interest/demographic):**
- Layer interests with AND logic for precision
- Start broad, let algorithm optimize
- Exclude existing customers always
- Demographics: age, gender, location, language

**Custom audiences:**
- Website visitors (specific pages, time on site, frequency)
- Customer list (emails/phone numbers, 30-70% match rate, refresh regularly)
- Engagement audiences (video viewers at 25/50/75/95%, page engagers, form openers)
- App activity (installers, in-app events)

**Lookalike audiences:**
- Use high-LTV customers as source, not all customers
- Minimum 100 source users, ideally 1,000+
- 1% = most similar, smallest reach
- 1-3% = good balance for most
- 3-5% = broader, good for scale
- Exclude the source audience

### LinkedIn Audiences

**Job-based targeting:**
- Job titles (be specific: CMO vs "Marketing")
- Job functions (broader, combine with seniority)
- Seniority levels (Entry, Senior, Manager, Director, VP, CXO)
- Skills (self-reported, less reliable, good for technical roles)

**Company-based targeting:**
- Company size: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+
- Industry classification
- Company names for ABM (minimum 300 companies recommended)
- Company growth rate (hiring rapidly = budget available)

**High-performing combinations:**

| Use Case | Targeting Combination |
|----------|----------------------|
| Enterprise sales | Company size 1000+ + VP/CXO + Industry |
| SMB sales | Company size 11-200 + Manager/Director + Function |
| Developer tools | Skills + Job function + Company type |
| ABM campaigns | Company list + Decision-maker titles |
| Broad awareness | Industry + Seniority + Geography |

### Twitter/X Audiences

- Follower lookalikes of relevant accounts (works well)
- Interest categories
- Keywords in tweets (catches active conversations)
- Conversation topics
- Tailored audiences (your lists)
- Lower CPMs than LinkedIn/Meta, less precise

### TikTok Audiences

- Demographics (age, gender, location)
- Interests (TikTok categories, broad)
- Behaviors (video interactions)
- Device (iOS/Android)
- Custom audiences (pixel, customer file)
- Lookalike audiences
- Creative matters more than targeting on TikTok

### Audience Size Guidelines

| Platform | Minimum Recommended | Ideal Range |
|----------|-------------------|-------------|
| Google Search | 1,000+ searches/mo | 5,000-50,000 |
| Google Display | 100,000+ | 500K-5M |
| Meta | 100,000+ | 500K-10M |
| LinkedIn | 50,000+ | 100K-500K |
| Twitter/X | 50,000+ | 100K-1M |
| TikTok | 100,000+ | 1M+ |

Too narrow = expensive, slow learning. Too broad = wasted spend, poor relevance.

### Exclusion Strategy

Always exclude:
- Existing customers (unless upsell campaign)
- Recent converters (7-14 day window)
- Bounced visitors (<10 seconds on site)
- Employees (by company or email list)
- Irrelevant page visitors (careers, support)
- Competitors (if identifiable)

---

## Creative Best Practices

### Image Ads

- Clear product screenshots showing UI
- Before/after comparisons
- Stats and numbers as focal point
- Human faces (real, not stock)
- Bold, readable text overlay (keep under 20%)

### Video Ads Structure (15-30 seconds)

1. **Hook (0-3 sec):** Pattern interrupt, question, or bold statement. First 3 seconds determine if they watch.
2. **Problem (3-8 sec):** Relatable pain point.
3. **Solution (8-20 sec):** Show product/benefit.
4. **CTA (20-30 sec):** Clear next step.

**Production tips:**
- Captions always (85% watch without sound)
- Vertical for Stories/Reels, square for feed
- Native feel outperforms polished
- TikTok: use trending sounds and formats

### Creative Testing Hierarchy

1. Concept/angle (biggest impact)
2. Hook/headline
3. Visual style
4. Body copy
5. CTA

---

## Bulk Ad Creative Generation

### Mode 1: Generate from Scratch

**Step 1 -- Define angles.** Establish 3-5 distinct angles before writing headlines. Each angle taps into a different motivation.

| Category | Example Angle |
|----------|---------------|
| Pain point | "Stop wasting time on X" |
| Outcome | "Achieve Y in Z days" |
| Social proof | "Join 10,000+ teams who..." |
| Curiosity | "The X secret top companies use" |
| Comparison | "Unlike X, we do Y" |
| Urgency | "Limited time: get X free" |
| Identity | "Built for [specific role/type]" |
| Contrarian | "Why [common practice] does not work" |

**Step 2 -- Generate variations per angle.** For each angle, produce multiple variations. Vary word choice (synonyms, active vs passive), specificity (numbers vs general), tone (direct vs question vs command), and structure (short punch vs full benefit statement).

**Step 3 -- Validate against specs.** Check every piece of creative against platform character limits. Flag anything over and provide trimmed alternative.

**Step 4 -- Organize for upload.** Present in structured format mapping to platform upload requirements.

### Mode 2: Iterate from Performance Data

**Step 1 -- Analyze winners.** Look at top performers by CTR, conversion rate, or ROAS. Identify winning themes, structures, word patterns, and character utilization.

**Step 2 -- Analyze losers.** Identify themes that fall flat, common patterns in low performers (too generic, too long, wrong tone).

**Step 3 -- Generate new variations.** Double down on winning themes with fresh phrasing. Extend winning angles into new variations. Test 1-2 new angles not yet explored. Avoid patterns from underperformers.

**Step 4 -- Document the iteration.** Track what was learned, what is being tested, winning patterns, new angles, retired angles.

### Batch Generation Workflow

For large-scale production (100+ variations per cycle):

1. **Break into sub-tasks:** Headline generation (click-through), description generation (conversion), primary text generation (engagement for Meta/LinkedIn).
2. **Generate in waves:** Wave 1 core angles (3-5 angles, 5 variations each), Wave 2 extended variations on top 2 angles, Wave 3 wild card angles.
3. **Quality filter:** Remove over-limit, remove duplicates, flag policy violations, verify headline/description combinations make sense.

### Writing Quality Standards

**Strong headlines:** Specific ("Cut reporting time 75%") over vague ("Save time"). Benefits ("Ship code faster") over features ("CI/CD pipeline"). Active voice. Include numbers when possible.

**Descriptions that convert:** Complement headlines, do not repeat them. Add proof points. Handle objections ("No credit card required"). Reinforce CTAs. Add urgency when genuine.

**Avoid:** Jargon, claims without specificity ("Best," "Leading"), all caps, clickbait the landing page cannot deliver on, generic descriptions.

---

## Platform Specs with Character Limits

### Google Ads -- Responsive Search Ads (RSAs)

| Element | Limit | Quantity |
|---------|-------|----------|
| Headline | 30 characters | 3 minimum, 15 maximum |
| Description | 90 characters | 2 minimum, 4 maximum |
| Display URL path | 15 characters each | 2 paths |

**RSA rules:**
- Headlines must make sense independently and in any combination
- Pin headlines to positions only when necessary (reduces optimization)
- Include at least one keyword-focused, one benefit-focused, and one CTA headline
- Google selects up to 3 headlines and 2 descriptions to show

**Recommended headline mix (15 headlines):**
- 3-4 keyword-focused (match search intent)
- 3-4 benefit-focused (what they get)
- 2-3 social proof (numbers, awards)
- 2-3 CTA-focused (action to take)
- 1-2 differentiators (why you over competitors)
- 1 brand name headline

**Pinning strategy:** Pin brand name to position 1 if required. Pin strongest CTA to position 2 or 3. Leave most unpinned for ML optimization.

### Google Ads -- Performance Max

| Element | Limit | Quantity |
|---------|-------|----------|
| Headline | 30 characters | 5 required |
| Long headline | 90 characters | 5 required |
| Description | 90 characters | 1 required, 5 max |
| Business name | 25 characters | Required |

### Meta Ads (Facebook/Instagram)

| Element | Recommended | Maximum | Notes |
|---------|-------------|---------|-------|
| Primary text | 125 chars visible | 2,200 chars | Front-load the hook; truncated after ~125 |
| Headline | 40 chars | 255 chars | Below the image |
| Description | 30 chars | 255 chars | Below headline; may not show |
| URL display link | 40 chars | -- | Optional |

**Placement-specific:** Feed shows all elements. Stories/Reels: keep primary text under 72 chars. Right column: only headline visible.

**Best practices:** Front-load hook in first 125 chars. Line breaks for readability. Emojis: test but 1-2 max. Questions increase engagement.

### LinkedIn Ads

| Element | Recommended | Maximum | Notes |
|---------|-------------|---------|-------|
| Intro text | 150 chars | 600 chars | Above the image; truncated after ~150 |
| Headline | 70 chars | 200 chars | Below the image |
| Description | 100 chars | 300 chars | Only on Audience Network |

**Carousel:** Intro text 255 chars, card headline 45 chars, 2-10 cards.

**Message Ad (InMail):** Subject 60 chars, body 1,500 chars, CTA button 20 chars.

**LinkedIn guidelines:** Professional but not boring. Job-specific language. Statistics and data perform well. Avoid consumer hype. First-person peer testimonials resonate.

### TikTok Ads

| Element | Recommended | Maximum | Notes |
|---------|-------------|---------|-------|
| Ad text | 80 chars | 100 chars | Above the video |
| Display name | -- | 40 chars | Brand name |
| CTA button | Platform options | Predefined | Select from TikTok list |

**TikTok guidelines:** Native content outperforms polished ads. First 2 seconds determine if they watch. Trending sounds and formats. Text overlay essential. Vertical 9:16 only.

### Twitter/X Ads

| Element | Limit | Notes |
|---------|-------|-------|
| Tweet text | 280 characters | Full tweet with image/video |
| Card headline | 70 characters | Website card |
| Card description | 200 characters | Website card |

**Twitter/X guidelines:** Conversational, casual tone. Short sentences. One clear message. Hashtags: 1-2 max (0 often better for ads).

### Character Counting Tips

- Spaces count as characters on all platforms
- Emojis count as 1-2 characters depending on platform
- Dynamic keyword insertion can exceed limits -- set safe defaults
- Always verify in platform ad preview before launching

### Multi-Platform Adaptation

Start with the most restrictive format and expand:
1. Google Search headlines (30 chars) -- tightest messaging
2. Meta headlines (40 chars) -- add a word or two
3. LinkedIn intro text (150 chars) -- add context and proof
4. Meta primary text (125+ chars) -- full hook and value prop

---

## Performance-Based Iteration Workflow

```
Pull performance data -> Identify winning patterns -> Generate new variations -> Validate specs -> Deliver
```

### Pulling Performance Data

Use CLI scripts to pull ad performance data:

```bash
# Google Ads -- campaign performance last 30 days
node google-ads.js campaigns performance --days 30

# Google Ads -- ad-level performance
node google-ads.js reports get --type ad_performance --date-range last_30_days

# Meta Ads -- campaign insights
node meta-ads.js campaigns insights --id camp_xxx --date-preset last_30d

# LinkedIn Ads -- campaign analytics
node linkedin-ads.js analytics get --campaign-id xxx --date-range last_30_days

# TikTok Ads -- campaign reports
node tiktok-ads.js reports get --advertiser-id xxx --date-range last_30_days
```

### Analyzing Results

Identify from top performers:
- Winning themes (topics, pain points in top ads)
- Winning structures (questions, statements, commands, numbers)
- Winning word patterns (specific recurring words/phrases)
- Character utilization (shorter or longer performers)

Identify from losers:
- Themes that fall flat
- Common patterns (too generic, too long, wrong tone)

### Generating New Variations

- Double down on winning themes with fresh phrasing
- Extend winning angles into new variations
- Test 1-2 new unexplored angles
- Avoid patterns from underperformers
- Allow 1,000+ impressions before judging any creative
- Retire creative based on data, not gut feeling

---

## Retargeting Strategies

### Funnel-Based Approach

| Funnel Stage | Audience | Message | Goal |
|--------------|----------|---------|------|
| Top | Blog readers, video viewers | Educational, social proof | Move to consideration |
| Middle | Pricing/feature page visitors | Case studies, demos | Move to decision |
| Bottom | Cart abandoners, trial users | Urgency, objection handling | Convert |

### Retargeting Windows

| Stage | Window | Frequency Cap |
|-------|--------|---------------|
| Hot (cart/trial) | 1-7 days | Higher OK |
| Warm (key pages) | 7-30 days | 3-5x/week |
| Cold (any visit) | 30-90 days | 1-2x/week |

### Exclusions for Retargeting

- Existing customers (unless upsell)
- Recent converters (7-14 day window)
- Bounced visitors (<10 seconds)
- Irrelevant pages (careers, support)

---

## Ad Visual Generation

### Image Generation Tools

| Tool | Best For | Pricing |
|------|----------|---------|
| Nano Banana Pro (Gemini) | High-quality ad images, text rendering | ~$0.04-0.24/image |
| Flux (Black Forest Labs) | Photorealistic, brand-consistent variations | ~$0.01-0.06/image |
| Ideogram | Ad banners with text overlays (~90% text accuracy) | ~$0.006-0.06/image |
| DALL-E 3 (OpenAI) | General image generation | Via API |

**Use Flux** for 50+ variations with consistent product identity. **Use Ideogram** for banners with headline text baked in. **Use Nano Banana Pro** for quick iterations on existing images.

### Video Generation Tools

| Tool | Max Length | Audio | Resolution | Best For |
|------|-----------|-------|------------|---------|
| Veo 3.1 (Google) | 60 sec | Native | 1080p/4K | Vertical social video |
| Kling 2.6 (Kuaishou) | 3 min | Native | 1080p | Longer cinematic |
| Runway Gen-4 | 10 sec | No | 1080p | Controlled, consistent |
| Sora 2 (OpenAI) | 60 sec | Native | 1080p | Dialogue-heavy |
| Seedance 2.0 (ByteDance) | 20 sec | Native | 2K | Affordable high-volume |
| Higgsfield | Varies | Yes | 1080p | Social, mobile-first |

### Voice Generation for Ad Voiceovers

| Tool | Quality | Cloning | Languages | Price/1K chars |
|------|---------|---------|-----------|----------------|
| ElevenLabs | Best | Yes | 29+ | $0.12-0.30 |
| OpenAI TTS | Good | No | 13+ | $0.015-0.030 |
| Cartesia Sonic | Very good | No | 15+ | ~$0.03/min |
| Voicebox (open source) | Good | Yes (local) | 2+ | Free |

### Code-Based Video: Remotion

For templated, data-driven video ads at scale. React + TypeScript. Deterministic, pixel-perfect, brand-consistent.

**Use cases:** Dynamic product ads from JSON data, A/B test video variations with different headlines/CTAs, personalized outreach videos, batch production across aspect ratios (1:1, 9:16, 16:9).

**Recommended workflow for scaled production:**
1. Generate hero creative with AI tools (exploratory, high-quality)
2. Build Remotion templates based on winning patterns
3. Batch produce variations with Remotion using data feeds
4. Iterate -- AI for new angles, Remotion for scale

### Cost Comparison for 100 Ad Variations

| Approach | Tool | Approximate Cost |
|----------|------|-----------------|
| 100 static images | Flux Dev | ~$1-2 |
| 100 static images | Nano Banana Pro | ~$4-24 |
| 100 static images | Ideogram API | ~$6 |
| 100 x 15-sec videos | Veo 3.1 Fast | ~$225 |
| 100 x 15-sec videos | Remotion (templated) | ~$0 (self-hosted) |
| 10 hero videos + 90 templated | Veo + Remotion | ~$22 + render time |

### Platform Image Specs

| Platform | Placement | Aspect Ratio | Size |
|----------|-----------|-------------|------|
| Meta Feed | Single image | 1:1 | 1080x1080 |
| Meta Stories/Reels | Vertical | 9:16 | 1080x1920 |
| Meta Carousel | Square | 1:1 | 1080x1080 |
| Google Display | Landscape | 1.91:1 | 1200x628 |
| Google Display | Square | 1:1 | 1200x1200 |
| LinkedIn Feed | Landscape | 1.91:1 | 1200x627 |
| LinkedIn Feed | Square | 1:1 | 1200x1200 |
| TikTok Feed | Vertical | 9:16 | 1080x1920 |
| Twitter/X Feed | Landscape | 16:9 | 1200x675 |
| Twitter/X Card | Landscape | 1.91:1 | 800x418 |

---

## Campaign Optimization

### Key Metrics by Objective

| Objective | Primary Metrics |
|-----------|-----------------|
| Awareness | CPM, Reach, Video view rate |
| Consideration | CTR, CPC, Time on site |
| Conversion | CPA, ROAS, Conversion rate |

### Optimization Levers

**If CPA is too high:**
1. Check landing page (is the problem post-click?)
2. Tighten audience targeting
3. Test new creative angles
4. Improve ad relevance/quality score
5. Adjust bid strategy

**If CTR is low:** Creative is not resonating (test new hooks), audience mismatch (refine targeting), ad fatigue (refresh creative).

**If CPM is high:** Audience too narrow (expand targeting), high competition (different placements), low relevance score (improve creative fit).

### Bid Strategy Progression

1. Start with manual or cost caps
2. Gather conversion data (50+ conversions)
3. Switch to automated with targets based on historical data
4. Monitor and adjust targets

### Attribution

- Platform attribution is inflated
- Use UTM parameters consistently
- Compare platform data to GA4
- Look at blended CAC, not just platform CPA

---

## CLI Scripts for Ad Platforms

All CLI tools are zero-dependency Node.js scripts (Node 18+). Set environment variables and run directly.

### google-ads.js

Campaign management, performance reporting, and optimization.

```bash
# Environment
export GOOGLE_ADS_TOKEN=xxx
export GOOGLE_ADS_DEVELOPER_TOKEN=xxx
export GOOGLE_ADS_CUSTOMER_ID=xxx

# Get account info
node google-ads.js account info

# List campaigns
node google-ads.js campaigns list

# Get campaign performance (last 30 days)
node google-ads.js campaigns performance --days 30

# Pause a campaign
node google-ads.js campaigns pause --id 12345

# Get ad group performance
node google-ads.js adgroups performance --days 30

# Get keyword performance
node google-ads.js keywords performance --days 30

# Pull ad-level reports
node google-ads.js reports get --type ad_performance --date-range last_30_days

# Preview without making changes
node google-ads.js campaigns list --dry-run
```

### meta-ads.js

Meta (Facebook/Instagram) campaign management and insights.

```bash
# Environment
export META_ACCESS_TOKEN=xxx
export META_AD_ACCOUNT_ID=act_xxx

# List ad accounts
node meta-ads.js accounts list

# List campaigns
node meta-ads.js campaigns list

# Get campaign insights
node meta-ads.js campaigns insights --id camp_xxx --date-preset last_30d

# Create campaign
node meta-ads.js campaigns create --name "Q1 Trial Campaign" --objective CONVERSIONS

# List ad sets
node meta-ads.js adsets list --campaign-id camp_xxx

# Get ad set insights
node meta-ads.js adsets insights --id adset_xxx

# List ads
node meta-ads.js ads list --adset-id adset_xxx
```

### linkedin-ads.js

B2B advertising with job title and company targeting.

```bash
# Environment
export LINKEDIN_ACCESS_TOKEN=xxx

# List ad accounts
node linkedin-ads.js accounts list

# List campaigns
node linkedin-ads.js campaigns list --account-id 12345

# Create campaign
node linkedin-ads.js campaigns create --account-id 12345 --name "CMO Targeting" --campaign-group-id 67890 --cost-type CPC --unit-cost 10.00

# Get campaign analytics
node linkedin-ads.js analytics get --campaign-id xxx --date-range last_30_days

# List creatives
node linkedin-ads.js creatives list --campaign-id xxx
```

### tiktok-ads.js

Short-form video advertising for younger demographics.

```bash
# Environment
export TIKTOK_ACCESS_TOKEN=xxx
export TIKTOK_ADVERTISER_ID=xxx

# Get advertiser info
node tiktok-ads.js advertiser info

# List campaigns
node tiktok-ads.js campaigns list

# Create campaign
node tiktok-ads.js campaigns create --name "App Install Q1" --objective APP_INSTALL --budget-mode BUDGET_MODE_DAY --budget 100

# List ad groups
node tiktok-ads.js adgroups list

# Get reports
node tiktok-ads.js reports get --date-range last_30_days

# Preview without sending
node tiktok-ads.js campaigns list --dry-run
```

---

## Composio MCP for Ad Platforms

Composio adds MCP access to ad platforms that lack native MCP servers, handling OAuth token management.

**Setup:**
```bash
npx @composio/mcp@latest setup
```

Verify in Claude Code with `/mcp`. Authenticate each platform via Connect Link on first use.

**Available ad platform toolkits:**

| Tool | Composio Toolkit | Auth | Coverage |
|------|-----------------|------|----------|
| Meta Ads | `FACEBOOKADS` | OAuth 2.0 | Campaigns, ad sets, insights |
| LinkedIn Ads | `LINKEDIN` | OAuth 2.0 | Campaigns, analytics, company pages |
| Google Ads | `GOOGLEADS` | OAuth 2.0 | Alternative to native MCP |

**Prefer native MCP** for Google Ads (deeper coverage). Use Composio for Meta Ads and LinkedIn Ads which lack native MCP servers.

**Example workflows:**

Cross-platform ad reporting:
```
"Compare my Meta Ads and LinkedIn Ads spend this month"
```

Pull performance data for creative iteration:
```
"Get the top 10 performing Meta ad creatives by CTR from the last 30 days"
```

Campaign management:
```
"Pause all LinkedIn campaigns with CPA above $50 in the last 7 days"
```

---

## Platform Setup Checklists

### Google Ads Pre-Launch

- [ ] Conversion tracking tested with real conversion
- [ ] Google Analytics 4 linked with auto-tagging
- [ ] Remarketing audiences created (all visitors, key pages, converters)
- [ ] Customer match lists uploaded
- [ ] Negative keyword lists created (free, jobs, careers, reviews, complaints)
- [ ] Ad extensions configured (sitelinks, callouts, structured snippets)
- [ ] Brand campaign running (protect branded terms)
- [ ] Location and language targeting set

### Meta Ads Pre-Launch

- [ ] Business Manager verified
- [ ] Meta Pixel + Conversions API (CAPI) configured
- [ ] Domain verified and aggregated events configured
- [ ] Top 8 events prioritized for iOS 14+
- [ ] Custom audiences created (visitors, video viewers, engagers, customer list)
- [ ] Lookalike audiences created (1%, 1-3%)
- [ ] Images in correct sizes (1080x1080, 1080x1920, 1200x628)
- [ ] UTM parameters in all URLs
- [ ] Special Ad Categories declared if applicable

### LinkedIn Ads Pre-Launch

- [ ] Insight Tag installed and verified
- [ ] Conversion tracking configured
- [ ] Matched Audiences created (website retargeting, company list, contact list)
- [ ] Lead gen form templates created (if using)
- [ ] Budget validated for LinkedIn CPCs ($8-15+ typical)
- [ ] Audience size validated (50K+ recommended)
- [ ] Images in correct sizes (1200x627 or 1080x1080)

### Universal Pre-Launch

- [ ] Conversion tracking tested with real conversion
- [ ] Landing page loads fast (<3 seconds)
- [ ] Landing page mobile-friendly
- [ ] UTM parameters working
- [ ] Budget set correctly (daily vs lifetime)
- [ ] Targeting matches intended audience
- [ ] Team notified of launch
- [ ] Reporting dashboard ready

---

## Common Mistakes to Avoid

### Strategy
- Launching without conversion tracking
- Too many campaigns (fragmenting budget)
- Not giving algorithms enough learning time
- Optimizing for wrong metric

### Targeting
- Audiences too narrow or too broad
- Not excluding existing customers
- Overlapping audiences competing with each other

### Creative
- Only one ad per ad set (need 3+ variations)
- Not refreshing creative (fatigue after 1,000+ impressions)
- Mismatch between ad and landing page
- All variations sound the same (vary angles, not just words)
- Writing headlines that only work together (RSAs combine randomly)
- Ignoring character limits (platforms truncate without warning)
- No CTA headlines in RSAs
- Retiring creative too early (allow 1,000+ impressions)
- Testing too many things at once

### Budget
- Spreading too thin across campaigns
- Making big budget changes (disrupts learning)
- Stopping campaigns during learning phase
