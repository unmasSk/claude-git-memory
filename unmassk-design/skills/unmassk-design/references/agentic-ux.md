# Agentic UX

Reference for AI-first product design: interfaces that build ongoing relationships
through memory, trust evolution, and collaborative planning.

**Scope:** Apply this reference ONLY when designing AI-native interfaces —
chatbots, agent systems, copilots, and products where the AI system learns and
adapts to individual users over time. Do not bleed this into general UI/UX design.
Conventional interfaces (forms, dashboards, e-commerce) use the other references.

---

## The Paradigm Shift

**Screen-centric design:** Optimize individual screens and isolated interactions.
Each session is independent. The system has no memory.

**Relationship-centric design:** Design for ongoing partnerships where the system
learns, remembers, and evolves alongside users across sessions, devices, and time.
Every interaction compounds prior interactions.

| Traditional UX | Agentic UX |
|---|---|
| Session duration | Relationship depth over months |
| Conversion rates | Trust scores and delegation comfort |
| Click-through rates | Compounding value (Month 6 vs Month 1) |
| Isolated screens | Continuous relationship context |
| Static preferences (theme: dark) | Dynamic behavioral pattern evolution |
| One-size-fits-all flows | Individually adaptive interfaces |
| Explicit navigation paths | Goal-aligned path construction |
| Binary permissions | Graduated trust evolution |

The screens still matter. The relationships matter more.

---

## Pillar 1: Memory Architecture

Old model: store static preferences.

```typescript
// Static preferences — insufficient for agentic systems
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}
```

New model: maintain dynamic, evolving relationship models through behavioral event
streaming and pattern detection.

### Behavioral Event Streaming

```typescript
interface BehavioralEvent {
  timestamp: Date;
  eventType: string;
  context: {
    userState: 'frustrated' | 'exploring' | 'decided' | 'urgent';
    sessionDuration: number;
    repeatActions: number;
    environmentalContext: {
      dayOfWeek: string;
      timeOfDay: string;
      deviceType: string;
    };
  };
  outcome: 'success' | 'abandoned' | 'escalated';
}

class BehavioralPatternEngine {
  detectPatterns(events: BehavioralEvent[]): UserPatterns {
    return {
      frustrationTriggers: this.analyzeFrustration(events),
      temporalPatterns: this.analyzeTemporalBehavior(events),
      goalEvolution: this.trackGoalChanges(events),
      successPatterns: this.identifyWhatWorks(events),
    };
  }
}
```

Capture not just what users do, but the context and outcome of each action.
Frustration signals (repeated actions, long search sessions, abandoned flows)
are as valuable as success signals.

### Contextual Memory Graph

```typescript
interface ContextualMemoryGraph {
  userId: string;

  patterns: {
    searchBehavior: {
      typicalQueries: string[];
      frustrationIndicators: {
        repeatedSearches: number;
        timeSpentSearching: number;
        queryRefinements: number;
      };
      successPatterns: {
        whatWorks: string[];
        preferredPathways: string[];
      };
    };

    decisionMaking: {
      riskTolerance: {
        stated: number;      // from questionnaire or onboarding
        actual: number;      // inferred from behavior
        contexts: Map<string, number>;  // varies by decision category
      };
      timePreference: 'quick' | 'thorough' | 'varies';
      informationNeeds: 'minimal' | 'detailed' | 'adaptive';
    };

    emotionalPatterns: {
      stressTriggers: string[];
      confidenceIndicators: string[];
      satisfactionSignals: string[];
    };
  };

  currentGoals: {
    primary: Goal;
    secondary: Goal[];
    constraints: Constraint[];
    deadline?: Date;
  };

  trust: {
    stage: 'transparency' | 'selective' | 'autonomous';
    delegationCategories: Map<string, number>;  // category → 0–100 comfort
    lastTrustCheckpoint: Date;
    escalationPreferences: EscalationConfig;
  };

  relationshipTimeline: {
    startDate: Date;
    milestones: Milestone[];
    interactionFrequency: number;
    longestGap: number;
  };
}
```

