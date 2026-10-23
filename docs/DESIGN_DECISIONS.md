# Waymark — Design Decisions

This document records the shipped design system and the reasoning behind it. Waymark is a small, deliberate product rather than a template-derived interface.

The visual system is **Airmail**: trip planning looks like two people writing to each other. Shared things are postcards; private notes are sealed kraft envelopes. A stop's status follows a letter's life — an empty stamp slot is planned, stamped is confirmed, postmarked is done — and the airmail border marks what's next. Each trip takes on its destination: an animated scene heads the trip and its centre is cut into the trip's stamp. The static system was specified by the Airmail v3 handoff, which is no longer kept in the repository: this document is the source of truth for it. Motion follows `design_handoff_airmail_v4_motion/README.md`, a local reference copy that is git-excluded; deliberate deviations from it are recorded in §5.

## 1. Design intent and positioning

Waymark uses a printed-mail aesthetic rather than a booking engine or SaaS dashboard: paper surfaces, a blue-grey airmail ground, stamps and postmarks, and editorial typography. UI copy and controls do not use emojis.

## 2. Typography

Two families carry the system. **Besley** is the editorial serif for display, titles, row copy, note bodies and buttons. **Courier Prime 700** is the typewriter mono for kickers, status tags, times, invite codes and stamp text; kickers and labels are uppercase.

| Role | Family / weight | Size / line | Letter spacing | Used for |
| --- | --- | --- | --- | --- |
| `display` | Besley 700 | 34/38 | −0.5 | "Your trips", "What's your name?" |
| `title` | Besley 700 | 32/36 | −0.4 | "Welcome back.", "Create an account" |
| `tripTitle` | Besley 700 | 30/34 | −0.3 | Trip header and tab titles |
| `cardTitleLg` | Besley 700 | 26/30 | −0.3 | Next card, profile name |
| `cardTitle` | Besley 700 | 24/31 | −0.2 | Empty and error state titles (31, not the handoff's 28: Android clips Besley's descenders in a 28 pt line box) |
| `cardTitleSm` | Besley 700 | 23/27 | −0.2 | New-trip preview |
| `rowTitle` / `rowTitleLg` | Besley 600 | 18/23 · 19/24 | 0 | Itinerary rows |
| `noteBody` | Besley 400 | 18/25 | 0 | Note bodies |
| `body` | Besley 400 | 17/24 | 0 | Body copy, input values |
| `bodySm` | Besley 400 | 15/20 | 0 | Sub-lines, helper text |
| `meta` | Besley 400 italic | 16/22 | 0 | "with Theo · 28 Mar – 6 Apr" |
| `metaSm` | Besley 400 italic | 14/18 | 0 | Timestamps, album status |
| `caption` | Besley 600 italic | 12/16 | 0 | Postcard caption chips |
| `buttonLg` / `button` | Besley 700 | 18/22 · 17/22 | 0 | CTA and bottom-bar buttons |
| `link` | Besley 600 | 15/20 | 0 | Underlined links |
| `tab` | Besley 600/700 | 13/16 | 0 | Trip tab bar |
| `wordmark` | Besley 800 | 21/24 | −0.2 | "Waymark" |
| `kicker` / `kickerLg` | Courier Prime 700 | 12/16 · 13/16 | 0.8 · 0.6 | Labels, section kickers |
| `tag` | Courier Prime 700 | 11/14 | 0.5 | PLANNED, CONFIRMED, DONE, NEXT, NOW |
| `time` | Courier Prime 700 | 15/20 | 0 | Itinerary times |
| `code` / `codeBox` | Courier Prime 700 | 32/40 · 25/30 | 3 · 0 | Invite code |
| `brandLetter` | Besley 800 | 13/16 | 0 | The "W" in the brand mark |
| `backLabel` | Besley 600 | 16/20 | 0 | The label beside a back chevron |
| `metaXs` | Besley 400 italic | 12/16 | 0 | The invite's expiry line |
| `sheetTitle` / `sheetCancel` / `sheetAction` | Besley 700 · 600 · 700 | 17/22 · 17/22 · 16/20 | 0 | Sheet header: title, Cancel/Back, the action pill |
| `addressNote` / `addressInitial` | Besley 400 italic · 800 | 13/17 · 15/18 | 0 | The Trip page's address card |

Some glyphs (日, วัน, Greek capitals, 京都) fall back to the system font; the destinations table covers them.

## 3. Colour

