# ReNew Frontend Documentation

## Project Overview

ReNew is a mental well-being web application built with React, TypeScript, and Vite. It provides a gentle structure for daily actions, helping users connect what feels possible today with real places around them.

---

## Application Routes

### Public Routes
- `/` - Landing Page (marketing site)
- `/login` - Sign In Page
- `/onboarding` - Onboarding Flow

### Authenticated App Routes (under `/app`)
- `/app/today` - Today Page (Life Dashboard)
- `/app/check-in` - Check-In Page
- `/app/recommendation` - Recommendation Page
- `/app/mission` - Mission Page
- `/app/reflection` - Reflection Page
- `/app/vision` - Life Vision Page
- `/app/route` - Life Route Page
- `/app/places` - Places Page
- `/app/places/:placeId` - Place Detail Page
- `/app/community` - Community Page
- `/app/community/:activityId` - Community Detail Page
- `/app/insights` - Insights Page
- `/app/settings` - Settings Page
- `/app/support` - Support Page

---

## Design System

### Color Palette

The application uses an OKLCH color space for consistent, perceptually uniform colors.

#### Primary Colors
- **--color-ink**: `oklch(19% 0.025 145)` - Primary text and borders
- **--color-forest**: `oklch(31% 0.073 145)` - Primary accent, active states
- **--color-deep-forest**: `oklch(23% 0.052 145)` - Dark backgrounds, hero sections
- **--color-leaf**: `oklch(72% 0.135 116)` - Success states, highlights
- **--color-citron**: `oklch(91% 0.105 105)` - Light backgrounds, secondary sections
- **--color-paper**: `oklch(96% 0.018 95)` - Main background, light surfaces

#### Accent Colors
- **--color-sky**: `oklch(80% 0.075 220)` - Information panels, insights
- **--color-clay**: `oklch(65% 0.115 47)` - Warm accents, place tiles
- **--color-plum**: `oklch(34% 0.08 345)` - Community sections

#### Utility Colors
- **--color-line**: `oklch(19% 0.025 145 / 24%)` - Borders and dividers

### Typography

#### Font Families
- **--font-display**: "Cormorant Garamond", serif - Headlines, display text
- **--font-editorial**: "Cormorant Garamond", serif - Body copy, descriptions
- **--font-script**: "Pinyon Script", cursive - Decorative script text
- **Default**: "Manrope", sans-serif - UI elements, buttons, forms

#### Font Sizes
- **Display/Headlines**: 3rem - 11rem (responsive)
- **Section headings**: 2.5rem - 4.5rem
- **Body text**: 0.88rem - 1.25rem
- **Small/UI text**: 0.62rem - 0.75rem
- **Kicker text**: 0.66rem - 0.68rem (uppercase, bold)

#### Font Weights
- **Display**: 400 (regular)
- **Editorial**: 400, 700
- **UI/Manrope**: 400, 600

### Spacing System

CSS Custom Properties for consistent spacing:
- **--space-xs**: 0.5rem
- **--space-sm**: 0.75rem
- **--space-md**: 1rem
- **--space-lg**: 1.5rem
- **--space-xl**: 2rem
- **--space-2xl**: 3rem
- **--space-3xl**: 4rem
- **--space-4xl**: 6rem

### Layout System

#### Grid & Flexbox
- Primary layout uses CSS Grid for complex sections
- Flexbox for navigation, headers, and simple alignments
- Mobile-first responsive design with breakpoints at 48rem (768px) and 64rem (1024px)

#### Container Widths
- Standard content: `min(100%, 78rem)` (landing page)
- App pages: `min(100%, 70rem)`
- Auth pages: `min(100%, 30rem)` for forms

### Animations & Transitions

- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (--ease-out)
- **Reveal animations**: 650ms with translateY and opacity
- **Hover transitions**: 150ms - 180ms
- **Respects**: `prefers-reduced-motion` media query

---

## Component Architecture

### App Shell (`AppShell.tsx`)

The main wrapper for authenticated app pages.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ product-sidebar (desktop)               │
│ - Logo/Wordmark                         │
│ - Navigation links                      │
│ - Quick Check-In link                   │
├─────────────────────────────────────────┤
│ product-main                            │
│ ┌─────────────────────────────────────┐ │
│ │ product-header (sticky)             │ │
│ │ - Mobile wordmark                   │ │
│ │ - Page title                        │ │
│ │ - Save state indicator              │ │
│ │ - Check-in link                     │ │
│ │ - Mobile menu button                │ │
│ ├─────────────────────────────────────┤ │
│ │ mobile-app-drawer (conditional)     │ │
│ ├─────────────────────────────────────┤ │
│ │ product-content (Outlet)            │ │
│ │ - Page content renders here         │ │
│ ├─────────────────────────────────────┤ │
│ │ mobile-bottom-nav (mobile only)     │ │
│ │ - Today, Route, Places, Insights    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Navigation Items
1. Today (CalendarCheck2 icon)
2. Life Route (Route icon)
3. Places (MapPin icon)
4. Insights (BarChart3 icon)
5. Settings (Settings icon)

#### Alignment
- **Sidebar**: Hidden on mobile, visible on desktop (left side)
- **Header**: Sticky top, full width
- **Content**: Scrollable main area
- **Bottom nav**: Fixed bottom on mobile, hidden on desktop

---

## Page-by-Page Documentation

### 1. Landing Page (`/`)

**Purpose**: Marketing and introduction to ReNew

**Project Context**: Introduces ReNew's core philosophy—helping users recognize their capacity, choose feasible actions, and connect with real places. Establishes trust by emphasizing no diagnosis, no comparison, and user control.

#### Sections (top to bottom):

**Header (site-header)**
- Position: Absolute, full width, z-index 50
- Alignment: Flex row, space-between
- Components:
  - Wordmark "ReNew" (left)
  - Desktop navigation (center, hidden on mobile)
  - Sign in / Get started buttons (right, hidden on mobile)
  - Mobile menu button (right, visible on mobile)

**Hero Section**
- Min-height: 46rem / 92svh
- Background: Video with forest overlay and shade
- Alignment: Centered grid content
- Components:
  - Hero kicker: "Everyday mental well-being for everyone"
  - H1: "ReNew" (5rem-11rem responsive)
  - Script text: "Rewrite the everyday"
  - Summary paragraph
  - CTA button: "Begin with ReNew"
  - Scroll cue (bottom right)

**Manifesto Section** (id: about)
- Background: --color-paper
- Alignment: Centered, max-width 78rem
- Components:
  - Section kicker: "01 / The question"
  - H2: "What kind of life do you want to build?"
  - Two-column copy grid (desktop)