Track stated preferences separately from actual behavioral preferences. They
frequently diverge. The financial advisor example: user states "moderate risk
tolerance" but behavior shows panic-selling at 5% dips. Actual behavior is the
ground truth.

### Tiered Memory Loading (Hot/Warm/Cold)

Loading the full relationship history for every interaction is expensive. Use
tiered loading:

```typescript
class MemoryManager {
  // Hot: last 7 days — always loaded
  hotMemory: BehavioralEvent[];

  // Warm: patterns from last 90 days — loaded when pattern matches current context
  warmMemory: UserPatterns;

  // Cold: historical trends — loaded only for significant decisions
  coldMemory: LongTermTrends;

  async getRelevantContext(currentSituation: Context): Promise<MemoryContext> {
    const recent = this.hotMemory;

    const patterns = await this.matchWarmPatterns(currentSituation);

    const historical = currentSituation.isSignificant
      ? await this.loadHistoricalTrends()
      : null;

    return { recent, patterns, historical };
  }
}
```

### Privacy-Preserving Memory

Users must control what is remembered. Memory without control is surveillance.

```typescript
interface MemoryControls {
  rememberedCategories: Set<string>;
  forgottenCategories: Set<string>;
  retentionPolicies: Map<string, number>;  // category → days
  forgetSpecific: (eventIds: string[]) => void;
  exportMemory: () => MemoryExport;  // user owns their data
}

class PrivacyPreservingMemory {
  // Differential privacy: add Laplace noise so patterns cannot be reverse-engineered
  learnPatternWithPrivacy(events: BehavioralEvent[], epsilon: number): Pattern {
    const noisyPattern = this.addLaplaceNoise(
      this.detectRawPattern(events),
      epsilon
    );
    return noisyPattern;
  }

  // Automatic PII scrubbing before storage
  scrubPII(event: BehavioralEvent): BehavioralEvent {
    return {
      ...event,
      context: this.removePII(event.context),
    };
  }
}
```

Memory visualization is a required UI feature, not a nice-to-have. Show users
what the system remembers and give them granular controls to modify it.

---

## Pillar 2: Trust Evolution

Design trust as a material. It is not given — it is earned through consistent,
aligned behavior and transparent reasoning.

### The Three Trust Stages

**Stage 1: Transparency**

Show all reasoning, decision processes, confidence levels, and data sources.
User wants to see everything. Appropriate for weeks 1–4 of a new relationship.

```typescript
function renderDecision(
  decision: Decision,
  stage: 'transparency',
  confidence: number
): UIComponent {
  return {
    reasoning: decision.reasoning,
    dataSources: decision.sources,
    alternativesConsidered: decision.alternatives,
    confidence,
    expandable: true,
    type: 'full-explanation',
  };
}
```

Exit criteria: user accepts suggestions > 60% of the time, explanation click
rate drops below 40%.

**Stage 2: Selective Disclosure**

Show reasoning only for high-stakes or uncertain decisions. Quiet confidence for
routine actions. User trusts but verifies.

```typescript
function renderDecision(
  decision: Decision,
  stage: 'selective',
  confidence: number
): UIComponent {
  const isHighStakes = decision.significance === 'high';
  const isUncertain = confidence < 0.7;

  if (isHighStakes || isUncertain) {
    return renderFullExplanation(decision, confidence);
  }

  return {
    confidence,
    summary: decision.summary,
    expandForDetails: true,
    type: 'confidence-indicator',
  };
}
```

Exit criteria: user accepts suggestions > 75%, comfortable with routine autonomy,
delegating specific categories.

**Stage 3: Autonomous Action**

System acts independently for delegated categories. Subtle notifications for
actions taken. Clear escalation paths. User delegates entire decision categories.

```typescript
function renderDecision(
  decision: Decision,
  stage: 'autonomous',
  confidence: number
): UIComponent {
  return {
    action: decision.action,
    undoButton: true,
    explainOnDemand: true,
    type: 'subtle-notification',
  };
}
```

