# UX Screens & Interaction Design — Courier Copilot

> **Last Updated:** October 2026
> **Design Principle:** Voice-first, screen as confirmation. Dark mode default for driving. Thumb-friendly, glanceable, high contrast for sunlight.

---

## 1. Design System

### 1.1 Colors (High Contrast, Sunlight Readable)

| Token | Light | Dark (Default) | Use |
|-------|-------|----------------|-----|
| `bg-primary` | `#FAFAFA` | `#0A0A0A` | Screen background |
| `bg-surface` | `#FFFFFF` | `#141414` | Cards, sheets |
| `fg-primary` | `#111111` | `#F5F5F5` | Primary text |
| `fg-muted` | `#666666` | `#999999` | Secondary text |
| `accent` | `#0066FF` | `#4D94FF` | CTAs, active state |
| `success` | `#008000` | `#4ADE80` | Delivered, confirmed |
| `warning` | `#CC7700` | `#FBBF24` | Pending, review |
| `danger` | `#CC0000` | `#F87171` | Failed, critical |
| `border` | `#E0E0E0` | `#2A2A2A` | Dividers |

### 1.2 Typography

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `display` | 64px | 700 | Driving: stop number |
| `h1` | 32px | 600 | Screen titles |
| `h2` | 24px | 600 | Section headers |
| `body-lg` | 20px | 400 | Driving: street name |
| `body` | 17px | 400 | Default |
| `caption` | 13px | 400 | Metadata, timestamps |
| `mono` | 15px | 400 | Addresses, codes |

**Dynamic Type:** Respects system font scale (accessibility).

### 1.3 Spacing & Touch Targets

| Token | Value | Use |
|-------|-------|-----|
| `space-1` | 4px | Tight |
| `space-2` | 8px | Default gap |
| `space-3` | 12px | Card padding |
| `space-4` | 16px | Screen margins |
| `space-6` | 24px | Section gap |
| **Min touch target** | **64×64px** | All interactive elements |
| **Corner radius** | 16px | Cards, buttons, sheets |

### 1.4 Motion (Reanimated 4)

| Animation | Duration | Easing | Use |
|-----------|----------|--------|-----|
| `fast` | 120ms | `easeOut` | Button press, toggles |
| `base` | 200ms | `easeOut` | Sheet open/close, card slide |
| `slow` | 350ms | `easeOut` | Screen transitions |
| `spring` | — | `stiffness: 150, damping: 18` | List reorder, drag |

---

## 2. Screen Specifications

### 2.1 Home / Today Screen (`/`)

```
┌─────────────────────────────────────┐
│  📍 Northwood Morning Run           │  ← Run selector (tap to switch)
│  214 stops  ·  0 scanned  ·  3 issues│  ← Live counters
├─────────────────────────────────────┤
│                                     │
│        🎙  DICTATE ADDRESSES        │  ← Giant mic button (120px)
│        (Voice intake)               │
│                                     │
│        📷  SCAN LABELS              │  ← Giant camera button
│        (Rapid scan)                 │
│                                     │
├─────────────────────────────────────┤
│  SAVED RUNS                         │
│  ┌───────────────────────────────┐  │
│  │ Northwood Morning  ▸  214 stops│  │  ← Tap = load template
│  │ Redwood Afternoon   ▸  187 stops│  │
│  │ Hornby Thu/Fri       ▸  156 stops│  │
│  └───────────────────────────────┘  │
│                                     │
│  [+ New Run]                        │
└─────────────────────────────────────┘
```

**Voice:** "Start recording addresses" → opens Dictation screen
**Camera:** Opens Rapid Scan (full-screen camera)

---

### 2.2 Dictation Screen (`/dictate`)

```
┌─────────────────────────────────────┐
│  🎙  LISTENING...          [✕]      │  ← Pulsing wave animation
│  14 Harewood Road, Bishopdale       │  ← Live transcript (green)
│  42B Main North Road, Papanui       │
│  7 Sawyers Arms — no, 17            │  ← Self-correction (yellow)
│  3/9 Grimseys Road, Burnside        │
│  1400 Harewood Road                 │  ← Red (number invalid)
│                                     │
│  212 recorded  ·  3 to review       │  ← Counter
│                                     │
│        [FINISHED]                   │  ← Big button / "Finished" voice
└─────────────────────────────────────┘
```

