# Waymark — Design Decisions

This document records the shipped design system and the reasoning behind it: Waymark is a small, deliberate product rather than a template-derived interface.

## 1. Design intent and positioning

Waymark uses a calm, editorial travel-journal aesthetic. Flat surfaces, generous space, restrained colour, hairline borders, and considered typography make trip planning feel personal and readable. The interface is not a booking engine or a SaaS dashboard. UI copy and controls do not use emojis.

## 2. Typography

Waymark uses two type families. Newsreader carries display and title moments, giving trip names and major headings a journal-like character. Source Sans 3 carries interface copy, controls, metadata, and form labels for legibility at small sizes. The `serifNote` role uses Newsreader italic for short reflective copy. Platform mono is reserved for invite codes.

| Role | Family and weight | Size | Line height | Letter spacing / treatment |
| --- | --- | ---: | ---: | --- |
| `display` | Newsreader Medium | 34 | 40 | -0.2 |
| `title` | Newsreader Medium | 27 | 33 | -0.1 |
| `serifNote` | Newsreader Regular Italic | 17 | 24 | — |
| `heading` | Source Sans 3 Semibold | 18 | 24 | — |
| `body` | Source Sans 3 Regular | 16 | 24 | — |
| `bodyMedium` | Source Sans 3 Medium | 16 | 22 | — |
| `bodyStrong` | Source Sans 3 Semibold | 16 | 24 | — |
| `label` | Source Sans 3 Semibold | 14 | 20 | — |
| `caption` | Source Sans 3 Regular | 13 | 18 | — |
| `kicker` | Source Sans 3 Semibold | 12 | 16 | 1.4; uppercase |

`AppText` applies these roles and themed text tones to app copy. Feature-specific compositions can derive local sizes from these roles where hierarchy requires it, such as trip-card titles and sheet headings.

## 3. Colour

The palette uses warm paper in light mode and warm, near-black surfaces in dark mode. One bronze/ochre accent carries wayfinding and primary actions: `#8A5D22` in light mode and `#D9A65C` in dark mode. The accent has pressed, disabled, on-accent, ink, and wash roles rather than being used as a general decoration colour.

### Light and dark ramps

| Role | Light | Dark |
| --- | --- | --- |
| Surface background | `#FAF7F1` | `#1C1915` |
| Surface raised | `#FDFBF7` | `#24201B` |
| Surface sunken | `#F2EDE2` | `#151210` |
| Hairline | `#E7E0D4` | `#38322A` |
| Strong hairline | `#D9D1C0` | `#4A4336` |
| Primary text | `#2B2620` | `#F0EAE0` |
| Secondary text | `#6B6355` | `#B5AC9D` |
| Muted text | `#8A8072` | `#8A8072` |
| Faint text | `#B3A992` | `#645C4F` |
| Accent base | `#8A5D22` | `#D9A65C` |
| Accent pressed | `#6F4A1B` | `#C08F45` |
| Accent disabled | `#CDBB9E` | `#57492F` |
| Accent wash | `#F3E9D8` | `#332A1D` |

| Semantic role | Light base / wash | Dark base / wash |
| --- | --- | --- |
| Success | `#3E7A4E` / `#E7EFE4` | `#7FBF93` / `#22301F` |
| Warning | `#92610E` / `#F3E9D3` | `#D9B25C` / `#332B18` |
| Danger | `#AC4433` / `#F4E4DE` | `#E08972` / `#3A231D` |
| Info | `#4A6B8A` / `#E5EBEF` | `#93B3CE` / `#1F2933` |

The palette is designed for WCAG 2.1 AA contrast across text and interactive states. `ThemeProvider` resolves a persisted light, dark, or system preference and exposes one palette through `useTheme`; dark mode is a complete palette change, not an inverted light screen.

## 4. Space, radius, elevation, and hairlines

Waymark uses one spacing scale for its layout language: `s1` 4, `s2` 8, `s3` 12, `s4` 16, `s5` 20, `s6` 24, `s7` 32, `s8` 40, and `s9` 48. `screenGutter` is 20.

The radius scale is `xs` 4, `sm` 7, `md` 10, `lg` 14, `sheet` 20, and `full` 999. Cards use hairlines and surface contrast for separation; `hairlineWidth` is `StyleSheet.hairlineWidth` on native and 1 on web.

The system deliberately defines one shadow token, `floatingShadow`. Depth otherwise comes from spacing, hairline borders, and subtle surface contrast rather than stacked shadows. The token is reserved for genuinely floating surfaces and is currently applied to the floating action button in `Fab.tsx`.

## 5. Motion

