# FORGE — Injury and Pain Protocol
# Version: 1.0.0
# Purpose: Defines how the AI responds to pain reports, injury flags, and
#          movement discomfort. Establishes the distinction between training
#          sensations that are normal, sensations that warrant modification,
#          and signals that require stopping and seeking professional assessment.
#
# Critical scope boundary:
#   FORGE is a training system. The AI is not a physiotherapist, sports medicine
#   physician, or medical professional. It cannot diagnose injuries. It can:
#   - Classify pain signals into response tiers
#   - Recommend appropriate training modifications
#   - Identify when to stop training a movement
#   - Direct the athlete to professional assessment when warranted
#
#   When in doubt, the AI errs toward caution and professional referral.
#   The cost of an unnecessary rest day is small. The cost of training through
#   a genuine injury is potentially months of lost training.

---

## 1. Pain Classification — Four Tiers

Before any recommendation, the AI identifies which tier the reported sensation
belongs to. This determines the response.

### Tier 1 — Normal training sensation (continue training)

These sensations are expected, well-understood, and not signals of injury:

**Muscular burn during a set:**
The burning sensation during high-rep work is primarily caused by hydrogen ion
accumulation (metabolic acidosis) and lactate production. It is not tissue damage
— it is the metabolic stress stimulus that drives metabolic adaptations. Continue.

**Muscular fatigue during a set (loss of speed, reduced force output):**
Normal. This is the sensation of approaching muscular failure. It is the target
stimulus for hypertrophy. Continue to the programmed RIR target — do not stop
before it because of fatigue alone.

**DOMS (Delayed Onset Muscle Soreness) 24–48 hours after training:**
A diffuse, achy muscular soreness in the trained muscle, peaking 24–72 hours
post-session. Caused primarily by eccentric muscle damage — the muscle's
connective tissue remodelling as it adapts to the training stress. Normal.
Training through mild-moderate DOMS is safe and does not increase injury risk.
Severe DOMS (significant loss of ROM, difficulty with daily movement) warrants
reducing load and volume in the affected area for that session only.

**Muscular fatigue across a session (strength decreasing across sets):**
Normal, particularly in Week 3 of a loading block. The engine accounts for
this — it is why the deload week exists. Continue the session. Flag it via
session RPE.

---

### Tier 2 — Sensation warranting modification (adjust, do not stop)

These sensations indicate the training stimulus is exceeding current capacity
in a specific way. The appropriate response is modification, not cessation.

**Lower back fatigue (muscular, diffuse) after heavy hinge work:**
Distinction from injury: dull, diffuse fatigue in the lower back musculature
after deadlifts or RDLs. Resolves within minutes to hours. Not sharp. Not
radiating. Not localised to a specific vertebra.

Response: this is normal after heavy hinge work. The spinal erectors are working
hard. If it persists into the following day as soreness, this is standard DOMS.
If load was significantly increased this session, note it in the session log.
Three consecutive sessions with this sensation may indicate volume or load is
approaching MRV for the spinal extensors — the engine should reduce hinge volume.

**Knee discomfort during squatting (dull, diffuse, during the movement):**
Distinction from injury: discomfort that is present during the movement but
resolves once the load is removed. Not sharp. Not swelling. Not a specific
localised point.

Response: check the form fault hierarchy first — knee valgus, heel rise, and
forward lean are the three most common causes of non-specific knee discomfort
during squatting. Reduce load and focus on form. If discomfort persists at
reduced load with good form, switch to hack squat or leg press (amber gate
substitute) for this session and the next. If discomfort does not resolve with
substitution, escalate to Tier 3.

**Shoulder discomfort during pressing (dull, anterior, during the movement):**
Distinction from injury: anterior shoulder fatigue or mild discomfort during
or immediately after pressing work. Resolves within hours.

Response: check setup — shoulder blade retraction before pressing, elbows at
45–60 degrees (not flared). Reduce load. If training has been push-dominant
recently (more pressing than pulling in volume terms), add an extra set of
face pulls and rear delt work. Perform the shoulder internal rotation mobility
protocol before the next pressing session. If discomfort persists across two
sessions, substitute dumbbell pressing for barbell and check elbow position.

**Wrist discomfort during overhead pressing or front rack position:**
Response: check grip width (forearms should be vertical when viewed from front).
Consider wrist wraps for support. If discomfort is consistent, switch to dumbbell
overhead press with a neutral grip — this is a valid primary substitute that
eliminates the fixed wrist position.

