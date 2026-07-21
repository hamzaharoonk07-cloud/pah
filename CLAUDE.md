# PAH – AI Physiotherapy — Project Brief

Build "PAH – AI Physiotherapy" (Physio At Home): a clinical-grade, privacy-first AI physiotherapy web app. Vanilla HTML/CSS/JS only, no build step, no backend, no signup — everything runs client-side and persists to localStorage. This is a MEDICAL app: accuracy and honesty about what's real vs. cosmetic are non-negotiable — never fake a metric, never claim a feature the tracking doesn't actually do.

## Pages
Two standalone HTML files sharing assets (logo, favicon, a shared `anatomy-viewer.js` module):

1. **index.html** — marketing/education landing page: a scroll-driven "conditions we treat" body map (9 regions: cervical, thoracic, lumbar spine; shoulder, elbow, wrist; hip, knee, ankle), each with a tag, title, related conditions, and description, synced to camera focus on a 3D anatomy model as the user scrolls (GSAP + ScrollTrigger). Simple gate/signup overlay (name, gender, age, weight, height) stored in localStorage, no real auth. Footer with brand blurb, platform/company/contact link columns, social icons, copyright bar.

2. **exercises.html** — the actual app: hero with search, an exercise library (14 Beginner-only exercises — no Intermediate/Advanced, ever), a live camera tracking session view, a floating AI coach chat widget, a hospitals/clinical-referral section, a WHO-sourced research/evidence section, and a personal recovery dashboard (streak, reps, form score, weekly activity, recent sessions) — all persisted locally, no account required.

