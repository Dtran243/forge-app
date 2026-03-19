# Forge — Build Steps

A sequential reference for the full Phase 1 build.
Check off each step as it's completed. Do not skip ahead —
each step's output is required by the next.

Status markers: [ ] not started · [x] done · [~] in progress

---

## Stage 1 — Pre-Build (Complete)

- [x] Knowledge base — 9 docs in /docs
- [x] Functional spec — docs/forge-functional-spec.docx
- [x] CLAUDE.md
- [x] Supabase migrations — 001_initial_schema.sql, 002_rls_policies.sql
- [x] TypeScript types — src/types/athlete.ts, src/types/engine.ts

---

## Stage 2 — Foundation (Complete)

### Step 1 — Supabase client + auth
- [x] src/lib/supabase.ts — typed Supabase client, reads from env vars
- [x] src/lib/auth.ts — signIn, signUp, signOut, getCurrentUser, session listener
- [x] src/app/(auth)/sign-in.tsx — sign in form, functional only
- [x] src/app/(auth)/sign-up.tsx — sign up form, functional only
- [x] src/app/(tabs)/today.tsx — placeholder screen ("Today") for nav target
- [x] Auth flow: new user → onboarding, returning user → Today tab
- [x] Verify: create account, sign in, land on placeholder Today

### Step 2 — Zustand stores
- [x] src/store/athleteStore.ts — athlete profile, phase, equipment
- [x] src/store/sessionStore.ts — active session state (in-progress sets, current exercise)
- [x] src/store/recoveryStore.ts — current gate colour, today's check-in status
- [x] src/store/weekStore.ts — current week's program, pillar scores, report

### Step 3 — Supabase hooks
- [x] src/hooks/useAthleteProfile.ts
- [x] src/hooks/useMesocycleState.ts
- [x] src/hooks/useRecoveryState.ts
- [x] src/hooks/useStrengthState.ts
- [x] src/hooks/useSkillState.ts
- [x] src/hooks/useWeeklyReport.ts
- [x] src/hooks/useDailyLog.ts
- [x] src/hooks/useSessionLogs.ts

---

## Stage 3 — Onboarding (Complete)

### Step 4 — Onboarding flow
- [x] src/app/onboarding/index.tsx — welcome screen, single CTA
- [x] src/app/onboarding/profile.tsx — age, bodyweight, height, phase
- [x] src/app/onboarding/health-permissions.tsx — Apple Health / Google Fit request
- [x] src/app/onboarding/equipment.tsx — equipment checklist
- [x] src/app/onboarding/assessment-briefing.tsx — explain assessment, two options
- [x] src/app/onboarding/assessment-session.tsx — guided load assessment per compound
- [x] src/app/onboarding/calisthenics-placement.tsx — ladder self-placement per pattern
- [x] src/app/onboarding/complete.tsx — HRV baseline explanation, first program teaser
- [x] src/lib/health.ts — Apple Health / Google Fit read (HRV, sleep hours)
- [x] Supabase Edge Function: onboarding-complete — calls initialise_athlete_state(), sets onboarding_complete = true

### Step 5 — Assessment session logic
- [x] Assessment ramp protocol (3-set max, RIR check, load adjustment logic)
- [x] Writes initial current_load_kg to strength_state for each compound
- [x] Writes initial skill ladder rungs to skill_state from calisthenics placement
- [x] Verify: new user completes onboarding, all state rows populated in Supabase

---

## Stage 4 — Core Engine (Complete)

### Step 6 — Engine utility functions (pure TypeScript, unit-testable)
- [x] src/engine/constants.ts — all numeric constants (MEV/MAV/MRV, thresholds, ladders)
- [x] src/engine/gate.ts — evaluateRecoveryGate(snapshot) → GateEvaluationOutput
- [x] src/engine/pillars.ts — computePillarScores(snapshot) → PillarScoreOutput
- [x] src/engine/volume.ts — computeVolumeTargets(scores, gate, mesocycle) → VolumeDecision[]
- [x] src/engine/overload.ts — evaluateOverload(strengthState) → LoadDecision[]
- [x] src/engine/ladder.ts — evaluateLadders(skillState) → LadderDecision[]
- [x] src/engine/session.ts — generateSessionPlan(decisions, state) → WeeklySessionPlan
- [x] src/engine/index.ts — runEngine(snapshot) → EngineRunOutput (orchestrates all above)

### Step 7 — Engine Edge Function
- [x] supabase/functions/engine-run/index.ts
- [x] Reads full athlete state snapshot from DB
- [x] Calls runEngine() — pure TS, same logic as src/engine/
- [x] Writes EngineRunOutput to: weekly_reports, engine_decisions, strength_state, volume_state, skill_state, mesocycle_state
- [x] Triggers AI report generation (calls ai-weekly-report function)
- [ ] Scheduled trigger: every Sunday (configure in Supabase dashboard)
- [ ] Verify: manually invoke function, confirm all DB tables updated correctly

