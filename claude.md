# claude.md — DELIVARA (MASTER SYSTEM SPEC)

# 1. 🧠 PRODUCT DEFINITION

Delivara is a real-time dispatch system connecting vendors, riders, and users through live map-based tracking, broadcast rider matching, and multi-stop delivery coordination.

Core loop:
Vendor → Create Job → Broadcast → Rider Accepts → Live Tracking → Completion

---

# 2. 🎯 PRODUCT PHILOSOPHY

- The map is the base reality layer
- UI exists only as overlays on reality
- Real-time state is the source of truth
- Motion = feedback system
- No static UI unless necessary
- Everything should feel alive and responsive

---

# 3. 👥 ROLES

Vendor:
- Creates delivery jobs
- Manages deliveries
- Views ratings and trust signals

Rider:
- Accepts broadcast jobs
- Streams location every 3.5s
- Updates job status

User:
- Opens tracking link
- Views live delivery progress (no login)

---

# 4. 📡 WEBSOCKET EVENT CONTRACT (ABSOLUTE SOURCE OF TRUTH)

RIDER_ONLINE
RIDER_OFFLINE

CREATE_JOB
JOB_REQUEST
JOB_ACCEPTED

LOCATION_UPDATE
JOB_STATUS
JOB_COMPLETED

---

# 5. 🔁 SYSTEM FLOW

1. Vendor creates job (CREATE_JOB)
2. Server broadcasts JOB_REQUEST to nearby riders
3. Riders receive and respond
4. First ACCEPT_JOB wins assignment
5. Rider streams LOCATION_UPDATE every 3.5s
6. Server forwards updates to:
   - vendor:{id}
   - job:{id} (tracking users)
7. JOB_STATUS updates propagate in real time
8. JOB_COMPLETED ends lifecycle

---

# 6. 🗺️ MAP SYSTEM (MAPBOX — CUSTOMIZED EXPERIENCE)

- Map is ALWAYS full-screen base layer
- Never replaced, only layered over
- Fully custom Mapbox styling (dark futuristic theme)
- Custom markers (rider, vendor, dropoff)
- Custom icons (minimal, glowing, motion-aware)
- Rider marker uses interpolation (no snapping)
- Camera follows rider unless user overrides
- Multi-stop routes are visually rendered with styled polylines
- Created with `preserveDrawingBuffer: true` and registered as a liquidGL live
  canvas, so the floating glass UI refracts the moving map in real time

---

# 7. 📍 MULTI-STOP DELIVERY MODEL

Each job contains ordered stops:

stops = [
  pickup,
  stop_1,
  stop_2,
  dropoff
]

Rules:
- Rider progresses sequentially
- Server tracks current_stop_index
- LOCATION_UPDATE is continuous across stops

---

# 8. 🎨 VISUAL SYSTEM (LIQUID GLASS / FUTURISTIC)

The UI is built on **liquidGL** (vendored at `src/lib/liquidGL.js`) — real glass
rendered in WebGL that REFRACTS whatever is behind it (an html2canvas snapshot
uploaded to a shared GL canvas). It works wherever WebGL + html2canvas do,
including iOS Safari, and falls back to a CSS blur otherwise.

STYLE:
- Liquid-glass surfaces that genuinely refract the live map / aurora behind them
- Holographic accents (iris / aqua / plasma) over a deep void
- Floating, motion-driven UI elements
- High contrast, premium, legible

BALANCE:
75% aggressive futuristic UI
25% subtle clean balance

## 8.1 Two glass surfaces (pick correctly)

- **`<Glass>`** (`src/components/Glass.tsx`) = a real liquidGL WebGL lens. Use it
  for the 1–4 PRIMARY floating panels per screen (top bars, hero cards, primary
  CTAs over the map). liquidGL shares ONE z-plane, so do not stack `<Glass>`
  surfaces above one another and do not nest them.
- **`.glass` / `.glass-light`** (CSS backdrop classes in `global.css`) = used for
  modals, bottom sheets, dialog backdrops, inputs, chips, and dense list rows —
  anything that must stack above other glass or appear many times (cheaper).

## 8.2 liquidGL + the map

