# Waymark - Architecture

## 1. Stack

Verify the latest stable versions at project initialization; the values below
reflect the intended baseline (mid-2026).

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Expo (SDK 57 or latest) | The recommended way to build production React Native apps |
| Runtime | React Native 0.8x, React 19 | Follow the Expo SDK's pinned versions |
| Language | TypeScript 5.x, strict | `strict: true`, no implicit any |
| Navigation | Expo Router (file-based) | Typed routes; groups for auth and app areas |
| Backend | Supabase | Postgres, Auth, Storage, Edge Functions |
| Data fetching | TanStack Query v5 | Caching, loading and error states, retries |
| Forms and validation | React Hook Form + Zod | One Zod schema per form; shared types |
| Notifications | expo-notifications | Local scheduled notifications in v1 |
| Secure storage | expo-secure-store | Supabase session persistence on native |
| Media | expo-image, expo-image-picker | Cover images and avatars |
| Package manager | pnpm | Node 20+ |
| Unit tests | Vitest + React Native Testing Library | Logic and component-state tests |
| DB policy tests | pgTAP via Supabase CLI | Adversarial RLS tests |
| Builds | EAS Build and EAS Update | Development and production profiles |

## 2. Principles

- One codebase, three targets. Prefer cross-platform primitives; isolate any
  platform-specific code behind small modules and `.ios/.android/.web` files.
- The database is the security boundary. The client is never trusted for access
  control; every table enforces Row Level Security. See `SECURITY.md`.
- Feature-first structure. Group code by feature, not by technical layer, so a
  feature can be read and changed in one place.
- Typed end to end. Database types are generated from Supabase and flow through
  the data layer into the UI.
- Design tokens only. Feature code references tokens and primitives, never raw
  color, spacing, or font values.
- Every screen has explicit loading, empty, error, and offline states.

## 3. Project structure

```
waymark/
  app/                      # Expo Router routes
    _layout.tsx             # root providers (query client, auth, theme)
    (auth)/                 # unauthenticated group
      sign-in.tsx
      sign-up.tsx
    (app)/                  # authenticated group (guarded)
      _layout.tsx
      index.tsx             # trips list
      onboarding.tsx        # first-run display name
      trips/
        new.tsx
        [tripId]/
          _layout.tsx       # trip tabs: itinerary, packing, notes
          index.tsx         # itinerary
          packing.tsx
          notes.tsx
          settings.tsx      # trip details, members, invite
      join.tsx              # accept invite by code/link
      profile.tsx
  src/
    features/
      auth/
      trips/
      itinerary/
      packing/
      notes/
      invites/
      reminders/
    components/             # shared primitives (Button, Card, Field, State views)
    lib/
      supabase/             # client, generated types, query hooks
      notifications/
      validation/           # shared Zod schemas
      format/               # date and text helpers (pure, unit-tested)
    theme/                  # tokens: colors, typography, spacing, radius, motion
  supabase/
    migrations/             # SQL migrations (schema + RLS)
    functions/              # edge functions (invite acceptance if server-side)
    tests/                  # pgTAP RLS tests
  eas.json
  app.config.ts
```

## 4. Navigation map

- Root layout mounts providers and decides auth state.
- `(auth)` group: sign-in and sign-up.
- `(app)` group is guarded; an unauthenticated user is redirected to `(auth)`.
- First-run users without a display name are routed to onboarding.
- Trip detail uses a tab layout: Itinerary, Packing, Notes, plus Settings.
- Deep link targets: `join` (invite acceptance) and a trip/item route opened
  from a reminder notification.

## 5. Data model

All identifiers are UUIDs. All tables carry `created_at` and, where mutable,
`updated_at`. Foreign keys cascade on trip deletion. This DDL is the reference
shape; the authoritative version lives in `supabase/migrations`.