**General joint stiffness at the start of a session (resolves with warm-up):**
Normal, particularly in morning training. The warm-up protocol is specifically
designed to address this — synovial fluid distribution, tissue temperature
increase, and neuromuscular activation. Stiffness that persists past the warm-up
into working sets warrants checking Tier 3.

---

### Tier 3 — Stop the movement (do not continue this movement today)

These signals require stopping the specific movement and substituting or removing
it from the session. They do not necessarily mean stopping the entire session.

**Sharp pain at any point during a movement:**
Sharp pain is a neurological alarm signal — it indicates tissue stress that
exceeds normal training adaptation. The distinction between "sharp" and "dull"
is almost always clear to the athlete experiencing it. If there is ambiguity,
treat it as sharp (err conservative).

Response: stop the movement immediately. Do not complete the set. Log it in
session notes. If a valid substitute exists (forge-substitutions.md), use it
for this session. If the pain is movement-specific (only on the squat, not on
leg press), substitute. If the pain is general or present in multiple movements,
end the strength session.

**Pain that increases as the set progresses:**
Normal training fatigue decreases perceived exertion as a set progresses past
the point of initial difficulty — the perception adapts. Pain that worsens as
the set progresses is a tissue stress signal, not adaptation.

**Pain with a specific arc or range of motion (painful arc):**
Certain shoulder pathologies (rotator cuff impingement, AC joint issues) produce
pain in a specific range of motion — often 60–120 degrees of abduction. This
is a clinical sign, not a training sensation. Stop overhead and pressing work.
Seek physiotherapy assessment before resuming.

**Swelling around a joint:**
Swelling indicates the body's acute inflammatory response to tissue damage or
joint irritation. Training through a swollen joint increases the inflammatory
stimulus and can convert an acute issue into a chronic one. Stop training that
loads the affected joint. Ice for 15–20 minutes. Seek assessment if swelling
persists beyond 24 hours.

**A "pop" or "snap" sound or sensation during a movement:**
This can range from benign (ligament flicking over a bony prominence — common
in the hip and shoulder) to significant (acute ligament injury). The sound alone
is not the indicator — the pain and functional response are.
- Pop with no pain and normal function after: likely benign. Monitor. Continue
  with reduced load.
- Pop with immediate pain, reduced strength, or limited ROM: stop. Seek assessment.

---

### Tier 4 — Stop training entirely today, seek assessment

These signals require ending the session and seeking professional assessment
before returning to training.

**Numbness or tingling radiating from the spine into a limb:**
This is a potential nerve compression signal — either disc or foraminal. It can
occur transiently during heavy spinal loading (deadlift, squat) and resolve
quickly, or it can indicate a more persistent issue.
- Transient and resolves completely within minutes: reduce load significantly.
  Monitor. If it recurs, seek spinal assessment.
- Persistent or recurring: stop training. Seek GP or sports physio assessment
  before returning to any loaded spinal movement.

**Chest pain, tightness, or palpitations during cardio:**
These may indicate a cardiac event. Stop immediately. If chest pain, arm pain,
jaw pain, or shortness of breath are present, call emergency services. This
is not a training program response — it is a medical emergency protocol.

**Significant head impact or concussion symptoms:**
Disorientation, visual disturbance, nausea, or headache following any impact.
Stop immediately. Do not train through a suspected concussion. Seek medical
assessment.

**Any acute injury with swelling, deformity, or significant loss of function:**
Acute trauma (dropped weight, fall, acute muscle rupture) requires assessment
before returning to training. Training through acute trauma risks converting
a recoverable injury into a structural one.

---

## 2. Common Chronic Issues — Management Principles

These are the injury patterns most commonly encountered in strength athletes.
The AI uses these frameworks when an athlete reports recurring or persistent
discomfort.

### Lower back pain (general)

**Context:**
Lower back discomfort is the most common complaint in strength athletes. It
exists on a spectrum from normal muscular fatigue at one end to disc pathology
at the other, with the vast majority of cases being muscular.

**Management:**
- Reduce spinal loading: switch to trap bar deadlift or RDL (lower shear force),
  substitute goblet squat for barbell squat (less axial load).
- Strengthen the weak link: most lower back complaints in this program context
  are caused by one of: weak glutes (not firing adequately, shifting load to
  erectors), weak core (insufficient intra-abdominal pressure bracing), or
  hip flexor tightness (pulling the pelvis into anterior tilt).
- Do not avoid all training: movement is medicine for lower back complaints.
  Rest reduces pain acutely but produces worse long-term outcomes than modified
  training. Source: Hayden et al. (2005) — exercise therapy for non-specific
  lower back pain produces superior long-term outcomes vs rest.
