# Airmail audit — fourth-pass screenshot build

**Code commit:** `aabe66790deb4f113813bd7b34513e4d81832272`
**Capture window (local, UTC-6):** 2026-10-07 19:31 → 2026-10-08 09:26
(one pass; the machine slept overnight, splitting the clock range)
**Captured:** Android emulator `emulator-5554`; headless Chromium via the
`agent-browser` CLI for the web frames.

## iOS limitation (unchanged)

No iOS simulator on this Linux host. 390/430/360 are reproduced on an Android
emulator via display-density overrides (`wm density 443 / 402 / 480`). Type
rendering and iOS-only affordances differ; layout widths do not.

## Proof per item

| Item | Files |
|------|-------|
| 1 · 34/N15 deletion copy + gate | `privacy-390-light` (top) + `privacy-bottom-390-light` ("Removing your data" = trip-deletion sentence only), `profile-delete-390-light` (corrected sheet copy), `web-delete-account-680-light` ("What gets deleted") |
| 1 · storage + pgTAP | `supabase/tests/account_deletion_test.sql` (13 assertions); `supabase/functions/delete-account/index.ts` removes avatars/<uid>/ + deleted covers; `useDeleteTrip` removes its cover |
| 2 · N11 navigation | `invite-code-390-light`, `invite-code-filled-390-light`, `signup-from-code-390-light` (new subtitle), `onboarding-390-light`, `join-preview-390-light` (Code found, real code QU927PK2), `joined-trip-390-light`, `join-invalid-390-light`, `join-notnow-returns-390-light` (Not now → Trips) |
| 3 · N16 web trip shell | `web-plan-680-light`, `web-plan-1280-light` (tab bar inside the 680 column) |
| 3 · N17 done stamp on web | `web-plan-{680,1280}-light` (Fushimi Inari DONE shows the postmarked stamp) |
| 4 · N18 status-bar bar | `privacy-390-light`, `profile-390-light`, `web-delete-account-680-light` |
| 5 · N19 sheet keyboard | `newtrip-typed-390-light` (destination field clear of the keyboard) |
| 6 · N20 delete sheet | `profile-delete-390-light` (wax-red Delete) |
| 7 · N21 sign-up | `signup-keyboard-390-light`, `signup-keyboard-360-light` (meter + privacy note visible), `signup-from-code-390-light` (invite subtitle) |
| 8 · N22 web footer | `web-trips-1280-light` (footer inside the column) |
| 9 · N23 local times | `plan-today-{360,390,430}-{light,dark}` (NOW 19:xx between 13:00 and 21:00, NEXT card) |
| N14 date boxes | `trip-edit-390-light` (dates set), `trip-edit-cleared-390-light`, `item-editor-390-light` |
| Theo non-owner | `trips-theo-390-light`, `plan-theo-390-light`, `packing-theo-390-light`, `notes-theo-390-light`, `trip-theo-390-light` ("Leave trip"), `trip-member-390-dark` |
| Avatar photo | `profile-390-light`, `trips-390-light` (header), `trip-430-dark` (People row) |
| States | `plan-today-*` (free time, Next, done+confirmed stamps), no-art Berlin on every tab (`*-noart` not requested this pass), `trips-empty` not re-taken |

## Matrix (76 files)

- Phone tabs, light+dark: `{trips,plan,plan-today,packing,notes,trip}-{360,390,430}-{light,dark}`
- No-art trip: `{plan,packing,notes,trip}-noart-390-light`
- Profile: `profile-390-{light,dark}`, `profile-430-light`, `profile-bottom-390-light`, `profile-delete-390-light`
- Auth: `signin-{360,390}-light`, `signin-360-dark`, `signin-keyboard-390-light`, `signup-keyboard-{360,390}-light`, `signup-from-code-390-light`, `onboarding-390-light`
- Invite: `invite-code-390-light`, `invite-code-filled-390-light`, `join-preview-390-light`, `joined-trip-390-light`, `join-invalid-390-light`, `join-notnow-returns-390-light`
- New trip / editors: `newtrip-typed-390-light`, `trip-edit-390-light`, `trip-edit-cleared-390-light`, `item-editor-390-light`
- Theo: `{trips,plan,packing,notes,trip}-theo-390-light`, `trip-member-390-dark`
- Misc: `privacy-390-light`, `privacy-bottom-390-light`
- Web: `web-{trips,plan,signin,newtrip}-{680,1280}-light`, `web-delete-account-680-light`

## Data notes

- Deletion was verified **locally** (local Supabase + `functions serve`); it is
  **not deployed to a hosted project**, so the privacy note keeps only the
  trip-deletion sentence (the gate from item 1).
- Past trip: there is no separate past-trip list row; the Lisbon trip appears
  as a **LISBOA stamp with a postmark** in `profile-390-light`.
- `plan-today` times are stored in local time (`America/Guatemala`); NOW sits
  between the 13:00 confirmed stop and the 21:00 next stop.

## N2 (settled)

Closed as not reproduced. A release-build check (density 480→420, font_scale
1.3→0.85→1.0) showed no crash. Separately, the dev build does surface
`java.lang.reflect.InvocationTargetException`, root cause
`Exceptions$MissingActivity: The current activity is no longer available`
thrown while `expo.modules.image.ExpoImageViewWrapper` constructs a view during
activity recreation — reported, not fixed (dev-only, benign).