## 3D anatomy model
Self-hosted, fully offline — a local `.glb` file (human muscular anatomy reference model, no skeleton/rig) rendered via Three.js r128 + GLTFLoader (non-module UMD builds) in a shared `anatomy-viewer.js` module. NOT an iframe, NOT a network-dependent embed (e.g. no Sketchfab iframe). The module auto-fits the camera from the model's real bounding box and exposes `focusRegion(fracY, zoom)` — camera framing computed as a fraction of the model's actual measured height, not hand-guessed coordinates, so it's correct regardless of the model's proportions. Continuous slow idle rotation. Since the model has no rig, be explicit that it's a rotating reference/orientation aid, not a live retarget of the user's tracked movement — never claim otherwise (e.g. don't say "muscle activation" if nothing actually maps activation to the model).

## Exercise tracking engine (the core of the app)
Real-time webcam pose tracking via MediaPipe Pose (landmarks), analyzed with genuine joint-angle geometry — `angleDeg(A,B,C)` (real angle at vertex B) and `angleFromVertical(A,B)` — never a fake/proxy score. Smooth with median-of-3 + EMA per tracked angle; keep each exercise's angle smoothing in its own isolated buffer (don't let a secondary check share and corrupt the primary angle's smoothing state).

Per exercise, define: name, body area, difficulty (always "Beginner"), target reps, target muscles, a `det` (detector id), a rep-phase state machine (`neutral` → target position → back to `neutral`, using a `phaseAge()` minimum-hold-time gate so reps can't be faked by flicking through the range too fast — if released early, don't count the rep, tell the user to hold longer), and a `threshold:{lo,hi}` angle range.

Score using `scoreHold`/`scoreOscillate` (100 inside the target range, decaying outside it) — never freeze a stale score. Critical correctness rules:
- If the required landmarks aren't visible/confident, score and angle must drop toward 0 and feedback must say so — never silently keep showing a leftover good score for an unmoving/invisible body.
- But debounce visibility loss (a handful of consecutive bad frames, not a single frame) before declaring "Lost" — single-frame confidence dips are normal MediaPipe noise, especially for landmarks near the top of frame or mid-reach (e.g. elbows during an overhead raise). Never gate scoring on a single frequently-noisy landmark without a grace period and a real fallback message — a silent per-frame `return` on a flaky landmark will look like "tracking is broken" exactly when the user completes the rep correctly. Prefer whichever landmark stays visible through the full range of motion for a given exercise (e.g. track wrist rather than elbow for an overhead raise).
- Detect genuine stillness (near-zero variance over ~1s) separately from "holding the target," so an idle/disengaged body sitting at a biased resting angle can't produce a flat false score — zero out score when idle outside the target, for both the "in range" and "moving toward range" branches.
- Detect compensation like a real physiotherapist would: for exercises where the torso should stay still (neck/chin/shoulder/knee/calf/ankle work), flag lateral trunk lean/sway as a form error (zero credit + "keep your torso still, move only the target joint") rather than letting the user fake range of motion by leaning. Don't apply this to exercises where torso movement is the intended motion (side bends, spinal flexion/extension work, pendulum swings, posture scan, symmetry-checked bilateral work) — those either need their own dedicated check (e.g. left/right symmetry error on bilateral moves, multi-factor posture scan: shoulder-height asymmetry, hip tilt, forward-head offset, spinal alignment) or intentionally involve trunk motion.
- Feedback should read like real physio coaching, not generic praise: name the correction ("draw your chin straight back," "keep both arms symmetric," "lower slower — control the movement") not just "good"/"bad."

Pair visual feedback with on-device voice coaching (Web Speech API, no API key) — speak a message once per state change, debounced (~7s) so it doesn't repeat, priority for warnings.

## AI coach chat
A floating chat widget, physiotherapy-scope-limited — only answer questions that are actually physio/pain/mobility/rehab related (match with real word-boundary keyword matching, not naive substring matching, which can misfire on unrelated words). Off-topic questions get redirected.

## Design system
Dark theme default with a full light theme (toggle button with sun/moon icon in the navbar, persisted to localStorage, defaulting to `prefers-color-scheme` when unset, applied via a `data-theme="light"` attribute with a pre-paint inline script so there's no flash of the wrong theme on load). Build every color as a CSS custom property from the start (`--bg`, `--bg-strong`, `--heading`, `--text`, `--muted`, `--submuted`, `--card`, `--w03…--w12` alpha overlays, `--brand`/`--accent` etc.) with a `:root[data-theme="light"]` override block — never hardcode `#fff`/`#000`/literal rgba-white on any surface that should flip with theme, except on surfaces that are intentionally always-dark regardless of theme (e.g. the live camera view). Brand color: rose/red (`#e11d48`) gradient with a violet/blue accent. Fonts: Poppins (headings) + Inter (body). Fully responsive down to mobile, with a hamburger menu below ~768px; keep the layout width strictly bounded (`overflow-x:hidden`, `max-width:100vw` on `html`/`body`) so zooming out never reveals extra horizontal space.

Add tasteful continuous ambient motion for a premium feel — animated gradient shimmer on highlighted heading words, slow-floating low-opacity blurred gradient blobs behind major sections, a soft pulsing glow on the primary floating action button — all gated behind `prefers-reduced-motion:reduce`. Keep any two fixed/floating UI elements (e.g. scroll-to-top + chat FAB) stacked with real clearance and modest shadow blur so their glows never visually merge.

## Structure/content per page
- Exercise library: search + filter, cards showing muscle tags, difficulty, rep target.
- Live session view: fullscreen camera overlay, angle ring, score ring, rep counter with flash animation, phase label, feedback banner, voice toggle, close button, small rotating 3D anatomy reference panel.
- Hospitals section: cards linking to each partner's physiotherapy department specifically (not a generic hospital homepage link).
- Research section: WHO-sourced statistics and evidence cards, each citing its source.
- Dashboard: personal greeting, streak ring, session/rep/form-score metrics, weekly activity grid, recent sessions list — all read from localStorage, "no account needed" messaging throughout.
- Footer: brand blurb, link columns, social icons (real redirect links), copyright bar — tight spacing, no orphaned/empty columns.

Ship a proper favicon (high-contrast mark on a solid rounded badge background, not a transparent PNG that disappears on light browser chrome) and correct page titles.