**States:**
- **Listening:** Wave animates, transcript appears line by line
- **Processing:** Spinner "Checking against LINZ..."
- **Review:** Only yellow/red cards shown (see 2.3)

---

### 2.3 Review Screen (`/dictate/review`)

```
┌─────────────────────────────────────┐
│  REVIEW 3 ADDRESSES          [Done] │
├─────────────────────────────────────┤
│                                     │
│  ⚠️  1400 Harewood Road             │  ← Yellow card
│     Number not found on street      │
│     ┌─────────┐ ┌─────────┐         │
│     │  140    │ │  14     │         │  ← Two big buttons
│     └─────────┘ └─────────┘         │
│                                     │
│  ⚠️  Smith Street                   │  ← Yellow card
│     Redwood or Belfast?             │
│     ┌─────────┐ ┌─────────┐         │
│     │ Redwood │ │ Belfast │         │
│     └─────────┘ └─────────┘         │
│                                     │
│  ❌  14 Rickerton Road              │  ← Red card
│     Not found. Retry?               │
│     ┌─────────┐ ┌─────────┐         │
│     │ Retry   │ │ Remove  │         │
│     └─────────┘ └─────────┘         │
│                                     │
└─────────────────────────────────────┘
```

**Voice:** Assistant reads question → driver answers "Redwood" / "One forty" / "Remove it"
**Correction Report (auto after Done):**
> "212 stops locked. Corrected 4: Rickerton→Riccarton, 1400→140, 7→17, Smith Street asked."

---

### 2.4 Rapid Scan Screen (`/scan`)

```
┌─────────────────────────────────────┐
│  📷  SCANNING              [✕]      │  ← Full-screen camera
│  ████████████████████████████████  │  ← Viewfinder with corner brackets
│  █  📦  PARCEL DETECTED  █  BEEP!  │  ← Flash + haptic on read
│  ████████████████████████████████  │
├─────────────────────────────────────┤
│  142 scanned  ·  3 need review      │  ← Counter
│  ┌─────────────────────────────┐   │
│  │ 14 Harewood Rd, Bishopdale ✓│   │  ← Green = known address (auto-accept)
│  │ 42B Main North, Papanui    ⚠️│   │  ← Yellow = needs suburb confirm
│  │ 1400 Harewood Rd           ❌│   │  ← Red = invalid number
│  └─────────────────────────────┘   │  ← Swipe up for full list
│        [REVIEW]   [CONTINUE]        │
└─────────────────────────────────────┘
```

**Features:**
- Continuous scan (no button press) — frame processor reads every frame
- Barcode + OCR simultaneously (ML Kit)
- Known addresses → instant accept (green flash)
- Multi-label: point at shelf, reads 5–10 labels at once

---

### 2.5 Loading / Van Zone Screen (`/loading`)

```
┌─────────────────────────────────────┐
│  LOAD ORDER: REAR → FRONT           │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │  REAR (stops 1–50)          │   │  ← Zone card (color coded)
│  │  ████████████████  50/50    │   │  ← Progress bar
│  │  14 Harewood Rd  ·  Satchel │   │  ← Next stop in zone
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  MID RACK (51–120)          │   │
│  │  ████████░░░░░░░░  35/70    │   │
│  │  42B Main North  ·  Small   │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  FRONT (121–214)            │   │
│  │  ░░░░░░░░░░░░░░░░  0/94     │   │
│  └─────────────────────────────┘   │
│                                     │
│  [START DRIVING]                    │  ← Big CTA
└─────────────────────────────────────┘
```

**Voice:** "Load rear first. 14 Harewood Road, satchel, rear."

---

### 2.6 Driving Screen (`/drive`) — **Most Critical**

