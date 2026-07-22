# Waymark — Developer Onboarding

## 1. What Waymark is

Waymark is a shipped Expo and Supabase trip-planning app and portfolio piece. Small groups share trips, itineraries, and packing lists, while each member can keep notes that remain private to their author. One Expo codebase serves iOS, Android, and web.

## 2. Mental model and invariants

- **The database is the security boundary.** Every protected table has two independent gates: a table `GRANT` to `authenticated` and a passing Row Level Security policy. Both must permit an operation.
- **Membership creation is privileged.** `create_trip` and `accept_trip_invite` are `SECURITY DEFINER` RPCs that create a trip and owner membership atomically or accept an invite and add its member atomically. Direct client inserts into `trip_members` are not permitted.
- **RLS scopes visibility.** Client reads trust database results and never re-filter row visibility in JavaScript. `src/lib/supabase/selects.ts` states this rule alongside the shared select strings.
- **Features own their behaviour.** `src/features/*` contains feature hooks, forms, presentation, and focused helpers; routes compose those features.
- **Database rows become domain types at the boundary.** Supabase uses `snake_case`; `src/lib/supabase/selects.ts` aliases select columns and maps RPC results to the camelCase types in `src/lib/types.ts`.
- **UI uses the shared visual system.** Colour, typography, spacing, and radius come from `src/theme` and shared primitives. Local derived layout arithmetic is acceptable when it does not introduce a new visual token. UI copy does not use emojis.
- **Data screens expose their state.** Shared `LoadingState`, `EmptyState`, `ErrorState`, and `OfflineBanner` make loading, empty, error, and offline behaviour explicit.
- **Offline is query-aware.** Native connectivity from NetInfo feeds TanStack Query's `onlineManager`; web uses browser online/offline events. `OfflineBanner` keeps cached data visible and explains that fresh data is unavailable.

## 3. Repo tour

| Location | Responsibility |
| --- | --- |
| `app/` | Expo Router routes and root providers. `(auth)` contains unauthenticated routes; `(app)` contains the guarded application routes, including trips, join, onboarding, and profile. |
| `src/features/` | Feature-first auth, trips, itinerary, packing, notes, invites, and reminders code. |
| `src/lib/supabase/` | The Supabase client, `selects.ts` aliases and mappers, generated `database.types.ts`, and storage helpers. |
| `src/components/` | Shared visual and state primitives. |
| `src/theme/` | Palette, type, space, radius, motion, icon, elevation, and theme-preference implementation. |
| `supabase/migrations/` | Ordered SQL schema, grants, RLS policies, functions, and storage-policy migrations. |
| `supabase/tests/` | pgTAP tests for RLS, invite, storage, function-grant, and deletion behaviour. |

## 4. Local setup

The project pins Node 24 in `.nvmrc`. pnpm runs through Corepack because `package.json` has no `packageManager` field.

```sh
nvm use
corepack pnpm install
cp .env.example .env
supabase start
pnpm start
```

`supabase start` prints the local API URL and anonymous key. Those values populate `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` before the app connects. `.env.example` permits only the public anonymous key; no service-role key belongs in the client.

## 5. Quality gates

Every change is validated with the following commands:

```sh
pnpm typecheck
pnpm lint
pnpm test
supabase test db
```

`pnpm test` runs Vitest. `supabase test db` runs the 33-test pgTAP RLS suite. These four commands are the required quality gate and must remain green.

GitHub Actions CI runs all four gates on every push to `main` and every pull request. The `quality` job uses Node 24, runs `pnpm install --frozen-lockfile`, then runs typecheck, lint, and Vitest. The `rls` job runs `supabase start` followed by `supabase test db`. All four gates must stay green; contributors run them locally before review.

## 6. Change workflow

Schema changes are additive and test-backed:

1. Add a new migration in `supabase/migrations/`. Never edit the pushed `20260721145016_init_schema.sql` migration.
2. Regenerate the generated client types:

   ```sh
   supabase gen types typescript --local > src/lib/supabase/database.types.ts
   ```

3. Add or adjust pgTAP coverage in `supabase/tests/`, including positive and negative policy cases.
4. Route privileged membership writes through reviewed `SECURITY DEFINER` RPCs. `create_trip` and `accept_trip_invite` remain the membership-creation paths.
5. Trust RLS results rather than re-filtering visibility in the client. Use `selects.ts` mappings for database-to-domain conversion.
6. Build UI with shared components and `src/theme` values; do not introduce raw visual tokens or emoji copy.
7. Run the four quality gates before review.

## 7. Tooling gotchas

- nvm installs global CLIs per Node version. `eas-cli` must be installed under the Node version selected by `nvm use`.
- pnpm is invoked through Corepack; this repository does not declare a `packageManager` field.
- Supabase local development runs in Docker.
- `app.config.ts` reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. EAS environments selected by `eas.json` must provide both values.
- The `development` EAS profile sets `developmentClient: true`. Development-client builds require `expo-dev-client`; it is not a direct dependency in the current `package.json`, so it must be added before producing that profile's development-client build.

## 8. Where to look next

- [Requirements](./REQUIREMENTS.md) records product scope and success criteria.
- [Architecture](./ARCHITECTURE.md) records the stack, data model, access patterns, and testing strategy.
- [Security](./SECURITY.md) records the authentication, grants, RLS policies, helper functions, and privacy test matrix.
- [Design decisions](./DESIGN_DECISIONS.md) records the shipped visual system and component decisions.
