# Airmail v4.1.3 — done at 200 ms, no press dim, a reflow that only moves forward

**Build:** Android release APK, JS bundled in, on the same `sdk_gphone16k_x86_64` emulator
as v4.1–v4.1.2, Android 17, 1080×2400 at density 443 (390 dp wide), light theme.
**Code:** `e8abf0c`.
**Account:** Mia, Kyoto & Nara day 10 of 10, real clock. The day's four stops were seeded
locally for the recording and are not part of the repository.

## Recordings

`recordings/confirm-done/confirm-done.mp4` is one clip: Gion walk is tapped once (planned →
confirmed) and again 0.8 s later (confirmed → done). Frames are named by time after each
segment's start, every frame to 500 ms. With no press dim, a segment's start shows only
through the comp: confirm's stamp fades in from its first frame, and done's postmark is
invisible until the comp's frame 18, 33 ms into `play(17, 35)`.

| Segment | Start | First visible | Contact |
|---------|-------|---------------|---------|
| Confirm | clip frame 92, 1.517 s (`confirm-frames/0000ms`) | the same frame: the stamp's first frame | clip frame 110, 1.817 s (`0300ms`): the old tag's hidden frame, CONFIRMED stamping in from `0317ms` |
| Done | clip frame 142, 2.350 s (`done-frames/0000ms`), 33 ms before the postmark shows | clip frame 144, 2.384 s (`0033ms`): the comp's frame 18 | clip frame 154, 2.551 s (`0200ms`): the row turns compact, 167 ms after the first visible frame; the squash shows from `0233ms` |

Neither stamp dims while pressed, so neither segment has a frame where the stamp jumps
back to full strength.

`recordings/done-route/` is the same done, cropped to the route, every frame from its start
to 700 ms. The row turns compact at 200 ms; from 233 ms the plane, NOW tag, "3 h free", the
NEXT ticket and the stamp below all rise together, frame by frame, on the 300 ms reflow,
settling by about 520 ms. Measured on the clip, none of them moves down on any frame.

## Device check

Still open: no physical mid-range Android was attached.