Motion durations are `fast` 120 ms, `base` 200 ms, and `slow` 300 ms. The custom sheet uses the base duration for its entrance, while the toggle uses the fast duration for its thumb. `useReducedMotion` follows the operating-system setting through `AccessibilityInfo`; non-essential sheet translation and skeleton motion are suppressed, and the toggle transition drops to 0 ms.

## 6. Iconography

The token set defines `sm` 16, `md` 20, and `lg` 24 icon sizes with a canonical 1.6 stroke. Lucide and small custom SVG marks provide the visual language: outlined, restrained, and functional. Current compact affordances and illustrative marks use locally appropriate sizes and strokes where needed, including smaller status icons and the 44 px BrandMark; the token values remain the baseline for standard interface icons.

## 7. Component system as built

The shared component directory provides the following primitives.

- `AppText` applies type roles and text tones to app copy.
- `Avatar` renders a signed avatar image or initials fallback; `AvatarStack` presents trip members with alternating fills and separating rings.
- `BrandMark` renders the dashed-compass mark used on authentication screens.
- `Button` provides primary, secondary, quiet, and destructive actions with pressed, disabled, and loading states.
- `Card` provides raised or flat, hairline-bordered containers; `CardRow` provides static or pressable settings rows with separators.
- `Chip` provides selectable pills for reminder offsets and packing assignment, including selected and pressed states.
- `DateTimeField` provides labelled native date and date-time selection with clear and inline error states; its web implementation is described in Cross-platform decisions.
- `ErrorBanner` exposes an inline danger alert for form failures.
- `Fab` provides the floating add action and is the current consumer of `floatingShadow`.
- `OfflineBanner` reports cached offline viewing without removing the current content.
- `SectionLabel` renders the uppercase kicker used for section headings and date badges.
- `SegmentedControl` provides an accessible radio group with a sunken track and raised selected segment for itinerary status.
- `Sheet` contains create and edit forms in a modal surface with cancel, optional action, disabled-action, keyboard, and wide-layout states.
- `LoadingState`, `EmptyState`, and `ErrorState` provide reusable loading, empty, and retryable error screens; `RouteMark` supplies the restrained empty-state mark.
- `TextField` provides labelled single-line and multiline inputs with focused and inline error states.
- `Toggle` provides the accessible on, off, disabled, pressed, and reduced-motion privacy or completion switch.

The component set owns recurrent interaction states: pressed feedback is generally a restrained opacity change; forms expose inline error copy; actions expose disabled and loading states where applicable; and screen data states use the shared loading, empty, error, and offline primitives.

`NoteCard` and `TripCard` show the feature pattern. Both compose shared text, card, avatar, and theme primitives; `TripCard` distinguishes active and past trips through surface and text roles, while `NoteCard` makes visibility explicit rather than relying on a colour treatment.

## 8. Private versus shared notes

Private versus shared notes are triple-coded and never conveyed by colour alone. A private note uses a lock icon, the `ONLY YOU` label, and a raised card surface. A shared note uses a people icon, author text, and a flat card surface. The editor repeats the distinction in icon, title, explanatory text, and an accessible toggle; new notes default to private.

## 9. Accessibility decisions

Interactive controls target at least 44 points through component dimensions or hit slop; buttons use a 48 pt minimum height, and controls expose React Native accessibility roles, labels, and state where applicable. Text and control labels remain explicit rather than icon-only. `AppText` and input primitives do not disable native font scaling, and layouts use flexible rows and wrapping content where appropriate. Error banners use the alert role. Privacy status combines iconography and text with surface treatment so that colour is never the only signal.

## 10. Cross-platform decisions

Waymark ships from one Expo and React Native codebase to iOS, Android, and web. `ThemeProvider` uses the system colour scheme when the saved preference is `system`. Native date-time selection is platform-specific: iOS presents a picker in a modal sheet, Android uses the date-then-time dialog flow, and `DateTimeField.web.tsx` renders a styled `date` or `datetime-local` input. `Sheet` becomes a centred 480 px modal card at widths of 720 px or more. `useLazyAnimatedValue` supplies the `Animated.Value` behaviour that `react-native-web` does not export.

## 11. Implementation

`src/theme/tokens.ts` defines palettes, type roles, spacing, radius, hairline width, elevation, motion, icon, and hit-target tokens. `src/theme/index.tsx` re-exports the tokens and supplies the themed palette through `ThemeProvider` and `useTheme`.

Feature code references colour, typography, spacing, and radius through the theme module rather than hardcoded hex values, ad-hoc font sizes, or magic spacing; this is the enforced review rule that keeps the app reading as one system. A limited amount of local layout arithmetic, such as relative or derived sizing and avatar-overlap offsets, is computed inline in components; this is expected and does not violate the colour, type, spacing, or radius rule.
