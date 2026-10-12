# Airmail audit — ninth-pass release capture

**Code commits:** `3099ae1` (the design-review fixes V1–V12, N46 and N47, plus three
design matches found while measuring the design files: field text inset, field label
colour and the New trip preview's date range) and `935d4c8` (blurred stamp shadows and
the tall New trip sheet).
**Capture windows (local, UTC−6):** 2026-10-11 16:37:31 → 17:02:55 (`3099ae1`) and
19:48:19 → 19:51:30 (`935d4c8`).
**92 PNGs:** 83 Android release frames and 9 headful Chrome frames. 76 come from
`3099ae1`; the 16 that show stamps or the New trip sheet were re-captured from
`935d4c8` (listed below). Each row of the inventory records its commit and build.
Every frame was visually reviewed. There are no runtime error screens, LogBox or
toasts; `join-invalid-390-light` is the requested invalid-code validation state.

## Stamp shadow and New trip sheet (`935d4c8`)

Re-captured: `trips-390-{light,dark}`, `trip-390-{light,dark}`,
`profile-390-{light,dark}`, `onboarding-390-light`, `plan-today-390-light`,
`notes-390-light`, `newtrip-{design,empty,typed}-390-light`, `trip-edit-390-light`,
`item-editor-390-light`, `web-newtrip-{680,1280}-light`.

| Fix | Result and measurements |
|-----|-------------------------|
| Stamp shadow | Every `PerforatedStamp` casts the README's shadow along its scalloped edge: `stampInk` at 0.3, offset 1 dp (0.8 under 40 pt), Gaussian blur σ 1 (0.75 on 40–64 pt stamps). The shadow is drawn from the stamp's outline path with the blur on the path, in an Svg that reaches 3 dp past the stamp; react-native-svg filters only shapes and, on Android, masks after the blur, so the masked frame could not carry it. Under the bottom edge of `trip-390-light`'s stamp, between two holes: **#FFFFFF → #E2E2E4 → #C4C5C6 → #D1D1D0 → #E3E1DE → #F3F1EB → #FDFAF3 → #FFFCF5** (one physical pixel each, 2.77 px per dp); before, #FFFFFF went straight to the card. In dark mode the shadow is dark (`stampInk` in both themes). Android and web use the blur; iOS runs the same code path but was not run here. Scrolling Trips and Profile shows the same janky-frame counts with and without the blur. Plan's day strip keeps 3 dp under its stamps inside its scroll view. |
| New trip sheet | New trip uses Sheet's `tall` size: the card's top sits 9 dp under the status bar and the card runs to the bottom of the screen, with the empty space under the dates. Sheet top **32.9 dp** (24 dp status bar + 9) in `newtrip-design`, `newtrip-empty` and `newtrip-typed` (keyboard up, Destination visible); **33.0 dp** at 360 and 430 with and without the keyboard; **32.9 dp** in dark. Web 680: card from **9 px** to the bottom; web 1280 keeps the centred 480 px card. Edit trip and the item editor still fit their content (their sheets are pixel-identical to the `3099ae1` frames; only the stamp and live scene behind the scrim and the input glyphs differ). |

## Proof per fix

Screenshot names below have the `.png` extension. Original bounds, conversions and
pixel checks are in [UI_MEASUREMENTS.json](UI_MEASUREMENTS.json); web values are in
[WEB_MEASUREMENTS.json](WEB_MEASUREMENTS.json). Design values are measured from the
design screens at 2× (px ÷ 2 = pt).