```sql
-- Profiles mirror auth.users with app-facing fields.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  cover_image_path text,
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  code text not null unique,                 -- 8 characters, generated
  invited_email text,
  created_by uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  title text not null,
  description text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'planned'
    check (status in ('planned','confirmed','done')),
  sort_order integer not null default 0,
  created_by uuid not null references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  label text not null,
  quantity integer not null default 1 check (quantity > 0),
  assigned_to uuid references auth.users on delete set null,
  is_packed boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trip_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  body text not null,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes: add btree indexes on every `trip_id` foreign key, on
`trip_members (user_id)`, and on `trip_invites (code)`.

## 6. Data-access layer

- A single Supabase client is created in `src/lib/supabase`, configured with
  secure-store session persistence on native and the default storage on web.
- Database types are generated with the Supabase CLI and re-exported; feature
  hooks consume typed rows.
- Each feature exposes TanStack Query hooks (for example `useTrips`,
  `useItinerary(tripId)`, `useCreateNote`). Query hooks own loading, error, and
  cache behavior; mutations invalidate the relevant queries.
- No raw table access from components. Components call feature hooks only.

## 7. State management

- Server state: TanStack Query.
- Session and current-user state: a small auth context backed by the Supabase
  session listener.
- Local UI state: component state and lightweight context. No global store is
  required for v1.

## 8. Notifications (v1)

- `expo-notifications` schedules a local notification for an itinerary item's
  start time, offset by a chosen lead time.
- A priming screen explains the value before the OS permission prompt.
- A notification response handler routes to the trip and item.
- Server-driven push (Expo push tokens plus an edge function) is deferred to
  v1.1; the schema leaves room to add a `device_push_tokens` table later.

## 9. Storage

- Buckets: `trip-covers` and `avatars`.
- Object path convention encodes ownership: `trip-covers/{trip_id}/{file}` and
  `avatars/{user_id}/{file}`.
- Storage access is controlled by policies on `storage.objects` that reuse the
  same membership rules as the database (see `SECURITY.md`).

## 10. Configuration and environments

- Application configuration lives in `app.config.ts`, which reads the Supabase
  URL and anon key from environment variables (they are public by design).
- No service-role key ever ships in the client. Any privileged operation runs in
  an edge function.
- Environments: local (Supabase CLI), a hosted staging project for shared builds,
  and production. EAS build profiles map to these.

## 11. Build and release (EAS)

- `development` profile: development client builds for the iOS Simulator, a
  physical iPhone, and Android.
- `preview` profile: internal distribution builds for testers.
- `production` profile: store-ready binaries.
- EAS Update delivers JavaScript updates to the development and preview channels.
- Web is exported as a static build and deployed to a static host for the live
  portfolio preview.

## 12. Testing strategy

- Pure logic (date formatting, sort ordering, code generation, Zod schemas):
  Vitest unit tests.
- Components: React Native Testing Library assertions on loading, empty, and
  error states.
- Database policies: pgTAP tests run by the Supabase CLI, asserting the
  private-versus-shared and membership rules. This is the headline test suite.
- Optional end-to-end (Maestro or Detox) for the core happy path is a stretch
  goal, not a v1 gate.

## 13. CI quality gates

A change is done only when all of these pass:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (Vitest)
- `supabase test db` (pgTAP RLS)

GitHub Actions CI runs typecheck, lint, Vitest, and `supabase test db` on every
push and pull request. EAS builds run on demand or on tags.

## 14. Analytics and observability (lightweight)

- A minimal, privacy-respecting analytics wrapper records only anonymous screen
  and action events; note content is never captured.
- Client errors are logged to the console in development; a hosted error
  reporter can be added later without changing feature code.

## 15. Key risks and mitigations

- RLS recursion on membership checks: mitigated with a security-definer helper
  function (see `SECURITY.md`), avoiding policies that reference each other.
- Web parity gaps for native modules: keep native-only features behind small
  wrappers and provide web fallbacks (notifications degrade gracefully on web).
- Scope creep: the README non-goals and the v1 scope table are the contract.
  New ideas become v1.1 items, not silent additions.