### Trust Level Detection

Detect the appropriate trust stage from behavior — do not set it on a fixed
calendar schedule.

```typescript
class TrustLevelDetector {
  detectTrustLevel(userBehavior: UserBehavior): TrustStage {
    const acceptanceRate =
      userBehavior.acceptedSuggestions / userBehavior.totalSuggestions;
    const explanationRequests =
      userBehavior.explanationClicks / userBehavior.interactions;
    const delegationComfort = this.measureDelegation(userBehavior);

    if (explanationRequests > 0.5 || acceptanceRate < 0.4) {
      return 'transparency';
    }

    if (acceptanceRate > 0.7 && delegationComfort > 0.6) {
      return 'autonomous';
    }

    return 'selective';
  }

  measureDelegation(behavior: UserBehavior): number {
    const delegatedActions = behavior.actions.filter(
      (a) => a.userInitiated === false
    );
    const acceptedWithoutReview = delegatedActions.filter(
      (a) => !a.reviewed
    ).length;
    return acceptedWithoutReview / delegatedActions.length;
  }
}
```

### Trust Recovery Protocol

When the system makes a mistake, trust degrades. Recovery requires a structured
response — not silence.

```typescript
interface TrustRecoveryProtocol {
  mistake: Decision;
  userFeedback: Feedback;

  async recover(): Promise<RecoveryOutcome> {
    // 1. Acknowledge transparently
    await this.acknowledge({
      what: 'I made a suboptimal decision',
      why: this.mistake.reasoning,
      impact: this.calculateImpact(this.mistake),
    });

    // 2. Explain what went wrong
    await this.explain({
      assumption: 'I assumed X based on Y',
      reality: 'But actually Z was true',
      learning: 'Now I understand that...',
    });

    // 3. Offer concrete correction options — user chooses
    const options = await this.generateRecoveryOptions();
    const userChoice = await this.askUser(options);

    // 4. Reduce autonomy temporarily in the affected category
    await this.adjustTrustLevel({
      category: this.mistake.category,
      adjustment: -0.2,
      duration: '7 days',
      escalationThreshold: 'lower',
    });

    // 5. Update the decision model to prevent recurrence
    await this.updateDecisionModel({
      pattern: this.extractPattern(this.mistake),
      correction: userChoice,
      context: this.mistake.context,
    });

    return { recovered: true, newTrustLevel: this.calculateNewTrustLevel() };
  }
}
```

Recovery template for user-facing messaging:

```
"I made a suboptimal decision about [X] because I assumed [Y].
In hindsight, [Z] was true and I should have [W].
I've adjusted my approach. Going forward: [updated behavior].
Would you like me to [Option A] or [Option B]?"
```

---

## Pillar 3: Collaborative Planning

Design goal-alignment mechanisms, not predetermined flows.

**Traditional:** Design every possible user path explicitly. System executes
predefined flows.

**Agentic:** Design goal-awareness. System dynamically constructs paths based on
the user's underlying objectives and current context.

### Goal-Aware State Machine

```typescript
class GoalAwareStateMachine {
  currentState: State;
  userGoal: Goal;
  context: Context;

  async nextState(): Promise<State> {
    const goalProgress = await this.evaluateGoalProgress();

    if (goalProgress.onTrack) {
      return this.continueCurrentPath();
    }

    if (goalProgress.blocked) {
      // Generate alternatives — do not just fail
      const alternatives = await this.generateAlternatives();
      const recommended = await this.selectBestAlternative(alternatives);
      // Present options to user for collaborative decision
      return await this.collaborativeDecision(alternatives, recommended);
    }

    if (goalProgress.complete) {
      return this.goalCompleteState();
    }

    await this.updatePathModel(this.currentState, goalProgress);
    return this.adaptivePath();
  }

  async generateAlternatives(): Promise<Alternative[]> {
    return this.alternativeGenerator.generate({
      goal: this.userGoal,
      context: this.context,
      history: this.getUserHistory(),
      constraints: this.getConstraints(),
    });
  }
}
```

