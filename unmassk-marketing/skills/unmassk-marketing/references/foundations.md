# Marketing Foundations Reference

Complete reference for product context, mental models, psychology, and marketing ideas. Use this before any marketing task to ground strategy in positioning, psychology, and proven tactics.

---

## Product Marketing Context

### Purpose

Create and maintain `.agents/product-marketing-context.md` — a single document capturing all foundational positioning and messaging. Every other marketing task references this file to avoid repeating information.

### Workflow

1. Check if `.agents/product-marketing-context.md` exists. Also check `.claude/product-marketing-context.md` for legacy setups.
2. If it exists: read it, summarize what is captured, ask which sections to update.
3. If it does not exist, offer two paths:
   - **Auto-draft from codebase** (recommended): scan README, landing pages, marketing copy, package.json, meta descriptions. Draft a V1 and iterate with the user.
   - **Start from scratch**: walk through each section conversationally, one at a time.
4. Push for verbatim customer language — exact phrases are more valuable than polished descriptions.

### The 12-Section Template

#### 1. Product Overview
- One-line description
- What it does (2-3 sentences)
- Product category (what "shelf" customers search on)
- Product type (SaaS, marketplace, e-commerce, service, etc.)
- Business model and pricing

#### 2. Target Audience
- Target company type (industry, size, stage)
- Target decision-makers (roles, departments)
- Primary use case (the main problem solved)
- Jobs to be done (2-3 things customers "hire" the product for)
- Specific use cases or scenarios

#### 3. Personas (B2B only)
Capture for each stakeholder (User, Champion, Decision Maker, Financial Buyer, Technical Influencer):
- What each cares about
- Their specific challenge
- The value promised to them

#### 4. Problems and Pain Points
- Core challenge before finding the product
- Why current solutions fall short
- Cost (time, money, missed opportunities)
- Emotional tension (stress, fear, doubt)

#### 5. Competitive Landscape
- **Direct competitors**: same solution, same problem
- **Secondary competitors**: different solution, same problem
- **Indirect competitors**: conflicting approach entirely
- How each falls short for the target customer

#### 6. Differentiation
- Key differentiators (capabilities alternatives lack)
- How the product solves it differently
- Why that approach is better (concrete benefits)
- Why customers choose this product over alternatives

#### 7. Objections and Anti-Personas
- Top 3 objections heard in sales and how to address each
- Who is NOT a good fit (anti-persona)

#### 8. Switching Dynamics (JTBD Four Forces)
- **Push**: frustrations driving them away from current solution
- **Pull**: what attracts them to this product
- **Habit**: what keeps them stuck with current approach
- **Anxiety**: what worries them about switching

#### 9. Customer Language
- How customers describe the problem (verbatim quotes)
- How they describe the solution (verbatim quotes)
- Words and phrases to use
- Words and phrases to avoid
- Glossary of product-specific terms

#### 10. Brand Voice
- Tone (professional, casual, playful, etc.)
- Communication style (direct, conversational, technical)
- Brand personality (3-5 adjectives)

#### 11. Proof Points
- Key metrics or results to cite
- Notable customers and logos
- Testimonial snippets
- Main value themes with supporting evidence

#### 12. Goals
- Primary business goal
- Key conversion action (what visitors should do)
- Current metrics (if known)

### Tips for Gathering Context
- Ask "What is the number one frustration that brings them to the product?" not generic questions
- Capture exact words from real customers
- Ask for examples to unlock better answers
- Validate and summarize each section before moving on
- Skip sections that do not apply (e.g., Personas for B2C)

---

## Mental Models and Psychology

### Foundational Thinking Models (14 Models)

Use these to sharpen strategy and solve the right problems.

