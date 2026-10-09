# Airmail audit — sixth-pass release capture

**Single UI code commit:** `37844ee07323b194a8bbf1250fd8a92b81c0bf3b` (`37844ee`).
**Capture window (local, UTC−6):** 2026-10-09 07:32:16 → 10:54:07.
**85 fresh PNGs:** 76 Android release frames and 9 headful Chrome frames.
Every frame was visually reviewed. There are no runtime error screens, LogBox
or toasts; `join-invalid-390-light` is the requested invalid-code validation state.

## Proof per fix

Screenshot names below have the `.png` extension. Original bounds, conversions
and pixel checks are in [UI_MEASUREMENTS.json](UI_MEASUREMENTS.json).

| Fix | Screenshots | Result and measurements |
|-----|-------------|-------------------------|
| N28 · Privacy header | `privacy-390-light`, `delete-account-390-light`, `privacy-bottom-390-light` | Both Back rows start at **30.0dp**: y=83px at density 443. Privacy now uses `paddingTop: insets.top`; the opaque page-coloured status band remains. |
| N29 · Android sheet padding | `trip-edit-390-light`, `trip-edit-cleared-390-light`, `newtrip-empty-390-light`, `item-editor-{360,390}-light`, `item-editor-cleared-390-light`, `profile-delete-390-light`; keyboard proofs: `newtrip-typed-390-light`, `trip-edit-keyboard-390-light` | Last-control bottom → gesture-handle top: Edit with dates **36.1dp**; Edit cleared **36.1dp**; New trip empty **36.1dp**; Item editor 360 **36.0dp**; Item editor 390 **35.8dp**; Item editor cleared **36.1dp**; Delete account confirmation **36.1dp**. All exceed 16dp. Closed padding is `insets.bottom + spacing.s3` (8dp); open-keyboard card padding is **0dp**. Both keyboard captures show the card meeting the keyboard, retaining N19. Dated item editors are scrolled to the end so Delete item is fully visible. |
| N30 · Join separator | `join-preview-390-light`, `join-preview-dated-390-light` | Undated: **“from Mia”**. Dated: **“from Mia · 13–16 Oct”**. Metadata joins only present parts. Both were checked against the actual native accessibility text. |
| N31 · Date labels | `newtrip-empty-390-light`, `newtrip-typed-390-light`, `trip-edit-390-light`, `trip-edit-cleared-390-light`, `web-newtrip-{680,1280}-light` | New and Edit use **TRIP NAME → DESTINATION optional → STARTS / ENDS**, in that order. New trip's separate DATES heading is removed; the paired fields share the 12dp column gap. |
| N32 · Item Clear link | `item-editor-{360,390}-light`, `item-editor-cleared-390-light`, `trip-edit-390-light` | **STARTS optional** and **ENDS optional** use the same style. **Clear times** sits on the left beneath the pair, with the same **24dp** layout gap as Clear dates (14dp body gap + 10dp link margin). Pair gap is 12dp. The accessibility label is also Clear times. Full `7 Oct, 10:30` remains visible at both widths. |
| N33 · Empty Notes | `notes-noart-390-light`, `notes-390-light`, `notes-theo-390-light` | Empty Notes keeps its intro and hides the filter. Mia's populated filter shows **All · 3 / Shared · 2 / Only you · 1**; Theo's shows **All · 2 / Shared · 2 / Only you · 0** and no birthday note. |
| N34 · Empty placement | `plan-noart-390-light`, `packing-noart-390-light`, `notes-noart-390-light` | All three use top placement, a shared **16dp** gap from preceding content, and the same **56×72dp** SVG stamp box. Raw whole-pixel accessibility gaps are 16.3 / 15.9 / 15.5dp respectively; text/SVG bounds differ slightly from their Yoga layout edges at density 443. The shared layout token is exactly 16dp in every case. |
| N35 · Sign-up shadow | `signup-keyboard-{360,390}-light`, `signup-from-code-390-light` | The postcard group clips its child shadows. Both keyboard frames have plain page colour immediately below the solid status band: **6,360 / 6,360** sampled pixels match the page colour in each image, with **0 shadow pixels** in those bands. |

## Build and capture provenance

- Android: `./gradlew assembleRelease -q` after the code commit; a fresh
  `adb uninstall app.waymark` / `adb install app-release.apk`, followed by sign-in.
  Local and installed APK SHA-256 both equal
  `9428824354eba9ba6856ea74915f70f7d7547a1042beccc9ab19c3e05c1a1fe7`.
