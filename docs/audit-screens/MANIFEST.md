# Airmail audit — third-pass screenshot build

**Code commit:** `97702f386a8153378afc804d870b5fadde1b10aa`
**Clock range (local, UTC-6):** 13:14:17 → 14:27:27
**Captured:** Android emulator (`emulator-5554`) for the phone frames, headless
Chromium (agent-browser CLI) for the web frames.

## iOS limitation (unchanged)

The brief asks for iPhone 14 (390 pt) and iPhone 15 Pro Max (430 pt). There is
no iOS simulator on this Linux host, so 390/430/360 are reproduced on an
Android emulator via display-density overrides:

| Label | Logical width | `wm density` |
|-------|---------------|--------------|
| `-430-` | 430 pt | 402 |
| `-390-` | 390 pt | 443 |
| `-360-` | 360 dp | 480 |

Type rendering and iOS-only affordances differ; layout widths do not.

## Proof per item

| Item | Files that prove it |
|------|---------------------|
| 1 · N4/N10 text clipping | `trips-430-light` (BERLIN, NARNIA full), `notes-390-light`/`notes-430-light` (Kyoto & Nara), `trip-360-light` |
| 2 · 34 privacy | `privacy-390-light` ("Removing your data") |
| 3 · N11 invite code | `signin-390-light`, `invite-code-390-light`, `invite-code-filled-390-light`, `signup-from-code-390-light`, `join-code-replayed-390-light` |
| 4 · 33 keyboard | `signin-keyboard-390-light`, `signup-keyboard-390-light`, `onboarding-keyboard-390-light` |
| 5 · N12 Plan title | `plan-noart-390-light` (Berlin weekend, 2 lines area) |
| 6 · N13 claim pills | `packing-360-light`, `packing-390-light` |
| 7 · N14 date boxes | `trip-390-light`, `trip-edit` states, `item-editor-390-light` |
| 8 · Plan empty column / Join label | `plan-empty-390-light`, `trips-360-light` ("Join with a code") |
| 9 · stampName longest word | `newtrip-typed-390-light` (san sebastian → SEBASTIÁN) |
| Decision · account deletion | `profile-bottom-390-light`, `profile-delete-390-light`, `privacy-390-light`, `web-delete-account-680-light`, `supabase/tests/account_deletion_test.sql` |
| Requested states | `plan-today-*` (free time, Next, confirmed stamps), `packing-noart-*`/`notes-noart-*`/`trip-noart-*` (Berlin every tab), `signin-360-light`, `profile-390-dark`, `signup-strength-390-*`, `newtrip-empty-390-light`, `trips-empty-390-light`, `onboarding-390-light` |
| Web | `web-{trips,plan,signin,newtrip}-{680,1280}-light`, `web-delete-account-680-light` |

## Matrix (73 files)

- Phone tabs, light+dark: `{trips,plan,plan-today,packing,notes,trip}-{360,390,430}-{light,dark}`
- No-art trip, every tab (light): `{plan,packing,notes,trip}-noart-390-light`
- Plan empty day: `plan-empty-390-light`
- Profile: `profile-390-light`, `profile-390-dark`, `profile-430-light`, `profile-bottom-390-light`, `profile-delete-390-light`
- Auth: `signin-{360,390}-light`, `signin-360-dark`, `signin-keyboard-390-light`, `signup-keyboard-390-light`, `signup-strength-390-{light,dark}`, `signup-from-code-390-light`, `onboarding-390-light`, `onboarding-keyboard-390-light`
- Invite: `invite-code-390-light`, `invite-code-filled-390-light`, `join-code-replayed-390-light`
- New trip: `newtrip-{empty,matched,typed}-390-light`
- Misc: `privacy-390-light`, `trips-empty-390-light`
- Web: `web-{trips,plan,signin,newtrip}-{680,1280}-light`, `web-delete-account-680-light`

All 73 files were opened and checked against their names before committing.

## N2 (settled)

Closed as not reproduced. Re-tested on a **release build** (`assembleRelease`):
opened a trip, changed Display size (density 480→420) and Font size
(font_scale 1.3→0.85→1.0). No stack trace: logcat showed no
`InvocationTargetException`, `FATAL EXCEPTION` or `AndroidRuntime` entry, and
the app recreated cleanly back to the same screen. `configChanges` untouched.