The light palette is the design's own. `ink` is a deep navy used for primary text, primary buttons, focused borders, checked boxes and selected states; `paper` is the cream used for cards, inputs, the tab bar and pills over art; `stampPaper` is pure white for stamp and postcard frames. Three accents carry meaning: `airmailRed` and `airmailBlue` for the stripe, `kraft`/`wax` for sealed notes, and `success` for "Stamp ready". The palette is exposed through `useTheme` and feature code never uses raw hex.

| Role | Light | Dark (provisional) |
| --- | --- | --- |
| `bg` | `#E2E9EE` | `#0F1729` |
| `paper` | `#FFFCF5` | `#1A2438` |
| `stampPaper` | `#FFFFFF` | `#F4F0E8` |
| `ink` | `#15223B` | `#EEF1F6` |
| `ink2` | `#46536B` | `#B4BFD1` |
| `ink3` | `#5A6478` | `#8E9AAF` |
| `inkBody` | `#2E3A52` | `#C9D1DE` |
| `hairline` / `divider` | `#ECE5D7` / `#C9D3DB` | `#2B3752` |
| `border` / `slot` | `#AEBBC6` / `#9AA6B8` | `#3A4762` / `#55627A` |
| `fieldBorder` | `#737F8F` | `#6B7A96` |
| `perforationEdge` | `#C9BCA4` | `#3A4762` |
| `airmailRed` / `airmailBlue` | `#C8323C` / `#24479A` | `#E5636B` / `#7E9CF0` |
| `danger` | `#A8262F` | `#EE7A81` |
| `dayPostmark` / `dayCancel` | navy at 42% / 38% | `ink` white at 42% / 38% |
| `rangeFill` / `rangeEdge` | blue at 18% / `#24479A` | `#7E9CF0` at 24% / `#7E9CF0` |
| `kraft` / `wax` | `#CDB28A` / `#A8262F` | `#7A6545` / `#C23A44` |
| `stampInk` | `#15223B` | `#15223B` |

**`stampInk` is fixed dark in both themes.** Stamp paper stays cream (`stampPaper`) in light and dark, so everything printed on it — stamp names, denominations, postmarks, day-stamp text and avatar panels — uses `stampInk` (`#15223B`, 7.8:1) rather than the theme `ink`, which would turn near-white on cream in dark mode. The earlier `kraftText` token was removed: sealed-note text now uses `stampInk` and the date uses `kraftInk`, giving readable contrast on kraft in both themes.

**Readable reds, findable controls.** Error and destructive text uses `danger`, never `wax`: `wax` is the seal's material colour, and in dark it fell to 2.94:1 on `paper` and 3.39:1 on `bg`. `danger` keeps at least 4.5:1 on both in both themes (6.87/5.74 light, 5.72/6.58 dark). The idle boundary of anything the user has to find — text fields, invite code boxes, the switch track — uses `fieldBorder`, at least 3:1 against `paper` and `bg` (WCAG 1.4.11; `border` measured 1.91:1). `border` and `slot` stay for decorative outlines, quiet buttons that carry a label, and dashed empty stamp slots. Dark `airmailRed` moved from `#E0575F` (4.21:1 on `paper`) to `#E5636B` (4.68:1) because it also prints small text. Perforation outlines (`perforationEdge`, about 1.9:1 on white in light) stay deliberately soft: they are decoration, exempt from 1.4.11, and a 3:1 edge reads as a cartoon outline rather than a perforated stamp.