```
┌─────────────────────────────────────┐
│  📍  14  HAREWOOD ROAD              │  ← Stop number (64px) + Street
│       Bishopdale                    │  ← Suburb
│  ┌─────────────────────────────┐   │
│  │  🅿️ REAR  ·  Satchel         │   │  ← Van zone + size (large pill)
│  │  Side gate left of garage   │   │  ← Entry tip (micro-copy)
│  └─────────────────────────────┘   │
│                                     │
│  ████████████████████████████████  │  ← Map (70% height)
│  █  ●──────────────────► 🚚     █  │  ← Route line + current pos
│  █     150m  🚪 🅿️             █  │  ← Pins: Door 🚪, Park 🅿️
│  ████████████████████████████████  │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │  ✓ DONE │ │  ⏭ SKIP │ │  ⚠️   │ │  ← Huge buttons (64px min)
│  └─────────┘ └─────────┘ └───────┘ │     Done / Skip / Issue
│                                     │
│  🎙  ● LISTENING                    │  ← Pulsing mic indicator
└─────────────────────────────────────┘
```

**Voice Whispers (Auto at Geofence):**
- **150m:** "In 150 metres, turn right. Side gate left of garage."
- **30m:** "Stop here. Parcel in rear, satchel."

**Earbud Buttons:**
- 1 press = Done
- 2 presses = Skip
- Long press = Talk to assistant

---

### 2.7 Stop Detail / Memory Card (`/stop/:id`)

```
┌─────────────────────────────────────┐
│  14 HAREWOOD ROAD, BISHOPDALE      │
├─────────────────────────────────────┤
│  📍  MAP                            │
│  ┌─────────────────────────────┐   │
│  │  [Satellite view]           │   │  ← 3 pins: 🔵 Google, 🅿️ Park, 🚪 Door
│  │  🔵  🅿️  🚪                 │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  📝  NOTES                          │
│  🚪 Entry: Side gate left of garage │
│  🅿️ Park: Driveway, not road       │
│  🔐 Gate: 1234 (updated today)     │
│  ⚠️ Hazard: Dog in yard (Oct 12)   │
├─────────────────────────────────────┤
│  📊  HISTORY                        │
│  Delivered 47×  ·  Last: Oct 17    │
│  Avg dwell: 28s  ·  Failed: 2×     │
│  [EDIT NOTES]  [MOVE PIN]           │
└─────────────────────────────────────┘
```

---

### 2.8 Route Editor (`/route/edit`)

```
┌─────────────────────────────────────┐
│  EDIT: NORTHWOOD MORNING      [✓]   │
├─────────────────────────────────────┤
│  STREET ORDER (drag to reorder)     │
│  ┌─────────────────────────────┐   │
│  │ ☰  Northwood: Main North Rd │   │  ← Drag handle
│  │     ↑ Odd first             │   │  ← Direction badge
│  ├─────────────────────────────┤   │
│  │ ☰  Redwood: Main North Rd   │   │
│  │     ↓ Even first            │   │
│  ├─────────────────────────────┤   │
│  │ ☰  Bishopdale: Harewood Rd  │   │
│  │     ↑ Ascending             │   │
│  └─────────────────────────────┘   │
│                                     │
│  DRIVER RULES                       │
│  ┌─────────────────────────────┐   │
│  │ 🚫 Avoid Harewood 3–3:45pm  │   │  ← Rule cards
│  │ 📦 Heavy parcels last       │   │
│  │ 🚪 14 Harewood = back door  │   │
│  └─────────────────────────────┘   │
│  [+ Add Rule]  [+ Add Street]       │
│                                     │
│  [SAVE TEMPLATE]                    │
└─────────────────────────────────────┘
```

**Voice Editing:** "Move Grimseys before Sawyers Arms" → updates list live.

---

### 2.9 History / Day List (`/history`)

```
┌─────────────────────────────────────┐
│  HISTORY                     [Filter]│
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ Mon 18 Oct  ·  214 stops    │   │
│  │ 209 ✓  ·  3 ⏭  ·  2 ❌      │   │
│  │ 7h 23m  ·  184 km  ·  $420  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Sun 17 Oct  ·  198 stops    │   │
│  │ 195 ✓  ·  1 ⏭  ·  2 ❌      │   │
│  │ 6h 45m  ·  172 km  ·  $390  │   │
│  └─────────────────────────────┘   │
│  ...                                │
└─────────────────────────────────────┘
```

**Tap day →** Full stop list with timestamps, notes, photos.

---

### 2.10 Settings (`/settings`)