**Method Section** (id: method)
- Background: --color-citron
- Alignment: Centered
- Components:
  - Section kicker: "02 / How it works"
  - Heading with span emphasis
  - Process list (4 steps with numbers)

**Route Story Section**
- Background: --color-deep-forest, color: --color-paper
- Alignment: Two-column grid (sticky intro + scrollable levels)
- Components:
  - Route intro with vision note
  - 5 adaptive action levels

**Local Network Section** (id: local)
- Background: --color-paper
- Alignment: Centered
- Components:
  - Section kicker: "04 / Local life network"
  - Place mosaic (2x2 grid on desktop, 1 column mobile)
  - 4 place types: Library, Cafe, Park, Community

**Trust Section**
- Background: --color-sky
- Alignment: Two-column grid (sticky statement + principles)
- Components:
  - Trust statement
  - 3 trust principles with numbers

**e-ICON Section** (id: e-icon)
- Background: --color-forest, color: --color-paper
- Alignment: Two-column grid
- Components:
  - Large background number "03"
  - e-ICON heading
  - Content with SDG links
  - Relation diagram (Recognize, Act, Connect)

**Closing Section**
- Background: --color-paper
- Alignment: Centered
- Components:
  - Script text: "A life, renewed"
  - H2: "Start with what is possible today"
  - CTA button

**Footer**
- Background: --color-ink, color: --color-paper
- Alignment: Grid (2 columns on desktop)
- Components:
  - Wordmark
  - Tagline
  - Navigation links
  - Copyright

---

### 2. Sign In Page (`/login`)

**Purpose**: User authentication

**Project Context**: Provides access to the user's personal ReNew space where their vision, route, and history are stored locally. The "Return to your own pace" messaging reinforces that ReNew respects the user's timeline and doesn't impose external pressure.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ auth-header                             │
│ - Back button | ReNew | RN/SIGN IN      │
├─────────────────────────────────────────┤
│ auth-intro (deep-forest background)      │
│ - Kicker: "Welcome back"                │
│ - H1: "Return to your own pace"         │
│ - Description                           │
├─────────────────────────────────────────┤
│ auth-form-wrap (centered)               │
│ - Email field                           │
│ - Password field with toggle            │
│ - Remember me / Forgot password         │
│ - Sign in button                        │
│ - Link to onboarding                    │
└─────────────────────────────────────────┘
```

#### Alignment
- Desktop: Two-column layout (intro left, form right)
- Mobile: Single column, stacked
- Form: Centered, max-width 30rem

---

### 3. Onboarding Page (`/onboarding`)

**Purpose**: Multi-step user onboarding flow

**Project Context**: Establishes the user's personalized foundation by capturing their life priorities, current conditions, and vision. This ensures all future recommendations are tailored to their unique context—not generic advice. The generated route provides an immediate sense of possibility.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ onboarding-header                       │
│ - ReNew wordmark | Step counter         │
├─────────────────────────────────────────┤
│ onboarding-progress (progress bar)      │
├─────────────────────────────────────────┤
│ onboarding-layout                       │
│ ┌──────────┬──────────────────────────┐ │
│ │ rail     │ content                  │ │
│ │ (steps)  │ (panels)                 │ │
│ │          │                          │ │
│ └──────────┴──────────────────────────┘ │
├─────────────────────────────────────────┤
│ onboarding-actions                      │
│ - Back button | Continue/Enter button   │
└─────────────────────────────────────────┘
```

#### Steps (5 total):
1. **Begin** - Welcome and principles (establishes trust: no diagnosis, optional recommendations, user control)
2. **Priorities** - Choose life domains (multi-select grid) (identifies what matters to them)
3. **Conditions** - Set preferences (time, distance, budget, social, places) (grounds recommendations in reality)
4. **Vision** - Create life vision statement (creates a "north star" that persists beyond daily fluctuations)
5. **Route** - Preview generated route (shows how big goals can flex into small steps)

#### Alignment
- Desktop: Side rail (left) + content (right)
- Mobile: Stacked, rail becomes horizontal progress
- Step counter: "01 / 05" format

---

### 4. Today Page (`/app/today`)

**Purpose**: Main dashboard for planning and tracking daily missions