**Fixed paper takes fixed ink.** Anything printed on `stampPaper`, which is cream in both themes, uses a fixed ink: `stampInk` for text, postmarks and cancel lines, `parAvion` for printed blue (the sheet of stamps' TODAY label used the theme `airmailBlue` and fell to 2.34:1 in dark). Day stamps printed on the theme's `paper` use `dayPostmark`/`dayCancel`, which follow the theme, so past-day postmarks stay visible on dark paper. A compact postmark printed over a stamp stays inside the stamp (Home's shoebox row) instead of overhanging onto a page whose colour it can't match.

**The design is light-only.** The app keeps Light / Dark / Auto because the product already shipped it, so the provisional dark mapping from the README is used until a dark design exists. It keeps stamps paper (`stampPaper` stays `#F4F0E8`) and lets scene art keep its own colours; the status bar over art follows the scene, not the theme. It is flagged as provisional.

## 4. Space, radius, elevation, borders

Spacing runs on one scale (`s1` 4 … `s12` 30) plus a 24 pt text gutter and a 14 pt card gutter, so cards run wider than the text column (362 on a 390 screen). Radii: cards 4, airmail border 5 outside / 2 for the paper inside, inputs 8, pills 999, sheet 20, chips and tags 2–3, checkbox and code boxes 4, brand mark 6 with 3 inside.

Depth comes from shadow tokens (`card`, `cardRaised`, `row`, `postcard`, `postcardFront`, `postcardJoin`, `stamp`) expressed as RN `boxShadow`. Borders follow the spec, except that idle inputs use `fieldBorder` for contrast: inputs inset 1.5 `fieldBorder` (focused inset 2 `ink`, error 2 `danger`), outline buttons inset 2 `ink` (quiet 1.5 `border`), empty stamp slots 1.5 dashed `slot`.

Row separators are a flat 1 pt (`hairlineWidth`), not `StyleSheet.hairlineWidth` (~0.33 pt on 3× screens). At ~1.15:1 contrast against paper the hairline effectively vanished on device; the design spec is 1 pt. Airmail stripe gaps are fixed cream (`#FFFCF5`), so the stripes don't read as solid red/blue in dark mode.

## 5. Motion

Motion follows `design_handoff_airmail_v4_motion/README.md`: every change of state happens to paper. Cards are dealt, stamps land and get postmarked, a sealed note breaks open, postcards flip, tags are dragged into bags and full bags get stamped PACKED. The static system above does not change.

**Tokens.** `motion` in `src/theme/tokens.ts` holds the handoff's durations, staggers and easing curves verbatim, plus `choreo`, every per-moment offset (contact frames, delays, idle-loop periods). Feature code reads timings only from there. Percentage keyframes live as data in `src/components/motion/keyframes.ts`; each element drives one linear 0→1 timeline and samples its tracks with `sampleTrack`, so every segment between two keyframes runs the moment's full easing curve, as the handoff maps keyframes to `withSequence` segments. `bezierAt` is a pure CSS `cubic-bezier` solver that runs on both threads and in Vitest; overshooting curves (`indicator`, `springHome`, `claim`) work unchanged. `easing()` hands Reanimated a worklet over `bezierAt` rather than `Easing.bezier`, because `bezierAt` clamps progress to [0, 1]: an animation's first frame can sample a slightly negative progress, and the extrapolated bezier made steep curves start by stepping backwards.

| Decision | Evidence |
| --- | --- |
| UI-thread animation only | Reanimated 4 shared values and worklets; the header height and the envelope height are shared values, never React state. |
| One scene per screen, never restarted | Every `TripScene` seeks to `sceneFrameAt(now)` from one epoch when it starts or resumes, so the Home card and the trip header show the same frame; native loops by replaying from 0 on finish. |
| Home → trip without a native transition | Home measures the card's paper and scene window (an envelope's top 150 pt), primes the shell's first frame at the card and opens the trip as a transparent modal with no animation; the shell starts the clip, colour and header-frame morph on its first layout, re-cropping the scene each frame, with the trip seeded from Home's list so the header is there from the first frame. Without a measured card it pushes and pops instead. |
| One trip on Home, picked from a rail | Home shows the on-now (else soonest) trip as one card; a rail of stamps under it, one per current trip with date captions and year dividers, deals the picked trip onto the card while the replaced card stays mounted underneath. The picked stamp's 4 pt lift and its deal drop feed one transform, so the lift holds at rest. Past trips open from the shoebox into an album, one sheet per year, pushed like the Trip page; the album's postmarks are drawn outside the stamp's clipped content so they overhang onto the sheet. |
| "Now" has its own slot on the Plan route | Today's route lays out a 30 pt slot as a row in the gap after the last stop at or before now (`nowSlotIndex`, `withNowSlot`, `layoutRoute` in `route.ts`), under that gap's free-time label, so the plane and the NOW tag never sit over a row. Whenever the slot moves, because now passes a stop or because a row changes height at contact, the rows, free-time labels, plane, NOW tag and ink move together on one 300 ms reflow. |
| Haptics on contact | One `haptic(kind)` helper (`selection`, `light`, `medium`, `rigid`), scheduled on the contact frame; a no-op on web. |
| Reduced motion | `useMotion().ms` turns every duration and delay to 0, idle loops stop, scenes hold frame 0 and stop stamps seek to their end frame. Haptics still fire, and the seal's 600 ms hold never shrinks: it is a privacy gesture. Sheets appear and close without a fade, cover photos and avatar photos appear without one. Verified on the emulator with the animation scales at 0: a 300 ms hold leaves the seal shut, 750 ms opens it. |
| The expand runs on a bounded clock | The Home → trip expand advances by the time since the last drawn frame, capped at 34 ms (two 60 Hz frames). At a steady 30 fps the nominal 580 ms expand finishes in about 600 ms, while a long first-frame stall advances only one capped step, so the reviewed motion is never skipped. The earlier 16.67 ms cap made a 30 fps device take about 1170 ms. |
| Leaving a trip any way resets Home | Navigation can remove the shell without its collapse (deleting or leaving a trip replaces the route). The trip layout's unmount resets the shared expand values (`resetHomeCover`), so Home never stays scaled and dimmed under a shell that is gone. |
| Only the front card plays | Home's idle loops and scenes play only on the card at the front, while the screen is focused and the app is active. The default airmail scene's bob reads the same scene epoch as the destination scenes, so it doesn't jump at the expand. |
| Motion only for this device's actions | A stop stamp's slam and haptic, and a bag's PACKED slam, play only when this device's press caused the change. A refetch, another member's change or an optimistic rollback moves the stamp or the bag to its new state silently. |
| The pattern band sits above the day stamps | The day stamps rest below the header's edge (`dayStripOverhang` 0, with room reserved for today's 4 pt raise and the drop-in), so the seigaiha band is fully visible; with the earlier 34 pt overhang the stamps covered about 84% of it. |

