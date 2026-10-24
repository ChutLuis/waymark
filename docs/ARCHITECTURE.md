# Waymark - Architecture

## 1. Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Expo SDK 57 | Production React Native framework |
| Runtime | React Native 0.86, React 19 | Expo-pinned runtime |
| Language | TypeScript 6, strict | `strict: true`, no implicit any |
| Navigation | Expo Router | File-based navigation with typed routes and auth/app groups |
| Backend | Supabase | Postgres, Auth, Storage, and security-definer RPCs for privileged writes |
| Data fetching | TanStack Query v5 | Caching, loading and error states, retries |
| Forms and validation | React Hook Form + Zod | One Zod schema per form; shared types |
| Notifications | expo-notifications | Local scheduled notifications in v1 |
| Secure storage | expo-secure-store | Supabase session persistence on native |
| Media | expo-image, expo-image-picker | Cover images and avatars |
| Package manager | pnpm 11 via Corepack | Node 24 |
| Unit tests | Vitest + React Native Testing Library | Logic and component-state tests |
| DB policy tests | pgTAP via Supabase CLI | Adversarial RLS tests |
| Builds | EAS Build (`--local`) | Development, test, and production profiles |

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
- Deep link targets: `join` (invite acceptance through a security-definer RPC)
  and a trip/item route opened from a reminder notification.

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
  Its fetch (`timeoutFetch.ts`) gives up on database and auth requests after
  20 s without a response with a "Network request failed" error, so queued
  writes treat a stalled request like a dropped one; Storage and Edge
  Functions are not limited.
- Database types are generated with the Supabase CLI and re-exported; feature
  hooks consume typed rows.
- Each feature exposes TanStack Query hooks (for example `useTrips`,
  `useItinerary(tripId)`, `useCreateNote`). Query hooks own loading, error, and
  cache behavior; mutations invalidate the relevant queries.
- No raw table access from components. Components call feature hooks only.
- **Offline queue that survives restarts.** Writes that can wait for the
  connection have a stable mutation key (`src/lib/query/keys.ts`) and register
  their whole behaviour with `queryClient.setMutationDefaults` at startup
  (`register…Mutations` in each feature's `hooks.ts`, called from
  `app/_layout.tsx`): create and edit trip; save and delete stop; stop status;
  save and delete note; save, pack and delete packing item. Their hooks go
  through `useQueuedMutation` (`src/lib/query/queued.ts`), which adds to the
  variables the trip id, the account that made the write (`ownerId`) and a
  client id for new rows (`expo-crypto`), so a write queued before the app
  closed runs without the screen that made it. Writes run one at a time per
  trip (`scope`, stored with the write). New stops, notes and packing items are
  inserted with their client id, so a retry after a lost response or a replay
  after a restart finds its own row (`23505` counts as done) instead of making
  a second one; idempotent writes retry a dropped request. Create passes its
  client id to `create_trip` (`_id`), which returns the caller's existing trip
  for an id it has seen, so Create retries like the rest. A write whose account is no longer
  signed in refuses to run and leaves the cache alone (AuthContext moves the
  owner before it clears the cache). Optimistic updates live in those
  defaults and their rollbacks restore only the fields they changed; a stop's
  reminder follows its saved or deleted stop there too, so it stays right
  after a restart, and a save that fails for good undoes the reminder the
  editor set when the save was made. Editors stay mounted between sheets:
  `useResetOnOpen` forgets an earlier session's write state when a sheet
  opens (so a change still queued doesn't lock the next one), and
  `useDraftId` gives each opening one id for its new row, so Save tapped
  again after a failure can't insert twice (it is kept out of the React
  Compiler, which reused one random id across sessions). Everything else (account deletion, invite preview
  and accept, cover and avatar uploads, leaving or deleting a trip, sign-in)
  stays online-only, with its own messages.
