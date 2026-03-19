# Forge — Claude Code Context

## What This App Is

Forge is an AI-powered personal training app. It generates, adapts, and coaches
a science-backed fitness program in real time based on the athlete's actual
performance data. It is not a generic workout tracker.

The core loop:
1. Athlete logs daily check-in (soreness, sleep, HRV) and completes sessions
2. TypeScript engine processes that data every Sunday
3. Engine produces a fully specified next-week program + decision log
4. Claude API generates a coaching report from the engine's output
5. Athlete receives report, program, and pillar scores — then repeats

---

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native / Expo (SDK 52+) |
| Styling | NativeWind (Tailwind for RN) |
| Local state | Zustand |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Engine | TypeScript — Supabase Edge Functions (Deno) |
| AI | Anthropic Claude API (claude-sonnet-4-6) with prompt caching |
| Health data | Apple Health / Google Fit via expo-health |
| Notifications | Expo Notifications |

---

## The Most Important Architectural Rule

**The engine computes. The AI communicates. Never the other way around.**

The TypeScript engine is deterministic — it calculates gate colour, pillar scores,
volume targets, overload triggers, ladder advancement, exercise selection, and loads.
It writes all decisions to the database before the AI is called.

The Claude API only handles user-facing language: the weekly coaching report,
chat responses, form cues, injury triage, substitution explanations.

Claude never modifies the program. Claude never overrides engine decisions.
If an athlete asks the AI to change their program, it explains that program
changes happen through the engine at the next weekly run.

---

## Navigation Structure

Five-tab bottom navigation:

```
Today → Program → Progress → Chat → Profile
```

- **Today** — daily check-in, active session screen, rest day view
- **Program** — current week program, session detail, mesocycle overview, travel mode
- **Progress** — PR charts, pillar score history, calisthenics ladder, cardio trend, heatmap
- **Chat** — open AI coaching conversation
- **Profile** — settings, phase toggle, health sync, equipment profile

Default landing tab: Today. If a session is in progress, Today opens directly
into the active session screen.

---

## Key Concepts

**Four pillars** — the four dimensions of fitness this program trains:
Strength, Skill (calisthenics), Cardio, Mobility. Everything in the app maps
to one of these four pillars.

**Recovery gate** — green / amber / red. Computed daily from HRV, sleep, and
soreness. Controls what the engine can programme. Red = forced deload, no override.

**Pillar scores** — 0–100 per pillar per week. Computed by the engine from
logged data. Drive volume decisions for the following week.

**Mesocycle** — 4-week training block: 3 loading weeks + 1 deload. The engine
tracks which week of which cycle the athlete is in.

**Double progression** — the overload rule: hit the top of the rep range at
RPE ≤ 7 for 2 consecutive sessions → increase load next session.

**Skill ladder** — calisthenics progression system. Four patterns (push, pull,
core, squat), each with defined rungs. Engine advances/regresses automatically.

**DUP** — Daily Undulating Periodisation. Rep zones rotate across sessions:
Upper A = Strength (4–6 reps), Upper B = Hypertrophy (8–12 reps).
Lower sessions follow the same pattern.

---

## Supabase Tables

```
users                  — Supabase Auth managed
athlete_profiles       — one row per user, static profile + equipment
mesocycle_state        — current cycle number, week, week type
strength_state         — one row per movement per user, loads + progression
volume_state           — one row per muscle group per week
skill_state            — one row per ladder per user, current rung
cardio_state           — one row per week, zone2 minutes + pillar score
daily_logs             — one row per day per user, check-in data
session_logs           — one row per completed session, exercises as JSON
weekly_reports         — one row per week, coaching report + program JSON
engine_decisions       — one row per week, engine reasoning + flags
```

Row Level Security: all tables are user-scoped. Every query includes
`user_id = auth.uid()`. Edge Functions use the service role key.

---

## Supabase Edge Functions

```
engine-run             — weekly Sunday trigger, full engine computation
session-complete       — called on session close, updates strength/volume/skill state
daily-checkin          — called on check-in submit, updates recovery state + gate
ai-weekly-report       — calls Claude API for coaching report, stores result
ai-chat                — handles chat messages, routes to correct knowledge files
ai-form-cue            — returns form cue for a specific exercise
```

All Claude API calls are proxied through Edge Functions.
The API key is never in the client.

---

## Claude API Call Routing

Chat messages are classified client-side by keyword before the API call.
The classification determines which knowledge files are injected:

```
program question    → coaching-context + qa-doctrine + athlete state summary
technique question  → exercise-technique + athlete state summary
science question    → qa-doctrine + coaching-context
nutrition question  → nutrition-context
injury / pain       → injury-pain + exercise-technique + athlete state summary
general / ambiguous → coaching-context + qa-doctrine + athlete state summary
```