**Deviations from the v4 handoff.** Two timings differ on purpose. The invite code types at 45 ms a character instead of 70, after a 380 + 320 ms card sequence, so the code starts appearing at about 745 ms rather than leaving a blank card for nearly two seconds. The sealed note opens to at least 280 pt instead of 252, and taller when the system font is larger: the letter's four ruled lines are sized from the effective line height, so every written line clears the pocket at 130% and 200% text. The letter is only mounted once the seal breaks, so a closed envelope never shows paper below its edge.

Scenes loop 240 frames (8 s) and pause when their screen loses focus, the app backgrounds, the Trip page covers the shell, or the on-now card is not at the front of the stack. Idle loops (the stripe crawl, the ON NOW dot, the plane bob and the marching route dashes) follow the same rules. Stop stamps play their `confirm` and `done` markers once, hold on frames 0 / 17 / 35, and seek instantly when a status moves backwards; nothing seeks a stamp while a segment plays, so a status change arriving from the data never cuts the segment short. The press drives the stamp: the row holds a pending status until the data catches up, the segment starts in the commit that carries it, and contact is timed from the tap: 300 ms for confirm, 200 ms for done, when the postmark bottoms out. A stamp whose tap advances it doesn't dim while pressed.

## 6. Iconography

Lucide with stroke 2. The trip shell's ticket-stub tab bar has three tabs: Plan `Calendar`, Packing a custom wheel-less suitcase (a 14×13 case with a handle and two straps) and Notes `Mail`. The Trip page opens from the title pill (`ChevronDown`) rather than a tab; its visible `TRIP DETAILS` caption makes that action explicit. The member-stamp pill is a labeled `Invite` shortcut on all three tabs, opening registered mail directly in a sheet with labeled Copy code / Share link actions. Back chevrons use 2.2 and plus signs 2.4.

## 7. Airmail primitives and components

**Perforations.** Hole centres sit on the stamp's *outer edges* (x = 0, x = W, y = 0, y = H), spaced close to 8 pt apart (4 pt on stamps under 30 pt), radius 3 (1.5 small). Holes are spread evenly per side so both corners always get a hole even when a side isn't a multiple of the pitch; `perforationOffsets` is a pure, tested helper. Each hole cuts a half-circle from the edge and each corner a quarter-circle notch. The frame's content padding is 5 inside that edge (2.5 for stamps under 30 pt), and the art window sits 2 pt further in (1 pt on the 40×48 past-trip stamp). The stamp shadow is drawn as an offset copy of the same masked shape inside the SVG, so it follows the scalloped outline rather than a rectangle.

`src/components/airmail/` holds the mail system: `PerforatedStamp` (an SVG `Mask` punches holes on the frame edges, so the surface behind shows through), `AirmailBorder` (an SVG diagonal stripe `Pattern` around paper content), `PatternBand` (seigaiha, huipil and azulejo, with airmail stripes as the fallback), `Postmark` (ink rings, arc city text and wavy cancel lines), `Postcard`, and `KraftEnvelope` + `WaxSeal`.

