# Waymark

[![CI](https://github.com/ChutLuis/waymark/actions/workflows/ci.yml/badge.svg)](https://github.com/ChutLuis/waymark/actions/workflows/ci.yml)

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
- Demonstrate a complete delivery: migrations, tests, CI gates, EAS configuration,
  documentation, and a public repository with a clear README.
- Use a safe domain. No health, children's, financial, or otherwise regulated
  data, so the app can be public without compliance exposure.

This app is also designed to produce truthful evidence for future client work:
a real Supabase RLS implementation with adversarial tests, a real cross-platform
Expo delivery, and a real native-integration example.

## Status

The full v1 is implemented against a LIVE Supabase backend (Postgres, Auth,
Storage, and RLS) and deployed to a hosted project. Email authentication and
onboarding, trip listing and creation, itinerary planning, packing, shared and
private notes, deep-link invite joining, local reminders, offline handling,
and storage for covers and avatars are working. A 33-test pgTAP RLS suite runs
GREEN in CI, proving private-versus-shared isolation. The remaining portfolio
and release work is listed in the roadmap below. EAS is configured for the
`@chutluis/waymark` project with development, preview, and production profiles;
builds have not yet run.

### Running

```
cp .env.example .env   # fill with local values printed by `supabase start`
supabase start         # local Postgres + Auth + Storage
pnpm install
pnpm start             # Expo dev server (press i / a / w)
pnpm typecheck         # TypeScript
pnpm lint              # ESLint
pnpm test              # Vitest (pure logic)
supabase test db       # pgTAP RLS suite
```

## Roadmap

### Done

- Storage RLS tests S18-S20.
- EAS configuration for `@chutluis/waymark`, including development, preview,
  and production profiles bound to EAS environments.

### Remaining

- Portfolio screenshots.
- EAS builds: validate a development build on a device, then distribute preview
  builds through TestFlight and Play internal testing. The development profile
  requires EAS environment values for `EXPO_PUBLIC_SUPABASE_*` and
  `expo-dev-client`.
- Demo video.
- Minor iOS date-picker polish: tapping outside the picker sheet should commit
  the selection.
- Optional follow-up: an invite-creation RPC and trips-list query consolidation.

### Dropped

- Live web deploy. Expo web remains a supported target; no hosted portfolio
  preview is planned.

## Documentation

- `docs/REQUIREMENTS.md` - product vision, scope, functional and non-functional
  requirements, and success criteria.
- `docs/ARCHITECTURE.md` - stack, project structure, data model, data-access
  patterns, build and release, testing strategy.
- `docs/SECURITY.md` - authentication, Row Level Security model, policies, the
  private-versus-shared rule, and the RLS test matrix.
- `docs/DESIGN_DECISIONS.md` - the shipped design system and the decisions
  behind it.
- `docs/ONBOARDING.md` - developer orientation: mental model, repo tour, setup,
  and change workflow.

## Prerequisites

- Node 24, pnpm 11 via Corepack, Xcode, Android Studio, an iOS Simulator and
  Android emulator.
- A Supabase project (local development via the Supabase CLI, plus a hosted
  project for shared builds).
- Optional for store release: an Apple Developer account and a Google Play
  Console account. Portfolio evidence comes from supported web, TestFlight, and
  Play internal testing even before paid store listings.

## Non-goals for v1

Maps and geosearch, in-app chat, real-time collaborative editing, AI features,
payments and subscriptions, offline write sync with conflict resolution, and
social feeds. These are explicitly out of scope for the first release and are
listed so scope does not creep during the build.