**Project Context**: The central hub where users connect their vision to daily action. Implements the core ReNew loop: Plan (choose missions), Do (execute), Review (reflect). Shows how today's step relates to the larger life direction while respecting current capacity.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ planner-heading                         │
│ - Kicker: "Week of [Month] [Day]"       │
│ - H1: "Plan the week. Do one thing..."  │
│ - Vision link (current direction)        │
├─────────────────────────────────────────┤
│ planner-header-actions                  │
│ - "Update today's conditions" button    │
├─────────────────────────────────────────┤
│ planner-flow (3-step status)            │
│ 01 Plan | 02 Do | 03 Review             │
├─────────────────────────────────────────┤
│ planner-calendar                        │
│ - "Your next seven days"                │
│ - Day strip tabs (Today, Tue, Wed...)   │
├─────────────────────────────────────────┤
│ planner-workspace                       │
│ ┌────────────────┬───────────────────┐  │
│ │ planner-focus  │ planner-day-agenda│  │
│ │ (main)         │ (sidebar)        │  │
│ │                │                  │  │
│ │ - Status       │ - Day header     │  │
│ │ - Title        │ - Mission list   │  │
│ │ - Description  │ - Open slots     │  │
│ │ - Actions      │ - Footer link    │  │
│ │ - Facts dl     │                  │  │
│ └────────────────┴───────────────────┘  │
├─────────────────────────────────────────┤
│ mission-schedule-editor (conditional)    │
│ - Day/time selectors                    │
│ - Save/Cancel buttons                   │
├─────────────────────────────────────────┤
│ planner-library                         │
│ - Mission library heading               │
│ - List of available missions            │
├─────────────────────────────────────────┤
│ planner-fit                             │
│ - "Why this mission fits now"           │
│ - Bullet points with reasons            │
├─────────────────────────────────────────┤
│ planner-result                          │
│ - "The next plan uses what happened"    │
│ - Previous result summary               │
├─────────────────────────────────────────┤
│ mission-supporting-links                │
│ - Route, Places, Insights, Support      │
└─────────────────────────────────────────┘
```

#### Key Components:

**Planner Flow**
- 3-step indicator: Plan → Do → Review
- Shows status for each step
- Visual states: is-current, is-complete
- **Purpose**: Makes the ReNew loop visible, helping users see where they are in the cycle

**Calendar Strip**
- 7 day buttons (Today + next 6 days)
- Shows planned mission count per day
- Selected state with --color-forest background
- **Purpose**: Enables flexible scheduling without rigid deadlines—plan around life's unpredictability

**Planner Focus**
- Status badge (Recommended, Lighter, etc.)
- Mission title and description
- Action buttons (Start, Change, Add to calendar, Not today)
- Facts list: When, Duration, Place, Travel, Cost, Bring
- **Purpose**: Surfaces the most relevant action for today, with all practical details to reduce friction

**Day Agenda**
- List of missions for selected day
- Each item: time, status, title, duration/place
- Actions: Start, Move, Remove
- Empty state: "Open time" slot
- **Purpose**: Provides structure while maintaining openness—users see what's planned but can adjust

**Mission Library**
- List of available mission options
- Shows variant label and "Best fit" badge
- Preview and Add to calendar buttons
- **Purpose**: Offers choice and control—users can select different "sizes" of the same direction

**Planner Fit**
- Bullet points explaining why this mission matches current conditions
- **Purpose**: Builds trust by showing the reasoning behind recommendations

**Planner Result**
- Shows how previous reflections inform current suggestions
- **Purpose**: Demonstrates the adaptive learning loop—today's plan uses yesterday's learning

#### Alignment
- Two-column workspace on desktop (focus + agenda)
- Single column on mobile
- Sticky calendar on scroll

---

### 5. Check-In Page (`/app/check-in`)

**Purpose**: Record current energy and capacity levels

**Project Context**: The foundation of ReNew's adaptive system. Rather than diagnosing or scoring the user, this page helps them observe their current state without judgment. This observation directly shapes mission recommendations—ensuring actions match today's reality, not an idealized standard.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ checkin-header                          │
│ - Back button                           │
│ - Progress bar (Step X of Y)            │
├─────────────────────────────────────────┤
│ checkin-step (dynamic content)          │
│                                         │
│ [STEP 1: Mode Selection]                │
│ - Kicker: "A moment, not a measure"     │
│ - H1: "What is today giving you..."     │
│ - Description                           │
│ - Mode cards (Quick / Standard)         │
│                                         │
│ [STEPS 2-4: Signal Fields]              │
│ - Mood (Step 2)                         │
│ - Energy (Step 3)                       │
│ - Capacity (Step 4)                     │
│ - [Standard]: Stress, Sleep, Social     │
│                                         │
│ [FINAL STEP: Optional Note]             │
│ - H1: "Anything worth remembering?"     │
│ - Textarea (optional)                   │
├─────────────────────────────────────────┤
│ checkin-actions                         │
│ - Back button (when step > 0)           │
│ - Continue / Find a workable step       │
└─────────────────────────────────────────┘
```

#### Signal Field Component
- Fieldset with legend
- Prompt text
- 5 radio button options (Very low → Strong or inverse)
- Selected state: --color-forest border, --color-citron background
- **Purpose**: Each field captures one dimension of current capacity. The poetic prompts ("How does your inner weather feel?") encourage body-awareness rather than clinical self-assessment.

#### Quick vs Standard Mode
- **Quick**: 3 signals (Mood, Energy, Capacity) for fast check-ins
- **Standard**: 6 signals adding Stress, Sleep, Social load for deeper reflection
- **Purpose**: Respects user's time and energy—some days need 30 seconds, other days allow deeper attention

#### Alignment
- Single column, centered
- Max-width constrained
- Radio buttons in vertical stack

**Key Design Choice**: "A moment, not a measure" reinforces that this isn't a test or diagnosis—just observation to inform the next step.

---

### 6. Recommendation Page (`/app/recommendation`)

**Purpose**: Display recommended mission based on check-in

**Project Context**: Translates the user's observed capacity into a concrete, feasible action. The "A route that can bend" philosophy means recommendations stay connected to the user's vision while respecting today's limits. Multiple options reinforce that the user always has choice.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ flow-heading                            │
│ - Back button                           │
│ - Kicker, H1, description               │
├─────────────────────────────────────────┤
│ recommendation-primary                  │
│ - Large index number "01"               │
│ - Kicker: "Suggested for today"         │
│ - H2: Mission title                     │
│ - Description                           │
│ - Meta: duration, place                 │
│ - Primary CTA button                    │
├─────────────────────────────────────────┤
│ recommendation-reason                   │
│ - Icon + "Why this fits today"          │
│ - Bullet list of reasons                │
├─────────────────────────────────────────┤
│ alternative-section                     │
│ - "Other workable sizes"                │
│ - List of alternative missions          │
│   (variant, title, description, button) │
├─────────────────────────────────────────┤
│ recommendation-skip                     │
│ - "Nothing here needs to become..."     │
│ - "Pause for now" link                  │
└─────────────────────────────────────────┘
```

#### Recommendation Variants
- **Recommended**: Best fit for current conditions
- **Lighter**: Smaller version of the same action
- **Different setting**: Same action, different place
- **More time**: Extended duration if energy supports it
- **Alternative**: Another way to move in the same direction
- **Purpose**: Each variant maintains connection to the vision while adjusting scale—proving goals don't require all-or-nothing effort

#### Transparency Through Reasoning
- "Why this fits today" section explains the match
- Shows which preferences were considered (time, distance, cost, social effort)
- **Purpose**: Builds user understanding and trust in the system

#### Alignment
- Primary section: Full width with forest background
- Desktop: Indented from left (margin-left: 4.5rem)
- Reason and alternatives: Same indent on desktop

**Key Design Choice**: "You stay in control" emphasizes that alternatives exist and choosing none is always valid—removes pressure to "perform" recovery.

---

### 7. Mission Page (`/app/mission`)

**Purpose**: Active mission execution and tracking

**Project Context**: The "Do" phase of the ReNew loop. This page supports execution while maintaining psychological safety—the "Still counts" section explicitly validates partial effort and stopping, combating all-or-nothing thinking. Users learn that showing up partially still counts as progress.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ mission-topbar                          │
│ - Back button | Status badge            │
├─────────────────────────────────────────┤
│ mission-hero (deep-forest background)   │
│ - Kicker: "Today's Mission"             │
│ - H1: Mission title                     │
│ - Description                           │
│ - Meta: duration, place                 │
├─────────────────────────────────────────┤
│ mission-layout (2 columns on desktop)   │
│ ┌────────────────┬───────────────────┐  │
│ │ mission-actions│ mission-place     │  │
│ │                │                   │  │
│ │ - Kicker       │ - Visual swatch   │  │
│ │ - H2           │ - Place name      │  │
│ │ - Primary btn  │ - Details         │  │
│ │ - Secondary    │ - Link to place   │  │
│ │ - Text action  │                   │  │
│ └────────────────┴───────────────────┘  │
├─────────────────────────────────────────┤
│ mission-boundaries                      │
│ - "Still counts"                        │
│ - 4 boundary statements                 │
└─────────────────────────────────────────┘
```

