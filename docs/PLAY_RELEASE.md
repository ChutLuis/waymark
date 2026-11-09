# Waymark — Google Play release worksheet

Prepared for Android v1 on 25 October 2026. This is the implementation-based
worksheet for the Console, not a record of submitted forms. Current operational
status and reviewer access details belong in the owner's private handoff.

## 1. Listing

Use [store/listing.md](../store/listing.md) for the app name, short/full
descriptions, release notes, asset paths and alt text. Package: `app.waymark`;
category: Travel & Local; support: `me@lfortiz.com`.

The owner supplies the developer/operator identity and selects distribution
countries and pricing in Console. v1 has no ads, subscriptions or purchases.

## 2. Data safety

The app collects data: email/password sign-in and trip planning send data to
Supabase. Account and trip records are retained, so they are not ephemeral.
Recommended entries for the current implementation:

| Category / type | Collected data | Required or optional | Collection purpose |
|---|---|---|---|
| Personal info / Email address | Sign-up, sign-in and password-reset address | Required | Account management; app functionality |
| Personal info / Name | Required display name (a nickname is fine) | Required | Account management; app functionality |
| Personal info / User IDs | Auth UUID, profile ID, authorship and trip membership | Required | Account management; app functionality |
| Personal info / Other info | Password-based authentication data; Supabase retains a password hash | Required | Account management; app functionality |
| Photos and videos / Photos | Selected profile and trip-cover images | Optional | App functionality |
| App activity / Other user-generated content | Trip names/destinations/dates, stops, packing items, shared and private notes | Required for core trip-planning functionality; extra notes/details are optional | App functionality |

For these retained data types: **Collected = yes; ephemeral = no**. The
required display name is verified in `app/(app)/onboarding.tsx` and
`src/lib/validation/schemas.ts`. Photo selection is optional and restricted to
images (`src/lib/images.ts`); the whole library is not uploaded.

### Sharing and security answers

- **Shared with third parties:** the intended answer is **no**, under Google's
  service-provider and user-initiated-sharing exceptions. Supabase processes
  data to operate the app; people deliberately invite members to shared trips.
  This does not mean trip members cannot see shared content.
- **Encrypted in transit:** **yes** for the production app's HTTPS backend.
  Private notes use access-control rules, not end-to-end encryption.
- **Deletion available:** **yes**, Profile → Delete account, plus the published
  account-deletion URL. The function deletes personal data and hands over shared
  trips where needed; see `SECURITY.md` §6.1 and `site/delete-account.html`.
- **Account creation:** email address and password. No social sign-in, phone
  authentication or guest account flow is implemented.
- **Advertising/marketing and analytics purposes:** none in the app's current
  implementation. Reminders are scheduled on-device, not server push campaigns.
- **Independent security-review badge:** no Google-authorized assessment has
  been recorded. The project's tests and code reviews are not that assessment.

### Backend-dependent confirmations for the owner

Before submitting, check that these entries cover the actual hosted services
too: Supabase's retained auth/API logs, any identifiers or inferred location
used from request IPs, and Amazon Simple Email Service (Amazon SES, us-east-1 /
United States) processing email addresses and message content for Supabase Auth
emails sent from `no-reply@lfortiz.com`, including suppression-list and delivery-log
retention. Add any extra type or purpose actually used there. The app does not
request GPS, contacts, calendar, microphone or broad photo-library access; typed
trip destinations are planning content, not a GPS tracking feature.

The data types above are a prepared worksheet; the owner confirms the exact
Console taxonomy and any additional backend processing. Google requires
server-side handling as well as SDK handling to be represented.

Evidence: `src/features/auth/hooks.ts`, `src/features/trips/hooks.ts`,
`src/features/itinerary/hooks.ts`, `src/features/packing/hooks.ts`,
`src/features/notes/hooks.ts`, `src/lib/supabase/storage.ts`,
`SECURITY.md` §2 and the production manifest checks in `BUILDS.md` §7.

## 3. App content and audience

| Console topic | Implementation-based answer |
|---|---|
| Contains ads | No |
| Restricted access / sign-in details | Sign-in is required; supply the confirmed reviewer account |
| Users can share content | Yes: invited trip members share notes, plans and photos |
| Public social feed / in-app chat | Neither is implemented |
| Purchases / subscriptions | Neither is implemented |
| Target audience | Owner's stated audience is 13+; select the applicable 13–15, 16–17 and 18+ bands |
| Content rating | Complete the questionnaire for the actual app; the rating is assigned by the authorities |

For an exact-alarm explanation if Console asks:

> Waymark lets users set reminders for individual itinerary stops. Reminders
> are scheduled locally on their device. On Android, the app requests exact
> alarm access in context so a reminder can arrive at the selected time.

The manifest uses `SCHEDULE_EXACT_ALARM`, not `USE_EXACT_ALARM`.

## 4. Reviewer access

The owner creates or designates a hosted reviewer account, confirms its email,
finishes onboarding and provides the login directly in Console. Use an account
that reviewers can sign into without waiting for an email or one-time code.
Keep login values out of the repository and handoff documents.

### Sample trip to prepare

- A two-day trip in the future named **Waymark review**, with a destination.
- Two stops: one planned and one confirmed, with times and a short location.
- Two packing items, including one already packed.
- One shared note and one private note written by the reviewer account.
- An optional trip cover to demonstrate photos.

### Additional instructions to paste into Console

```text
Sign in with the supplied email address and password. The account is already confirmed and onboarding is complete.

Open the "Waymark review" trip from Home. Use Plan, Packing and Notes to review its itinerary, packing list, shared notes and the account's private note. Hold the wax seal to open a private note. Use the trip title to open trip details and Invite to view the invitation flow.

Notification and exact-alarm permissions are optional; you can review the planning features without granting them. To test a reminder, add or edit a future stop and enable "Remind me".

Profile is opened from the stamp at the top of Home. It includes theme settings, the privacy policy and Delete account. Account deletion is permanent; it removes the sample account and its personal data.
```

Paste these instructions once the described trip/account actually exist, and
keep reviewer access available during review. Validate the supplied login in
the installed production build.

## 5. Release sequence

1. Configure and test custom SMTP; enable email confirmation after delivery
   works. Test sign-up and password reset on the same device that requested
   the PKCE link.
2. Fill the operator name in the app and website. If the policy changes,
   update both policy effective dates. Publish the privacy/deletion pages and
   check the exact URLs from `src/lib/legal.ts` return 200.
3. Complete the listing, reviewer access and app-content forms in Console.
4. Rebuild the production AAB/APK after app changes, with the owner's go-ahead,
   and run every check in `BUILDS.md` §7. If versionCode 10000 was already
   uploaded, increase `BUILD` before creating the next upload.
5. Upload the AAB to internal testing and install it through Google Play.
   Confirm sign-in, one shared trip, a reminder, and both legal links. Check
   deletion with a disposable test account.
6. Start the closed test after app setup is complete. For personal developer
   accounts created after **13 November 2023**, at least **12 testers** must
   remain opted in continuously for **14 days**. An internal-test period does
   not count toward that closed-test requirement.
7. Collect real feedback with [store/TESTING.md](../store/TESTING.md), fix issues,
   and apply for production access using the actual test dates/results.

## References

- [Data safety definitions, types and sharing exceptions](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Preparing app content and review access](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
- [Closed testing and production access](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Android release review (29 October 2026)](ANDROID_RELEASE_REVIEW.md)