liquidGL ignores `<canvas>` in its capture path, so the vendored copy is PATCHED
to composite a flagged map canvas through its per-frame `<video>` pipeline. The
Mapbox map is created with `preserveDrawingBuffer: true` and registers its canvas
via `registerLiveCanvas`, so the glass refracts the LIVE, moving map at frame
rate. Keep map resolution / lens count modest on mobile (see `LG_RESOLUTION`).

---

# COLORS  (deep void + holographic aurora)

bg_primary (void):      #06070F
bg_secondary:           #0A0C1A

iris   (accent_primary):  #7C5CFF   (electric violet — primary CTAs, active state)
aqua   (accent_secondary):#22E0F0   (plasma cyan — secondary highlights)
plasma:                   #FF4D9D   (neon magenta — alerts / accents, used sparingly)
lime:                     #7CF59A   (success / rider-online)

text_primary:           #F4F6FF
text_secondary:         #9AA3C7

Tailwind tokens: `iris` `aqua` `plasma` `lime` `void`, plus aliases
`accent.primary/secondary`, `bg.primary/secondary`, `text.primary/secondary`.
Helpers: `text-holo` (gradient heading text), `btn-iris` (gradient primary CTA),
`glow-primary` / `glow-accent`.

---

# EFFECTS

- liquidGL optics: refraction ~0.015, bevelDepth ~0.07, bevelWidth ~0.12,
  animated specular, drop shadow, optional pointer tilt.
- Aurora background: drifting holographic blobs + faint grid over the void
  (`AuroraBackground` — the refraction source on non-map screens).
- CSS glass: blur_strong 18px / blur_light 10px, saturate ~180%, 1px rim.
- glow_primary: violet; glow_accent: cyan. shadow_soft: 0 14px 44px rgba(0,0,0,0.5)

---

# 9. 🧱 LAYOUT ARCHITECTURE

LAYERS (bottom → top):

1. Aurora void background (refraction source on non-map screens)
2. Map (reality layer; refracted live through the glass)
3. liquidGL shared WebGL canvas (renders glass refraction for all lenses)
4. Route + rider marker layer
5. Live indicators (ETA, status chips)
6. Floating liquid-glass panels (`<Glass>`)
7. Glass navigation bar (primary nav)
8. CSS-glass overlays: bottom sheets, modals, side drawer (stack above glass)

---

# 10. 🧭 NAVIGATION SYSTEM

## 10.1 Glass Navigation Bar (Primary)

- Floating liquidGL `<Glass>` surface on top of the map (refracts it live)
- Beveled glass edge + animated specular
- Minimal navigation only (core actions); icon-first
- Active item marked with an iris/aqua gradient pill (animated)
- Always visible unless modal focus mode is active

---

## 10.2 Collapsed Side Navigation (Secondary)

- Slide-out drawer (left side)
- Contains full navigation structure
- Default collapsed state (icon rail)
- Expands on interaction

Sections:
- Dashboard
- Deliveries
- History
- Ratings & Reviews
- Settings
- Payments (COMING SOON - greyed out)

---

## 10.3 Payments Section (Future Locked)

- Visible in sidebar but disabled
- Greyed out state
- Label: “Coming Soon”
- No interaction allowed

---

## 10.4 External Actions

- Become a Vendor → redirects to marketing website
- Become a Rider → redirects to marketing website

---

# 11. 🎬 MOTION SYSTEM (144HZ FEEL)

- All UI transitions animated
- No instant state changes
- Rider movement interpolated (no teleporting)
- Spring physics for buttons
- Smooth camera tracking
- GPU-accelerated transforms only
- Glass surfaces refract the moving map in real time; specular gloss drifts
  across them. Respect `prefers-reduced-motion` (aurora + specular settle).

---

# 12. ⚡ INTERACTION RULES

- One primary action per screen
- Bottom sheets preferred over page transitions
- Modals blur background instead of replacing it
- Floating buttons pulse when actionable
- UI always reflects real-time state

---

# 13. 📱 TRACKING SCREEN (CORE EXPERIENCE)

Subscribes:
- job:{id}

Displays:
- full-screen Mapbox map (custom styled)
- interpolated rider marker
- status chip (LIVE / IN_TRANSIT / DELIVERED)
- optional ETA

Behavior:
- auto-follow rider
- disables on user interaction
- resumes after inactivity