### Proactive Suggestion Engine

Suggestions must be timely. Interrupting a user in flow state is worse than no
suggestion. Wait for natural pause points.

```typescript
class ProactiveSuggestionEngine {
  async evaluateSuggestion(
    suggestion: Suggestion,
    context: Context
  ): Promise<ShouldSuggest> {
    // Do not interrupt flow
    if (context.userState === 'focused' || context.userState === 'progressing') {
      return { suggest: false, reason: 'user-in-flow' };
    }

    // Do suggest when frustration is detected
    if (this.detectFrustration(context)) {
      return { suggest: true, urgency: 'high', reason: 'frustration-detected' };
    }

    // Do suggest when confidence is high and relevance is clear
    if (suggestion.confidence > 0.85 && this.isRelevant(suggestion, context)) {
      return { suggest: true, urgency: 'medium', reason: 'high-confidence' };
    }

    // Suggest at natural pause points
    if (context.userState === 'paused' || context.userState === 'stuck') {
      return { suggest: true, urgency: 'low', reason: 'natural-pause' };
    }

    return { suggest: false, reason: 'wait-for-better-timing' };
  }

  detectFrustration(context: Context): boolean {
    return (
      context.repeatedActions > 3 ||
      context.timeSinceProgress > 300 ||  // 5 minutes
      context.undoCount > 2 ||
      context.searchRepetitions > 2
    );
  }
}
```

### Human-AI Co-Creation Pattern

```typescript
interface CoCreationWorkspace {
  humanInput: {
    goals: Goal[];
    constraints: Constraint[];
    preferences: Preference[];
    judgmentCalls: Decision[];
  };

  aiInput: {
    analysis: Analysis[];
    patterns: Pattern[];
    suggestions: Suggestion[];
    capabilities: Capability[];
  };

  sharedArtifacts: {
    plan: Plan;
    decisions: Decision[];
    rationale: Rationale[];
  };
}
```

The pattern:
1. Human provides high-level goal
2. AI generates analysis and options
3. AI presents options for human judgment
4. Human selects or refines
5. AI elaborates the selected direction into detail
6. Iterate until both converge

Human contributes: goals, constraints, values, judgment. AI contributes:
analysis, patterns, capabilities, alternatives. Neither works without the other.

---

## Pillar 4: Relationship Metrics

Replace session-level metrics with longitudinal relationship metrics.

### Relationship Quality Score

```typescript
class RelationshipQualityMetric {
  calculate(user: User, timeWindow: TimeWindow): QualityScore {
    const trust = {
      delegationComfort: this.measureDelegation(user),
      overrideRate: this.calculateOverrides(user),
      escalationFrequency: this.measureEscalations(user),
    };

    const engagement = {
      interactionDepth: this.measureDepth(user),
      returnFrequency: this.calculateFrequency(user),
      featureAdoption: this.measureAdoption(user),
    };

    const alignment = {
      goalProgress: this.measureGoalProgress(user),
      expectationMatch: this.compareExpectations(user),
    };

    return this.weightedScore({ trust, engagement, alignment });
  }
}
```

### Compounding Value

Measure whether the relationship is accelerating improvement over time.

```typescript
class CompoundingValueMetric {
  calculate(user: User): CompoundingScore {
    const baseline = user.getOnboardingMetrics();
    const current = user.getCurrentMetrics();

    return {
      timeToSuccess: {
        baseline: baseline.averageTimeToGoal,
        current: current.averageTimeToGoal,
        improvement: this.calculateImprovement(baseline, current),
        compoundingRate: this.calculateCompoundingRate(user.getHistoricalMetrics()),
      },
      outcomeQuality: {
        baseline: baseline.outcomeQuality,
        current: current.outcomeQuality,
      },
      capabilityGrowth: {
        newCapabilitiesAdopted: current.featuresUsed.filter(
          (f) => !baseline.featuresUsed.includes(f)
        ),
      },
    };
  }

  calculateCompoundingRate(historical: Metric[]): number {
    const improvements = historical.map((metric, i) =>
      i > 0 ? (metric.value - historical[i - 1].value) / historical[i - 1].value : 0
    );
    // Positive slope in exponential fit = compounding (not linear improvement)
    const exponentialFit = this.fitExponential(improvements);
    return exponentialFit.slope > 0 ? exponentialFit.slope : 0;
  }
}
```