| Model | Core Principle | Marketing Application |
|-------|---------------|----------------------|
| First Principles | Break problems to basic truths, build from there | Do not copy competitors blindly. Ask "why" five times to find root causes. |
| Jobs to Be Done | People hire products for outcomes, not features | Frame around the job accomplished. "A drill buyer wants a hole." |
| Circle of Competence | Stay where genuine expertise exists | Double down on channels with real competitive advantage. |
| Inversion | Ask "What guarantees failure?" then avoid those things | List everything that kills a campaign (confusing messaging, wrong audience, slow pages), then prevent each. |
| Occam's Razor | Simplest explanation is usually correct | Check the obvious first (broken form, page speed) before assuming complex attribution issues. |
| Pareto Principle (80/20) | 80% of results come from 20% of efforts | Find the 20% of channels, customers, or content driving 80% of results. Cut the rest. |
| Local vs. Global Optima | Best nearby is not best overall | Optimizing email subject lines (local) is pointless if email is the wrong channel (global). Zoom out first. |
| Theory of Constraints | Every system has one bottleneck | If the funnel converts well but traffic is low, fix traffic first. |
| Opportunity Cost | Every choice costs what you give up | Time on a low-ROI channel is time not spent on high-ROI activities. |
| Diminishing Returns | Additional investment yields smaller gains after a point | The 10th blog post will not have the same impact as the first. Know when to diversify. |
| Second-Order Thinking | Consider effects of effects | A flash sale boosts revenue (first order) but may train customers to wait for discounts (second order). |
| Map vs. Territory | Models represent reality but are not reality | The customer persona is useful but real customers are more complex. Stay in touch with actual users. |
| Probabilistic Thinking | Think in probabilities, not certainties | Spread risk. Plan for scenarios where the primary strategy underperforms. |
| Barbell Strategy | Combine extreme safety with small high-risk bets | 80% budget on proven channels, 20% on experimental bets. Avoid the mediocre middle. |

### Buyer Psychology Models (22 Models)

These explain how customers think, decide, and behave.

**Fundamental Attribution Error** — People attribute behavior to character, not circumstances. When customers do not convert, examine the process before blaming them.

**Mere Exposure Effect** — Familiarity breeds liking. Consistent brand presence across channels builds preference over time.

**Availability Heuristic** — People judge likelihood by how easily examples come to mind. Case studies and testimonials make success feel achievable.

**Confirmation Bias** — People seek information confirming existing beliefs. Align messaging with what the audience already believes. Fighting beliefs head-on rarely works.

**The Lindy Effect** — The longer something has survived, the longer it will likely continue. Proven marketing principles (clear value props, social proof) outlast trendy tactics.

**Mimetic Desire** — People want things because others want them. Waitlists, exclusivity, and social proof trigger mimetic desire.

**Sunk Cost Fallacy** — People continue investing because of past investment. Kill underperforming campaigns regardless of past spend.

**Endowment Effect** — People value things more once they own them. Free trials and freemium models make users reluctant to give up the product.

**IKEA Effect** — People value things more when they built them. Let customers customize, configure, or build. Their investment increases commitment.

**Zero-Price Effect** — "Free" is psychologically different from any price. Free tiers, trials, and shipping have disproportionate appeal. The jump from $1 to $0 is bigger than $2 to $1.

**Hyperbolic Discounting / Present Bias** — People strongly prefer immediate rewards. Emphasize "Start saving time today" over "You will see ROI in 6 months."

**Status-Quo Bias** — People prefer the current state. Reduce friction to switch. Make the transition feel safe: "Import your data in one click."

**Default Effect** — People accept pre-selected options. Pre-select the recommended plan. Opt-out beats opt-in (ethically applied).

**Paradox of Choice** — Too many options paralyze. Three pricing tiers beat seven. Recommend a single "best for most" option.

**Goal-Gradient Effect** — People accelerate as they approach a goal. Show progress bars, completion percentages, and "almost there" messaging.

**Peak-End Rule** — People judge experiences by the best/worst moment and the ending. Design memorable peaks (surprise upgrades) and strong endings (thank-you pages, follow-ups).