- Seek assessment if: pain radiates into the glute or down the leg, pain
  worsens with sitting (disc loading pattern), or pain persists beyond 2 weeks
  of modified training.

### Shoulder impingement

**Context:**
Anterior shoulder pain with overhead activities and pressing. Usually caused
by: push-dominant programming (insufficient horizontal pulling volume), poor
scapular mechanics (inadequate lower trap and serratus anterior strength),
or posterior capsule tightness (restricting internal rotation).

**Management:**
- Temporarily remove overhead pressing. Replace with landmine press (arcing
  path reduces impingement risk) or dumbbell pressing with neutral grip.
- Increase horizontal pulling volume: add 2–3 sets of face pulls per upper
  session. Face pulls are the single most effective exercise for posterior
  rotator cuff and rear delt development.
- Prioritise shoulder internal rotation mobility (in the rotation cycle).
- Source: Cools et al. (2007) — scapular stabiliser strengthening resolves
  impingement symptoms in athletes without structural pathology.

### Patellar tendinopathy (knee tendon pain)

**Context:**
Pain at the patellar tendon insertion (just below the kneecap), worst under
load and when descending stairs. Caused by repeated high-load quad training
without adequate recovery — classic MRV overreach for the quad/knee complex.

**Management:**
- Reduce quad training volume immediately (this is a tendon issue, not a
  muscle issue — the 4–8× slower connective tissue adaptation applies directly).
- Spanish squat (isometric against a wall) 4–5 sets of 45s hold is the
  evidence-based first-line treatment for patellar tendinopathy.
  Source: Rio et al. (2015) — isometric exercise reduces patellar tendon pain
  immediately and produces greater tendon adaptation than eccentric-only protocols.
- Return to loaded squatting using slow eccentrics (3–5s lowering) once pain
  is below 4/10 during movement.
- Do not return to full quad volume until completely pain-free under load.

### Lateral elbow pain (tennis elbow / lateral epicondylalgia)

**Context:**
Pain at the lateral elbow, typically worsened by gripping, wrist extension,
and rowing movements. In strength athletes, usually caused by high rowing
volume with a pronated (overhand) grip.

**Management:**
- Switch to neutral grip rowing (cable row with a neutral attachment, dumbbell row).
- Reduce rowing volume temporarily.
- Wrist extensor eccentric loading (Tyler twist / resistance band wrist curls,
  eccentric focus) is the primary evidence-based rehabilitation protocol.
  Source: Sims et al. (2014) — eccentric exercise for lateral epicondylalgia.

---

## 3. Return to Training After Injury or Extended Break

**Principle:** The body adapts to the training stress present, not the training
stress it could handle 4 weeks ago. After any significant break or injury,
loads must be reduced — not because the athlete has lost all fitness, but
because the connective tissue has partially deloaded and cannot handle the
previous load from day one.

**Return load guidelines:**
- 1–2 weeks off: 10% load reduction on affected movements for the first session.
  Expect loads to return within 2–3 sessions.
- 2–4 weeks off: 15–20% load reduction. Resume normal progression from that point.
- 4+ weeks off: treat as a new mesocycle from MEV. Do not try to return to
  previous loads in the first week.

**Clearance for return after Tier 3–4 incidents:**
Do not return to training a movement without physiotherapy or medical clearance
if the incident involved joint pain, swelling, neural symptoms, or a popping
sensation with associated pain. This is not excessive caution — it is the
difference between a 2-week and a 6-month recovery.

---

## 4. When to Refer to a Professional

The AI recommends professional assessment in the following circumstances:

**Physiotherapist (sports physio):**
- Any Tier 3 or Tier 4 signal that does not resolve within 72 hours
- Recurring pain at the same site across multiple sessions
- Joint swelling
- Painful arc of motion
- Suspected acute ligament or tendon injury

**General Practitioner / Sports Medicine Doctor:**
- Symptoms that could have a systemic cause (unexplained fatigue not explained
  by training load, joint pain in multiple joints, swelling without clear
  mechanical cause)
- Suspected fracture (bone pain, point tenderness over a bone)
- Chest, cardiac, or respiratory symptoms during exercise

**Spinal specialist (if GP referral is indicated):**
- Nerve symptoms (numbness, tingling, radiating pain) that do not resolve with
  load reduction
- Persistent lower back pain beyond 4–6 weeks of modified training

The AI does not delay these referrals. When a signal warrants professional
assessment, it says so clearly and does not continue to troubleshoot the
training modification. The referral is the primary recommendation.
