# Airmail audit — eighth-pass release capture

**Code commit:** `9645fb1` (date pairs, field insets, wide-sheet padding,
New trip stamp letter, migration `20260726000000_invite_member_first.sql` and pgTAP).
It builds on the pass-seven code commits `7a4f60c` and `4ed9ffb`.
**Capture window (local, UTC−6):** 2026-10-09 20:29:07 → 20:43:11.
**90 fresh PNGs:** 81 Android release frames and 9 headful Chrome frames, all
from `9645fb1`. Every frame was visually reviewed. There are no runtime error
screens, LogBox or toasts; `join-invalid-390-light` is the requested
invalid-code validation state.

## Proof per fix

Screenshot names below have the `.png` extension. Original bounds, conversions
and pixel checks are in [UI_MEASUREMENTS.json](UI_MEASUREMENTS.json).

| Fix | Screenshots | Result and measurements |
|-----|-------------|-------------------------|
| N41 · Clear link touch area | `item-editor-{360,390}-light`, `trip-edit-390-light`, `newtrip-dates-390-light` | `hitSlop={{ top: 4, bottom: 20, left: 8, right: 8 }}`. From the bounds, the touch area's top equals the STARTS field's bottom: **0.0dp** at 360, **−0.03dp** at 390 (whole-pixel rounding). The touch target is **44.0 / 44.2dp** tall. The visual gap is unchanged (link bounds 4dp, text 8.3dp below the fields). |
| N42 · Date text inset | `trip-edit-390-light`, `newtrip-dates-390-light`, `web-newtrip-{680,1280}-light`, `item-editor-longdate-360-light` | The compact variant is gone; date fields use TextField's 16dp inset on Android and web. TextField also no longer keeps Android's own EditText padding, which had put its text 2dp further in. First text pixel, Destination vs STARTS: **0.0dp** apart in `trip-edit-390` (both 18.1dp in from the box edge), **0.4dp** in `newtrip-dates-390`; web **1px** apart at 680 and 1280 (18px vs 17px, glyph side bearing). Item editor at 360: "28 Nov, 10:40" (set in the form only, then cancelled) stays on one line with **6.8dp** to spare; the widest possible value, "20 May, 20:00", measures 114dp in 115dp of room. |
| N43 · Wide sheet top edge | `web-newtrip-1280-light` | Wide sheets get `paddingTop: 16`. Modal top → Create pill: **19.5px** (pass seven: 3px). Last field → modal bottom: **34px**. |
| N44 · New trip stamp letter | `newtrip-dates-390-light` | Name "Weekend away", destination "Berlin", dates 13–16 Oct: the preview stamp shows **W** with the BERLIN caption, matching the trip card, Trip tab, Profile and join card. It uses the destination's letter only while the name is empty. The frame also records New trip's **Clear dates** link. The form was cancelled. |
| N45 · Member with a used or expired code | `join-member-used-390-light`; pgTAP `invite_existing_member_test.sql` | Both functions check membership before the invite's state. Joiner opening Mia's **used** Berlin code sees **“You’re already on Berlin weekend”** and Open trip, with no error. pgTAP **19/19**: a member with a used code (M10–M12) or an expired code (M15–M17) gets the trip and the invite is untouched; non-members still get **invite already used** (M9, M14) and **invite expired** (M18, M19). S14 in `rls_invites_test.sql` now checks expiry with a caller who is not on the trip. Full suite **71/71**. |
| Join line on revisit | `join-member-390-light`, `join-member-used-390-light` | Found while capturing N45: on Android, revisiting the join screen in one session drew “You’re already on Berlin” with the trip name clipped. The line now has `flex: 1`; both frames (second and third join visit of the session) draw the full line. |