### Context Accuracy

```typescript
class ContextAccuracyMetric {
  calculate(user: User, timeWindow: TimeWindow): AccuracyScore {
    const predictions = user.getSystemPredictions(timeWindow);
    const actuals = user.getActualBehavior(timeWindow);

    return {
      intentAccuracy: this.measureIntentPrediction(predictions, actuals),
      preferenceAccuracy: this.measurePreferencePrediction(predictions, actuals),
      contextRecognition: this.measureContextRecognition(predictions, actuals),
    };
  }

  measurePreferencePrediction(
    predictions: Prediction[],
    actuals: Actual[]
  ): number {
    // Did user select the system's top recommendation?
    const matches = predictions.filter(
      (pred, i) => pred.topChoice === actuals[i].choice
    );
    return matches.length / predictions.length;
  }
}
```

### Democratic Alignment

```typescript
class DemocraticAlignmentMetric {
  calculate(user: User, timeWindow: TimeWindow): AlignmentScore {
    const decisions = user.getSystemDecisions(timeWindow);

    return {
      valueAlignment: this.measureValueAlignment(decisions),
      boundaryRespect: this.measureBoundaryRespect(decisions),
      fairness: this.measureFairness(decisions),
    };
  }

  measureValueAlignment(decisions: Decision[]): number {
    const violations = decisions.filter((d) =>
      this.violatesValue(d, this.getConstitution())
    );
    return 1 - violations.length / decisions.length;
  }
}
```

Select 2–3 metrics from each category (Quality, Value, Accuracy, Alignment).
Track them over weeks and months, not sessions. Compare Month 1 vs Month 6.

---

## Domain Examples

### B2B Automotive Service Networks

**Context:** European service networks competing against cost pressure. Advantage
is trusted, service-centric relationships.

**Traditional approach:** Static dashboard — tickets, parts, warranty claims.
Each session independent.

**Agentic approach:**

Memory surfaces temporal patterns:
"Yesterday you spent 20 minutes searching hydraulic pump inventory across 3 regions.
Pattern detected: your Wednesday searches are 3× longer than other days.
Here are the parts you typically need on Wednesdays, pre-loaded."

Trust evolution:
- Week 1 (Transparency): "Recommending part X — 78% match rate with similar vehicles in your region after this symptom"
- Month 2 (Selective): Reasoning shown only for expensive or warranty-impacting decisions
- Month 6 (Autonomous): Quietly pre-orders common parts for predictable patterns, notifies user

Real goal alignment — not "find parts" but "reduce Mean Time to Repair" — not
"process tickets" but "improve first-time-fix rate".

```typescript
interface UserRelationshipContext {
  behavioralPatterns: {
    searchFrustrationIndicators: {
      timeSpent: number;
      repeatedQueries: string[];
      weekdayPattern: Map<string, number>;
    };
    decisionPatterns: {
      priceThreshold: number;
      preferredSuppliers: string[];
      urgencyIndicators: string[];
    };
  };
  trustLevel: {
    stage: 'transparency' | 'selective' | 'autonomous';
    delegationComfort: number;  // 0–100
    autonomousCategories: string[];
  };
  ongoingGoals: {
    primaryObjective: 'reduce_mttr' | 'optimize_costs' | 'improve_first_fix';
    progressMetrics: {
      baseline: number;
      current: number;
      trend: 'improving' | 'stable' | 'declining';
    };
  };
}
```