#### Mission Actions
- **Planned**: "Start this step" button
- **In Progress**: "Mark complete" button
- **Completed/Not Today**: "Open reflection" button
- Always: "Make it smaller" and "Not today" options
- **Purpose**: Provides clear progression while always offering an exit—no penalty for stopping

#### Mission Place
- Visual swatch with color based on place type
- Place name, distance, cost, social mode
- Supplies list
- Link to place details
- **Purpose**: Connects abstract action to concrete location, reducing activation friction

#### Mission Boundaries
- "Stopping after arrival counts"
- "Changing the place counts"
- "Trying only the first two minutes counts"
- "Choosing not to continue today counts"
- **Purpose**: Actively dismantles perfectionism by validating all levels of participation

#### Alignment
- Hero: Full width, dark background
- Layout: 2-column grid on desktop
- Boundaries: Left border accent (--color-leaf)

**Key Design Choice**: The dark hero creates focus on the current mission, while the boundaries section provides psychological safety—users know they can stop without failure.

---

### 8. Reflection Page (`/app/reflection`)

**Purpose**: Record mission outcome and effort

**Project Context**: The "Review" phase of the ReNew loop. This isn't evaluation—it's observation. The language ("Reflection, not evaluation") and three outcome options (Completed, Partly, Not today) all validate that partial effort is data, not failure. This data directly shapes future recommendations.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ flow-heading                            │
│ - Back button                           │
│ - Kicker, H1, description               │
├─────────────────────────────────────────┤
│ reflection-mission                      │
│ - "Mission" label                       │
│ - Mission title                         │
├─────────────────────────────────────────┤
│ reflection-form                         │
│ - Outcome options (3 radio cards)       │
│   * Completed / Partly / Not today      │
│ - Effort options (5 radio buttons)      │
│   * Very light → Very heavy             │
│ - Optional note textarea                │
│ - Next adjustment notice (sky bg)       │
│ - Submit button                         │
└─────────────────────────────────────────┘
```

#### Outcome Options
- Card-style radio buttons
- Icon + label + copy for each
- Selected: --color-forest border, --color-citron background
- **Purpose**: Three valid endings remove the binary pass/fail mindset. "Partly" and "Not today" are successes, not failures.

#### Effort Options
- Horizontal radio buttons (5 on desktop)
- Circle indicator with selected state
- Selected: 3px border, forest background, paper color
- **Purpose**: Tracks effort separately from outcome—helps identify patterns (e.g., "low energy days lead to smaller missions")

#### Next Adjustment Notice
- Dynamic message based on outcome and effort
- Examples: "Keep this step available", "Begin one level smaller next time", "Pause without penalty"
- **Purpose**: Shows users how their reflection directly influences future recommendations—closes the learning loop

#### Alignment
- Single column, centered
- Outcome cards: Vertical stack
- Effort: Horizontal on desktop, vertical on mobile
- Left margin on desktop (4.5rem)

**Key Design Choice**: The sky-blue "What ReNew will carry forward" section transforms reflection from judgment into forward-looking adaptation.

---

### 9. Vision Page (`/app/vision`)

**Purpose**: Manage life vision statement

**Project Context**: The Vision is ReNew's anchor—it's the "north star" that persists even when daily capacity fluctuates. By keeping the vision separate from daily missions, users learn that adjusting today's step doesn't mean abandoning their larger direction. The vision can be paused (not deleted), reinforcing that rest is part of the process.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ planning-heading                        │
│ - Kicker, H1, description               │
│ - Status badge (active/paused)          │
├─────────────────────────────────────────┤
│ vision-statement (deep-forest bg)       │
│ - Large "V1" number (leaf color)        │
│ - Domain label                          │
│ - H2: Vision title                      │
│ - Description                           │
│ - Action buttons (Edit, Pause/Resume)   │
│   OR                                     │
│ vision-edit-form (when editing)         │
│ - Domain select                         │
│ - Title input                           │
│ - Description textarea                  │
│ - Cancel/Save buttons                   │
├─────────────────────────────────────────┤
│ vision-route-link                       │
│ - Kicker, H2, description               │
│ - "Open Life Route" button              │
├─────────────────────────────────────────┤
│ vision-principles                       │
│ - 3 principle statements                │
└─────────────────────────────────────────┘
```

#### Vision Statement
- Large decorative "V1" number (top right, leaf color)
- Domain label (e.g., "Study & focus")
- Title and description
- Edit/Pause actions
- **Purpose**: Makes the vision feel tangible and important—worthy of a "hero" section

#### Edit Form
- Domain select (8 life domains)
- Title input (max 90 chars)
- Description textarea (max 400 chars)
- **Purpose**: Encourages concise, memorable vision statements

#### Vision Principles
1. "You can rewrite this Vision at any time"
2. "Pausing does not remove your history or Route"
3. "Today's capacity changes the step, not your worth"
- **Purpose**: Reinforces core ReNew values—flexibility, continuity, and self-worth separate from productivity

#### Alignment
- Statement: Full width, dark background
- Large decorative number (top right)
- Content: Centered, max-width constrained
- Principles: Numbered list

**Key Design Choice**: The dark forest background with large "V1" number gives the vision ceremonial weight—it's the constant amid daily variation.

---

### 10. Route Page (`/app/route`)

**Purpose**: Manage adaptive life route steps