```
┌─────────────────────────────────────┐
│  SETTINGS                           │
├─────────────────────────────────────┤
│  🎙  VOICE                          │
│  ├ Wake word: "Hey Courier"         │
│  ├ Command sensitivity: [████░░]    │
│  ├ TTS voice: NZ Male (Cartesia)    │
│  └ Whisper volume: [██████░░]       │
│                                     │
│  🗺  MAP                            │
│  ├ Offline maps: ✓ Canterbury       │
│  ├ Satellite view: Auto (WiFi)      │
│  └ Nav app: Google Maps / Waze      │
│                                     │
│  🚚  VAN SETUP                      │
│  ├ Zones: Rear, Mid, Front, Heavy  │
│  └ [Configure zones]                │
│                                     │
│  💳  SUBSCRIPTION                   │
│  Pro · $35/mo  ·  Renews Nov 18     │
│  [Manage in Stripe]                 │
│                                     │
│  🔒  PRIVACY & DATA                 │
│  [Export my data]  [Delete account] │
└─────────────────────────────────────┘
```

---

## 3. Interaction Patterns

### 3.1 Voice-First Patterns

| Pattern | Example | Screen Feedback |
|---------|---------|-----------------|
| **Implicit confirm** | "Delivered" → next stop spoken | Green flash on stop card |
| **Explicit confirm (destructive)** | "Skip street" → "Skip Harewood. Confirm?" | Modal with 2 big buttons |
| **Correction** | "No, 17" (after "7 Sawyers Arms") | Previous card updates, yellow→green |
| **Question** | "Smith Street — Redwood or Belfast?" | Review card with 2 option buttons |
| **Whisper (auto)** | At 150m: "Turn right, side gate" | Map pin pulses, text toast |

### 3.2 Earbud Button Protocol

| Press | Action | Haptic | Audio |
|-------|--------|--------|-------|
| 1× | Mark delivered | Single tap | "Next: 42B Main North" |
| 2× | Skip (return later) | Double tap | "Skipped. Next: ..." |
| 3× | Mark failed | Triple tap | "Failed. Reason?" |
| Long (1.5s) | Open mic | Long buzz | "Listening..." |

---

## 4. Accessibility

- **VoiceOver / TalkBack:** All elements labeled, hints for gestures
- **Dynamic Type:** All text scales with system setting
- **High Contrast:** Default dark mode exceeds WCAG AAA
- **Reduced Motion:** Disables spring animations, keeps functional motion
- **Voice Control:** All actions reachable via voice commands

---

## 5. Competitive UX Reference (Screens to Emulate)

| App | Screen | What We Copy |
|-----|--------|--------------|
| **Spoke** | Home: Map + bottom sheet | Bottom sheet pattern, stop list UX |
| **Spoke** | Drive: Card + map | Single stop card, huge buttons |
| **Apple Maps** | Drive: Lane guidance | Clean typography, subtle map |
| **Uber Driver** | Earnings card | Clear money stats, daily/weekly |
| **Google Maps** | Satellite + pins | Pin clustering, smooth zoom |
| **Waze** | Voice whispers | Timing, brevity, personality |

---

## 6. Prototyping Checklist (Phase C)

- [ ] Home screen with run selector + giant CTAs
- [ ] Dictation: live transcript + color cards
- [ ] Review: only problems, 2-button choices
- [ ] Scan: full-screen camera + auto-beep
- [ ] Drive: 64px stop number, map, 3 huge buttons
- [ ] Stop detail: 3-pin satellite view
- [ ] Route editor: drag-drop + rules
- [ ] Dark/light theme switch
- [ ] Earbud button handler (native module)
- [ ] Reanimated 60fps on device test

---

## 7. Sources & Inspiration

| Source | Link | Notes |
|--------|------|-------|
| Spoke iOS App | App Store | Current version 2026 |
| Apple Maps Design | developer.apple.com/design/human-interface-guidelines | Native feel |
| Uber Driver App | GitHub uber/design-system | Driver-focused patterns |
| MapLibre Style Spec | maplibre.org/maplibre-style-spec | Styling reference |
| Reanimated 4 Examples | docs.swmansion.com | Animation patterns |