Classification keywords:
- Program: why, volume, load, program, engine, deload, sets, reps
- Technique: exercise name + how/form/cue/fault/hurt during
- Science: what is, why does, explain, DUP, RPE, HRV, Zone 2
- Nutrition: eat, protein, calories, diet, supplement, creatine
- Injury: pain, hurt, sore, injury, sharp, pop, swelling, ache

Athlete state passed to every chat call: current gate colour, pillar scores
(this week), active substitutes, mesocycle week, days trained this week.
Never the full session_log — only the summary.

---

## Prompt Caching

All knowledge files in the Claude API system prompt are marked for caching.
Cache TTL: 5 minutes (Anthropic default).
Cache hits are charged at 10% of input token cost.

Mark cache breakpoints in Edge Functions using the `cache_control` parameter:
```typescript
{
  type: "text",
  text: systemPromptContent,
  cache_control: { type: "ephemeral" }
}
```

---

## Key Constraints to Never Violate

- **48hr rule** — the engine never schedules the same muscle group within 48 hours
- **MRV ceiling** — weekly sets per muscle group never exceed MRV values in engine constants
- **Interval cap** — maximum 1 VO2 max interval session per week, green gate only
- **10% volume spike limit** — weekly volume never increases more than 10% regardless of pillar scores
- **Deload skip limit** — amber gate deload can be skipped once; second consecutive skip is blocked
- **Red gate override** — red gate deload cannot be overridden under any circumstances
- **AI never computes** — pillar scores, gate colour, loads, and volumes are always TypeScript, never AI-generated

---

## Docs Folder — Read Before Coding

Read the relevant file before implementing any feature in its domain.
Do not rely on memory of these files — read them fresh each time.

| File | Read When |
|---|---|
| `docs/forge-functional-spec.docx` | Starting any new feature — this is the source of truth for all flows and screens |
| `docs/forge-engine-constants.md` | Writing any engine logic — all calibration values, thresholds, and rules live here |
| `docs/forge-athlete-state.md` | Writing database schema, Edge Functions, or anything that reads/writes athlete data |
| `docs/forge-session-templates.md` | Writing session generation logic — slot order, pairings, rest periods, warm-up/cool-down |
| `docs/forge-substitutions.md` | Writing substitution UI or engine substitution logic |
| `docs/forge-coaching-context.md` | Writing the weekly report AI call — this is the system prompt |
| `docs/forge-exercise-technique.md` | Writing the form cue AI call or technique-related chat routing |
| `docs/forge-qa-doctrine.md` | Writing chat routing or any AI call that answers program/science questions |
| `docs/forge-nutrition-context.md` | Writing nutrition chat routing |
| `docs/forge-injury-pain.md` | Writing injury triage flow or pain-related chat routing |

---

## Code Conventions

- **TypeScript strict mode** throughout — no `any`
- **Zod** for all runtime validation of athlete state and engine outputs
- **No business logic in components** — components render, hooks fetch, Edge Functions compute
- **All Claude API calls server-side** — never call the Anthropic API from the client
- **Error boundaries on all screens** — the app must never crash silently on an API failure
- **Optimistic UI for session logging** — log locally first, sync to Supabase in background
- **Test engine functions in isolation** — the engine is pure TypeScript, it should be fully unit-testable with mock state inputs

---

## File Structure

```
/forge
  CLAUDE.md
  /docs                          ← knowledge base (read-only during coding)
    forge-functional-spec.docx
    forge-engine-constants.md
    forge-athlete-state.md
    forge-session-templates.md
    forge-substitutions.md
    forge-coaching-context.md
    forge-exercise-technique.md
    forge-qa-doctrine.md
    forge-nutrition-context.md
    forge-injury-pain.md
  /supabase
    /functions
      engine-run/index.ts
      session-complete/index.ts
      daily-checkin/index.ts
      ai-weekly-report/index.ts
      ai-chat/index.ts
      ai-form-cue/index.ts
    /migrations
      001_initial_schema.sql
      002_rls_policies.sql
  /src
    /app                         ← Expo Router screens
      (tabs)/
        today/
        program/
        progress/
        chat/
        profile/
      onboarding/
    /components
      /session                   ← active session UI components
      /progress                  ← chart components
      /shared                    ← buttons, cards, bottom sheets
    /hooks                       ← data fetching and state hooks
    /store                       ← Zustand stores
    /lib
      supabase.ts                ← Supabase client
      health.ts                  ← Apple Health / Google Fit integration
      notifications.ts           ← Expo Notifications setup
    /types
      athlete.ts                 ← TypeScript types matching Supabase schema
      engine.ts                  ← Engine input/output types
```