Metrics: Trust score 8.2/10, MTTR decreased 22% (Week 1: 4.2h → Month 6: 3.3h),
context accuracy 87%.

### Streaming Content Discovery

**Traditional:** User searches for sci-fi 20 minutes, finds nothing, closes app.
Next day: same generic recommendations.

**Agentic:** "Yesterday you skipped 14 action-heavy titles but paused on
philosophical/cerebral ones. Found new releases that match: Arrival, Solaris,
Annihilation."

Trust progression:
- Early: "Suggesting Arrival because 87% of users who liked Contact also enjoyed this"
- Later: Simple confidence indicator
- Mature: Personalized category "Cerebral Sci-Fi You'll Actually Finish" (learns completion patterns)

Metrics: Time to find satisfying content: 18 min → 4 min (78% improvement over 3 months).

### Project Management

**Traditional:** Manual task creation, Gantt chart display, no understanding of
working style.

**Agentic goal continuity:**
"Q2 goal: ship MVP by June 30. Detected: 3 days behind schedule since design
revisions. You do best creative work 8–10am. Block tomorrow 8–10am for design
finalization?"

**Collaborative planning dialogue:**

```
Human: "Need to add user authentication"

System: "I see 3 approaches:
1. OAuth — 2 days setup, scales cleanly (matches your long-term goals)
2. Email/password — 4 hours, MVP-ready now
3. Magic link — 8 hours, better UX, middle ground

Given 'ship by June 30' and 3 days current delay, I suggest option 2 now
and plan migration to option 1 in July. Your past decisions under time
pressure favor 'working now > perfect later'."
```

Adaptive interface evolution: Week 1 shows full task board. Month 2, system
learned user never opens Gantt view — auto-hides it. Month 3, surfaces
"energy-matched tasks" based on time of day.

Metrics: Project completion rate +34%, planning time 45 min/week → 12 min/week.

### Trust-Evolving Financial Advisor

**Memory distinguishes stated from actual risk tolerance:**

Stated: "Moderate" (questionnaire). Actual: panics on 5% dips, checks portfolio 8×
on red days, regrets selling near bottom. Real behavioral profile: conservative
during volatility despite stated moderation.

**Trust stage progression:**

Phase 1 (Months 1–2): Every recommendation explains behavioral evidence:
"Recommending 15% shift to bonds because your portfolio checks increased 4×
this week — your historical pattern: regrettable decisions when checking >5×
daily. This reduces volatility 18% while maintaining 73% of growth potential."

Phase 2 (Months 3–6): Routine rebalancing executes quietly. Significant
decisions show full reasoning. Anomalous market conditions always escalate.

Phase 3 (Month 7+): Auto-rebalances within agreed parameters. Executes emotional
guardrails (preventing panic selling within configurable volatility thresholds).
User retains override at all times.

Trust recovery example: "I prioritized volatility reduction based on your stress
patterns. In hindsight, your stress was work-deadline driven, not market-related.
Learning: correlate calendar events with stress signals. Should I A) factor in
calendar stress, B) require explicit market concerns, or C) reduce autonomy level?"

Metrics: Trust 3.2/10 → 8.9/10, delegation comfort 76% autonomous, regrettable
decisions decreased 89% (2.3/month → 0.25/month).

### Healthcare Patient Care Coordination

**Scope constraint:** Autonomous actions in healthcare are limited. System must
never autonomously modify medications or clinical decisions. Limit autonomy to
scheduling, reminders, and supply management.

Memory surfaces lifestyle-clinical correlations:
"Glucose spikes correlate with work deadline weeks. Medication compliance drops
on weekends. Your stated goal: 'be active with grandkids' — not just 'control A1C'."

Contextual intervention:
"Work deadline approaching (calendar sync). Your glucose typically rises 15%
during deadline weeks. Proactive: pack healthy snacks, glucose check before bed?"