**Zeigarnik Effect** — Unfinished tasks occupy the mind. "You are 80% done" creates pull to finish. Incomplete profiles and abandoned carts leverage this.

**Pratfall Effect** — Competent entities become more likable with a small flaw. Admitting "We are not the cheapest, but..." increases trust and differentiation.

**Curse of Knowledge** — Experts cannot imagine not knowing. Test copy with people unfamiliar with the space.

**Mental Accounting** — People treat money differently by category. "$3/day" feels different from "$90/month" even though identical.

**Regret Aversion** — People avoid actions that might cause regret. Money-back guarantees, free trials, and "no commitment" messaging reduce fear.

**Bandwagon Effect / Social Proof** — People follow what others do. Show customer counts, testimonials, logos, reviews, and "trending" indicators.

### Influence and Persuasion Models (13 Models)

Use these to ethically influence customer decisions.

**Reciprocity Principle** — Give first (free content, tools, generous free tiers). People feel obligated to return favors.

**Commitment and Consistency** — Get small commitments first (email signup, free trial). People who take one step are more likely to take the next.

**Authority Bias** — People defer to experts. Feature expert endorsements, certifications, "featured in" logos, and thought leadership.

**Liking / Similarity Bias** — People say yes to those they like. Use relatable spokespeople and community language. "Built by marketers for marketers."

**Unity Principle** — Shared identity drives influence. Position the brand as part of the customer's tribe with insider language and shared values.

**Scarcity / Urgency** — Limited availability increases perceived value. Limited-time offers and exclusive access create urgency. Only use when genuine.

**Foot-in-the-Door** — Small request first, then escalate. Free trial, then paid plan, then annual plan, then enterprise.

**Door-in-the-Face** — Start with an unreasonably large ask, then retreat. Show enterprise pricing first, then reveal the affordable starter plan.

**Loss Aversion / Prospect Theory** — Losses hurt twice as much as gains feel good. Frame in terms of what they lose by not acting.

**Anchoring Effect** — The first number seen heavily influences judgment. Show the higher price first to anchor expectations.

**Decoy Effect** — A third inferior option makes the preferred option look better. A "decoy" pricing tier makes the target tier the obvious choice.

**Framing Effect** — Same facts, different perception. "90% success rate" versus "10% failure rate" feel different. Frame positively.

**Contrast Effect** — Things seem different depending on comparison. Show the "before" state clearly to make the "after" vivid.

### Pricing Psychology (5 Models)

**Charm Pricing / Left-Digit Effect** — $99 feels much cheaper than $100. Use .99 endings for value-focused products.

**Rounded-Price (Fluency) Effect** — Round numbers feel premium. Use $500/month for premium products, $497/month for value products.

**Rule of 100** — Under $100: percentage discounts seem larger ("20% off"). Over $100: absolute discounts seem larger ("$50 off").

**Price Relativity / Good-Better-Best** — Three tiers where the middle is the target. The expensive tier makes it look reasonable; the cheap tier anchors.

**Mental Accounting (Pricing)** — "$1/day" feels cheaper than "$30/month." "Less than your morning coffee" reframes the expense.

### Design and Delivery Models (10 Models)

**Hick's Law** — More choices equal slower decisions equal more abandonment. One clear CTA beats three.

**AIDA Funnel** — Attention, Interest, Desire, Action. Structure pages and campaigns to move through each stage.

**Rule of 7** — Prospects need roughly 7 touchpoints before converting. Build multi-touch campaigns. Retargeting, email sequences, and consistent presence compound.

**Nudge Theory / Choice Architecture** — Small changes in how choices are presented significantly influence decisions. Default selections, strategic ordering, friction reduction.

**BJ Fogg Behavior Model** — Behavior = Motivation x Ability x Prompt. All three must be present. Design for all three.

