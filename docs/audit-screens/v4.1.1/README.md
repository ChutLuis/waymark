# Airmail v4.1.1 — rail lift, stop stamp, album postmarks and the now slot

**Build:** Android release APK, JS bundled in, on the same `sdk_gphone16k_x86_64` emulator
as v4.1, Android 17, 1080×2400 at density 443 (390 dp wide).
**Code:** `pick` and the stills at `cbfa34f`; `confirm` and `done` at `5bbbaa2`, which
changes only how the status tag stamps in.
**Account:** Mia. Today is 12 Oct 2026, so Kyoto & Nara is on day 10 of 10. The day's four
stops and eight extra past trips were seeded locally for these captures and are not part
of the repository.
**Clock:** the Plan stills set the emulator's clock to the time in their name; the
recordings use the real clock.

## Stills

| File | Shows |
|------|-------|
| `home-berlin-picked-390-light` | Home at rest after picking Berlin: Berlin's stamp sits 4 pt above the others. |
| `album-390-{light,dark}` | The album with 10 past trips over 2024–2026 (sheets of two, six and two); the postmark rings and cancel lines run past each stamp's right edge onto the sheet. |
| `album-end-390-light` | The album scrolled to its end. |
| `plan-0730-390-light` | Before the first stop: the plane and "NOW 7:30" sit in a slot above Fushimi Inari. |
| `plan-1628-390-{light,dark}` | 16:28: the slot sits after Tea ceremony, under "4 h free"; the NEXT ticket for Gion walk starts below it. |
| `plan-1631-390-light` | 16:31: the slot has moved past Gion walk, under "3 h free"; Philosopher's Path is the NEXT ticket. |
| `plan-2200-390-light` | After the last stop: the slot sits below Philosopher's Path. |

## Measurements

**Rail lift.** Berlin's navy panel starts at y = 1522 px unpicked (the v4.1 stills) and at
1511 px picked at rest: 11 px, which is 4 pt at 2.77 px/pt. In `pick` it reaches 1511 by
150 ms and stays there through 950 ms, past the old card's removal at 640 ms. At launch
Kyoto's art sits 11 px higher than when it is unpicked, matched by image search.

**Now slot move.** Recorded across 16:30 on the real route: the rows, plane and ink move
from 38.08 s to 38.38 s, 300 ms. The free-time labels keep their text and slide with
their gaps.

## Recordings

Each folder in `recordings/` holds the clip and `frames/`, named by the time after the tap.
The tap frame is the first frame that shows the touch dot or a change above the idle
motion.

| Clip | Frames | What the frames show |
|------|--------|----------------------|
| `pick` | Every 50 ms, 0–950 ms | Berlin's envelope deals over Kyoto; Berlin's stamp rises by 150 ms and holds. |
| `confirm` | Every frame, 0–395 ms | Gion walk, planned → confirmed. The stamp fades in by 67 ms and the torii inks in from about 212 ms, complete by about 350 ms. PLANNED holds through 279 ms, 296 ms is the new tag's hidden first frame, and CONFIRMED stamps in from 312 ms, at rest by 346 ms. |
| `done` | Every frame, 0–500 ms | Gion walk, confirmed → done. The postmark plays through: the ring shows from about 116 ms and holds its final frame. The row turns compact and the stamp squashes from 416–449 ms. |

**Done timing.** The squash and the row swap fire together, 330 ms after the `done`
segment starts, as specified. But the segment starts about 85 ms after the tap (two runs,
both swapping at 416 ms), while the confirm segment starts within a frame of the tap.
Both go through the same optimistic status update; the extra latency before `done`
reaches the stamp is not explained here.

## Device check

Not run: no physical mid-range Android was attached, only this emulator.
