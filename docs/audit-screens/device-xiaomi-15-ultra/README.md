# Device run — Xiaomi 15 Ultra

**Device:** Xiaomi 15 Ultra (25010PN30G), Android 17, 1080×2400 at density 450 (384 dp wide),
120 Hz. A flagship, not the mid-range class (Pixel 6a/7a, Galaxy A5x) the expand's device
check asks for.
**Build:** Android release APK at `dc24e17`, against the local Supabase over USB.
**Account:** Mia, light theme. Kyoto & Nara is on day 10 of 10; its four stops that day were
seeded locally for the run and are not part of the repository.
**Capture:** `adb shell screenrecord` at 30 Mbit/s, re-encoded with every frame kept.
screenrecord writes a frame only when the screen changes, so a gap between frames is either
a dropped frame or a still screen.

## Recordings

| Clip | What it does | Frame pacing in the motion |
|------|--------------|----------------------------|
| `launch` | Cold launch and the session's deal | 8.9 ms mean; gaps of 21–34 ms during the deal |
| `pick` | Berlin from the rail, then Kyoto back | 8.5 and 9.0 ms mean; one 25 ms gap |
| `expand1` | First open after launch, then back | stalls 226 ms at the tap (below) |
| `expand2` | Second open, then back | stalls 210 ms at the tap |
| `expand3` | Open after a minute in the background, then back | stalls 209 ms at the tap |
| `plan` | Gion walk planned → confirmed, then → done 0.8 s later | 8.9 and 10.2 ms mean, nothing over 17 ms |
| `packed` | Untick and re-tick the last item in Mia's bag | 8.3 and 8.5 ms mean; PACKED slams |
| `notes` | Flip Theo's postcard, then hold the wax seal open | 9.3 and 9.8 ms mean; one 35 ms gap two frames into the flip |
| `album` | Open the shoebox album, then back | push 8.3 ms mean with no gap; one 51 ms gap as the pop ends |

**Plan timing on the device.** Confirm's tag changes at frame 165, 300 ms after the
stamp's first frame (129). Done swaps at frame 245, 166 ms after the postmark's first
frame (229), which is 200 ms from the segment's start. Both match the emulator.

## The expand

`expand-first-open-frames/` holds every frame of `expand1` from 1.0 to 1.75 s, named by
clip time.

| Time | Frame |
|------|-------|
| 1.045 s | Home, the tap just landed |
| 1.045 → 1.271 s | no frame: the screen does not change for 226 ms, and the card shows no press |
| 1.271 s | the postcard on Home is blank: a beige window over cream paper |
| 1.287 s | the trip's stage fills the screen, empty |
| 1.295 s | the header scene appears, already 48 pt from its final top |
| 1.295 → 1.56 s | the header settles its last 48 pt; the page fades in |

The header goes from the card's window (y 544 px) to nearly full screen (y 48 px) between
two drawn frames, so the 580 ms expand from the card is not seen. The expand starts its
clock on the shell's first layout, while the device is still building the trip page's
views; no frames are drawn during those ~210 ms, but the animation's time runs, so most of
it is gone by the first drawn frame. The same stall freezes the card's press feedback. The
second open and the open after the background stall the same way (210 and 209 ms), so it
is not a cold-start cost.

The one-frame blank card at 1.271 s is the header showing nothing before the scene draws,
rather than the still frame jumping to the live scene.

## The expand after the fix (`c7a7689`)

The expand now advances on its own clock, at most one 60 Hz frame per drawn frame, so the
stall pauses it instead of skipping it, and the scene still is decoded once at full size.
`recordings-after-fix/` repeats the three opens; `expand-first-open-frames-after-fix/`
holds every frame of the first from 1.05 to 1.9 s.

| Open | Stall at the tap | After the stall |
|------|------------------|-----------------|
| First after launch | 217 ms | one blank-card frame, then the header grows from the card 8–16 px a frame and reaches the top 558 ms later |
| Second | 235 ms | the same, 499 ms to the top |
| After a minute in the background | 208 ms | the same, 484 ms to the top |

In the first open's frames: 1.286 s is the blank card, 1.302 s has the art at the card's
rectangle, the page grows to full width by 1.444 s while Home steps back, the content
fades in, and the plane reaches now by 1.84 s. The ~210 ms stall itself remains; it is the
trip page being built.

Packing and Notes, opened for the first time after the expand, are fully drawn 0.8 s after
the tap (`packing.png`, `notes.png`).

## Stills

`home.png` and `plan.png` (before the fix), `packing.png` and `notes.png` (after it).
