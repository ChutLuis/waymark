# Airmail v4.1.2 — stamp on the tap, one reflow, plane glyph, album grid

**Build:** Android release APK, JS bundled in, on the same `sdk_gphone16k_x86_64` emulator
as v4.1 and v4.1.1, Android 17, 1080×2400 at density 443 (390 dp wide).
**Code:** `09b5b30` for the recording and every still.
**Account:** Mia. Today is 12 Oct 2026, Kyoto & Nara day 10 of 10. The day's four stops and
eight extra past trips were seeded locally for these captures and are not part of the
repository.
**Clock:** the Plan stills set the emulator's clock to the time in their name, after a
launch on the real clock so the app's cached data is current; the recording uses the
real clock.

## Stills

| File | Shows |
|------|-------|
| `plan-0730-390-light` | The slot above the first stop, "NOW 07:30", and the plane glyph in its disc. |
| `plan-1628-390-light` | The slot after Tea ceremony, "NOW 16:28", above the NEXT ticket for Gion walk; the glyph shows. |
| `album-390-{light,dark}` | 10 past trips over 2024–2026: four to a row (2025 is 4 + 2), "Athens long weekend" and "Bangkok at New Year" in full on three lines, and each row's months on one baseline. |
| `album-end-390-light` | The album scrolled to its end. |

## Recordings

`recordings/confirm-done/confirm-done.mp4` is one clip: Gion walk is tapped once (planned →
confirmed) and again 0.8 s later (confirmed → done). Frames are named by time after each
tap, every frame to 500 ms. Show-touches does not appear in this recording, so each tap is
the first frame the app answers it.

| Segment | Tap frame | Segment starts | Contact |
|---------|-----------|----------------|---------|
| Confirm | clip frame 93 (1.537 s) | clip frame 93, `confirm-frames/0000ms`: the stamp's first frame; the empty slot shows no press dim, so the tap and the start are the same frame | `0300ms`: the old tag's hidden frame; CONFIRMED stamps in from `0317ms` |
| Done | clip frame 141 (2.338 s), the press dim at touch-down | the postmark's first visible frame is clip frame 145, `done-frames/0066ms`; the comp's postmark is invisible until its frame 18, 33 ms into `play(17, 35)` | `0366ms`: the row turns compact; the stamp squashes from about `0383ms` |

adb sends touch-up a few tens of milliseconds after touch-down, and the stamp starts on
`onPress`, which fires at touch-up. Measured from touch-down, done's segment starts within
about two frames and its contact lands 36 ms after 330; measured from its start, as
confirm is, both land within a frame of 300 and 330 ms. An isolated done, launched fresh
with no confirm before it, also swaps at 367 ms from touch-down, so the back-to-back taps
add no delay.

`recordings/done-route/` is the same done, cropped to the route, every frame from the tap
to 800 ms. The row turns compact at 366 ms; from there "3 h free", the plane, the NOW tag
and the NEXT ticket move up together and settle by about 650 ms. Nothing jumps and
nothing crosses.

## Device check

Still open: no physical mid-range Android was attached.