- **Persisted cache.** `src/lib/query/persistence.ts` stores the query cache
  and paused mutations with `@tanstack/query-async-storage-persister` in
  AsyncStorage, one key per account (`waymark.query.v1.<userId>`), restores it
  after the session is known (`QueryPersistence`, which holds queries in
  TanStack's restoring state meanwhile) and then calls
  `resumePausedMutations()` once TanStack knows whether the device is really
  online (NetInfo). It is a small custom provider rather than
  `PersistQueryClientProvider`, because the key depends on the signed-in
  account and a restore that finishes after the account changed must not
  hydrate. Rules (`persist.ts`, Vitest-covered): only the trip list, trip,
  members, profile, stops, notes and packing are stored (never invites,
  invite previews or signed URLs); stored note lists drop private notes; a
  queued save of a private note, and a trip created with a picked photo, stay
  in memory only; only paused writes are stored, never ones in flight. Only
  the stored families get a 7-day `gcTime`. AuthContext stops persisting, clears the cache
  and deletes that account's key whenever a session ends or the account
  changes, and a launch with nobody signed in deletes every stored cache.
  Conflicts: last write wins (no conflict resolution in v1).
- **Failures after the fact.** A queued write that fails once sent is reported
  app-wide (`src/features/offline`: a mutation-cache watcher and a pinned
  `ErrorBanner` with Dismiss), unless the sheet that made it is still open and
  showed the error itself.

## 7. State management

- Server state: TanStack Query.
- Session and current-user state: a small auth context backed by the Supabase
  session listener.
- Local UI state: component state and lightweight context. No global store is
  required for v1.

## 8. Notifications (v1)

- `expo-notifications` schedules a local notification for an itinerary item's
  start time, offset by a chosen lead time. Reminders stay on the scheduling
  device and are never part of the persisted query cache.
- Android picks an exact alarm only with `SCHEDULE_EXACT_ALARM`, which people
  grant in system settings (denied by default on Android 14+). The local Expo
  module `modules/exact-alarms` (Android only; iOS and web report "not
  applicable") exposes `canScheduleExactAlarms()` and opens the setting;
  `src/lib/notifications` wraps it. The reminder switches show one caption with
  a link to the setting while it is off, and reminders are rescheduled under
  the same ids whenever the access changes (checked on every return to the
  foreground).
- A priming screen explains the value before the OS permission prompt.
- A notification response handler routes to the trip and item.
- Server-driven push is deferred to v1.1; the schema leaves room to add a
  `device_push_tokens` table later.

## 9. Storage

- Buckets: `trip-covers` and `avatars`.
- Object path convention encodes ownership: `trip-covers/{trip_id}/{file}` and
  `avatars/{user_id}/{file}`.
- Trip covers are readable and writable by trip members. Avatars are readable
  by their owner or a trip-mate and writable by their owner only. See
  `SECURITY.md` for the `storage.objects` policies.

## 10. Configuration and environments

- Application configuration lives in `app.config.ts`, which reads the Supabase
  URL and anon key from environment variables (they are public by design).
- No service-role key ships in the client. Privileged writes use the
  `create_trip`, `get_or_create_trip_invite` and `accept_trip_invite`
  PostgreSQL security-definer RPCs; account deletion runs in the
  `delete-account` Edge Function with the service role (`docs/SECURITY.md`
  §6.1).
- Environments: local (Supabase CLI), a hosted staging project for shared builds,
  and production. The `development` profile embeds no values (Metro serves the
  bundle with the local `.env`); `test` reads the `preview` EAS environment
  and `production` the `production` one. `.easignore` keeps local `.env`
  files out of every build.

## 11. Build and release (EAS)

- EAS is configured for the `@chutluis/waymark` project (`owner: 'chutluis'`,
  `extra.eas.projectId`). Builds run locally with `eas build --local`.
- `APP_VARIANT` (set per profile in `eas.json`) selects the application id,
  name and URL scheme: `development` → `app.waymark.dev`, `test` →
  `app.waymark.test`, `production` → `app.waymark`. Unset means development.
- `development` is a debug dev-client APK signed with the template debug key.
  `test` (APK), `production` (AAB) and `production-apk` are release builds
  with R8, resource shrinking, Hermes, no cleartext traffic and no dev client,
  signed with the owner's keystore through `credentials.json`.
- Versions are local (`appVersionSource: "local"`): `VERSION` and `BUILD` in
  `app.config.ts` derive `versionCode` and `buildNumber`.
- Inside an EAS build, `app.config.ts` refuses a `test` or `production` build
  whose Supabase URL is missing, not HTTPS, or a loopback host.
- Profiles, signing, versions and commands are documented in `BUILDS.md`.
- Expo web runs as a supported target. Notifications no-op and the Supabase
  session uses browser storage on web; no live web deployment is pursued.

## 12. Testing strategy

- Pure logic (date formatting, sort ordering, code generation, Zod schemas):
  Vitest unit tests.
- Components: React Native Testing Library assertions on loading, empty, and
  error states.
- Database policies: pgTAP tests run by the Supabase CLI, asserting the
  private-versus-shared and membership rules. The 33-test suite is the headline
  test suite.
- Optional end-to-end (Maestro or Detox) for the core happy path is a stretch
  goal, not a v1 gate.

## 13. CI quality gates

A change is done only when all of these pass:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test` (Vitest)
- `supabase test db` (pgTAP RLS)

GitHub Actions CI runs typecheck, lint, Vitest, and `supabase test db` on every
push and pull request. EAS builds remain unrun pending their required EAS
environment values and the development-client dependency.

## 14. Analytics and observability

- No analytics wrapper ships in v1. No analytics events are collected.
- Client errors are logged to the console in development. Hosted error reporting
  is deferred.

## 15. Key risks and mitigations

- RLS recursion on membership checks: mitigated with a security-definer helper
  function (see `SECURITY.md`), avoiding policies that reference each other.
- Web parity gaps for native modules: keep native-only features behind small
  wrappers and provide web fallbacks (notifications degrade gracefully on web).
- Scope creep: the README non-goals and the v1 scope table are the contract.
  New ideas become v1.1 items, not silent additions.