The shared components are: `AppText`; `Avatar`/`AvatarStack`; `BackButton`; `BrandMark` (the airmail square with a "W"); `Button` (primary/secondary/quiet/text/destructive at 56/48/44); `Card`/`CardRow`; `Chip`; `DateTimeField` (+ web); `ErrorBanner`; `OfflineBanner`; `OfflineNotice` (why a sheet's action waits); `SectionLabel`; `SegmentedControl`; `Sheet`; `StateViews` (`EmptyStampSlot`, `LoadingState`, `EmptyState`, `ErrorState`); `TextField`; `Toggle`. Feature components own the mail behaviour: `TripScene`, `SceneStamp`/`AvatarStamp`/`DestinationStamp`, `StopStamp`, Home's `HomeCard` (`OnNowPostcard`, `EnvelopeFace`), `TripRail` and `Shoebox`, the shoebox album, the shell's `ShellTopBar` and `TripTabBar`, Plan's `DayStrip` and `PlanRoute`, Notes' `SealedNote`, `PostcardNote` and `NoteReader`, Packing's `LooseTag` and `Bag`, and the Trip page's `SheetOfStamps`, `AddressCard` and `RegisteredInvite`.

## 8. Destination system

`src/features/trips/destinations.ts` is pure and unit-tested (25 Vitest cases): destination matching (normalised, whole-word, earliest-match, with exclusions for Antigua-and-Barbuda and New Mexico), inclusive days and nights, denominations including singular forms, the scene crop maths, free-time wording, and Roman-numeral months. `destinationArt.ts` holds the Metro static requires, and the build step (`tools/scenes/`) generates the WebP stills and the neutral `00-airmail` stamp. **Never show another country's art:** an unknown destination with dates uses an "initial stamp" (the trip name's first letter on an ink panel), no dates uses a dashed slot, and stop stamps use the neutral airmail stamp.

**Country selection.** Create and Edit use `CountryField` instead of guessing from typed city names. The quick dropdown shows the ten countries that have illustrations (labelled ILLUSTRATED DESTINATIONS, which is what they are) and a search over everything; inline search shows at most eight matches with a "keep typing" hint. "Browse all 249 countries" opens `CountryPicker` on the full A–Z list under sticky letter headings (accented names file under their base letter), with optional accent-insensitive name/code/alias search, selected checkmarks and a Decide later option. Countries without illustrations show their code inside the same inset art window as illustrated stamps, so the perforated frame always shows. Countries with designed scenes show their miniature stamps; other rows print their country codes on neutral stamp paper. The picker replaces the form inside the same `Sheet`, with Back returning without changing anything, so native modals and vertical scrollers never nest. Picking saves a canonical country name in the existing destination column; an existing free-text destination stays untouched until explicitly replaced or cleared. No schema or RLS changes are required.

The dedicated invitation sheet reuses `RegisteredInvite` and the existing member-authorised invite hook. It only requests an invite when opened and shows the full code immediately; the Trip page keeps its original typing choreography.

**Dates.** The range calendar is a two-tap state machine: the first tap sets Leave, the second sets Return; tapping the waiting Leave date again makes a one-day trip; any tap after a finished range starts a new one. A Leave date still waiting for its Return is an outlined pill, so it doesn't read as a one-day trip (solid). Each week draws one continuous band between solid ink end caps, edged in 1 pt `rangeEdge` (airmail blue) so the range reads at a glance (8.4:1 light, 5.8:1 dark) over the faint `rangeFill`; in-range numbers stay ink, and every day in the trip is `selected` for screen readers with its role in the label ("trip start", "in your trip", "one-day trip"). Presets are +5 nights, +7 nights and Wknd, a real weekend: the next Friday to Sunday from the start date or today. Applying a preset moves the calendar to its month. Day cells, presets and DONE are 44 pt.

**Android date and time dialogs** are the Material system pickers, themed in `app.config.ts` (the datetimepicker plugin) plus `plugins/withTimePickerDialogTheme.js`, which gives the time dialog the date dialog's theme; without it its buttons were Material teal. Light: an airmail-blue header with white text, paper body, ink buttons. Dark: the header turns periwinkle (`#7E9CF0`) with navy text (white on periwinkle was 2.6:1), the body `paper`, buttons near-white. Weeks start on Monday, like the range calendar (`firstDayOfWeek={1}`; the module adds 1 to reach `Calendar.MONDAY`). Theme changes are native: rebuild the dev client after editing them.

