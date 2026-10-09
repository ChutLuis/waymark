# Airmail audit — fifth-pass release capture

**Single code commit:** `2e646c84ea32ee61e35a3da1cd6615f8ca6b7364` (`2e646c8`)
**Capture window (local, UTC-6):** 2026-10-08 **18:58:10 → 19:42:39**
**Files:** **87 fresh PNGs** — 78 Android release frames and 9 Chrome web frames.
Every PNG was visually inspected, including full-resolution checks of the critical
fixes. No file shows LogBox, a toast, or `InvocationTargetException`.

## Build and device provenance

- Android release: `android/app/build/outputs/apk/release/app-release.apk`, built
  with `./gradlew assembleRelease -q` after the code commit, installed with `adb install -r`.
- Local and installed `app.waymark` APK SHA-256 both equal
  `8c8a58242e264138bfd1fa9e138035338cf39728df85ccb5d22472e5d0316276`.
- Web: Expo static export from the same commit; bundle
  `entry-0960dbbf55bd3b2aca8a34c90e2e4e4f.js`. Chrome DevTools captured viewports
  **680×1100** and **1280×900**, DPR 1, light scheme.
- Android `emulator-5554`: physical **1080×2400**, font scale **1.0**.
  Density 480 / 443 / 402 yields 360 / approximately 390 / approximately 430dp.
  The app was force-stopped and relaunched after each density change.
- Per-file timestamp, dimensions, actor, theme and SHA-256:
  [CAPTURE_INVENTORY.json](CAPTURE_INVENTORY.json).
- Emulator density is restored to its default **420**, with no override.

## Proof per item

| Item | Evidence and result |
|------|---------------------|
| N16 · bounded web shell | `web-plan-{680,1280}-light`: root/shell equal window height; Plan scroller has `flex: 1` and `minHeight: 0`; tab bar reaches the window bottom; all labels are fully visible. Measurements below. |
| N24 · focused status styles | `statusbar-sheet-390-light` has LIGHT icons on the dark scrim; `statusbar-warm-invite-390-light` has DARK icons on the light valid preview; `statusbar-notnow-trips-390-light` returns directly to Trips with DARK icons. |
| N24 · fresh invite flow | `invite-code-*`, `signup-from-code-*`, `onboarding-*`, `join-preview-*`, `joined-trip-*`, `join-notnow-preview-*`, `join-notnow-returns-*`: DARK icons on light screens, including onboarding and the joined header. |
| N25 · named sealed-note copy | `notes-390-light`: “Theo can't open yours, and you can't open Theo's.” `notes-theo-390-light`: “Mia can't open yours, and you can't open Mia's.” Mia has `Only you · 1`; Theo has `Only you · 0` and cannot see the birthday note. The plural branch was also checked with a temporary third member, then that membership was removed. |
| N18 · opaque status band | `signup-keyboard-{360,390}-light`: password meter visible, opaque page-coloured area behind the clock, no cards behind it. `delete-account-390-light` starts below the Android top inset with DARK icons. Privacy top/bottom also retain their opaque band. |
| N20 · stacked confirmation | `profile-delete-390-light`: full one-line “Delete account?” title, explanation, full-width wax-red Delete account, then Cancel. |
| N14 · complete dates | `item-editor-{360,390}-light`: `7 Oct, 10:30` is one line and complete; `ENDS optional`; one Clear link below both fields. `item-editor-cleared-390-light` shows both cleared. Trip edit/set/cleared captures retained. |
| N26 · weekday words | `plan-430-{light,dark}` and all Plan-today widths show complete SAT / SUN / MON. Stamp width is responsive; weekday text uses the tag role without font reduction. |
| Storage deletion | [STORAGE_PROOF.md](STORAGE_PROOF.md) contains actual before/after `storage.objects` rows: Delete trip removes its cover but retains the avatar; Delete account removes the avatar and solo-trip cover. |
| N23 · Next deadline | All six `plan-today-{360,390,430}-{light,dark}` were captured **18:58:10 → 18:59:06**, before **20:30 local**, with the 21:00 Philosopher's Path Next card present. |
| Theo non-owner | `{trips,plan,packing,notes,trip}-theo-390-light`, `trip-member-390-dark`: shared data, zero private notes, Leave trip rather than Delete trip. |
| Retained checks | `newtrip-typed-390-light` keeps the destination above the keyboard; `web-trips-1280-light` has its footer inside the centered column; no-art Berlin is captured on all four tabs. |