- Android `emulator-5554`: physical 1080×2400, font scale **1.0**.
  Densities **480 / 443 / 402** supply nominal **360 / 390 / 430dp** widths.
  The app was force-stopped and relaunched after every density change.
- Web: production static export from the same code commit, bundle
  `entry-06f7f99cc5a4a8b40a96909c174f9cb2.js`. Headful Chrome was driven through the
  Chrome DevTools MCP CLI with a persistent profile. Viewports are
  **680×1100** and **1280×900**, DPR **1**, light scheme.
- Per-file timestamps, actor, theme, density/viewport, dimensions, SHA-256,
  visual-review result and source commit:
  [CAPTURE_INVENTORY.json](CAPTURE_INVENTORY.json).
  APK/export hashes and restored device state:
  [BUILD_PROVENANCE.json](BUILD_PROVENANCE.json).
- Web Plan shell and tab-bar bottoms equal **1100px / 900px** at the two
  respective viewports; all four tab labels remain within the window.
  [WEB_MEASUREMENTS.json](WEB_MEASUREMENTS.json) records the current export's
  DOM measurements, retaining N16.

## Plan-today clock

The existing itinerary's 21:00 Philosopher's Path stop is dated **8 Oct local**;
there are no 9 Oct itinerary rows. The six Plan-today frames used an emulator
clock set to **2026-10-08 19:00 UTC−6**, preserving the trip data. They show the
8 Oct stamp selected, the Next card and the 21:00 stop.

Actual host capture times on **9 Oct** were **10:53:17 → 10:54:07**,
before 20:30 local. Device times were **19:01:04 → 19:01:55** on 8 Oct, also
before the fixture's 20:30 cutoff. Each of these inventory rows explicitly
records its fixture-clock scenario. Automatic time was restored afterward.

## Matrix — 85 PNGs

- `{trips,plan,plan-today,packing,notes,trip}-{360,390,430}-{light,dark}` (36).
- `trips-bottom-390-light`, scrolled to PAST TRIPS (1).
- `{plan,packing,notes,trip}-noart-390-light` (4).
- `profile-390-{light,dark}`, `profile-430-light`,
  `profile-bottom-390-light`, `profile-delete-390-light` (5).
- `signin-{360,390}-light`, `signin-360-dark`,
  `signin-keyboard-390-light`, `signup-keyboard-{360,390}-light`,
  `signup-from-code-390-light`, `onboarding-390-light` (8).
- `invite-code-390-light`, `invite-code-filled-390-light`,
  `join-preview-390-light`, `join-preview-dated-390-light`,
  `join-invalid-390-light` (5).
- `newtrip-empty-390-light`, `newtrip-typed-390-light`,
  `trip-edit-390-light`, `trip-edit-cleared-390-light`,
  `trip-edit-keyboard-390-light`, `item-editor-{360,390}-light`,
  `item-editor-cleared-390-light` (8).
- `{trips,plan,packing,notes,trip}-theo-390-light`,
  `trip-member-390-dark` (6).
- `privacy-390-light`, `privacy-bottom-390-light`,
  `delete-account-390-light` (3).
- `web-{trips,plan,signin,newtrip}-{680,1280}-light`,
  `web-delete-account-680-light` (9).

## Fixture integrity and final state

The UI code leaves the feature data hooks, database functions, navigation and
flows intact. Before/after row hashes match for trips, itinerary items,
packing items, trip notes and trip members. Edit/clear/new forms were cancelled;
Delete account was only previewed; no invite was accepted. The existing Trip
screen generated one unused Mia code for the undated Pass five invite trip
through its normal lazy-invite flow. No new account or profile was created:
Fresh's onboarding name was a local draft, followed by clearing local app data
and signing back in as Mia. Account passwords and configuration values are not
stored in the audit artifacts or capture scripts.

Quality gates passed: **typecheck**, **lint with 0 errors**, **73 Vitest tests**,
and **52 pgTAP assertions**. The initial uncached lint pass reported the five
pre-existing React Hook Form compiler warnings; the final cached pass succeeded.

Emulator restored to **physical density 420 with no override**, **font scale
1.0**, **automatic time enabled**, `America/Guatemala`, signed in as **Mia**
on Your trips. The six obsolete extra invite/status-path PNGs from pass five
were removed from the current directory; the earlier archive directories remain.
