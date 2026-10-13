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
GREEN in CI, proving private-versus-shared isolation.

The UI is the **Airmail** design: a printed-mail visual system with animated
destination scenes, stamps, postmarks and a bottom tab bar across all 11
screens. Each trip takes on its destination — a Lottie scene heads the trip and
its centre is cut into the trip's stamp — and stop status follows a letter's
life (planned slot, stamped, postmarked). See `docs/DESIGN_DECISIONS.md` and
`design_handoff_airmail_v3/README.md`.

The remaining portfolio and release work is listed in the roadmap below.
Android builds run locally with `eas build --local` in three variants that
install side by side: `development` (dev client, `app.waymark.dev`), `test`
(release-like APK, `app.waymark.test`) and `production` (Play AAB, or an APK
for sideloading, `app.waymark`). See `docs/BUILDS.md`.

### Running

```
cp .env.example .env   # fill with local values printed by `supabase start`
supabase start         # local Postgres + Auth + Storage
pnpm install
pnpm android           # build + install the dev client (app.waymark.dev)
adb reverse tcp:54321 tcp:54321   # device reaches the local Supabase
pnpm start:dev-client  # Metro for the installed dev client
pnpm web               # Expo web
pnpm typecheck         # TypeScript
pnpm lint              # ESLint
pnpm test              # Vitest (pure logic)
supabase test db       # pgTAP RLS suite
```

The app uses native modules Expo Go does not ship, so it runs as a
development build. Local EAS builds need `eas login`, JDK 17, `ANDROID_HOME`
and NDK 27.1.12297006; release profiles also need `credentials.json` and the
`EXPO_PUBLIC_SUPABASE_*` variables in the profile's EAS environment:

```
eas build --platform android --profile development    --local --output build/waymark-dev.apk
eas build --platform android --profile test           --local --output build/waymark-test.apk
eas build --platform android --profile production     --local --output build/waymark.aab
eas build --platform android --profile production-apk --local --output build/waymark.apk
```

## Roadmap

### Done

- Storage RLS tests S18-S20.
- EAS configuration for `@chutluis/waymark`: development, test and production
  profiles that build locally, install side by side, and sign releases with
  the owner's keystore.

### Remaining

- Device verification of the Airmail motion: the Kyoto scene header holding
  30 fps on a low-end Android, and Reduce Motion suppressing all animation.
  Web export and the auth screens were checked; a device pass is outstanding.
- Portfolio screenshots.
- Distribute test builds through Play internal testing and TestFlight (iOS
  builds need macOS).
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
- `docs/BUILDS.md` - build profiles, versions, environment values, signing,
  and local build and install commands.

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