## N16 measurements

Measured on the final exported app using `getBoundingClientRect()` on the root,
shell, column, scroller and `trip-tab-bar` test IDs. DOM text `Range` rectangles
measured the actual Plan / Packing / Notes / Trip labels. Raw values and timestamps:
[WEB_MEASUREMENTS.json](WEB_MEASUREMENTS.json).

| Viewport | Root / shell bottom | Tab-bar bottom | Delta from `innerHeight` | Label bottom | Column |
|----------|---------------------|----------------|--------------------------|--------------|--------|
| 680×1100 | 1100 | 1100.000076 | 0.000076px | 1094.400024 | x=0, width=680 |
| 1280×900 | 900 | 900.000015 | 0.000015px | 894.400024 | x=300, width=680 |

Both tab bars round to the exact viewport bottom. The sub-0.001px residual is
browser floating-point layout precision. The document heights are exactly
1100 and 900; label bounds are above the bar bottom at both sizes.

## Matrix (87 PNGs)

- Phone: `{trips,plan,plan-today,packing,notes,trip}-{360,390,430}-{light,dark}` (36).
- No-art: `{plan,packing,notes,trip}-noart-390-light` (4).
- Profile: `profile-390-{light,dark}`, `profile-430-light`, `profile-bottom-390-light`, `profile-delete-390-light` (5).
- Auth: `signin-{360,390}-light`, `signin-360-dark`, `signin-keyboard-390-light`, `signup-keyboard-{360,390}-light`, `signup-from-code-390-light`, `onboarding-390-light` (8).
- Invite: `invite-code-390-light`, `invite-code-filled-390-light`, `join-preview-390-light`, `joined-trip-390-light`, `join-invalid-390-light`, `join-notnow-preview-390-light`, `join-notnow-returns-390-light` (7).
- Warm status path: `statusbar-{sheet,warm-invite,notnow-trips}-390-light` (3).
- Editors: `newtrip-typed-390-light`, `trip-edit-390-light`, `trip-edit-cleared-390-light`, `item-editor-{360,390}-light`, `item-editor-cleared-390-light` (6).
- Theo: `{trips,plan,packing,notes,trip}-theo-390-light`, `trip-member-390-dark` (6).
- Misc: `privacy-390-light`, `privacy-bottom-390-light`, `delete-account-390-light` (3).
- Web: `web-{trips,plan,signin,newtrip}-{680,1280}-light`, `web-delete-account-680-light` (9).

## Fixture and operation notes

- Main matrix uses the seeded Mia/tester account and seeded Theo account. No
  credentials are stored in these artifacts.
- Kyoto: `b0000000-0000-0000-0000-000000000001`, 3–12 Oct 2026. The 7 Oct agenda
  remains; matching 8 Oct rows provide today's Next card. Times render in
  `America/Guatemala`. The birthday sealed note is authored by Mia.
- Berlin: `b0000000-0000-0000-0000-000000000003`. Its existing companion remains
  Joiner (`44f7df90-5f89-4eac-a799-7da17a957ef0`) throughout the matrix and afterward.
- Invite work followed the matrix and used a separate trip, **Pass five invite**
  (`19f32404-dc87-4937-92c3-d07dc56dd943`). Mia's code `TG6QYW6W` was read from
  the app and consumed once by a newly signed-up Joiner. The joined account is
  `8511f1b1-db29-46de-bfe7-ee015b14f7eb`; the original seeded joiner/fresh accounts
  were preserved. Subsequent valid Not now used the regenerated app code
  `R7EGBVZG`; invalid-code evidence used `ABCDEFGH`.
- Deletion proof was **local Supabase + locally served function**, not hosted.
  Backend deletion implementation was unchanged; the existing privacy-note gate
  and trip-deletion wording remain.
- Past-trip UI/item 20 was not changed. Lisbon remains visible as a past row on
  the web and as a postmarked LISBOA stamp in profile.
- Quality gates passed: typecheck; lint 0 errors / 5 pre-existing React Hook Form
  compiler warnings; 73 Vitest tests; 52 pgTAP assertions.

## Closed items and platform limitation

N2 and 08 remain closed. No release capture reproduces the dev-only
`InvocationTargetException` / `Exceptions$MissingActivity` during activity
recreation. No iOS simulator is available on this Linux host: the phone widths
are Android density equivalents, not iOS rendering evidence.