**EAST Framework** — Make desired behaviors Easy, Attractive, Social, Timely.

**COM-B Model** — Behavior requires Capability, Opportunity, Motivation. Can they do it? Is the path clear? Do they want to?

**Activation Energy** — High starting friction prevents action. Pre-fill forms, offer templates, show quick wins. Make the first step trivially easy.

**North Star Metric** — One metric capturing the core value delivered. Identify it and align all efforts toward it.

**The Cobra Effect** — When incentives backfire. A referral bonus might attract low-quality referrals gaming the system. Test incentive structures.

### Growth and Scaling Models (8 Models)

**Feedback Loops** — Output becomes input. More users lead to more content, better SEO, and more users. Identify and strengthen positive loops.

**Compounding** — Small consistent gains accumulate exponentially. Content, SEO, and brand building compound over time.

**Network Effects** — Product becomes more valuable with more users. Design features that improve with adoption: shared workspaces, integrations, communities.

**Flywheel Effect** — Content leads to traffic, leads, customers, case studies, and more content. Each element powers the next.

**Switching Costs** — High switching costs create retention. Increase ethically: integrations, data accumulation, workflow customization, team adoption.

**Exploration vs. Exploitation** — Balance trying new things with optimizing what works. Do not abandon working channels for shiny new ones.

**Critical Mass / Tipping Point** — Focus resources on reaching critical mass in one segment before expanding. Depth before breadth.

**Survivorship Bias** — The viral hit you copy had 99 failures you never saw. Study failed campaigns, not just successful ones.

### Quick Reference: Challenge to Models

| Challenge | Relevant Models |
|-----------|----------------|
| Low conversions | Hick's Law, Activation Energy, BJ Fogg, Friction, EAST |
| Price objections | Anchoring, Framing, Mental Accounting, Loss Aversion, Rule of 100 |
| Building trust | Authority, Social Proof, Reciprocity, Pratfall Effect, Mere Exposure |
| Increasing urgency | Scarcity, Loss Aversion, Zeigarnik Effect, Hyperbolic Discounting |
| Retention and churn | Endowment Effect, Switching Costs, Status-Quo Bias, IKEA Effect |
| Growth stalling | Theory of Constraints, Local vs. Global Optima, Compounding, Flywheel |
| Decision paralysis | Paradox of Choice, Default Effect, Nudge Theory, Hick's Law |
| Onboarding friction | Goal-Gradient, IKEA Effect, Commitment and Consistency, Activation Energy |
| Pricing strategy | Charm Pricing, Good-Better-Best, Decoy Effect, Mental Accounting |
| Channel selection | Circle of Competence, Pareto, Opportunity Cost, Barbell Strategy |
| Campaign planning | First Principles, Inversion, Probabilistic Thinking, Second-Order |
| Competitive positioning | JTBD, Differentiation, Contrast Effect, Framing |

---

## The 139 Marketing Ideas

Proven marketing approaches organized by category. Use the product context and company stage to select the right subset.

### By Stage