| Fix | Screenshots | Result and measurements |
|-----|-------------|-------------------------|
| V1 · Bottom actions pinned | `signin-{360,390}-light`, `signin-360-dark`, `signup-keyboard-{360,390}-light`, `signup-from-code-390-light`, `onboarding-390-light`, `web-signin-{680,1280}-light` | Content containers grow (`flexGrow: 1`) and the bottom block takes `marginTop: 'auto'` with `paddingBottom: max(insets.bottom, 34)` (40 on Onboarding; Join uses the same rule). Measured on the release build at 360 / 390 / 430: the invite button ends **34.0 / 33.9 / 33.8 dp** above the screen edge; Create account **84.0 / 84.1 / 84.0 dp** (34 + the 44 dp Sign in row + 6); Continue **40.0 / 40.1 / 39.8 dp**. Web: **34 px** at 680 and 1280. With the keyboard up the block stays below the form and scrolls with it. |
| V2 · Needs-someone rows | `packing-{360,390,430}-{light,dark}`, `packing-theo-390-light` | Checkbox, label and pills share one row: **64.0 dp** pitch, pills **44 dp** high, **8 dp** apart, always on the label's row; Theo's pill ends at the card's inner edge (**365.4 dp** at 390, design 365.5). At 390 every label is on one line; "Camera and charger" wraps to two. At 360 "Pocket Wi-Fi" (117.4 dp at 17/22) also wraps: the row leaves 113 dp, and the design's own values leave 115 pt for its 115.5 pt label. Three or more pills keep their own row. |
| V3 · Notes filter spans the card | `notes-{360,390,430}-{light,dark}`, `notes-theo-390-light` | Margin 12 14 0 and three equal segments (**105.3 / 105.4 / 105.3 dp** at 360). The track's edges sit on the note cards' edges: **0.0 dp** in dark; the ±0.7–1.0 dp in light is the card's shadow edge. All three labels fit untruncated at 360. Profile's Appearance control is unchanged. |
| V4 · LEAVE / RETURN date boxes | `newtrip-design-390-light`, `newtrip-dates-390-light`, `newtrip-empty-390-light`, `trip-edit-{,cleared-,keyboard-}390-light`, `item-editor-*`, `newtrip-longdate-360-light`, `web-newtrip-{680,1280}-light` | The label sits inside a 64 dp box (radius 8, paper, 1.5 border, 2 ink while pressed or the picker is open). Build vs design at 390: box **166.1 × 63.9** vs 166 × 64; label ink **14.4 / 14.1** vs 14.5 / 14.5 dp from the box's top / left; value ink bottom **47.7** vs 47.5 dp. DATES sits **6.1 dp** above the boxes, which are **9.8 dp** apart. Widest values at 360 (room 123 dp): "Wed 20 May" **117.0 dp**, "20 May, 20:00" at 16/20 **111.3 dp**, each on one line. Web: same box, label at 14 px, 6 px label gap, 10 px box gap. |
| V5 · Stamp ready inside Destination | `newtrip-design-390-light`, `newtrip-typed-390-light` | TextField's new `trailing` node follows the input (`flex: 1`); `labelAccessory` is gone. The input ends **29.2 dp** before Stamp ready, whose text ends **14.8 dp** from the field edge (design 14.0), so typed text scrolls inside it. |
| V6 · No optional tag | `newtrip-*`, `trip-edit-390-light` | DESTINATION (and the dates) carry no "optional" tag in New trip or Edit trip. |
| V7 · Profile email | `profile-390-{light,dark}`, `profile-430-light` | Courier Prime 13/16 in `ink2`: **7.86 dp** per character (Courier Prime 13 advances 7.8), one **16.2 dp** line with an ellipsis for long addresses. |
| V8 · Onboarding preview card | `onboarding-390-light` | The stamp is positioned at top 11, right 11 (measured **10.3–10.8 dp** from the card top, **35 dp** from the screen edge = 24 + 11). The card is **72.7 / 73.7 / 73.3 dp** at 360 / 390 / 430 (design 74). The sample line stays on one line as drawn; the header keeps 30 dp clear of the stamp. |
| V9 · Fixed 48 dp day stamps | `plan-today-{360,390,430}-{light,dark}`, `plan-*` | Stamps **48.0 dp**, gaps **9.0 dp**, first stamp at **16 dp**. At 390 six stamps show in full and the seventh shows **32.1 dp**; at 360 six and **2 dp**; at 430 seven and **14.7 dp** of the eighth. When the tab opens on a day past the edge, the strip scrolls to show it with 16 dp after it (the `plan-*` frames opened on 11 Oct, SUN 11). |
| V10 · Two-digit times | `plan-*`, `plan-today-*` | Rows read **08:00 / 13:00 / 21:00** and the Next card **21:00 · Walk up to Ginkaku-ji**; the NOW chip keeps `formatTime` (**NOW 19:00**). New Vitest cases cover 07:00, 09:05 and 20:00. |
| V11 · Onboarding back chevron | `onboarding-390-light` | A **44 × 44 dp** target at x 8 with `ChevronLeft` 24 / 2.2, labelled Back. With nothing behind it, it signs out and the auth gate returns to Sign in (verified live; the account is kept). |
| V12 · Suitcase tab icon | every trip tab frame | The design's wheel-less suitcase, drawn with react-native-svg at 22 pt with the tab's colour and stroke. |
| N46 · Clear times above Status | measured live at 360 and 390 | DatePair draws above the next block (`zIndex: 1`). The link's touch area starts at the boxes' bottom edge (**0.0 dp**), overlaps the STATUS label by **5.9–6.0 dp** and stops **16.0–16.5 dp** above the segmented control. A real tap **17 dp** under the link's box (inside the STATUS label) cleared both times; a tap **2 dp** above the boxes' bottom edge opened the picker. Each form was cancelled. |
| N47 · SECURITY.md S14 / S15 | `docs/SECURITY.md` §7 | "A non-member accepts an expired invite" and "A non-member accepts an already-used invite", both denied. |

### Design matches found while measuring