**Sheets keep what's open in view and don't lose work.** A field that opens inside a sheet (the country dropdown, its search, the calendar) asks the sheet to scroll just enough to show it, again as the keyboard settles, and stops if the user drags (`useSheetReveal`). Create, Edit and the stop, note and packing-item editors opt into `discardConfirm`: tapping the scrim, system back or Cancel with unsaved changes asks first ("Discard this trip?" / "this stop?" / "this note?" / "this item?" for something new, "Discard changes?" for an edit, so saved work never sounds deleted). A stop's reminder switch and offset count as changes. While a save or delete is on its way the prompt is off: that change can't be discarded any more. Under Reduce Motion a sheet appears and closes without its fade.

**Create offline.** Offline, Create says so up front; tapping it checks the form and holds the trip, then sends it automatically once the connection is back (discarding the sheet drops it). Edit shows the same notice and disables Save, since an edit can't be queued safely against later changes. The stop, note and packing-item editors keep their actions on: offline they say "Anything you save is sent when you're back online", and once tapped "this will finish when you're back online"; the paused mutation runs when the connection returns and the sheet closes then. A cold start offline (nothing is cached across launches) says "You're offline. Your trips will load when you're back online." instead of spinning silently.

**The New Trip preview** follows the envelope face: a header with the destination once (PREVIEW when the trip is named after it, WHERE TO? with none) and the countdown, then the name, dates and note on the ruled lines beside the stamp. A start date with no return is previewed as a one-day trip, which is what gets saved.

## 9. Private versus shared notes

Private versus shared notes are triple-coded and never conveyed by colour alone. A private note is a sealed `KraftEnvelope` with a `WaxSeal`, a lock icon and the `ONLY YOU` label. A shared note is a paper postcard with a people icon and `SHARED · FROM …`. The editor repeats the distinction in icon, title, explanatory text, and an accessible toggle; new notes default to private.

## 10. Accessibility

Interactive controls target at least 44 pt through component dimensions or hit slop, including back controls (one `BackButton`, in a `row` variant on the page ground and a bordered `pill` variant over art or another page). Gestures always have a screen-reader path: the wax seal has an "Open sealed note" action, each loose packing tag has a "Put in …'s bag" action per bag, and a postcard's activate action flips it, with a separate Read action and, for its author only, Edit. Every member can open any shared note in full in a read-only reader (the postcard clamps to three lines); only the author gets Edit there. A sealed note's text is not rendered until it is opened; once open, its body is part of the note's accessible label, as a postcard's is. Controls expose React Native accessibility roles, labels and state; the stop stamp's label says "Mark {title} confirmed/done", and the text tag still shows the status so the stamp is never the only signal. Decorative glyphs that carry no meaning (the registered-mail "R") are hidden from screen readers.

**Font scaling stays on, with caps only where fixed chrome would break.** Checked at 200%: the Home header keeps the wordmark (a logo) at its size and caps New trip at 1.15×; the Sheet header caps at 1.15× so its centred title still fits between Cancel and the action; the trip tab bar caps at 1.3×; day stamps (fixed 48×56 art, full date in the label) cap at 1.2×. Everything else scales: the Plan's free-time label grows with the text and hides when its gap is too short, the sealed envelope's label truncates before the date, Create's photo button moves under its copy above 1.3×, and labels that share a row keep a gap and wrap on their own side. Error banners use the alert role. Status, privacy and selection are never shown by colour alone.

## 11. Cross-platform decisions

Waymark ships from one Expo and React Native codebase to iOS, Android and web. Scenes play through `lottie-react-native`, whose web entry delegates to `@lottiefiles/dotlottie-react` (ThorVG). `ThemeProvider` resolves a persisted light, dark or system preference. `DateTimeField.web.tsx` renders styled `date`/`datetime-local` inputs drawn as the same 64 pt label-and-value date box as native. `Sheet` becomes a centred 480 px modal card at ≥720 px, and wide screens keep the centred 680 column. `useLazyAnimatedValue` supplies the `Animated.Value` behaviour `react-native-web` does not export.

## 12. Implementation

`src/theme/tokens.ts` defines palettes, type roles, spacing, radii, shadows, borders, motion, icon and hit-target tokens, `disabledOpacity` (0.5) and `pressedOpacity` (0.7), plus the stamp-text sizes (`stampText`, including the avatar stamps' initial and name in `stampText.avatar`); `src/theme/index.tsx` re-exports them and supplies the themed palette. Feature code references colour, typography, spacing and radius through the theme module rather than hardcoded hex values, ad-hoc font sizes, or magic spacing. A limited amount of local layout arithmetic (relative sizing, avatar overlap, the scene crop transform) is computed inline and does not violate that rule.
