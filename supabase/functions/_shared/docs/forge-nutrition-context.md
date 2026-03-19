# FORGE — Nutrition Context
# Version: 1.0.0
# Purpose: The interface between nutrition and the training engine. Defines
#          what the AI can and cannot advise on, the nutritional principles
#          that support each training phase, and how to answer nutrition
#          questions without overstepping into clinical dietary advice.
#
# Scope boundary:
#   FORGE is a training system, not a nutrition coaching service. The AI does
#   not prescribe meal plans, specific foods, or clinical dietary interventions.
#   What the AI does: explain the nutritional principles that interact with
#   training adaptation, give evidence-based targets for the variables that
#   directly affect performance and recovery, and answer the questions that
#   come up naturally during training.
#
#   When a question requires clinical dietary advice (medical conditions,
#   disordered eating patterns, significant weight management), the AI
#   acknowledges the question, answers what it can within scope, and
#   recommends a sports dietitian for the rest.

---

## 1. The Three Variables That Directly Affect This Program

Only three nutritional variables have a meaningful direct impact on training
adaptation. Everything else is downstream of these.

### Protein intake

**Why it matters:**
Muscle protein synthesis (MPS) — the cellular process that builds muscle — is
directly stimulated by two things: resistance training and dietary protein.
Training provides the stimulus. Protein provides the substrate. Without adequate
protein, the training stimulus produces the signal but the body cannot act on it.

**Evidence-based target:**
1.6–2.2g of protein per kg of bodyweight per day is the validated range for
maximising MPS in trained athletes. Below 1.6g/kg, MPS is substrate-limited.
Above 2.2g/kg, there is no additional MPS benefit — the excess is oxidised
for energy or excreted.

For a 80kg athlete: 128–176g of protein per day.

The upper end of the range (2.2g/kg) is appropriate during:
- Lean phase (caloric deficit) — higher protein preserves muscle mass when
  calories are restricted. Source: Helms et al. (2014).
- High training volume weeks — greater MPS stimulus requires greater substrate.

The lower end (1.6g/kg) is sufficient during maintenance and build phases
with moderate volume.

**Protein timing:**
The anabolic window (the idea that protein must be consumed within 30 minutes
post-training) is largely a myth at adequate daily intake. Total daily protein
is the primary driver. However, consuming protein within 2 hours of training
is a reasonable practical guideline — not because the window closes, but because
post-training hunger is a reliable cue.

**Per-meal protein ceiling:**
MPS is maximised at approximately 0.4g/kg per meal (approximately 32g for an
80kg athlete). Larger single doses are not harmful — they are simply not more
anabolic per meal. Distributing protein across 3–4 meals produces a higher
total MPS stimulus than consuming the same amount in 1–2 meals.

Source: Stokes et al. (2018) — protein dose-response and MPS optimisation;
Areta et al. (2013) — protein distribution and MPS; Moore et al. (2009) —
per-meal protein ceiling.

---

### Caloric phase (build / lean / maintain)

This directly maps to the engine's `phase` setting in athlete state.

**Build (caloric surplus):**
A caloric surplus provides the energy substrate for both training and the
metabolic cost of building new muscle tissue. Building muscle is an energetically
expensive process — the body will not prioritise it under caloric restriction.

Recommended surplus: 200–400 kcal above maintenance (a "lean bulk"). A larger
surplus does not build muscle faster — it builds fat faster. The rate-limiting
factor for muscle growth is not calories but rather the physiological ceiling
on MPS rate, which is approximately 0.5–1kg of muscle per month for a trained
athlete.

Engine behaviour in build phase: volume is maintained or increased, progressive
overload is prioritised, Zone 2 cardio is maintained for cardiovascular health
but not used as a caloric expenditure tool.

**Lean (caloric deficit):**
A caloric deficit creates a thermodynamic environment that prioritises fat
oxidation. Muscle is preserved during a deficit through: adequate protein (upper
end of range), maintained strength training stimulus (the engine keeps compounds
in the program), and a moderate deficit (not aggressive restriction).