Trust stages in healthcare context:
- Transparency: Always show clinical reasoning, data sources, confidence levels,
  and uncertainty. Offer "explain simply" and "show the research" options.
- Selective: Routine reminders execute silently. Significant patterns escalate
  with full reasoning.
- Autonomous (limited): Auto-schedule routine appointments, smart reminders based
  on learned patterns, proactive supply refills. Never medication changes.

Collaborative care planning:
"Your A1C improved 1.2 points over 6 months. Blood pressure stable. Your active
minutes increased 3×. This supports discussing medication reduction with your
doctor. I've flagged this for your next visit and prepared an improvement summary."

Metrics: Medication adherence 64% → 91%, A1C 8.2 → 6.8 (goal <7.0 achieved),
urgent care visits reduced 34%.

---

## Design Process

### Phase 1: Understand the Relationship Context

Answer before designing:
1. Relationship duration: days, months, years?
2. Interaction frequency: daily, weekly, sporadic?
3. Goal complexity: simple tasks or evolving multi-step objectives?
4. Trust requirements: what level of autonomy is appropriate for this domain?
5. Memory sensitivity: what must be remembered, what must be forgettable?
6. Personalization depth: how much should the experience adapt?

### Phase 2: Map Trust Evolution for the Domain

For your specific context:
1. What must always be explained? (high-stakes, uncertain, novel decisions)
2. What can become autonomous over time? (routine, high-confidence, low-risk)
3. How will users see system confidence? (visual indicator design)
4. What happens when the system makes mistakes? (recovery protocol)
5. How do users adjust autonomy levels? (user-facing controls)

### Phase 3: Design Memory Architecture

1. What behavioral patterns matter for this domain?
2. What changes over time vs. what is stable?
3. What indicates the user's current state and goal?
4. How do users manage what is remembered?
5. How does the system maintain context across sessions and devices?

### Phase 4: Define Relationship Metrics

Select 2–3 from each category:
- Relationship Quality: trust score, delegation comfort, override rate
- Compounding Value: time-to-success improvement, capability expansion
- Context Accuracy: intent prediction, preference matching
- Democratic Alignment: value alignment, boundary respect

Set baselines at onboarding. Track at Week 1, Month 1, Month 3, Month 6.
Alert on degradation, not just on absolute thresholds.

---

## 3-Day Sprint: Memory and Data Contracts

### Day 1: Discovery and Mapping

Morning — Behavioral Inventory (3 hours):
1. List all user interactions (30 min) — what actions, choices, and paths exist
2. Identify valuable patterns (60 min) — which patterns indicate goals, frustration, satisfaction, temporal evolution
3. Map temporal dimensions (30 min) — what changes by time, day, season
4. Define context signals (60 min) — what indicates current user state, goals, constraints

Afternoon — Privacy and Retention Design (3 hours):
1. Categorize memory types: behavioral patterns, explicit preferences, ongoing goals, historical trends, sensitive information
2. Define retention policies: what must be kept, what expires, what requires user control
3. Design user controls: memory visualization UI, forgetting controls, export, boundary settings

Deliverable: Memory inventory + privacy framework

### Day 2: Architecture Design

Morning — Data Structures (3 hours):
1. Event schema: timestamp, event type, context (user state + environment), outcome
2. Pattern schema: pattern type, confidence, supporting evidence, temporal scope
3. Memory graph: user identity, behavioral patterns, ongoing goals, trust level, relationship timeline

Afternoon — Implementation Planning (3 hours):
1. Storage strategy: hot (7-day, always loaded), warm (90-day patterns, on-demand), cold (historical, analysis only)
2. Pattern detection algorithms: frustration indicators, success patterns, temporal patterns, preference evolution
3. Privacy implementation: PII scrubbing, encryption, access controls, audit logging

Deliverable: Complete memory architecture specification

### Day 3: Metrics and Testing

Morning — Metrics Design (3 hours):
1. Select relationship metrics (2–3 per category)
2. Define measurement methods: how to calculate, what data needed, success thresholds, degradation alerts
3. Design metric visualization: dashboard layout, trend displays, user-facing vs. internal