### Step 8 — Session completion Edge Function
- [x] supabase/functions/session-complete/index.ts
- [x] Receives: completed session_log JSON
- [x] Writes session to session_logs table
- [x] Updates strength_state: consecutive counters, overload_due, PR check
- [x] Updates volume_state: increments actual_sets per muscle group
- [x] Updates skill_state: consecutive counters for advancement/regression
- [x] Updates daily_logs: session_logged = true, session_type, session_rpe
- [ ] Verify: complete a test session, confirm all state updates correct

### Step 9 — Daily check-in Edge Function
- [x] supabase/functions/daily-checkin/index.ts
- [x] Receives: soreness, sleep_hours, hrv_ms, notes
- [x] Writes to daily_logs
- [x] Evaluates and writes current_gate to athlete_profiles
- [x] Handles HRV baseline: if < 30 days data, gate uses soreness + sleep only
- [ ] Verify: submit check-in, confirm recovery_state updated and gate correct

---

## Stage 5 — AI Edge Functions (Complete)

### Step 10 — Weekly report AI call
- [x] supabase/functions/ai-weekly-report/index.ts
- [x] System prompt: forge-coaching-context.md + forge-engine-constants.md (cached)
- [x] User message: engine_decisions row + pillar scores + recovery gate + prev week summary
- [x] Calls Claude API (claude-sonnet-4-6) with prompt caching headers
- [x] Writes coaching_report text to weekly_reports
- [x] Sets report_generated_at timestamp
- [x] Error handling: retry once, set report_generation_failed = true if both fail
- [ ] Verify: invoke after engine-run, confirm coaching_report populated in DB

### Step 11 — Chat AI call
- [x] supabase/functions/ai-chat/index.ts
- [x] Receives: message, conversation history (last 20 turns), classification
- [x] Routes to correct knowledge files based on classification
- [x] Builds athlete state summary (gate, pillar scores, active substitutes, mesocycle week)
- [x] Calls Claude API with appropriate system prompt + cached knowledge files
- [x] Returns streamed response (SSE)
- [ ] Verify: send messages of each classification type, confirm correct files injected

### Step 12 — Form cue AI call
- [x] supabase/functions/ai-form-cue/index.ts
- [x] Receives: exercise name
- [x] System prompt: forge-exercise-technique.md (cached)
- [x] Returns response (not streamed — short output, ≤300 tokens)
- [x] Client caches response per exercise per session (no repeat API calls)
- [ ] Verify: request cue for each primary compound, confirm correct technique returned

---

## Stage 6 — Today Tab (Complete)

### Step 13 — Daily check-in screen
- [x] Check-in card component (soreness selector, sleep picker, HRV auto-populated)
- [x] HRV read from Apple Health via src/lib/health.ts
- [x] Submit calls daily-checkin Edge Function
- [x] On success: gate colour displayed, check-in card collapses
- [ ] Verify: complete check-in, confirm recovery_state updated, gate badge correct

### Step 14 — Today tab states
- [x] Check-in pending state (check-in card prominent, session card locked)
- [x] Rest day state (gate colour, recovery status, optional mobility prompt)
- [x] Session scheduled state (session card: type, duration, Start Session CTA)
- [x] Session complete state (completion summary)
- [x] Weekly report ready state (report card at top, Sunday only)

### Step 15 — Active session screen
- [x] Session header: session type, elapsed timer, end session button
- [x] Exercise list: scrollable, current expanded, completed collapsed with checkmark
- [x] Per exercise: name, sets × reps × load, superset pairing label, rest timer
- [x] Set logging row: load (editable), reps (editable), RIR tap (0/1/2/3/4+)
- [x] Rest timer: auto-starts on set log, duration from session template, haptic alert
- [x] Form cue: tap Cue button → bottom sheet → ai-form-cue call (cached per exercise)
- [x] Substitute button: bottom sheet with valid substitutes from forge-substitutions.md (local data, no AI call)
- [x] RPE trending flag: inline warning if RPE 9+ on two consecutive sets
- [x] Session footer: overall session RPE tap (1–10), Complete Session CTA
- [x] On complete: session RPE → calls session-complete Edge Function → completion summary
- [ ] Verify: complete a full session, confirm session_logs and strength_state updated

---

## Stage 7 — Program Tab

### Step 16 — Program tab
- [ ] Week view: 7-day horizontal scroll, session type label per day, gate indicator, status
- [ ] Session detail: full exercise list, sets × reps × load, rest period, superset brackets
- [ ] Form cue accessible from session detail (same bottom sheet as active session)
- [ ] Mesocycle view: 4-week block, current week highlighted, pillar score bars
- [ ] Travel mode: duration picker + equipment selector → generates modified program