**Project Context**: The Route operationalizes the Vision into a ladder of progressively larger actions. Each step is a "size" of the same direction—from "Put one notebook in your bag" (Level 01) to "Complete one short focus block outside" (Level 05). This teaches that big goals are built from small, repeatable steps, and that any step can be adjusted, reordered, or paused without losing the overall direction.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ planning-heading (route-heading)        │
│ - Kicker, H1, description               │
│ - "View Vision" link button             │
├─────────────────────────────────────────┤
│ route-overview (3 columns on desktop)   │
│ - Steps explored count                  │
│ - Sizes available count                 │
│ - Progress bar with percentage          │
├─────────────────────────────────────────┤
│ route-manager                           │
│ - Heading + "Add step" button           │
│ - Ordered list of route steps           │
│   Each step:                            │
│   - Complete button (circle/check)      │
│   - Level label                         │
│   - Title + metadata                    │
│   - Actions (up, down, edit, delete)    │
├─────────────────────────────────────────┤
│ route-editor (conditional)              │
│ - Form with title, minutes, place       │
│ - Save/Cancel buttons                   │
└─────────────────────────────────────────┘
```

#### Route Overview
- Steps explored count
- Sizes still available count
- Progress bar with percentage
- **Purpose**: Shows progress without pressure—the route is a menu of options, not a checklist

#### Route Manager List
- Each step: min-height 6rem
- Grid layout: [complete-btn] [level] [copy] [actions]
- Completed state: strikethrough, reduced opacity
- Actions: 2x2 grid on mobile, 4-column on desktop (move up/down, edit, delete)
- **Purpose**: Full user control—reorder, rewrite, or remove any step. The route belongs to them.

#### Route Editor
- Background: --color-citron
- Fields: Title (text), Minutes (number), Place type (text)
- Desktop: 3-column field layout
- **Purpose**: Quick editing to adjust step scale or setting

#### Alignment
- Overview: 3-column grid on desktop
- Manager: Full width list
- Editor: Indented on desktop (margin-left: 4.5rem)

**Key Design Choice**: Level numbering (01-05) and the "From smallest to widest" framing reinforce that all steps are valid—there's no "right" size, only what fits today.

---

### 11. Places Page (`/app/places`)

**Purpose**: Browse and filter local places

**Project Context**: Implements ReNew's "Local Life Network" concept—real places become part of the user's route. By reviewing places for distance, cost, accessibility, and social load, ReNew removes the guesswork from "where can I do this?" This grounds abstract missions in physical reality, making action more accessible.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ discovery-heading                       │
│ - Kicker, H1, description               │
│ - "Community steps" link                │
├─────────────────────────────────────────┤
│ place-tools                             │
│ - Search input                          │
│ - Saved filter button                   │
├─────────────────────────────────────────┤
│ place-type-tabs                         │
│ - All | Library | Cafe | Park | Community│
├─────────────────────────────────────────┤
│ place-result-meta                       │
│ - Count: "X reviewed places"            │
│ - Distance preference                   │
├─────────────────────────────────────────┤
│ place-results                           │
│ - List of place results                 │
│   Each:                                 │
│   - Visual swatch (colored)             │
│   - Copy (distance, name, description)  │
│   - Tags (social load, accessibility)   │
│   - Save button (bookmark)              │
│   OR                                    │
│ empty-results (when no matches)         │
│ - Message + Reset button                │
└─────────────────────────────────────────┘
```

#### Place Result
- Visual: Colored background with border decoration
- Desktop: 3-column grid (visual, copy, save button)
- Tags: Small uppercase labels with border
- **Purpose**: Each tag (social load, accessibility features) helps users quickly assess if this place fits their current capacity

#### Filtering System
- Search by name, type, description
- Filter by place type (Library, Cafe, Park, Community)
- Filter by saved status
- **Purpose**: Reduces decision fatigue—users find suitable places quickly

#### Alignment
- Single column, max-width 70rem
- Results: Border-separated list
- Desktop: Horizontal card layout

**Key Design Choice**: "Reviewed" places are pre-vetted for safety and accessibility, removing the anxiety of trying an unfamiliar place alone.

---

### 12. Place Detail Page (`/app/places/:placeId`)

**Purpose**: Detailed view of a specific place

**Project Context**: Provides comprehensive information to reduce the anxiety of visiting a new place. The "Why it fits" section connects the place to the user's stated preferences, while access notes prepare them for the environment. This transforms a place from an unknown variable into a chosen part of their route.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ detail-topbar                           │
│ - Back button | Save/Unsave button      │
├─────────────────────────────────────────┤
│ place-detail-hero (2 columns desktop)   │
│ ┌────────────────┬───────────────────┐  │
│ │ visual swatch  │ title section     │  │
│ │ (colored)      │ - Kicker          │  │
│ │                │ - H1: Place name  │  │
│ │                │ - Description     │  │
│ │                │ - CTA button      │  │
│ └────────────────┴───────────────────┘  │
├─────────────────────────────────────────┤
│ place-facts (4 columns desktop)         │
│ - Address, Hours, Cost, Social load     │
├─────────────────────────────────────────┤
│ place-detail-grid (2 columns desktop)   │
│ ┌────────────────┬───────────────────┐  │
│ │ place-fit      │ place-access      │  │
│ │ - Why it fits  │ - Accessibility   │  │
│ │ - Check marks  │ - Tags            │  │
│ │                │ - Privacy note    │  │
│ └────────────────┴───────────────────┘  │
├─────────────────────────────────────────┤
│ related-places                          │
│ - "Two nearby alternatives"             │
│ - List of 2 related places              │
└─────────────────────────────────────────┘
```

#### Place Facts
- Grid layout with icon, label, value
- Desktop: 4 columns
- Mobile: Stacked with borders
- **Purpose**: Practical details (hours, cost, address) reduce logistical friction

#### Place Fit Section
- Check marks showing alignment with preferences
- Within/outside preferred distance
- Cost and social load match
- **Purpose**: Validates the choice and builds confidence

#### Place Access Section
- Accessibility tags (wheelchair access, quiet space, etc.)
- Privacy note about location data
- **Purpose**: Prepares users for the physical environment and reinforces data privacy

#### Related Places
- 2 nearby alternatives
- **Purpose**: Provides backup options—if this place feels overwhelming, another is nearby

#### Alignment
- Hero: 2-column grid on desktop
- Facts: 4-column grid on desktop
- Details: 2-column grid on desktop

**Key Design Choice**: "Use for current Mission" button directly connects place discovery to action—users can immediately apply this place to their active mission.

---

### 13. Community Page (`/app/community`)

**Purpose**: Browse community activities

**Project Context**: Implements ReNew's "low-pressure social" principle. Community activities are structured, reviewed, and optional—no random matching, no private messaging, no live location sharing. This page helps users find "being alongside others" without the demands of socializing, supporting those who find typical community settings overwhelming.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ discovery-heading                       │
│ - Kicker, H1, description               │
│ - "Browse places" link                  │
├─────────────────────────────────────────┤
│ community-safety-note                   │
│ - Shield icon + safety message          │
├─────────────────────────────────────────┤
│ place-tools                             │
│ - Search input                          │
│ - Joined filter button                  │
├─────────────────────────────────────────┤
│ place-type-tabs                         │
│ - All social settings | Low | Medium    │
├─────────────────────────────────────────┤
│ community-list                          │
│ - List of activity articles             │
│   Each:                                 │
│   - Date mark (numbered, colored)       │
│   - Copy (host, title, description)     │
│   - Tags (place, social, capacity)      │
│   - Detail link arrow                   │
│   OR                                    │
│ empty-results                           │
└─────────────────────────────────────────┘
```

