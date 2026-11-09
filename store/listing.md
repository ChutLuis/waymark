# Waymark — Google Play listing

English (United States), prepared for v1 on 25 October 2026. Copy the text
inside each block into the corresponding Console field. Publishing and
developer identity are recorded by the owner in Play Console.

## App name

```text
Waymark
```

## Short description

```text
Plan trips together with shared itineraries, packing lists and private notes
```

76 characters; Play allows 80.

## Full description

```text
Plan the trip together, from the first idea to the last packed bag.

Waymark keeps your itinerary, packing list and travel notes in one shared place. Invite the people you are travelling with and give each trip its own little collection of plans.

A plan for every day
Add stops with places, start and end times, and notes. Browse your trip by day, mark stops as planned, confirmed or done, and set reminders for the ones you want to remember.

Know who is bringing what
Make a shared packing list, add quantities and assign items to your travel companions. Check things off as you pack, so everyone knows what is ready.

Notes to share, and notes just for you
Leave a note for your trip companions or keep it private. Private notes are visible only to the person who wrote them, not to other trip members.

Bring your people along
Share an invite code so your partner, friends or family can join the same trip. Everyone has access to the shared plan, packing list and notes.

Keep your plans handy offline
Previously loaded trip plans stay on your device. Changes to itineraries, packing lists and shared notes can wait for a connection and sync when you are back online. Signing in, joining a trip and uploading photos need a connection.

A little airmail for your travels
Paper envelopes, destination stamps and sealed notes give your plans a place of their own. Choose light or dark mode, add an optional trip cover or profile photo, and look back through past trips in your album.

Waymark has no ads or tracking SDKs. An account is required to plan and share trips.
```

1,571 characters; Play allows 4,000.

## Initial test release notes

```text
Plan shared trips with day-by-day stops, packing lists and shared or private notes. Invite your travel companions, set stop reminders and keep previously loaded plans handy offline.
```

## Store settings

| Field | Value |
|---|---|
| Type | App |
| Category | Travel & Local |
| Developer name | `LFOrtiz` (as shown on the Play listing) |
| Support email | `me@lfortiz.com` |
| Privacy policy | `https://waymark-web-production.up.railway.app/privacy.html` |
| Account deletion | `https://waymark-web-production.up.railway.app/delete-account.html` |

The website field uses `https://waymark-web-production.up.railway.app/`. A custom
domain would change these URLs; keep them aligned with `src/lib/legal.ts`.

The developer name shown on the Play listing is "LFOrtiz". It must match the
operator named in the privacy policy (`OPERATOR_NAME` in `src/lib/legal.ts`,
"Luis Ortiz (LFOrtiz)") and on the site's privacy page.

## Graphics and alt text

Upload screenshots in the order below. They show the real Android app with
demo trip data; the dated trips are examples, not a promise of live content.

| Asset | File | Alt text |
|---|---|---|
| App icon | `assets/images/play-store-icon-512.png` | Waymark's W on an airmail stamp |
| Feature graphic | `store/feature-graphic.png` | Waymark: plan a trip together with stops, packing and notes |
| Screenshot 1 | `store/screenshots/home.png` | Your trips as airmail envelopes, with destination stamps and an album of past trips |
| Screenshot 2 | `store/screenshots/plan.png` | A day-by-day Paris itinerary with train and hotel stops |
| Screenshot 3 | `store/screenshots/packing.png` | Shared packing items assigned to two travellers, with packed items checked off |
| Screenshot 4 | `store/screenshots/notes.png` | Shared travel notes alongside a sealed private note |
| Screenshot 5 | `store/screenshots/newtrip.png` | Creating a trip with its name, country, dates and an optional cover photo |

Asset checks on 25 October: icon 512 × 512, RGBA/32-bit, under 1 MB;
feature graphic 1024 × 500, RGB/24-bit; all five screenshots 1080 × 2160,
RGB/24-bit. The screenshots meet the upload requirement; their 2:1 ratio
is different from the 9:16 ratio recommended for some promotional placements.

`bash store/render.sh icon` ensures the icon is a 32-bit PNG without changing
its RGB pixels. The other renderer modes remove alpha from the feature
graphic and screenshots.

## References

- [Listing fields and character limits](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
- [Preview assets and formats](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842?hl=en)
- [Release/declaration worksheet](../docs/PLAY_RELEASE.md)
- [Tester guide](TESTING.md)
