# Airmail audit — seventh-pass release capture

**Code commits:** `7a4f60c` (UI, migration `20260725000000_invite_existing_member.sql`
and pgTAP) and `4ed9ffb` (Edit trip form reset). Every frame was captured from
`4ed9ffb`, which contains both.
**Capture window (local, UTC−6):** 2026-10-09 17:05:52 → 17:18:16.
**87 fresh PNGs:** 78 Android release frames and 9 headful Chrome frames.
Every frame was visually reviewed. There are no runtime error screens, LogBox
or toasts; `join-invalid-390-light` is the requested invalid-code validation state.

## Proof per fix

Screenshot names below have the `.png` extension. Original bounds, conversions
and pixel checks are in [UI_MEASUREMENTS.json](UI_MEASUREMENTS.json).
"Glyph" gaps are measured from the date field's bottom border to the first or
last row of text ink.

| Fix | Screenshots | Result and measurements |
|-----|-------------|-------------------------|
| N36 · Member opens own invite | `join-member-390-light`; pgTAP `invite_existing_member_test.sql` | Joiner, already on Mia's Berlin weekend, enters Mia's current Berlin code: **“You’re already on Berlin weekend”** with **Open trip** and no Join button (checked in the native accessibility tree; Open trip was not tapped). `preview_trip_invite` returns `is_member`; `accept_trip_invite` returns the trip id without marking the invite used for a member. pgTAP **11/11**: member accept → invite row `accepted_at=null accepted_by=null` before **and** after; non-member accept → `accepted=t`, accepted by the newcomer; a used code is rejected for a non-member and for a member. Full suite **63/63**. |
| N35 · Sign-up shadow | `signup-from-code-390-light` (not scrolled), `signup-keyboard-{360,390}-light` | The clip is gone. Not scrolled, the shadow reaches **18.4dp** below both cards (pixels differing from the page colour by ≥2; pass five: about 16dp). The shadow lives on a layer behind each card whose opacity follows scroll on the native driver: 1 at rest, 0 by 8dp before the cards reach `insets.top`. Keyboard frames, 6dp strip directly under the status band: 390 — **19,080 / 19,080** page-colour pixels, **0 shadow**; 360 — **2,232** page-colour pixels, **16,848** inside the scrolled EMAIL field, **0 shadow**. |
| N37 · One date-pair style | `trip-edit-390-light`, `trip-edit-cleared-390-light`, `newtrip-empty-390-light`, `item-editor-open-390-light`, `item-editor-{360,390}-light`, `item-editor-cleared-390-light`, `web-newtrip-{680,1280}-light` | Every STARTS / ENDS label sits **above** its field like TRIP NAME and DESTINATION: label bottom → field top **6.1dp** at 390 (6.0dp at 360), left edges aligned (0dp), never inside the field. Both pairs read **STARTS optional / ENDS optional** with the same **Add date** placeholder. Web: label → input **6px** at both viewports, `optional` on the label row. New trip gains the same Clear dates link as Edit trip. |
| N38 · Clear link spacing | `item-editor-open-390-light`, `item-editor-{360,390}-light`, `trip-edit-390-light` | Pair → link glyph: **8.3dp** (Clear times, 390), **8.7dp** (360), **8.3dp** (Clear dates). Link → STATUS glyph: **21.3dp** (390), **21.0dp** (360), the full 14dp section gap. Pass six: 28dp / 22dp. |
| N39 · Sheet header edge | `item-editor-open-390-light` (top), `item-editor-{360,390}-light` (scrolled to the end) | At the top no full-width line exists under the header. Scrolled, a full-width divider-coloured hairline (`#C9D3DB`) appears at y=392–393px (390) and 408–410px (360). The 1dp edge is reserved in both states, so content does not shift. |
| Edit trip reset | `trip-edit-390-light` → `trip-edit-cleared-390-light` → Cancel → `trip-edit-keyboard-390-light` | Reopened on the same mounted Trip screen straight after the cancelled Clear dates, the fields read **STARTS: Tue 13 Oct / ENDS: Fri 16 Oct** (native accessibility labels). The sheet now resets to the saved trip and clears any failed-save state on every open, like the item, packing and note editors. |
| N40 · No-art join card | `join-preview-dated-390-light`, `join-member-390-light`; `join-preview-390-light` keeps its scene | Berlin weekend now shows New trip's preview card: cream fill **#FFFCF5**, destination on ruled address lines, the stamp on the right half at the top, airmail band along the bottom, **23.8dp** clear of the stamp. New trip and Join share one `TripPreviewCard` component. |