Retained from pass seven, re-measured from these frames: N35 shadow reach
**18.4dp** at rest, **0** shadow pixels under the clock in both keyboard frames;
N36 member-case invite row `accepted_at=null accepted_by=null` before and after;
N37 labels **6.1dp** above every date field (6px on web); N38 pair → link
**8.3dp**, link → STATUS **21.3dp**; N39 hairline only when scrolled; N40 cream
card, stamp **23.8dp** above the airmail band; Edit trip reopens with the saved
dates after a cancelled Clear dates. Older fixes: Back rows **30.0dp** (N28),
sheet bottom gaps **36.0–36.1dp** (N29), empty-state gaps
**16.3 / 15.9 / 15.5dp** (N34), web Plan shell and tab bar ending at
**1100px / 900px** ([WEB_MEASUREMENTS.json](WEB_MEASUREMENTS.json), N16).

## Build and capture provenance

- Android: `./gradlew assembleRelease -q` from `9645fb1`, then a fresh
  `adb uninstall app.waymark` / `adb install app-release.apk` and sign-in.
  Local and installed APK SHA-256 both equal
  `30714b84e772998fd7b86d145a0a5477b13ecdce3a7b045fd07e0aa69c3c5392`.
- Android `emulator-5554`: physical 1080×2400, font scale **1.0**.
  Densities **480 / 443 / 402** supply nominal **360 / 390 / 430dp** widths.
  The app was force-stopped and relaunched after every density and theme change.
- Web: production static export from the same commit, bundle
  `entry-93aa427e05cd9a620a2b258313e84857.js`, verified as the loaded script on
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

## Matrix — 90 PNGs

- `{trips,plan,plan-today,packing,notes,trip}-{360,390,430}-{light,dark}` (36).
- `trips-bottom-390-light` (1).
- `{plan,packing,notes,trip}-noart-390-light` (4).
- `profile-390-{light,dark}`, `profile-430-light`,
  `profile-bottom-390-light`, `profile-delete-390-light` (5).
- `signin-{360,390}-light`, `signin-360-dark`, `signin-keyboard-390-light`,
  `signup-keyboard-{360,390}-light`, `signup-from-code-390-light`,
  `onboarding-390-light` (8).
- `invite-code-390-light`, `invite-code-filled-390-light`,
  `join-member-390-light`, `join-member-used-390-light`,
  `join-preview-390-light`, `join-preview-dated-390-light`,
  `join-invalid-390-light` (7).
- `newtrip-empty-390-light`, `newtrip-typed-390-light`,
  `newtrip-dates-390-light`, `trip-edit-390-light`,
  `trip-edit-cleared-390-light`, `trip-edit-keyboard-390-light`,
  `item-editor-open-390-light`, `item-editor-{360,390}-light`,
  `item-editor-longdate-360-light`, `item-editor-cleared-390-light` (11).
- `{trips,plan,packing,notes,trip}-theo-390-light`,
  `trip-member-390-dark` (6).
- `privacy-390-light`, `privacy-bottom-390-light`,
  `delete-account-390-light` (3).
- `web-{trips,plan,signin,newtrip}-{680,1280}-light`,
  `web-delete-account-680-light` (9).

New this pass: `newtrip-dates-390-light` (N44), `join-member-used-390-light`
(N45) and `item-editor-longdate-360-light` (the N42 fit check).

Actors: Mia (`tester@waymark.test`) for her trips, editors and profile;
Joiner (`joiner@waymark.test`, on Mia's Berlin weekend) for the member,
used-code and invalid-code states; Theo (`theo@waymark.test`, on neither
invite's trip) for both join previews and his Kyoto views; Fresh for onboarding.

## Fixture integrity and final state

Before/after row hashes are identical for trips, itinerary items, packing
items, trip notes, trip members and trip invites. No invite was accepted
outside pgTAP: join screens were previewed only, Open trip and Join were never
tapped, and no new invite code was created. Every edit, clear, date and
new-trip form was cancelled; Delete account was only previewed. Fresh's
onboarding name was a local draft, followed by clearing local app data and
signing back in as Mia; no profile was created. Account passwords are not
stored in the audit artifacts.

Quality gates: **typecheck**, **lint with 0 errors and 0 warnings**,
**73 Vitest tests**, **71 pgTAP assertions** in 10 files.

Emulator restored to **physical density 420 with no override**, **font scale
1.0**, **automatic time enabled**, light mode, `America/Guatemala`, signed in as
**Mia** on Your trips.
