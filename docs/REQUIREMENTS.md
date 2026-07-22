# Waymark - Product Requirements (v1)

## 1. Vision

A calm, focused app for planning a trip with someone else. The core idea is a
clear split between shared trip content that every member sees and private notes
that stay with their author. The product should feel deliberate and premium, not
like a generic list template.

## 2. Target users

- Primary: two people planning a shared trip (a couple, two friends, a parent
  and adult child). One creates the trip and invites the other.
- Secondary: a small group of up to a handful of members on one trip.

The data model supports many members per trip from the start; the v1 experience
is tuned and tested for two.

## 3. Scope overview

| Area | In v1 | Notes |
| --- | --- | --- |
| Email authentication | Yes | Sign up, sign in, sign out, session restore |
| Profile | Yes | Display name and optional avatar |
| Create and manage trips | Yes | Name, destination, dates, optional cover image |
| Invitations | Yes | 8-character code and shareable link; accept flow |
| Shared itinerary | Yes | Create, edit, reorder, mark status |
| Shared packing list | Yes | Items, quantity, per-member assignment, checked |
| Notes (shared and private) | Yes | Per-member private notes and shared notes |
| Scheduled reminders | Yes | Local scheduled notification for an itinerary item |
| Empty, loading, error, offline states | Yes | Required on every screen |
| Web build | Yes | Same codebase; responsive layout |
| Server-driven push | No (v1.1) | Local notifications only in v1 |
| Maps, chat, AI, payments | No | See README non-goals |

## 4. Functional requirements

Each requirement has an ID and acceptance criteria. "Member" means an
authenticated user who belongs to the trip. "Owner" means the member who created
the trip.

### 4.1 Authentication (AUTH)

- AUTH-1: A user can create an account with email and password.
  - Acceptance: invalid email or weak password is rejected inline with a clear
    message; on success the user lands in the authenticated area.
- AUTH-2: A user can sign in and sign out.
  - Acceptance: signing out clears the session and returns to the sign-in
    screen; no authenticated data remains readable.
- AUTH-3: A returning user's session is restored on app launch.
  - Acceptance: with a valid stored session the user skips the sign-in screen;
    with an expired session they are routed to sign-in without a crash.
- AUTH-4: The session token is stored in secure device storage.
  - Acceptance: tokens are not held in plain AsyncStorage on native.

### 4.2 Profile (PROF)

- PROF-1: A new user sets a display name during first-run onboarding.
- PROF-2: A user can edit their display name and avatar later.
  - Acceptance: changes persist and are visible to co-members where a name or
    avatar is shown (for example, packing assignment).

### 4.3 Trips (TRIP)

- TRIP-1: A member can create a trip with a name; destination, start date, end
  date, and cover image are optional.
- TRIP-2: The creator becomes the owner and an automatic member.
- TRIP-3: A member sees a list of only the trips they belong to.
- TRIP-4: The owner can edit trip details and delete the trip.
  - Acceptance: a non-owner member cannot edit or delete the trip; deleting a
    trip removes its itinerary, packing items, notes, invites, and membership.
- TRIP-5: A member can leave a trip; the owner cannot leave without transferring
  or deleting (v1: owner deletes; transfer is out of scope).

### 4.4 Invitations (INV)

- INV-1: An owner or member can generate an invitation to a trip that produces
  an 8-character code and a shareable link.
- INV-2: An invited person accepts by entering the code or opening the link
  while signed in; they become a member.
  - Acceptance: acceptance is performed by a server-side routine, not a direct
    client insert into membership; an expired or already-accepted invite is
    rejected with a clear message.
- INV-3: An invite has an expiry.
- INV-4: Accepting an invite never grants access to any trip other than the one
  the invite targets.

### 4.5 Itinerary (ITIN)

- ITIN-1: A member can add an itinerary item with a title; description,
  location, start time, and end time are optional.
- ITIN-2: A member can edit and delete any itinerary item on the trip (shared
  content).
- ITIN-3: A member can reorder items and set a status (planned, confirmed,
  done).
- ITIN-4: All members see the same itinerary content.

### 4.6 Packing list (PACK)

- PACK-1: A member can add a packing item with a label and optional quantity.
- PACK-2: A member can assign an item to any member or leave it unassigned.
- PACK-3: A member can mark an item packed or unpacked.
- PACK-4: All members see the same packing list.

### 4.7 Notes (NOTE)

- NOTE-1: A member can write a note on a trip and choose whether it is shared
  with all members or private to themselves. Private is the default.
- NOTE-2: A private note is visible only to its author. No other member,
  including the owner, can read it.
- NOTE-3: A shared note is visible to all members of the trip.
- NOTE-4: A member can edit and delete only their own notes.

This requirement is the product's central security guarantee and must be covered
by automated tests (see `SECURITY.md`).

### 4.8 Reminders (REM)

- REM-1: A member can set a reminder for an itinerary item with a start time.
- REM-2: The app requests notification permission with a clear priming screen
  before the system prompt.
- REM-3: At the reminder time the device shows a local notification; opening it
  routes to the relevant trip and item.
  - Acceptance: reminders are scheduled locally on the device in v1; declining
    permission degrades gracefully without breaking the itinerary flow.

### 4.9 Application states (STATE)

- STATE-1: Every screen that loads data shows a loading state, a distinct empty
  state, and an error state with a retry affordance.
- STATE-2: When the device is offline, the app shows an unobtrusive offline
  indicator and reads any cached data it already has rather than crashing.

## 5. Non-functional requirements

- NFR-1 Platforms: one Expo codebase targets iOS, Android, and web.
- NFR-2 Type safety: TypeScript strict mode; no implicit any; `typecheck` passes
  in CI.
- NFR-3 Quality gates: lint, typecheck, unit tests, and database policy tests
  all pass before a change is considered done.
- NFR-4 Security: Row Level Security is enabled on every table holding user data;
  isolation is proven by tests, not assumed.
- NFR-5 Accessibility: meet WCAG 2.1 AA for contrast; all interactive elements
  are labeled for screen readers; the app supports larger text sizes and honors
  reduced-motion.
- NFR-6 Performance: cold start to interactive under about three seconds on a
  recent mid-range device; lists stay smooth at a few hundred items.
- NFR-7 Design fidelity: the UI uses a defined token system; no hard-coded
  colors, spacing, or fonts in feature code.
- NFR-8 Privacy: collect only what the features need; no analytics on note
  content; a plain-language privacy note is available.

## 6. Success criteria (portfolio)

- A public repository with a clear README, architecture docs, and screenshots.
- A live web build and a runnable development build on a physical iPhone.
- Passing pgTAP RLS tests demonstrating private-versus-shared isolation, visible
  in CI.
- A short demo video walking the create-trip, invite, plan, and private-note
  flows.
- Two to four polished portfolio screenshots suitable for the Upwork profile.