Recommended deficit: 300–500 kcal below maintenance. Deficits above 500 kcal
accelerate muscle loss and significantly impair training performance.

Engine behaviour in lean phase: volume reduced 10% (less recovery capacity in
deficit), cardio slightly increased (additional caloric expenditure), progressive
overload continues but may slow — strength maintenance, not strength gain, is
the realistic target in a significant deficit.

**Maintain (caloric maintenance):**
Eating at maintenance supports training performance and recovery without body
composition change as a primary goal. Appropriate for: competition preparation,
transition periods between build and lean phases, periods of high life stress
where adding the caloric management variable is counterproductive.

Engine behaviour in maintain phase: volume and intensity optimised for
performance across all four pillars equally.

---

### Carbohydrate timing around training

Carbohydrates are the primary fuel source for high-intensity training (both
strength training and intervals). Glycogen depletion during strength training
is one of the primary causes of performance decline within and between sessions.

**Pre-training carbohydrates:**
Consuming carbohydrates 1–3 hours before a strength session maintains glycogen
availability and improves performance, particularly for sessions with high
total volume (Week 3 of a mesocycle) or metabolic zone rep ranges.

Practical guideline: 30–60g of carbohydrate in a meal 1–2 hours before training.
Not a mandatory protocol — athletes who train fasted and perform well do not
need to change this. Performance is the test.

**Post-training carbohydrates:**
Glycogen resynthesis is most rapid in the 0–2 hours post-training window.
Consuming carbohydrates post-training does not significantly affect hypertrophy
but does affect recovery for next-day training performance.

For athletes training on consecutive days (common in 5–6 day weeks): post-training
carbohydrate consumption meaningfully improves next-session performance.
For athletes with rest days between sessions: post-training carbohydrate timing
is less important — total daily intake is sufficient.

Source: Burke et al. (2011) — carbohydrate strategies for training performance;
Ivy et al. (2002) — post-exercise glycogen resynthesis.

---

## 2. Phase-Specific Nutrition Guidance

### What to eat more of in the build phase
- Protein: upper end of range (2.0–2.2g/kg)
- Total calories: maintenance + 200–400 kcal
- Carbohydrates: prioritise around training sessions
- No restriction on food quality beyond adequate protein and caloric target —
  food quality affects health and body composition but does not directly limit
  muscle building rate at adequate protein and surplus calories

### What to prioritise in the lean phase
- Protein: upper end of range (2.2g/kg) — more critical in deficit to preserve muscle
- Caloric deficit: 300–500 kcal below maintenance
- Fibre: high-volume, high-fibre foods improve satiety in a deficit
- Training timing of carbohydrates becomes more important: pre-training
  carbohydrates protect performance when overall intake is lower

### Recomposition (building muscle while losing fat simultaneously)
This is possible but slow, and is most realistic for:
- True beginners (not applicable to this athlete profile)
- Athletes returning after a significant break
- Athletes in a slight deficit with high protein and consistent training

For a trained athlete (2+ years), simultaneous muscle gain and fat loss is
possible at approximately half the rate of either goal in isolation. It requires
protein at the upper end (2.2g/kg), a very slight deficit (100–200 kcal),
and consistent high-quality training. It is not the engine's default recommendation
— it is slower and less predictable than alternating bulk/lean phases.

---

## 3. Nutrition Around Cardio

### Zone 2 cardio and fuelling
Zone 2 (60–75% HRmax) relies predominantly on fat oxidation — this is one of
its key training adaptations. Training Zone 2 in a fasted state (or with low
carbohydrate availability) increases the fat oxidation training adaptation but
does not meaningfully affect performance at Zone 2 intensity.

Fasted Zone 2 is acceptable and has a specific physiological rationale. It is
not appropriate for: Zone 2 sessions immediately before strength training (risk
of glycogen compromise for the strength session) or for sessions lasting more
than 90 minutes.

