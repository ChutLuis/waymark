# Airmail audit — screenshot build

**Commit:** `f79f7fbb289c590e6070d5ea5d698bc9849aeffb`
**Captured from:** a development build, logged in as the local test user
(`tester@waymark.test`, seeded manually). Dev-client overlays (Tools bubble,
LogBox, element inspector) were hidden; the status bar is visible in every
frame.

## Device substitution (important)

The brief asks for **iPhone 14 (390 pt)** and **iPhone 15 Pro Max (430 pt)**.
There is no iOS simulator on this Linux host, so the shots were taken on an
**Android emulator** with the display-density override set to reproduce the
same logical widths:

| Label | Logical width | Android density override |
|-------|---------------|--------------------------|
| `-430-` | 430 pt | `wm density 402` |
| `-390-` | 390 pt | `wm density 443` |
| `-360-` | 360 dp | `wm density 480` |

Type rendering and iOS-specific affordances (back-swipe, native date wheel)
therefore differ from a real iPhone; layout widths do not.

## Naming

`<screen>[-<state>]-<device>-<theme>.png`

- device: `390`, `430`, `360`
- theme: `light`, `dark`

## Matrix

`390` and `430` were captured in **light and dark**; `360` in **light and dark**
for the five tab screens plus the core states. Files present:

- `trips-{390,430,360}-{light,dark}` — trips list
- `plan-{390,430,360}-{light,dark}` — Plan tab (Kyoto, empty day)
- `plan-tue-{390,430,360}-{light,dark}` — Plan tab with a scheduled item
- `plan-noart-390-{light,dark}` — Plan tab, trip with no destination art (Berlin)
- `packing-{390,430,360}-{light,dark}`
- `notes-{390,430,360}-{light,dark}`
- `trip-{390,430,360}-{light,dark}` — Trip/settings tab
- `profile-{390,430}-light`
- `privacy-390-light`
- `join-390-{light,dark}` — invite-code entry
- `signin-390-{light,dark}`, `signup-390-{light,dark}`, `signin-error-390-dark`
- `newtrip-empty-390-light`, `newtrip-matched-390-light`,
  `newtrip-typed-390-light`, `newtrip-dates-390-light`
- `trip-edit-390-light`, `item-editor-390-light`
- `trips-offline-390-light`

## Not captured / blocked

- **Onboarding** — requires a brand-new account with no display name; the
  `(app)` guard redirects an existing user past it. Not captured to avoid
  creating throwaway accounts.
- **17 · non-owner (Theo) view** — Theo's local password is unknown (the seed
  file is intentionally empty; users were created by hand in an earlier
  session). Not captured.
- **Empty trips list** — the test user owns trips; needs a fresh account.
- **Web/wide layout** — not captured in this pass.
- **iOS-specific** — no simulator on Linux (see above).