#### Community Safety Note
- Shield icon with message: "Structured and reviewed. No private messages, random one-to-one matching, or live location sharing."
- **Purpose**: Immediately establishes safety boundaries—critical for users who may have had negative social experiences

#### Community List Item
- Desktop: 3-column grid (date-mark, copy, link)
- Date mark: --color-citron background, large number
- Tags: Small uppercase labels
- Joined tag: --color-leaf background
- **Purpose**: Clear structure (host, venue, time, capacity) reduces uncertainty

#### Social Load Filtering
- All / Low / Medium social load
- **Purpose**: Empowers users to choose their comfort level—no surprise social demands

#### Alignment
- Single column, max-width 70rem
- List items: Border-separated
- Desktop: Horizontal layout with date mark

**Key Design Choice**: "Shared action without social pressure" captures the essence—community as optional backdrop, not obligation.

---

### 14. Community Detail Page (`/app/community/:activityId`)

**Purpose**: Detailed view and participation in community activity

**Project Context**: Provides full transparency before commitment. Users see exactly what they're joining—host, venue, group size, social load—and can make an informed choice. The confirmation dialog and easy cancellation reinforce that participation is always voluntary and reversible.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ detail-topbar                           │
│ - Back button | "Joined" badge          │
├─────────────────────────────────────────┤
│ community-detail-hero (deep-forest bg)  │
│ - Kicker: "Reviewed Community Step"     │
│ - H1: Activity title                    │
│ - Description                           │
│ - Large "C1" number (leaf color)        │
├─────────────────────────────────────────┤
│ community-facts (4 columns desktop)     │
│ - When, Where, Group, Social load       │
├─────────────────────────────────────────┤
│ community-detail-grid (2 columns)       │
│ ┌────────────────┬───────────────────┐  │
│ │ participation  │ host-panel        │  │
│ │ - Points list  │ - Host name       │  │
│ │ - Join/Cancel  │ - Description     │  │
│ │   button       │ - Venue link      │  │
│ └────────────────┴───────────────────┘  │
├─────────────────────────────────────────┤
│ participation-confirm (dialog)          │
│ - Confirmation message                  │
│ - Go back / Confirm buttons             │
├─────────────────────────────────────────┤
│ community-report                        │
│ - Warning icon + message                │
│ - Report activity button                │
│   OR                                    │
│ report-form (when open)                 │
│ - Reason select, details textarea       │
│ - Submit button                         │
└─────────────────────────────────────────┘
```

#### Participation Panel
- 4 check-marked points about safety:
  1. Activity happens in a reviewed public place
  2. Conversation is optional unless clearly stated
  3. Can leave or cancel at any point
  4. No private contact details shared in ReNew
- Primary CTA: "Join this step" or "Cancel participation"
- Confirmation dialog before action
- **Purpose**: Sets clear expectations and reinforces autonomy

#### Host Panel
- Host name and description
- Link to venue details
- **Purpose**: Transparency about who's organizing builds trust

#### Report Feature
- "Something does not look right?" section
- Reason select (incorrect details, safety concern, host concern, other)
- Details textarea
- **Purpose**: User-controlled safety mechanism—empowers community to self-moderate

#### Alignment
- Hero: Full width, dark background
- Facts: 4-column grid on desktop
- Grid: 2-column on desktop
- Report: Full width with border

**Key Design Choice**: "ReNew will only save your participation on this device" in the confirmation dialog reinforces local-first privacy—no social data leaves the user's control.

---

### 15. Insights Page (`/app/insights`)

**Purpose**: View activity patterns and statistics

**Project Context**: Demonstrates that ReNew doesn't score or diagnose—it describes. The Insights page shows patterns in the user's own activity (mission outcomes, sizes, settings, conditions) without comparing to norms or prescribing "improvement." This reinforces self-awareness without self-judgment.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ activity-insights-header                │
│ - Kicker, H1, description               │
│ - Range selector (7/28/all days)        │
├─────────────────────────────────────────┤
│ insight-view-tabs                       │
│ - Overview | Activity | Patterns        │
├─────────────────────────────────────────┤
│ insight-view-panel                      │
│                                         │
│ [OVERVIEW VIEW]                         │
│ ┌───────────────────────────────────┐   │
│ │ activity-summary                  │   │
│ │ - Stats grid (6 metrics)          │   │
│ └───────────────────────────────────┘   │
│ ┌────────────────┬──────────────────┐   │
│ │ insight-recent │ insight-next     │   │
│ │ - Recent       │ - Upcoming       │   │
│ │   activity     │   plans          │   │
│ │   timeline     │   (next 7 days)  │   │
│ └────────────────┴──────────────────┘   │
│ ┌───────────────────────────────────┐   │
│ │ insight-route-strip               │   │
│ │ - Vision + progress bar           │   │
│ └───────────────────────────────────┘   │
│                                         │
│ [ACTIVITY VIEW]                         │
│ ┌───────────────────────────────────┐   │
│ │ Activity filters                  │   │
│ │ (All/Missions/Check-Ins/Plans)    │   │
│ ├───────────────────────────────────┤   │
│ │ activity-timeline                 │   │
│ │ - Chronological event list        │   │
│ │   with icons and details          │   │
│ └───────────────────────────────────┘   │
│                                         │
│ [PATTERNS VIEW]                         │
│ ┌───────────────────────────────────┐   │
│ │ pattern-section (01)              │   │
│ │ - Mission results bar chart       │   │
│ ├───────────────────────────────────┤   │
│ │ pattern-section (02)              │   │
│ │ - Mission size distribution       │   │
│ ├───────────────────────────────────┤   │
│ │ pattern-section (03)              │   │
│ │ - Setting distribution            │   │
│ ├───────────────────────────────────┤   │
│ │ pattern-section (04)              │   │
│ │ - Conditions comparison           │   │
│ └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

#### Activity Summary Stats
- 6 metrics in grid:
  1. Missions chosen
  2. Completed
  3. Partly completed
  4. Not today
  5. Recorded time
  6. Next 7 days planned
- **Purpose**: Provides objective record without judgment—"partly" and "not today" are counted as valid outcomes

#### Activity Timeline
- Chronological list of events
- Each event: date/time, icon, eyebrow, title, detail
- Event types: missions, check-ins, plans
- Compact view (4 items) in overview
- **Purpose**: Creates coherent narrative from scattered actions—shows how small steps accumulate

#### Pattern Sections
- Bar charts with proportional widths
- 4 pattern types:
  1. Mission outcomes (completed/partly/not today)
  2. Mission size (duration groups)
  3. Setting (in person/at home/online)
  4. Conditions (energy vs mission size)
- **Purpose**: Helps users see their own patterns—"I tend to do shorter missions on low-energy days"—without prescribing change

#### Alignment
- Header: Two-column (title + range selector)
- Tabs: Horizontal scroll on mobile
- Overview: Mixed grid layouts
- Activity: Full-width timeline
- Patterns: Stacked sections

**Key Design Choice**: "These comparisons describe your activity only. They do not score or diagnose you." explicitly states the non-judgmental intent.

---

### 16. Settings Page (`/app/settings`)

**Purpose**: Manage profile, preferences, and data

**Project Context**: Empowers users to control their ReNew experience on their own terms. The "Keep ReNew on your terms" messaging reinforces autonomy. Settings are organized to show how different aspects (profile, rhythm, planning, data) work together to create a personalized experience that respects the user's context.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ settings-heading                        │
│ - Kicker, H1, description               │
├─────────────────────────────────────────┤
│ settings-layout (2 columns desktop)     │
│ ┌────────────────┬───────────────────┐  │
│ │ settings-section│ settings-section │  │
│ │ - Profile       │ - Rhythm &       │  │
│ │   - Name input  │   comfort        │  │
│ │   - Email input │   - Frequency    │  │
│ │   - Save button │   - Day select   │  │
│ │                 │   - Time select  │  │
│ │                 │   - Reminders    │  │
│ │                 │   - Reduced      │  │
│ │                 │     motion       │  │
│ ├────────────────┼───────────────────┤  │
│ │ settings-section│ settings-section │  │
│ │ - Planning      │ - Data controls  │  │
│ │   - Vision link │   - Export JSON  │  │
│ │   - Prefs link  │   - Reset demo   │  │
│ │   - Support link│   - Sign out     │  │
│ └────────────────┴───────────────────┘  │
└─────────────────────────────────────────┘
│                                         │
│ reset-confirm (dialog, conditional)      │
│ - Warning message                       │
│ - Keep data / Reset buttons             │
└─────────────────────────────────────────┘
```