---

# 14. 🛵 RIDER SYSTEM

- Must keep app open (PWA limitation)
- Sends LOCATION_UPDATE every 3.5s
- Sends JOB_STATUS updates
- Accepts broadcast job requests

---

# 15. 🌐 PWA CONSTRAINTS

- No reliable background GPS
- Foreground tracking required
- Service worker only for caching UI assets
- WebSocket is primary real-time engine

---

# 16. ⭐ RATINGS & REVIEWS SYSTEM (EARLY TRUST LAYER)

- Vendors can rate riders after delivery
- Users can rate vendors after delivery
- Ratings are tied to completed JOBS only
- Simple 5-star system initially
- Optional text review

Trust signals:
- Average rating
- Completed deliveries count
- Reliability score (future expansion)

---

# 17. 📦 FUTURE FLUTTER COMPATIBILITY (IMPORTANT)

This system is designed to migrate to Flutter with zero protocol changes.

Only changes in Flutter:
- Location provider (native background tracking)
- UI rendering layer

Everything else remains identical:
- WebSocket events
- Data flow
- UI logic

---

# 18. 🧠 FINAL PRINCIPLE

Delivara is a live map system first, and an application second.

Everything else is an interaction layer on top of reality.

# ONBOARDING IDEA 
Summary of Video Content: Insights on App Onboarding Flows
This video presents a comprehensive analysis of onboarding flows across more than 900 apps, aiming to understand what makes onboarding effective and whether onboarding is always necessary. The study challenges common advice to keep onboarding short, revealing nuanced patterns and best practices.

Key Findings and Patterns
Average Onboarding Length: The average app onboarding consists of 25 screens, with finance, health & fitness, and education apps having the longest flows.

Category Insights:

Finance apps dominate the category with the longest onboarding flows (7 out of 10 longest).
AI products tend to have the shortest onboarding flows, often allowing users to access core features quickly without lengthy setups.
Common Successful Onboarding Pattern:

Sign up
Account setup
Reach the "aha moment" where users realize the product’s value (e.g., Airbnb's first booking, Netflix watching a show).
Selling Outcomes, Not Features:
Top onboarding flows focus on demonstrating the product’s value rather than listing features. For example:

Timo shows the product in action immediately.
Front Butts uses animations to convey functionality without text.
Alma allows users to try the core experience before signing up.
Personalization in Onboarding:

Approximately 23% of apps personalize the onboarding experience.
AI apps personalize less during onboarding (~7%), often learning from user behavior post-signup instead of upfront questioning.
Examples:
Headspace allows users to select multiple goals, increasing free trial conversion by 10%.
Focus Flight customizes map styles during onboarding, enhancing user ownership.
Dollar Shave Club’s conversational quiz copy increased subscriptions by 5%.
Visualizing Outcomes from User Input:

Apps like Endo and Bite Pal show personalized plans and timelines immediately after onboarding quizzes, creating early confidence in the product’s value.
Speak, a language app, visualizes progress and goal attainment with simple graphs.
Paywall Integration:

22% of apps include a paywall during onboarding.
Some combine personalization with paywalls to create urgency, such as Beside’s quiz paired with a one-time offer and Focus Flight’s playful paywall design.
Grammarly tailors pricing plans based on quiz responses, leading to a 20% increase in plan upgrades.
Examples of Long but Engaging Onboarding
Duolingo: Over 60 screens before sign-up, but users engage through early lessons and value delivery, making the flow feel shorter.
Bipal: 61 screens featuring animations, personalized plans, and even a virtual pet, keeping the experience fun and engaging despite length.
Effortless and Guided Experiences
Apps like Cake Equity make complex topics approachable via reassuring copy and tooltips.
Real-time feedback during input (e.g., password strength) reduces friction.
Mural’s six-step checklist replacing pop-ups improved one-week retention by 10%.
Custom pre-notification screens increase permission acceptance rates significantly.
Cultural and UX Considerations
Splitting signup forms into multiple screens (e.g., House app) raised conversions by 15%.
Users’ cultural backgrounds influence preferences for information density; Eastern markets tolerate more information-heavy designs.
No universal “right” onboarding formula exists; success depends on tailoring flows to user needs and product specifics.