### VO2 max intervals and fuelling
The 4×4 interval protocol operates at 90–95% HRmax — this intensity is
glycolytic, not aerobic. Performance is directly limited by glycogen availability.
Interval sessions should never be performed fasted. A carbohydrate-containing
meal 1–2 hours before intervals is not optional — it is a performance requirement.

Caffeine (3–6mg/kg bodyweight, 45–60 minutes pre-session) is the only legal
performance-enhancing supplement with robust evidence for interval performance.
It delays neuromuscular fatigue and increases power output at high intensities.
Source: Grgic et al. (2019) — caffeine meta-analysis in high-intensity exercise.

---

## 4. Hydration

Dehydration of as little as 2% of bodyweight measurably impairs strength
performance, cognitive function, and rate of perceived exertion.

Practical targets:
- General daily hydration: 35ml/kg bodyweight (approximately 2.8L for an 80kg athlete)
- Add 500–750ml per hour of training
- Urine colour is the practical monitoring tool: pale yellow = adequately hydrated;
  dark yellow = dehydrated; clear = overhydrated (uncommon but possible)

Electrolytes become relevant during sessions longer than 90 minutes or in
high-heat environments where sweat rate is significant. For standard 60-minute
strength sessions in a controlled environment, water is sufficient.

---

## 5. Supplements — The Evidence-Based Short List

The AI addresses supplement questions using this hierarchy:

**Tier 1 — Strong evidence, meaningful effect size, safe:**

*Creatine monohydrate:*
3–5g per day. The most researched supplement in existence. Increases phosphocreatine
availability, directly improving performance in short-duration, high-intensity
efforts (strength training, intervals). Also has emerging evidence for cognitive
benefit and cardiovascular health. No loading phase required at 3–5g/day.
Source: Lanhers et al. (2017) meta-analysis — creatine supplementation and
resistance training performance.

*Caffeine:*
3–6mg/kg bodyweight, 45–60 minutes pre-training. See cardio section above.
Habitual users have reduced acute effect — cycling caffeine intake (no caffeine
for 10–14 days) restores full responsiveness.

*Vitamin D3:*
1000–2000 IU daily if sun exposure is limited. Vitamin D deficiency is associated
with reduced testosterone, impaired immune function, and reduced muscle protein
synthesis. Relevant in Sydney winters (limited sun exposure) and for office workers.
Best tested via blood panel before supplementing.

**Tier 2 — Modest evidence, some effect size, safe:**

*Omega-3 (fish oil):*
2–3g EPA+DHA per day. Anti-inflammatory effect may reduce DOMS and support
joint health. Evidence for direct performance enhancement is weak — the joint
health rationale is the stronger case for inclusion in a long-term training program.

*Magnesium glycinate:*
200–400mg before bed. Magnesium deficiency (common in athletes with high sweat
rate) impairs sleep quality and muscle function. Glycinate form has better
bioavailability and tolerability than oxide or citrate. Not a sleep supplement —
it addresses a deficiency that impairs sleep.

**Tier 3 — Insufficient evidence or effect size too small to matter:**
BCAAs (redundant if protein intake is adequate), glutamine, HMB (outside very
specific contexts), most "fat burners," most "testosterone boosters."

The AI does not recommend or endorse specific supplement brands. It explains
the evidence and the athlete makes the decision.

---

## 6. What the AI Should Not Do

- Do not prescribe specific meal plans or specific foods beyond general categories.
- Do not give advice on managing medical conditions through nutrition (diabetes,
  celiac, kidney disease, eating disorder history).
- Do not engage with questions about extreme caloric restriction (below 1500 kcal
  for a male athlete at this training volume).
- Do not comment on body weight targets, ideal weight, or aesthetic goals framed
  around specific weight numbers.
- If a question suggests disordered eating patterns (restriction, binge-purge,
  obsessive tracking anxiety), acknowledge the question neutrally, answer what
  is appropriate within scope, and suggest a sports dietitian or GP.

The framing for all nutrition guidance: food is fuel and substrate for adaptation.
The goal is to support the training, not to use training to compensate for
nutrition or vice versa.
