# Airmail v4.1 — Home rail, shoebox album and motion recordings

**Build:** Android release APK (`./gradlew assembleRelease`), JS bundled in, on an
`sdk_gphone16k_x86_64` emulator, Android 17, 1080×2400 at density 443 (390 dp wide).
**Code:** stills at `29c4c5e`; `home-4-390-dark` and the recordings at `d618dc6`, which
changes only the card underneath during a pick.
**Account:** Mia, signed in. Today is 12 Oct 2026, so Kyoto & Nara is on now.

## Stills

| File | Shows |
|------|-------|
| `home-4-390-{light,dark}` | Home with 4 current trips: the on-now postcard, a rail of 4 stamps (Kyoto, Berlin, then a blank divider and two dashed no-date slots), the shoebox row with 2 past trips. |
| `home-12-390-{light,dark}` | Home with 12 current trips: the rail runs off the right edge at the "2027" divider; "1 OF 12". |
| `rail-end-390-{light,dark}` | The same rail scrolled to its end: Tikal, Reykjavik (no art, "R"), Positano, Santorini, the blank divider and the two no-date slots. |
| `album-390-{light,dark}` | The shoebox album: one 2026 sheet, "TWO TRIPS", Chiang Mai and Lisbon postmarked, names and months in stamp ink in both themes. |

## Recordings

Each folder in `recordings/` holds the clip (`adb shell screenrecord`, re-encoded with
every frame and its timing kept) and `frames/`: one frame every 50 ms from the tap,
`0000ms` to `0950ms`. Show-touches was on. The tap frame is the first frame that
shows either the touch dot or a change above the screen's idle motion.

screenrecord writes a frame only when the screen changes, so a still screen adds no
frames. "Frames" counts the encoded frames in the first second after the tap, or until
the screen settles; "longest gap" is the longest wait between two of them while it
moves.

| Clip | Action | Frames | Longest gap | What the frames show |
|------|--------|--------|-------------|----------------------|
| `pick` | Tap Berlin's stamp on the 4-trip rail | 40 in 0.67 s | 23 ms | Berlin's envelope deals over the Kyoto postcard, which keeps its scene and route underneath; the caption rule moves to "13 OCT" and the counter reads "2 OF 4" from the first frame; the card is at rest by 650 ms. |
| `album` | Tap the shoebox row | 47 in 1 s | 67 ms | Home holds for the press, the album slides in from the right while Home steps back and dims, and the stamps print in from about 400 ms. The 67 ms gap is a drop during the push. |
| `confirm` | Tap Philosopher's Path's stamp slot on Plan (planned → confirmed) | 60 in 1 s | 18 ms | The stamp lands by 100 ms; the tag still reads PLANNED until 350 ms, then CONFIRMED stamps in on that frame. |
| `packed` | Tick the last item in Mia's bag | 59 in 1 s | 34 ms | 50 ms: the bag reads 4/4 with no stamp; PACKED drops in from 100 ms, large and faint, and lands by 200 ms. |

The emulator renders the release build close to 60 fps; the debug build manages about
12 fps on the same emulator. The Home → trip expand was not recorded here: whether its
header shows the still before the live scene needs a physical mid-range phone.
