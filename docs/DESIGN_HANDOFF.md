# Waymark - Design Handoff Brief

This document is written to be handed directly to a design agent or designer.
Everything needed to produce the UI system and screens is below. If anything is
ambiguous, choose the calmer, simpler option and note the assumption.

---

## Prompt to give the design agent

You are designing the complete UI system for Waymark, a shared trip-planning
mobile app built with Expo (React Native) that ships to iOS, Android, and web
from one codebase. Produce a cohesive, production-ready design system and the
full set of v1 screens with all their states. Deliver design tokens a developer
can implement directly.

### Product in brief

Two people (sometimes a small group) plan a trip together. They share an
itinerary and a packing list. Each person can also keep private notes that no
other member can see. It is calm, focused, and personal, not a busy productivity
tool and not a social network.

### Brand and art direction

- Tone: calm, confident, editorial, and a little warm. It should feel like a
  well-made travel journal, not a booking engine or a corporate SaaS dashboard.
- Absolutely no emojis anywhere in the UI or copy.
- No generic template look. Avoid stock gradients, drop-shadow-heavy cards, and
  default component-library styling. Favor flat surfaces, restrained color, and
  clear typography with generous spacing.
- Depth comes from spacing, hairline borders, and subtle contrast between
  surfaces, not from heavy shadows or glows.
- Support both a light and a dark theme from the same token set. Design in both.
- Motion is minimal and purposeful: short, soft transitions; honor
  reduced-motion by disabling non-essential animation.

Typography: propose a pairing and justify it. A reasonable starting point is a
humanist or geometric sans for body text and a slightly characterful display
face for headings and trip names. Keep to at most two families. Ensure the faces
are available as web fonts and via Expo Google Fonts, or provide an equivalent.

Color: choose one restrained accent that carries wayfinding and primary actions,
plus neutral surface and text ramps for light and dark. Define semantic roles
(success, warning, danger, info) as tokens, not one-off colors. Meet WCAG 2.1 AA
contrast for all text and interactive elements in both themes.

### Design tokens to define (the primary deliverable)

Deliver these as a structured token set (JSON or an equivalent table) so a
developer can implement them without guessing:

- Color: surface levels (background, raised, sunken), border or hairline, text
  (primary, secondary, muted, inverse), the accent and its pressed and disabled
  states, and semantic roles. Provide light and dark values for each.
- Typography: font families, a type scale (display, title, heading, body, label,
  caption) with size, line height, weight, and letter spacing.
- Spacing: a single spacing scale used for all padding, gaps, and margins.
- Radius: corner-radius scale for controls, cards, and sheets.
- Border: hairline width and color roles.
- Elevation: define the small number of elevation levels as subtle
  surface-and-border treatments rather than large shadows.
- Motion: durations and easing curves for the few allowed transitions.
- Icon style: stroke weight and sizing rules for a single coherent icon set.

### Components and primitives to specify

For each, show default, pressed, focused, disabled, loading, and error states as
relevant, in both themes:

- Button (primary, secondary, quiet or text, and destructive).
- Text field, text area, and a labeled form row with inline validation.
- Toggle and checkbox (used for packing "packed" and the note privacy switch).
- Select or segmented control (used for itinerary status).
- List row (used for itinerary and packing items) with leading control, title,
  supporting text, trailing meta, and an assigned-person indicator.
- Card and section header.
- Avatar and an avatar stack for showing trip members.
- Tab bar for the trip detail tabs.
- Bottom sheet or modal for create and edit forms.
- Empty-state block (illustration or restrained mark, a line of copy, one
  action).
- Error-state block (message plus retry).
- Inline offline indicator.
- A privacy affordance for notes that makes "private to me" versus "shared with
  the trip" unmistakable at a glance.

### Screens to design (v1)

Design each screen for mobile first, then describe how it adapts to a wide web
layout. Every data screen must include its loading, empty, error, and offline
variants.

1. Sign in.
2. Sign up.
3. First-run onboarding: set display name (and optional avatar).
4. Trips list, including the empty state for a brand-new user.
5. Create or edit trip: name, destination, dates, cover image.
6. Trip detail shell with tabs: Itinerary, Packing, Notes, Settings.
7. Itinerary tab: ordered list with status; empty and populated.
8. Itinerary item editor: title, description, location, start and end time,
   status, and a "remind me" control.
9. Packing tab: list with quantity, assignment to a member, and packed toggle.
10. Packing item editor.
11. Notes tab: a member's own notes plus shared notes, with an obvious
    private-versus-shared distinction; empty and populated.
12. Note editor: body and the private or shared switch, with the default being
    private.
13. Trip settings: edit details, member list with avatars, generate and share an
    invite (8-character code and link), leave or delete trip.
14. Join by invite: enter a code or arrive via link, then confirm joining.
15. Profile and app settings: edit display name and avatar, theme preference,
    sign out.
16. Notification permission priming screen shown before the system prompt.
17. Global states to design once and reuse: full-screen loading, generic error
    with retry, and the offline indicator.

### Accessibility requirements

- Meet WCAG 2.1 AA contrast in both themes.
- Provide clear, labeled targets at least 44 by 44 points.
- Support larger text sizes without breaking layouts; show at least one screen
  at a large text setting.
- Provide screen-reader labels for all controls and icons.
- Do not use color alone to convey the private-versus-shared distinction; pair
  it with an icon and text.

### Deliverables

- The token set as structured data (JSON or a clear table), light and dark.
- Component specs with states, in both themes.
- High-fidelity screens for all v1 screens above, mobile first, with the
  required states, plus a short note on the web adaptation for each.
- An app icon and a splash screen.
- A one-page style summary: type scale, color roles, spacing, and the three or
  four core patterns.
- Optional: a small set of restrained empty-state illustrations or marks in a
  single consistent style.

### Constraints and do-nots

- No emojis, anywhere.
- No heavy shadows, glows, neon gradients, or default template styling.
- No more than two type families and one accent color family.
- Do not invent features beyond the screen list; if you see a gap, note it
  rather than adding scope.
- Keep everything implementable with standard React Native and Expo primitives;
  flag any effect that would require custom native work.

### How this will be implemented

Developers will translate the token set into a theme module and build the
components as shared primitives. Feature screens will reference only tokens and
primitives. Design decisions that cannot be expressed as tokens should be called
out explicitly so they can be handled deliberately.