#### Settings Sections
1. **Profile**: Name, email inputs with save button
   - **Purpose**: Personalization without requirement—ReNew works even with minimal profile info

2. **Rhythm and Comfort**:
   - Frequency select (daily/weekdays/weekly/custom)
   - Day select (for weekly)
   - Custom day toggles (for custom)
   - Time select
   - Reminders toggle
   - Reduced motion toggle
   - **Purpose**: Adapts the app to the user's life, not the other way around. Check-In rhythm respects their natural patterns

3. **Planning**: Links to Vision, Preferences, Support
   - **Purpose**: Quick navigation to core planning features

4. **Data Controls**: Export, Reset, Sign out
   - **Purpose**: Full user control over their data—export, reset, or leave. No lock-in.

#### Alignment
- Desktop: 2x2 grid of sections
- Mobile: Single column stack
- Reset dialog: Fixed position, centered

**Key Design Choice**: "Frontend records are stored in IndexedDB on this browser. Nothing is sent to a server in this build." reinforces local-first privacy at the point where users might wonder about data handling.

---

### 17. Support Page (`/app/support`)

**Purpose**: Manage trusted contact and handoff messaging

**Project Context**: Implements ReNew's "user-controlled support" principle. ReNew can prepare a handoff message but never sends it automatically. This page helps users communicate with trusted contacts when they choose, without the app making assumptions about their support network. The explicit data exclusions (Check-Ins, Reflections) reinforce that mental health data is sensitive and user-controlled.

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ support-heading                         │
│ - Kicker, H1, description               │
│ - ShieldCheck icon (right)              │
├─────────────────────────────────────────┤
│ support-grid (2 columns desktop)        │
│ ┌────────────────┬───────────────────┐  │
│ │ trusted-contact│ support-message   │  │
│ │ panel          │ panel             │  │
│ │                │                   │  │
│ │ - Form or      │ - Message         │  │
│ │   saved view   │   starters (3)    │  │
│ │                │ - Textarea        │  │
│ │                │ - Review button   │  │
│ └────────────────┴───────────────────┘  │
├─────────────────────────────────────────┤
│ handoff-preview (conditional)           │
│ - Full message preview                  │
│ - Included/excluded data list           │
│ - Approval checkbox                     │
│ - Open SMS / Open phone buttons         │
├─────────────────────────────────────────┤
│ formal-support-note                     │
│ - Shield icon + message                 │
│ - "No automatic contact" label          │
└─────────────────────────────────────────┘
```

#### Trusted Contact Panel
- Form: Name, phone, relationship inputs
- Saved view: Display with edit/remove buttons
- Validation: Required fields
- **Purpose**: Establishes the human connection—someone the user chooses, not assigned by the app

#### Support Message Panel
- 3 message starter buttons (numbered 01, 02, 03)
- Textarea for custom message
- "Review handoff" button (disabled until contact saved)
- **Purpose**: Lowers the barrier to reaching out—users don't need to find the right words themselves

#### Handoff Preview
- Recipient details
- Channel explanation (SMS or phone)
- Full message preview
- Included data list (only phone number and message)
- Excluded data list (Check-Ins, Reflections, diagnosis language, location)
- Approval checkbox (required)
- Action buttons: Open SMS, Open phone
- **Purpose**: Full transparency before any action—users see exactly what will be shared and what won't

#### Alignment
- Desktop: 2-column grid
- Mobile: Single column
- Preview: Full width with border
- Formal note: Flex row with icon

**Key Design Choice**: "ReNew never sends a message, starts a call, or shares your data on its own." The app prepares, the user decides. This is the ultimate expression of user control.

---

## Shared Components

### Buttons

#### Primary Command (.primary-command)
- Min-height: 3.5rem
- Border: 1px solid --color-ink
- Background: --color-ink
- Color: --color-paper
- Padding: 0 1rem
- Font-weight: 600
- Hover: Inverts colors (paper bg, ink text)

#### Secondary Command (.secondary-command)
- Min-height: 3.5rem
- Border: 1px solid --color-ink
- Background: transparent
- Color: inherit
- Hover: Background change

#### Icon Button (.icon-button)
- Size: 2.75rem × 2.75rem
- Border: 1px solid currentColor
- Background: transparent
- Grid centered icon
- Used for: Back buttons, close buttons, actions

#### Text Button (.text-button)
- No border or background
- Underlined text
- Used for: Secondary actions, links

### Form Elements

#### Input Fields
- Min-height: 3.25rem - 3.5rem
- Border: 1px solid --color-ink
- Background: transparent
- Padding: 0 0.75rem - 1rem
- Font-size: 1rem
- Focus: Box shadow with --color-leaf

#### Field Groups
- Display: grid
- Gap: 0.5rem
- Label: 0.72rem, uppercase, bold
- Input: Full width

### Navigation Patterns

#### Desktop Sidebar (AppShell)
- Fixed left side
- Width: Auto (content-based)
- Navigation links with icons
- Active state: Visual indicator

#### Mobile Bottom Navigation
- Fixed bottom
- 4 items: Today, Route, Places, Insights
- Icons + labels
- Active state: --color-forest

#### Mobile App Drawer
- Fixed top (below header)
- Full width
- Background: --color-citron
- Navigation links with icons

---

## Responsive Breakpoints

### Mobile First Approach
- **Base**: < 48rem (768px) - Mobile layout
- **Tablet**: ≥ 48rem (768px) - Enhanced layouts
- **Desktop**: ≥ 64rem (1024px) - Full desktop experience

### Key Changes at Breakpoints

#### At 48rem (tablet)
- Auth pages: Two-column layout
- Headings: Larger (3.5rem - 4.5rem)
- Process list: 3-column grid
- Place mosaic: 2-column grid
- Community facts: 4-column grid
- Route overview: 3-column grid
- Settings: 2-column layout
- Insights stats: 4-column grid

#### At 64rem (desktop)
- Landing header: Desktop nav visible
- Hero H1: 11rem
- Hero script: 4rem
- Scroll cue: Shows text label
- Manifesto copy: 75% width, left-aligned
- Section headings: 2-column grid
- Route/trust layouts: 2-column with sticky intro
- Place mosaic: 3-column asymmetric grid
- e-ICON: 2-column layout, larger number

---

## Accessibility Features

### ARIA Labels
- All interactive elements have aria-labels
- Navigation has aria-label attributes
- Form fields have proper labels
- Dialogs use aria-modal and aria-labelledby

### Keyboard Navigation
- All interactive elements are focusable
- Focus visible states with box shadows
- Logical tab order maintained

### Screen Reader Support
- Semantic HTML (main, nav, header, section, article)
- Live regions for dynamic content (aria-live)
- Hidden text for icons (sr-only class)
- Role attributes for tabs and tablists

### Motion Preferences
- Respects prefers-reduced-motion
- Disables animations when enabled
- Maintains functionality without motion

---

## State Management

### AppState Context
- Centralized state using React Context
- IndexedDB for persistence
- Local-first architecture
- Demo data available for testing

### Key State Slices
- **profile**: User name, email, sign-in status
- **vision**: Life vision (title, description, domain, status)
- **route**: Adaptive life route steps
- **recommendations**: Available mission options
- **mission**: Current active mission
- **plannedMissions**: Scheduled missions
- **checkIns**: Check-in records
- **reflections**: Mission reflections
- **places**: Local places database
- **savedPlaceIds**: User's saved places
- **community**: Community activities
- **settings**: User preferences
- **trustedContact**: Support contact

---

## Data Flow

### Check-In → Recommendation → Mission → Reflection

1. **Check-In**: User records energy/capacity
2. **Recommendation**: System generates mission options
3. **Mission**: User selects and executes mission
4. **Reflection**: User records outcome and effort
5. **Insights**: System updates patterns and statistics

### Route Adaptation
- Each reflection can mark route steps as completed
- Completed steps unlock next level
- Mission recommendations adapt to route progress

---

## Performance Considerations

### Optimizations
- CSS custom properties for theming
- Minimal re-renders with useMemo
- Lazy loading of page components
- Efficient IndexedDB queries
- Debounced search inputs

### Bundle Strategy
- Vite for fast builds
- Tree shaking for lucide-react icons
- Code splitting by route
- Shared component library

---

## Browser Support

### Supported Browsers
- Modern browsers with CSS Grid support
- IndexedDB support required
- ES2020+ JavaScript support

### Progressive Enhancement
- Graceful degradation for older browsers
- Core functionality without animations
- Semantic HTML for accessibility

---

## Development Notes

### File Structure
```
frontend/src/
├── components/
│   └── AppShell.tsx          # Main app wrapper
├── pages/
│   ├── LandingPage (in App.tsx)
│   ├── SignInPage.tsx
│   ├── OnboardingPage.tsx
│   ├── TodayPage.tsx
│   ├── CheckInPage.tsx
│   ├── RecommendationPage.tsx
│   ├── MissionPage.tsx
│   ├── ReflectionPage.tsx
│   ├── VisionPage.tsx
│   ├── RoutePage.tsx
│   ├── PlacesPage.tsx
│   ├── PlaceDetailPage.tsx
│   ├── CommunityPage.tsx
│   ├── CommunityDetailPage.tsx
│   ├── InsightsPage.tsx
│   ├── SettingsPage.tsx
│   └── SupportPage.tsx
├── data/
│   ├── appData.ts            # Type definitions
│   └── missionLogic.ts       # Recommendation logic
├── state/
│   └── AppState.tsx          # Global state management
├── styles.css                # Landing page styles
├── app.css                   # App page styles
├── App.tsx                   # Route definitions
└── main.tsx                  # Entry point
```

### Icon Library
- **lucide-react**: Consistent icon set
- All icons are 1rem - 1.25rem by default
- aria-hidden="true" on decorative icons

### Naming Conventions
- Components: PascalCase
- CSS classes: kebab-case
- State variables: camelCase
- Constants: UPPER_SNAKE_CASE

---

## Future Enhancements

### Potential Features
- Backend integration for data sync
- Push notifications for reminders
- Advanced analytics dashboard
- Social features (opt-in)
- Multi-language support
- Dark mode toggle
- Export to PDF reports

### Technical Debt
- Extract more shared components
- Add unit tests for logic
- Implement error boundaries
- Add loading skeletons
- Optimize bundle size further

---

## Conclusion

ReNew's frontend is designed with a calm, supportive aesthetic that prioritizes user comfort and control. The design system emphasizes clarity, gentle guidance, and respect for user autonomy. Every element serves the core philosophy: help users recognize their capacity, choose feasible actions, and connect with real places at their own pace.

The application is fully responsive, accessible, and built with modern React patterns. The local-first architecture ensures privacy while providing a rich, personalized experience.