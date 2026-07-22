# Waymark

Working codename for a shared trip-planning mobile app. This is the flagship
React Native portfolio piece: a small, real, polished product rather than a
demo. The name is a placeholder and can be changed before any public release.

## What it is

Waymark helps a small group (starting with two people) plan a trip together.
Trip members share an itinerary and a packing list, and each member can keep
private notes that no other member can see. It runs from a single Expo codebase
on iOS, Android, and web.

## Why it exists (portfolio goals)

- Demonstrate production React Native and Expo across iOS, Android, and web.
- Demonstrate Supabase Auth and PostgreSQL Row Level Security with tested,
  provable isolation between private and shared data.
- Demonstrate native capability integration (scheduled notifications) and
  deliberate, non-template product design.
- Demonstrate a complete delivery: migrations, tests, CI gates, EAS builds,
  documentation, and a public repository with a clear README.
- Use a safe domain. No health, children's, financial, or otherwise regulated
  data, so the app can be public without compliance exposure.

This app is also designed to produce truthful evidence for future client work:
a real Supabase RLS implementation with adversarial tests, a real cross-platform
Expo delivery, and a real native-integration example.

## Status

In progress. All v1 screens are implemented against the live Supabase backend:
auth (email + password, secure-store sessions on native), trips list and
creation (via the `create_trip` RPC), invites (accepted via
`accept_trip_invite`), the full trip detail (itinerary, packing, notes with
the private-versus-shared rule enforced by RLS), trip settings, profile, and
onboarding. Storage covers trip covers and avatars through private buckets
and signed URLs. A 24-test pgTAP suite proves the RLS isolation. Remaining:
CI wiring, EAS builds, the notification priming screen, storage policy tests,
and itinerary drag-reorder.

### Running

```
cp .env.example .env   # fill from `supabase start` (local) or the Dashboard
supabase start         # local Postgres + Auth + Storage
pnpm install
pnpm start             # Expo dev server (press i / a / w)
pnpm typecheck         # TypeScript
pnpm lint              # ESLint
pnpm test              # Vitest (pure logic)
supabase test db       # pgTAP RLS suite
```

## Documentation

- `docs/REQUIREMENTS.md` - product vision, scope, functional and non-functional
  requirements, and success criteria.
- `docs/ARCHITECTURE.md` - stack, project structure, data model, data-access
  patterns, build and release, testing strategy.
- `docs/SECURITY.md` - authentication, Row Level Security model, policies, the
  private-versus-shared rule, and the RLS test matrix.
- `docs/DESIGN_HANDOFF.md` - the brief to hand to a design agent to produce the
  UI system and screens.

## Prerequisites to confirm before implementation

- Node 20+, pnpm, Xcode, Android Studio, an iOS Simulator and Android emulator.
- A Supabase project (local development via the Supabase CLI, plus a hosted
  project for shared builds).
- Optional for store release: an Apple Developer account and a Google Play
  Console account. The portfolio value is achievable via a public web build plus
  TestFlight and Play internal testing even before paid store listings.

## Non-goals for v1

Maps and geosearch, in-app chat, real-time collaborative editing, AI features,
payments and subscriptions, offline write sync with conflict resolution, and
social feeds. These are explicitly out of scope for the first release and are
listed so scope does not creep during the build.