**Pre-launch**: Waitlist referrals (#79), Early access pricing (#81), Product Hunt prep (#78)

**Early stage**: Content and SEO (#1-10), Community (#35), Founder-led sales (#47)

**Growth stage**: Paid acquisition (#23-34), Partnerships (#54-64), Events (#65-72)

**Scale**: Brand campaigns, International (#131-132), Media acquisitions (#73)

### By Budget

**Free**: Content and SEO, Community building, Social media, Comment marketing

**Low budget**: Targeted ads, Sponsorships, Free tools

**Medium budget**: Events, Partnerships, PR

**High budget**: Acquisitions, Conferences, Brand campaigns

### Content and SEO (1-10)
1. **Easy Keyword Ranking** — Target low-competition keywords competitors overlook: niche variations, long-tail queries, emerging topics.
2. **SEO Audit** — Conduct comprehensive technical audits, share findings publicly to build authority.
3. **Glossary Marketing** — Create industry term glossaries. Each term becomes an SEO-optimized page targeting "what is X" searches.
4. **Programmatic SEO** — Template-driven pages at scale targeting keyword patterns: location pages, comparison pages, integration pages.
5. **Content Repurposing** — One piece becomes many: blog post to Twitter thread, YouTube video, podcast episode, infographic.
6. **Proprietary Data Content** — Leverage unique product data for original research. Data competitors cannot replicate creates linkable assets.
7. **Internal Linking** — Strategic linking distributes authority and improves crawlability. Build topical clusters.
8. **Content Refreshing** — Update existing content with fresh data and examples. Refreshed content often outperforms new content.
9. **Knowledge Base SEO** — Optimize help docs for search. Support articles targeting problem-solution queries capture active seekers.
10. **Parasite SEO** — Publish on high-authority platforms (Medium, LinkedIn, Substack) that rank faster than owned domains.

### Competitor and Comparison (11-13)
11. **Competitor Comparison Pages** — "[Product] vs [Competitor]" pages capture high-intent searchers.
12. **Marketing Jiu-Jitsu** — Turn competitor weaknesses into strengths. When competitors raise prices, launch affordability campaigns.
13. **Competitive Ad Research** — Study competitor advertising through SpyFu or Facebook Ad Library to learn resonating messages.

### Free Tools and Engineering (14-22)
14. **Side Projects as Marketing** — Build small, useful tools related to the main product.
15. **Engineering as Marketing** — Free tools solving real problems: calculators, analyzers, generators.
16. **Importers as Marketing** — "Import from [Competitor]" tools reduce switching friction.
17. **Quiz Marketing** — Interactive quizzes engage users and qualify leads.
18. **Calculator Marketing** — ROI calculators, pricing estimators, savings tools attract links and rank well.
19. **Chrome Extensions** — Browser extensions providing standalone value via Chrome Web Store distribution.
20. **Microsites** — Focused sites for specific campaigns, products, or audiences.
21. **Scanners** — Website scanners, security checkers, performance analyzers as free tools.
22. **Public APIs** — Open APIs enable developers to build an ecosystem.

### Paid Advertising (23-34)
23. **Podcast Advertising** — Host-read ads on relevant podcasts perform especially well.
24. **Pre-targeting Ads** — Awareness ads before direct response campaigns. Warm audiences convert better.
25. **Facebook Ads** — Meta's targeting for specific audiences with creative testing and retargeting.
26. **Instagram Ads** — Visual-first advertising via Stories and Reels.
27. **Twitter Ads** — Promoted tweets and follower campaigns for engaged professionals.
28. **LinkedIn Ads** — Target by job title, company size, industry. Premium CPMs justified by B2B intent.
29. **Reddit Ads** — Transparent, authentic messaging for passionate communities.
30. **Quora Ads** — Target users actively asking questions the product answers.
31. **Google Ads** — High-intent search: brand terms, competitor terms, category terms.
32. **YouTube Ads** — Pre-roll and discovery ads with detailed targeting.
33. **Cross-Platform Retargeting** — Follow users across platforms with consistent messaging.
34. **Click-to-Messenger Ads** — Open direct conversations instead of landing pages.

### Social Media and Community (35-44)
35. **Community Marketing** — Slack groups, Discord servers, Facebook groups around the product.
36. **Quora Marketing** — Answer questions with genuine expertise, mention product where natural.
37. **Reddit Keyword Research** — Mine Reddit for real language the audience uses.
38. **Reddit Marketing** — Authentic participation in relevant subreddits. Value first.
39. **LinkedIn Audience** — B2B personal brands and thought leadership.
40. **Instagram Audience** — Visual storytelling, behind-the-scenes, user stories.
41. **X Audience** — Threads and insights for consistent value.
42. **Short Form Video** — TikTok, Reels, Shorts for new audiences.
43. **Engagement Pods** — Coordinated content boost with peers.
44. **Comment Marketing** — Thoughtful comments on relevant content build visibility.

### Email Marketing (45-53)
45. **Mistake Email Marketing** — Authentic "oops" emails generate engagement.
46. **Reactivation Emails** — Win back churned or inactive users.
47. **Founder Welcome Email** — Personal welcome from founders creates connection.
48. **Dynamic Email Capture** — Smart capture adapting to behavior (exit intent, scroll depth).
49. **Monthly Newsletters** — Consistent newsletters keep the brand top-of-mind.
50. **Inbox Placement** — Technical optimization: authentication, list hygiene.
51. **Onboarding Emails** — Guide new users to activation.
52. **Win-back Emails** — Re-engage churned users with compelling return reasons.
53. **Trial Reactivation** — Targeted campaigns to recover expired trials.

### Partnerships and Programs (54-64)
54. **Affiliate Discovery via Backlinks** — Find affiliates by analyzing competitor backlinks.
55. **Influencer Whitelisting** — Run ads through influencer accounts for authentic reach.
56. **Reseller Programs** — White-label options create distribution partners.
57. **Expert Networks** — Certified experts who implement the product.
58. **Newsletter Swaps** — Exchange mentions with complementary newsletters.
59. **Article Quotes** — Contribute expert quotes to journalists via HARO.
60. **Pixel Sharing** — Share remarketing audiences with complementary companies.
61. **Shared Slack Channels** — Shared channels with partners and customers.
62. **Affiliate Program** — Structured commission programs for referrers.
63. **Integration Marketing** — Joint marketing with integration partners.
64. **Community Sponsorship** — Sponsor communities, newsletters, or publications.

### Events and Speaking (65-72)
65. **Live Webinars** — Educational webinars for leads and expertise demonstration.
66. **Virtual Summits** — Multi-speaker events with varied perspectives.
67. **Roadshows** — Meet customers directly in their markets.
68. **Local Meetups** — Host or attend meetups in key markets.
69. **Meetup Sponsorship** — Sponsor relevant meetups for local reach.
70. **Conference Speaking** — Speak at industry conferences.
71. **Conferences** — Host your own to become industry center.
72. **Conference Sponsorship** — Sponsor for brand visibility.

### PR and Media (73-76)
73. **Media Acquisitions** — Acquire newsletters, podcasts, or publications in the space.
74. **Press Coverage** — Pitch newsworthy stories to publications.
75. **Fundraising PR** — Leverage funding announcements for coverage.
76. **Documentaries** — Create documentary content about the industry or customers.

### Launches and Promotions (77-86)
77. **Black Friday Promotions** — Annual urgency and acquisition spikes.
78. **Product Hunt Launch** — Structured launches for early adopters.
79. **Early-Access Referrals** — Reward referrals with earlier access.
80. **New Year Promotions** — Fresh budgets and goal-setting energy.
81. **Early Access Pricing** — Discounted early access tiers.
82. **Product Hunt Alternatives** — BetaList, Launching Next, AlternativeTo.
83. **Twitter Giveaways** — Engagement-boosting follow/retweet giveaways.
84. **Giveaways** — Strategic giveaways for attention and leads.
85. **Vacation Giveaways** — Grand prize giveaways for massive engagement.
86. **Lifetime Deals** — One-time payments generate cash and users.

### Product-Led Growth (87-96)
87. **Powered By Marketing** — "Powered by [Product]" badges create free impressions.
88. **Free Migrations** — Free migration services from competitors.
89. **Contract Buyouts** — Pay to exit competitor contracts.
90. **One-Click Registration** — OAuth options minimize signup friction.
91. **In-App Upsells** — Strategic upgrade prompts within the product.
92. **Newsletter Referrals** — Built-in referral programs for newsletters.
93. **Viral Loops** — Product mechanics that naturally encourage sharing.
94. **Offboarding Flows** — Optimized cancellation flows to retain or learn.
95. **Concierge Setup** — White-glove onboarding for high-value accounts.
96. **Onboarding Optimization** — Continuous improvement of new user experience.

### Content Formats (97-109)
97. **Playlists as Marketing** — Spotify playlists for the target audience.
98. **Template Marketing** — Free templates users can immediately apply.
99. **Graphic Novel Marketing** — Complex stories as visual narratives.
100. **Promo Videos** — High-quality product showcase videos.
101. **Industry Interviews** — Interview customers, experts, thought leaders.
102. **Social Screenshots** — Shareable screenshot templates for social proof.
103. **Online Courses** — Educational courses for authority and lead generation.
104. **Book Marketing** — Author a domain-expertise book.
105. **Annual Reports** — Industry data and trend reports.
106. **End of Year Wraps** — Personalized year-end summaries users share.
107. **Podcasts** — Reach audiences during commutes.
108. **Changelogs** — Public changelogs showcase product momentum.
109. **Public Demos** — Live demonstrations of real usage.

### Unconventional and Creative (110-122)
110. **Awards as Marketing** — Create industry awards as tastemaker.
111. **Challenges** — Viral challenges that spread organically.
112. **Reality TV Marketing** — Reality-show content following real customers.
113. **Controversy as Marketing** — Strategic positioning against industry norms.
114. **Moneyball Marketing** — Data-driven discovery of undervalued channels.
115. **Curation as Marketing** — Curate valuable resources for the audience.
116. **Grants as Marketing** — Offer grants to customers or community.
117. **Product Competitions** — Sponsor competitions using the product.
118. **Cameo Marketing** — Personalized celebrity messages via Cameo.
119. **OOH Advertising** — Billboards and transit ads.
120. **Marketing Stunts** — Bold attention-grabbing moments.
121. **Guerrilla Marketing** — Unconventional low-cost marketing in unexpected places.
122. **Humor Marketing** — Humor for standout memorability.

### Platforms and Marketplaces (123-130)
123. **Open Source as Marketing** — Open-source tools build developer goodwill.
124. **App Store Optimization** — Optimize app store listings.
125. **App Marketplaces** — List on Salesforce AppExchange, Shopify App Store, etc.
126. **YouTube Reviews** — Get YouTubers to review the product.
127. **YouTube Channel** — Tutorials and thought leadership on YouTube.
128. **Source Platforms** — Submit to G2, Capterra, GetApp.
129. **Review Sites** — Actively manage review platform presence.
130. **Live Audio** — Twitter Spaces, Clubhouse, LinkedIn Audio discussions.

### International and Localization (131-132)
131. **International Expansion** — New geographic markets with localization.
132. **Price Localization** — Adjust pricing for local purchasing power.

### Developer and Technical (133-136)
133. **Investor Marketing** — Market to investors for portfolio introductions.
134. **Certifications** — Programs validating expertise.
135. **Support as Marketing** — Exceptional support creates shareable stories.
136. **Developer Relations** — Build developer community relationships.

### Audience-Specific (137-139)
137. **Two-Sided Referrals** — Reward both referrer and referred.
138. **Podcast Tours** — Guest on multiple podcasts reaching the target audience.
139. **Customer Language** — Use the exact words customers use in all marketing.

### Top Ideas by Use Case

**Need leads fast**: Google Ads (#31), LinkedIn Ads (#28), Engineering as Marketing (#15)

**Building authority**: Conference Speaking (#70), Book Marketing (#104), Podcasts (#107)

**Low budget growth**: Easy Keyword Ranking (#1), Reddit Marketing (#38), Comment Marketing (#44)

**Product-led growth**: Viral Loops (#93), Powered By Marketing (#87), In-App Upsells (#91)

**Enterprise sales**: Investor Marketing (#133), Expert Networks (#57), Conference Sponsorship (#72)