Retained from pass six (re-measured from these frames): Privacy / Delete
account Back rows at **30.0dp** (N28); sheet bottom gaps **36.0–36.1dp** for all
seven closed sheets (N29); empty-state gaps **16.3 / 15.9 / 15.5dp** with the
**56×72dp** stamp (N34); join metadata **“from Mia”** and **“from Mia · 13–16 Oct”**
(N30); Notes filters (N33). Web Plan shell and tab-bar bottoms equal
**1100px / 900px** ([WEB_MEASUREMENTS.json](WEB_MEASUREMENTS.json), N16).

## Build and capture provenance

- Android: `./gradlew assembleRelease -q` from `4ed9ffb`, then a fresh
  `adb uninstall app.waymark` / `adb install app-release.apk` and sign-in.
  Local and installed APK SHA-256 both equal
  `c8d139fcb5409062548473296ffa5977f72acd7a1943ea47fdf8dab393da748b`.
- Android `emulator-5554`: physical 1080×2400, font scale **1.0**.
  Densities **480 / 443 / 402** supply nominal **360 / 390 / 430dp** widths.
  The app was force-stopped and relaunched after every density and theme change.
- Web: production static export from the same commit, bundle
  `entry-118dd1e08e7671551836178648fa86a2.js`, verified as the loaded script on
  every navigation. Headful Chrome via the Chrome DevTools MCP CLI, viewports
  **680×1100** and **1280×900**, DPR **1**, light colour scheme forced.
- Per-file timestamps, actor, theme, density/viewport, dimensions, SHA-256,
  visual-review result and source commit:
  [CAPTURE_INVENTORY.json](CAPTURE_INVENTORY.json). APK/export hashes, fixture
  hashes, quality gates and restored device state:
  [BUILD_PROVENANCE.json](BUILD_PROVENANCE.json).

## Plan-today clock

The 21:00 Philosopher's Path stop is dated **8 Oct local**. The six Plan-today
frames used an emulator clock set to **2026-10-08 19:00 UTC−6** with
`cmd alarm set-time`; device times were **19:00–19:01** on 8 Oct, before the
fixture's 20:30 cutoff. Each row records its `captureClock`. Automatic time was
restored afterward.

## Matrix — 87 PNGs

- `{trips,plan,plan-today,packing,notes,trip}-{360,390,430}-{light,dark}` (36).
- `trips-bottom-390-light` (1).
- `{plan,packing,notes,trip}-noart-390-light` (4).
- `profile-390-{light,dark}`, `profile-430-light`,
  `profile-bottom-390-light`, `profile-delete-390-light` (5).
- `signin-{360,390}-light`, `signin-360-dark`, `signin-keyboard-390-light`,
  `signup-keyboard-{360,390}-light`, `signup-from-code-390-light`,
  `onboarding-390-light` (8).
- `invite-code-390-light`, `invite-code-filled-390-light`,
  `join-member-390-light`, `join-preview-390-light`,
  `join-preview-dated-390-light`, `join-invalid-390-light` (6).
- `newtrip-empty-390-light`, `newtrip-typed-390-light`,
  `trip-edit-390-light`, `trip-edit-cleared-390-light`,
  `trip-edit-keyboard-390-light`, `item-editor-open-390-light`,
  `item-editor-{360,390}-light`, `item-editor-cleared-390-light` (9).
- `{trips,plan,packing,notes,trip}-theo-390-light`,
  `trip-member-390-dark` (6).
- `privacy-390-light`, `privacy-bottom-390-light`,
  `delete-account-390-light` (3).
- `web-{trips,plan,signin,newtrip}-{680,1280}-light`,
  `web-delete-account-680-light` (9).

Actors: Mia (`tester@waymark.test`) for her trips, editors and profile;
Joiner (`joiner@waymark.test`, on Mia's Berlin weekend) for the member and
invalid-code states; Theo (`theo@waymark.test`, on neither invite's trip) for
both join previews and his Kyoto views; Fresh for onboarding.

## Fixture integrity and final state

Before/after row hashes are identical for trips, itinerary items, packing
items, trip notes, trip members and trip invites. No invite was accepted
outside pgTAP: the join screens were previewed only, and no new invite code was
minted. Every edit, clear and new-trip form was cancelled; Delete account was
only previewed. Fresh's onboarding name was a local draft, followed by clearing
local app data and signing back in as Mia; no profile was created. Account
passwords are not stored in the audit artifacts.

Quality gates: **typecheck**, **lint with 0 errors and 0 warnings**,
**73 Vitest tests**, **63 pgTAP assertions** in 10 files.

Emulator restored to **physical density 420 with no override**, **font scale
1.0**, **automatic time enabled**, light mode, `America/Guatemala`, signed in as
**Mia** on Your trips.
