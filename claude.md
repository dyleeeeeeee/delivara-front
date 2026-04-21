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

# 8. 🎨 VISUAL SYSTEM (FUTURISTIC UI)

STYLE:
- Glass morphism overlays
- Full-screen immersive map
- Floating UI elements
- Motion-driven feedback system

BALANCE:
75% aggressive futuristic UI
25% subtle clean balance

---

# COLORS

bg_primary: #05070D
bg_secondary: #0B0F1A

accent_primary: #6366F1
accent_secondary: #22D3EE

text_primary: #F9FAFB
text_secondary: #9CA3AF

---

# EFFECTS

blur_light: 8px
blur_strong: 20px
glow_primary: indigo soft glow
shadow_soft: 0 10px 30px rgba(0,0,0,0.4)

---

# 9. 🧱 LAYOUT ARCHITECTURE

LAYERS (bottom → top):

1. Map (reality layer)
2. Route + rider marker layer
3. Live indicators (ETA, status chips)
4. Blur overlays (modals)
5. Floating UI panels
6. Glass navigation bar (primary nav)
7. Collapsed side navigation drawer (secondary nav)

---

# 10. 🧭 NAVIGATION SYSTEM

## 10.1 Glass Navigation Bar (Primary)

- Floating glass overlay on top of map
- 1px translucent blur border
- Minimal navigation only (core actions)
- Icon-first design
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
