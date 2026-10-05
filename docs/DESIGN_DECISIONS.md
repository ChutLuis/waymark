# Waymark — Design Decisions

This document records the shipped design system and the reasoning behind it. Waymark is a small, deliberate product rather than a template-derived interface.

The visual system is **Airmail**: trip planning looks like two people writing to each other. Shared things are postcards; private notes are sealed kraft envelopes. A stop's status follows a letter's life — an empty stamp slot is planned, stamped is confirmed, postmarked is done — and the airmail border marks what's next. Each trip takes on its destination: an animated scene heads the trip and its centre is cut into the trip's stamp. The handoff spec the implementation follows is `design_handoff_airmail_v3/README.md`.

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
| `cardTitle` | Besley 700 | 24/28 | −0.2 | Trip cards |
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
| `airmailRed` / `airmailBlue` | `#C8323C` / `#24479A` | `#E0575F` / `#7E9CF0` |
| `kraft` / `wax` | `#CDB28A` / `#A8262F` | `#7A6545` / `#C23A44` |

**The design is light-only.** The app keeps Light / Dark / Auto because the product already shipped it, so the provisional dark mapping from the README is used until a dark design exists. It keeps stamps paper (`stampPaper` stays `#F4F0E8`) and lets scene art keep its own colours; the status bar over art follows the scene, not the theme. It is flagged as provisional.

## 4. Space, radius, elevation, borders

Spacing runs on one scale (`s1` 4 … `s12` 30) plus a 24 pt text gutter and a 14 pt card gutter, so cards run wider than the text column (362 on a 390 screen). Radii: cards 4, airmail border 5 outside / 2 for the paper inside, inputs 8, pills 999, sheet 20, chips and tags 2–3, checkbox and code boxes 4, brand mark 6 with 3 inside.

Depth comes from shadow tokens (`card`, `cardRaised`, `row`, `postcard`, `postcardFront`, `postcardJoin`, `stamp`) expressed as RN `boxShadow`. Borders follow the spec: inputs inset 1.5 `border` (focused inset 2 `ink`), outline buttons inset 2 `ink` (quiet 1.5 `border`), empty stamp slots 1.5 dashed `slot`.

## 5. Motion

Scenes loop 240 frames (8 s). **Only one scene plays per screen**, and a scene pauses when the screen loses focus, the app backgrounds, or (for the trips-list on-now card) the card scrolls out of view. Everywhere else the scene is a still, never a `LottieView`. The trip shell mounts one scene and animates the header height 196↔104 over 300 ms without remounting it. Stop stamps play once: they seek to the frame their status maps to (0 planned, 18 confirmed, 36 done) and play the transition forward, seeking instantly when a status moves backwards. Haptics fire as the stamp and the postmark land. `useReducedMotion` (via `AccessibilityInfo`) shows the frame-0 still, jumps stamps to their end frame, makes the header change instant, and still fires haptics.

## 6. Iconography

Lucide with stroke 2. Navigation: Plan `Calendar`, Packing `Luggage`, Notes `Mail`; Trip is a custom dashed-rectangle stamp icon. Back chevrons use 2.2 and plus signs 2.4.

## 7. Airmail primitives and components

`src/components/airmail/` holds the mail system: `PerforatedStamp` (an SVG `Mask` punches holes from the frame, so the surface behind shows through), `AirmailBorder` (an SVG diagonal stripe `Pattern` around paper content), `PatternBand` (seigaiha, huipil and azulejo, with airmail stripes as the fallback), `Postmark` (ink rings, arc city text and wavy cancel lines), `Postcard`, and `KraftEnvelope` + `WaxSeal`.

The shared components are: `AppText`; `Avatar`/`AvatarStack`; `BrandMark` (the airmail square with a "W"); `Button` (primary/secondary/quiet/text/destructive at 56/48/44); `Card`/`CardRow`; `Chip`; `DateTimeField` (+ web); `ErrorBanner`; `OfflineBanner`; `SectionLabel`; `SegmentedControl`; `Sheet`; `StateViews` (`EmptyStampSlot`, `LoadingState`, `EmptyState`, `ErrorState`); `TextField`; `Toggle`. Feature components own the mail behaviour: `TripScene`, `SceneStamp`/`AvatarStamp`/`DestinationStamp`, `StopStamp`, `TripCard`, and `TripTabBar`.

## 8. Destination system

`src/features/trips/destinations.ts` is pure and unit-tested (25 Vitest cases): destination matching (normalised, whole-word, earliest-match, with exclusions for Antigua-and-Barbuda and New Mexico), inclusive days and nights, denominations including singular forms, the scene crop maths, free-time wording, and Roman-numeral months. `destinationArt.ts` holds the Metro static requires, and the build step (`tools/scenes/`) generates the WebP stills and the neutral `00-airmail` stamp. **Never show another country's art:** an unknown destination with dates uses an "initial stamp" (the trip name's first letter on an ink panel), no dates uses a dashed slot, and stop stamps use the neutral airmail stamp.

## 9. Private versus shared notes

Private versus shared notes are triple-coded and never conveyed by colour alone. A private note is a sealed `KraftEnvelope` with a `WaxSeal`, a lock icon and the `ONLY YOU` label. A shared note is a paper postcard with a people icon and `SHARED · FROM …`. The editor repeats the distinction in icon, title, explanatory text, and an accessible toggle; new notes default to private.

## 10. Accessibility

Interactive controls target at least 44 pt through component dimensions or hit slop. Controls expose React Native accessibility roles, labels and state; the stop stamp's label says "Mark {title} confirmed/done", and the text tag still shows the status so the stamp is never the only signal. Font scaling stays on. Error banners use the alert role. Status, privacy and selection are never shown by colour alone.

## 11. Cross-platform decisions

Waymark ships from one Expo and React Native codebase to iOS, Android and web. Scenes play through `lottie-react-native`, whose web entry delegates to `@lottiefiles/dotlottie-react` (ThorVG). `ThemeProvider` resolves a persisted light, dark or system preference. `DateTimeField.web.tsx` renders styled `date`/`datetime-local` inputs, including the new-trip box variant. `Sheet` becomes a centred 480 px modal card at ≥720 px, and wide screens keep the centred 680 column. `useLazyAnimatedValue` supplies the `Animated.Value` behaviour `react-native-web` does not export.

## 12. Implementation

`src/theme/tokens.ts` defines palettes, type roles, spacing, radii, shadows, borders, motion, icon and hit-target tokens, plus the stamp-text sizes; `src/theme/index.tsx` re-exports them and supplies the themed palette. Feature code references colour, typography, spacing and radius through the theme module rather than hardcoded hex values, ad-hoc font sizes, or magic spacing. A limited amount of local layout arithmetic (relative sizing, avatar overlap, the scene crop transform) is computed inline and does not violate that rule.