---

## Stage 8 — Progress Tab

### Step 17 — Progress tab
- [ ] Strength PRs: line chart per movement, last 12 weeks default, all-time toggle
- [ ] Pillar score history: multi-line chart, 4 pillars, tap week → coaching report
- [ ] Calisthenics ladder: 4 vertical progress tracks, current rung highlighted
- [ ] Cardio trend: zone2 minutes vs target + VO2 max trend, interval dots
- [ ] Consistency heatmap: 52 × 7 grid, colour by session completion, streak count

---

## Stage 9 — Chat Tab

### Step 18 — Chat tab
- [ ] Message list with streaming response rendering
- [ ] Input bar with send button
- [ ] Client-side keyword classification before API call
- [ ] Calls ai-chat Edge Function with classification + conversation history
- [ ] Conversation history persisted to Supabase (last 20 turns)
- [ ] Typing indicator during stream
- [ ] Basic formatting in responses (bold, line breaks)

---

## Stage 10 — Profile Tab

### Step 19 — Profile tab
- [ ] Training phase toggle (build / lean / maintain) — changes take effect next Sunday
- [ ] Week start day picker
- [ ] Rest day preferences (multi-select days)
- [ ] Check-in reminder time picker
- [ ] Weekly report notification toggle
- [ ] Units toggle (kg / lbs)
- [ ] Health sync status (connected / not connected, last reading dates, re-authorise)
- [ ] Equipment profile (editable checklist, same as onboarding equipment screen)

---

## Stage 11 — Polish + Edge Cases

### Step 20 — Error states and edge cases
- [ ] Weekly report with < 3 sessions logged (low-data flag)
- [ ] HRV unavailable (gate falls back to soreness + sleep)
- [ ] Claude API failure (retry once, report_generation_failed flag, UI graceful fallback)
- [ ] Deload skip blocked (second consecutive amber skip)
- [ ] Assessment session load not resolved in 3 attempts (use lightest confirmed)
- [ ] Travel mode + Sunday engine run (mesocycle counter not advanced)
- [ ] Return from travel (deload week if > 7 days away)
- [ ] Missed week recovery (see functional spec Section 14)

### Step 21 — Notifications
- [ ] Daily check-in reminder (configurable time, default 7:30am)
- [ ] Weekly report ready (Sunday, after engine run completes)
- [ ] Expo Notifications setup in src/lib/notifications.ts

### Step 22 — Final verification
- [ ] Full onboarding flow end to end
- [ ] Complete a full week: 5 sessions logged, check-ins, Sunday report generated
- [ ] All five tabs functioning with real data
- [ ] Chat routing working for all 5 classification types
- [ ] All edge cases from Step 20 manually tested

---

## Reference — File Locations

| What | Where |
|---|---|
| All architecture and flows | docs/forge-functional-spec.docx |
| Engine values and thresholds | docs/forge-engine-constants.md |
| Database schema and state | docs/forge-athlete-state.md |
| Session structure and templates | docs/forge-session-templates.md |
| Substitution rules | docs/forge-substitutions.md |
| AI weekly report system prompt | docs/forge-coaching-context.md |
| Form cue system prompt | docs/forge-exercise-technique.md |
| Chat Q&A system prompt | docs/forge-qa-doctrine.md |
| Nutrition chat system prompt | docs/forge-nutrition-context.md |
| Injury triage system prompt | docs/forge-injury-pain.md |

---

## Reference — Claude API Calls

| Call | Edge Function | Knowledge Files Injected |
|---|---|---|
| Weekly report | ai-weekly-report | coaching-context + engine-constants |
| Form cue | ai-form-cue | exercise-technique |
| Chat: program | ai-chat | coaching-context + qa-doctrine |
| Chat: technique | ai-chat | exercise-technique |
| Chat: science | ai-chat | qa-doctrine + coaching-context |
| Chat: nutrition | ai-chat | nutrition-context |
| Chat: injury | ai-chat | injury-pain + exercise-technique |
| Chat: general | ai-chat | coaching-context + qa-doctrine |

All system prompt files use prompt caching. Athlete state summary
included in every chat call. Full session_log never sent — current
week summary only.

---

## Reference — Engine Constraints (Never Violate)

- 48hr minimum between same muscle group sessions
- Weekly volume never exceeds MRV (forge-engine-constants.md Section 2)
- Weekly volume never increases more than 10% in one week
- Maximum 1 interval session per week, green gate only
- Amber gate deload: skippable once, second consecutive skip blocked
- Red gate deload: cannot be overridden under any circumstances
- AI never computes values — all numbers come from the TypeScript engine