| Match | Screenshots | Result and measurements |
|-------|-------------|-------------------------|
| Field text inset | `newtrip-design-390-light`, `trip-edit-390-light` | The design's field borders are inset, so text sits 16 pt from the outer edge. TextField now pads 16 − border (14 − border on the right while a trailing node shows): first text ink **15.9–17.0 dp** from the outer edge (design 16.0 for "Antigua", 17.0 for "Guatemala"), and it no longer moves when the border thickens on focus. |
| Field labels in ink | form frames | Field labels (TextField, DatePair, Onboarding FROM / TO, the editors' group labels) render **#15223B**, as in the design; section kickers stay `ink2`. |
| Preview date range | `newtrip-design-390-light`, `newtrip-dates-390-light`, `newtrip-longdate-360-light` | The preview uses the trip cards' compact range: **13–23 NOV · 10 NIGHTS**, as in the design. |

Retained from earlier passes, re-measured from these frames: N35 shadow reach
**18.42 dp** at rest and **0** shadow pixels beside the cards under the clock band in
both keyboard frames; N36 / N45 member-first invites (pgTAP files unchanged, full suite
**71/71**, join frames show "You’re already on Berlin weekend"); N38 pair → link
**8.31 dp**, link → STATUS **21.67 dp**; N39 header hairline only when scrolled; N40
cream card, stamp **23.84 dp** above the airmail band; N41 Clear link touch area
**44.0 / 44.2 dp** tall, starting at the boxes' edge; N44 New trip stamp **W**; Edit
trip reopens with the saved dates after a cancelled Clear dates. Older fixes: Back rows
**29.98 dp** (N28), sheet bottom gaps **36.12 dp** (N29), empty-state gaps
**16.25 / 15.89 / 15.53 dp** (N34), web Plan shell and tab bar ending at
**1100 px / 900 px** with no page scroll (N16).

## Build and capture provenance

- Android: `./gradlew assembleRelease -q` from `3099ae1`, then a fresh
  `adb uninstall app.waymark` / `adb install app-release.apk` and sign-in.
  Local and installed APK SHA-256 both equal
  `c361ceb31a0bbbaf6ff42c93899d8483a7d019c6947ed825876c897024a3a36c`.
- Android `emulator-5554`: physical 1080×2400, font scale **1.0**.
  Densities **480 / 443 / 402** supply nominal **360 / 390 / 430dp** widths.
  The app was force-stopped and relaunched after every density and theme change.
- Web: production static export from the same commit, bundle
  `entry-6b2192ccc18dc70244eb97cd5880fb2b.js`, verified as the loaded script on
  every navigation. Headful Chrome via the Chrome DevTools MCP CLI, viewports
  **680×1100** and **1280×900**, DPR **1**, light colour scheme forced.
- The `935d4c8` frames: a fresh install of its release APK
  (`fae717f4009b108c9e65d1311a8b59bc2775eecf42f5197fbc7f1e1d628e7977`, local and
  installed) at density 443, and its web export
  `entry-d4f3caee74c12024790c1d3902e44b3c.js` at 680×1100 and 1280×900.
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

## Matrix — 92 PNGs

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
  `newtrip-dates-390-light`, `newtrip-design-390-light`,
  `newtrip-longdate-360-light`, `trip-edit-390-light`,
  `trip-edit-cleared-390-light`, `trip-edit-keyboard-390-light`,
  `item-editor-open-390-light`, `item-editor-{360,390}-light`,
  `item-editor-longdate-360-light`, `item-editor-cleared-390-light` (13).
- `{trips,plan,packing,notes,trip}-theo-390-light`,
  `trip-member-390-dark` (6).
- `privacy-390-light`, `privacy-bottom-390-light`,
  `delete-account-390-light` (3).
- `web-{trips,plan,signin,newtrip}-{680,1280}-light`,
  `web-delete-account-680-light` (9).

New this pass: `newtrip-design-390-light` ("Antigua & Tikal", Guatemala, 13–23 Nov,
to match the design) and `newtrip-longdate-360-light` ("Wed 20 May"). Re-taken:
`item-editor-longdate-360-light` now holds "20 May, 20:00".

Actors: Mia (`tester@waymark.test`) for her trips, editors and profile;
Joiner (`joiner@waymark.test`, on Mia's Berlin weekend) for the member,
used-code and invalid-code states; Theo (`theo@waymark.test`, on neither
invite's trip) for both join previews and his Kyoto views; Fresh for onboarding.

## Fixture integrity and final state

Before/after row hashes are identical for trips, itinerary items, packing
items, trip notes, trip members and trip invites. No invite was accepted
outside pgTAP: join screens were previewed only, Open trip and Join were never
tapped, and no new invite code was created. Every edit, clear, date and
new-trip form was cancelled, including the N46 taps; Delete account was only
previewed. Fresh's onboarding name was a local draft, followed by clearing local
app data (or Back, which signs out) and signing back in as Mia; no profile was
created. Account passwords are not stored in the audit artifacts.

Quality gates: **typecheck**, **lint with 0 errors and 0 warnings**,
**76 Vitest tests**, **71 pgTAP assertions** in 10 files at `3099ae1`; typecheck,
lint (0 / 0) and **79 Vitest tests** at `935d4c8`. Fixture hashes were unchanged
across both captures.

Emulator restored to **physical density 420 with no override**, **font scale
1.0**, **automatic time enabled**, light mode, `America/Guatemala`, signed in as
**Mia** on Your trips.