Afternoon — Testing Strategy (3 hours):
1. Longitudinal test plan: Week 1 (onboarding + transparency), Month 1 (patterns + trust), Month 3 (compounding), Month 6 (maturity)
2. Success criteria per phase
3. Risk mitigation: privacy, trust violation, metric degradation

Deliverable: Metrics specification + longitudinal test plan

---

## Common Mistakes

**Treating memory like static settings**
Storing preferences as key-value pairs (theme: dark) instead of evolving behavioral
patterns. Fix: design dynamic models that understand patterns, temporal context,
and evolution over time.

**Binary trust model**
System is either fully transparent from day one or fully autonomous. Fix: design
three-stage trust evolution with gradual autonomy and user-controlled progression.

**Using traditional UX metrics**
Measuring session duration and conversion rates for relationship-based systems.
Fix: track relationship quality, compounding value, context accuracy over weeks
and months.

**Forgetting privacy controls**
System remembers everything with no user control. Fix: build memory visualization,
forgetting controls, and clear retention policies.

**Designing screens instead of relationships**
Focusing on pixel-perfect interfaces without relationship architecture. Fix: start
with the relationship model, then design screens that support the ongoing partnership.

**No trust recovery path**
When the system makes mistakes, users lose trust permanently. Fix: design structured
recovery protocols that acknowledge, explain, offer corrections, and adjust autonomy.

**Remembering too much**
Storing every interaction without relevance filtering causes slow systems, privacy
concerns, and noisy pattern detection. Fix: implement relevance filtering and
retention policies. Use tiered loading.

**Rigid trust stage timelines**
Fixed schedule: "Week 1 = transparency, Week 4 = autonomous." Fix: detect trust
level from behavior, let users control progression. One user may reach autonomous
trust in two weeks; another may stay in transparency for months.

**Optimizing for short-term metrics**
Still measuring session duration and immediate conversion while relationship quality
degrades. Fix: track longitudinal health. Set degradation alerts.

---

## Red Flags

| Signal | Diagnosis | Fix |
|---|---|---|
| Users say "it doesn't remember me" | Pattern detection not working | Check behavioral event capture and pattern algorithms |
| Users say "it remembers too much" | No privacy controls visible | Add memory visualization and forgetting controls |
| Users never progress beyond transparency | Explanations unclear or untrustworthy | Improve explanation quality and confidence display |
| Users don't use autonomous features | Delegation still uncomfortable | Reduce scope of autonomous actions, strengthen recovery paths |
| Traditional metrics up, relationship metrics down | Wrong incentive alignment | Realign product goals around relationship health |
| No compounding value after 3 months | System not learning from behavior | Audit pattern detection and learning algorithms |
| Trust violations cause user churn | No recovery protocol | Implement structured recovery: acknowledge, explain, correct, adjust |

---

## Quick Start: Minimum Viable Relationship

Build relationship architecture incrementally. Start here.

**Week 1:** Store last 7 days of interactions. Detect 2–3 simple patterns (repeat
searches, abandoned tasks). Show "Last time you..." context on relevant screens.
Measure: do users notice? Do they find it helpful?

**Weeks 2–4:** Add confidence indicators to suggestions. Add "Explain this" button.
Build basic reasoning display. Measure: how often do users click "Explain this"?
Does explanation increase acceptance?

**Month 2:** Track 1 relationship quality metric and 1 compounding value metric.
Compare Week 1 vs Week 8. Measure: is experience improving over time?

**Month 3:** Identify 1–2 routine tasks. Offer autonomous execution with easy undo.
Track delegation comfort. Measure: do users accept autonomous actions?

**Month 6:** Complete memory architecture, full three-stage trust evolution,
comprehensive relationship metrics, collaborative planning features.

The goal at Month 6: users say "it knows me" and delegate comfortably. That is
the signal that agentic UX design is working.
