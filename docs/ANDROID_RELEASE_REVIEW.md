# Waymark — Android release review

Independent review of the uncommitted working tree on 29 October 2026 (HEAD
`7cc7cf03`), focused on the account-deletion, trip-deletion and auth-session
hardening and on Google Play readiness. The owner is targeting Android first;
iOS is deferred (§8). File references point at that tree and will drift as it
changes.

## 1. Verdict

**Not ready for Play production.** The quality gates pass and no critical
defect was found, but the listing points at dead legal URLs, the privacy policy
names no developer, the public policy is less complete than the in-app one, the
app has none of the user-generated-content safeguards Play's UGC policy asks
for, and three medium auth defects (§4, C1–C3) affect offline use and sign-out.

- **Internal testing:** can start once §3 L1–L2 are fixed and a fresh
  production AAB passes `BUILDS.md` §7.
- **Closed test** (Play reviews it, and its 14 days are the critical path):
  fix L1–L4 first. C1–C3 should follow promptly; they can ship as closed-test
  updates, since the 14-day requirement counts opted-in testers, not builds.

## 2. Gates

| Command | Exit | Result |
|---|---|---|
| `pnpm typecheck` | 0 | clean |
| `pnpm lint` | 0 | 0 errors, 0 warnings |
| `pnpm test` | 0 | 38 files, 764 tests |
| `supabase test db` (local stack) | 0 | 12 files, 113 tests |

Passing tests do not cover the defects below. There are no tests for
`src/lib/supabase/client.ts` (chunked storage), `AuthContext`, or the hook
wiring (`useSignOut`, `useDeleteAccount`, `useDeleteTrip`), which is where C1
lives.

## 3. Play blockers

| # | Severity | Finding | Fix |
|---|---|---|---|
| L1 | Blocker | `store/listing.md` gives `https://chutluis.github.io/waymark/privacy.html` and `/delete-account.html` for the Console fields; both return 404. The app (`src/lib/legal.ts`) and the live pages use `https://waymark-web-production.up.railway.app/`. | Put the Railway URLs (or the final domain) in `listing.md` and in Console, equal to `legal.ts`. |
| L2 | Blocker | No developer is named: `OPERATOR_NAME = 'the Waymark developer'` in `src/lib/legal.ts`, and the live policy says "its independent developer" (`site/privacy.html`). Play's User Data policy requires developer information and a privacy point of contact. | Fill in the legal name in `legal.ts` and `site/privacy.html`; republish. |
| L3 | High | The public policy (the one Console links) omits what the in-app policy discloses: sign-in records and IP addresses, retention in provider backups, and the rights section. `site/delete-account.html` says nothing is kept after deletion and that there are no backups, which contradicts the in-app backup sentence and Supabase's auth logs. A custom SMTP sender, once configured, is an undisclosed processor. | Make the site pages the complete text, align the retention wording, name the SMTP processor once chosen, and update both effective dates. |
| L4 | High risk | Play's UGC policy has no carve-out for private groups: content "visible to or accessible by at least a subset of the app's users" is UGC. Users must accept terms before posting, and apps for a specified set of users must offer in-app reporting of content and users. Waymark has no terms, no report action and no member removal in the UI (the database already allows leaving and owner removal, `SECURITY.md` §5.3). | Before the first closed-test submission: terms of use accepted at sign-up, a Report action on notes, photos and members (a prefilled email is enough), and owner "Remove member". |

Owner and Console work already listed in `PLAY_RELEASE.md` §5 remains: custom
SMTP and then email confirmation (off on the hosted project), the reviewer
account and sample trip, Data safety (add server logs and the SMTP processor),
the content rating, the closed test (12 testers opted in for 14 consecutive
days on a personal account), and a rebuilt production AAB checked with
`BUILDS.md` §7, including 16 KB alignment (required for updates from
1 February 2027; NDK 27.1). Current Play policy text on whether
`SCHEDULE_EXACT_ALARM` needs a Console declaration could not be retrieved;
check in Console.

Already compliant: target and compile SDK 36 (Play requires API 36 for new apps
and updates from 31 August 2026), minimal permissions with `USE_EXACT_ALARM`
blocked, and in-app account deletion plus a public deletion page.

## 4. Code defects

Severity is for an Android release. "Reproduced" means a harness drove the
installed `@supabase/auth-js` 2.110.7 with the real `sessionGate.ts` and
`runForAccount`, using synthetic fixtures; the harness is not in the
repository.

### C1 · Medium · reproduced — offline sign-out with an expired token loses queued changes and stays signed in

With an expired access token and no connection, `supabase.auth.signOut()`
returns an `AuthRetryableFetchError` without removing the session: the SDK
cannot refresh, and `_signOut` returns early on that error. `useSignOut`'s
`onSettled` handler (`src/features/auth/hooks.ts`) then clears the query cache
precisely because the same session is still stored. That drops queued offline
writes from memory while persistence is still active, so the stored queue is
overwritten too. Reminders were already purged, Profile shows no error, and the
SDK's offline refresh retries for about 30 s while the exclusive session lock
is held. `signOut({ scope: 'local' })` takes the same early return.

Fix: remove that `onSettled` clear and let AuthContext's reconciler clear. When
sign-out fails and the captured session is still stored, remove it with
`sessionGate.removeSessionIf({ userId })` (as `finishAccountDeletion` does) and
reconcile; show an error if the session remains.

### C2 · Medium · reproduced — a deep-link exchange can replace a signed-in account

`src/features/auth/authDeepLink.ts` exchanges a code under
`runExclusive('establish')` without checking who is stored, and the gate allows
replacing a different user in that mode (`sessionGate.ts`, `setItem`).
supabase-js reads the token from storage for every request, while queued writes
only check the module owner, which AuthContext changes asynchronously.

Repro: B requests a password reset on this device, A signs in, then B's link is
opened. The exchange stores B, and a `PATCH /rest/v1/trips` issued afterwards
carries B's token. Impact is limited to what B can reach under RLS; the window
lasts until reconciliation applies (indefinitely with C3).

Fix: inside the establish slot, read `storedSessionIdentity()` and refuse the
link when another user is stored ("signed in as another account; sign out
first"). Defence in depth: the global fetch rejects REST, Storage and Functions
requests whose bearer `sub` is not the current query owner.

### C3 · Medium — failed reconciliation is never retried

`createSessionReconciler` (`src/features/auth/sessionTransitions.ts`) keeps the
current state after an error, a corrupt read or a masked read, and nothing
retries; the next attempt waits for the next SDK event. With C2 the UI keeps
showing A while the SDK is B, and Sign out is refused because `runForAccount`
sees another identity. `app/auth-callback.tsx` can then show "Opening your
reset link…" indefinitely; it has no timeout.

Fix: retry with backoff and when `AppState` becomes `active`; add a local
sign-out path for an absent, corrupt or other-user stored identity; time out
the callback screen.

### C4 · Medium-low — trip deletion holds the session lock for the whole cleanup

`useDeleteTrip` wraps every list/remove round in one `runForAccount`, and
Storage requests have no timeout (`timeoutFetch.ts` only times `/rest/v1/` and
`/auth/v1/`). A stalled deletion makes sign-out, sign-in and link exchange fail
as busy after 45 s, and a busy sign-out then triggers C1's clear.

Fix: take the lock per round; time out Storage list and remove.

### Low

- **C5** A failed code exchange cannot be retried: auth-js deletes the PKCE
  verifier on any error, network errors included. The comment in
  `authDeepLink.ts` and a test in `recovery.test.ts` say otherwise. After
  process death Android can redeliver the launch link; its exchange then fails
  and also deletes any newer verifier. Tell the user to request a new link.
- **C6** Account deletion sends the access token held in React state. If it
  expired in the background, the result is "couldn't confirm" rather than a
  call with a fresh token. Read the token with `getSession()` inside
  `runForAccount`.
- **C7** Retirement and the deletion notice live in memory only. If the app is
  killed after the server deletes the account but before local cleanup, the
  next launch shows the deleted account until its token expires. Persist a
  tombstone or document the limitation.
- **C8** A folder entry in a trip's cover folder makes the trip undeletable
  (`deleteTrip.ts` fails closed on `id === null`). The app never creates
  folders; an earlier storage policy let members upload nested paths.
- **C9** The chunked SecureStore write is not atomic (`client.ts`): a narrow
  failure leaves a corrupt value that C3 never resolves.
  `removeSessionIf({ corrupt: true })` exists but is unused at runtime.
- **C10** If the first session read fails and B then signs in, A's scheduled
  reminders are not purged (`AuthContext.tsx`).
- **C11** The gate's `removeItem` is unconditional, and auth-js removes
  whatever session is stored after a non-retryable refresh failure if that
  session looks expired. A late failure for A could remove a newer B only with
  device clock skew. Rejected writes never remove a session: they are
  `AuthRetryableFetchError`s.

Reported by the parallel review and not independently confirmed: unhandled
rejections when the initial session read throws, refresh waiters that can hang,
a password change reported as failed after the server accepted it, and gate
wait timeouts treated as permanent failures for queued writes (`queued.ts`).

## 5. Verified correct

- Account deletion is bound to the initiating account: the explicit
  `Authorization` header survives supabase-js's `fetchWithAuth`, and the
  function identifies the user only from the JWT.
- Deletion outcomes: only `{ ok: true }` is success; `stage: "after_prepare"`
  is partial; a 401 followed by `user_not_found` means already deleted; device
  cleanup failures never become server failures.
- A delayed refresh for A is discarded after B signs in (the auth-js commit
  guard plus the gate's `stale` rejection, covered with the real AuthClient).
- Started gate operations keep their slot; only waiters time out. No runtime
  path nests exclusive operations.
- Trip cover cleanup handles more than 100 objects, detects partial or
  permission-denied removal (the names reappear), fails closed on malformed
  listings, and checks that exactly one trip row was deleted.
- Recovery: one exchange per code, one claim, and the reset screen requires the
  claimed recovery identity.

## 6. Still to verify

- **On a device:** SecureStore chunking and latency, cold and warm callback
  links, relaunch from recents after process death.
- **On the hosted project:** the deployed `delete-account` function matches the
  repository; the error code for a deleted user; function run time for large
  accounts; redirect URLs and minimum password length.
- **In Console:** the exact-alarm declaration and the Data safety taxonomy.

## 7. Next steps

1. L1–L3 (copy only), then republish the site.
2. C1, then C2, each with a regression test that drives the real AuthClient.
3. C3: retry, a local sign-out escape, and a callback timeout.
4. L4's minimum safeguards.
5. Rebuild the production AAB, run `BUILDS.md` §7, start internal testing, then
   the closed test.

## 8. iOS (deferred)

Not started: there is no iOS build and no App Store metadata. When resumed:
Xcode 26 on macOS, iPhone screenshots at 1179 × 2556 or 1206 × 2622, App Privacy
answers, a demo account, Apple guideline 1.2 for user-generated content
(filtering, reporting, blocking, contact details), and checking the generated
privacy manifest's required-reason APIs after prebuild.

## 9. Fix log

Changes made after the review, uncommitted in the working tree.

- **L1–L3 (29 October 2026):** `store/listing.md` now gives the Railway privacy,
  deletion and website URLs and the Play developer name (LFOrtiz). The
  operator is named as Luis Ortiz (LFOrtiz) in `src/lib/legal.ts`, the in-app
  policy and both site pages. The site policy now matches the in-app policy
  (sign-in records, emails sent, backups and sign-in-log retention, rights),
  the deletion page no longer denies backups, and the effective date is
  29 October 2026 in both places. Still open: republish the Railway site, and
  name the SMTP provider as a processor once chosen.
- **C1 (29 October 2026):** sign-out moved to `signOutAccount`
  (`src/features/auth/signOut.ts`). Offline, or when the SDK keeps the session,
  it removes this account's stored session directly, lets the SDK finish its
  own teardown (code verifier, `SIGNED_OUT`) and asks AuthContext to reconcile.
  `useSignOut` no longer clears the cache itself, so the cache is never
  cleared while the session is still stored. Profile shows an error if
  sign-out fails. Covered by `src/features/auth/__tests__/signOut.test.ts`
  (9 tests against the real AuthClient). Gates after this change: typecheck
  and lint clean, 39 files and 773 tests.
- **C2 (29 October 2026):** auth links are exchanged through
  `exchangeOnThisDevice` (`src/features/auth/authExchange.ts`), which refuses
  while a live session is stored on the device instead of letting another
  account's link replace it; the callback screen says "You’re already signed
  in". The comment claiming a failed link can be retried is corrected
  (auth-js discards the code verifier on any failure). Covered by
  `src/features/auth/__tests__/authExchange.test.ts` (6 tests against the real
  AuthClient) and new coordinator tests in `recovery.test.ts`. Gates after
  this change: typecheck and lint clean, 40 files and 781 tests.
- **C4 (29 October 2026):** Storage listing and removal are now bounded by
  `withRequestTimeout` (`src/lib/supabase/timeoutFetch.ts`), matched on method
  as well as path (list is `POST /object/list/…`, remove is
  `DELETE /object/<bucket>`); uploads, downloads and signed URLs stay untimed.
  Trip deletion no longer holds one session-gate slot for its whole run:
  `lockedOperations` (`src/features/trips/deleteTrip.ts`) wraps each account
  step, so `useDeleteTrip` re-takes the gate per round and a stalled deletion
  can no longer block sign-out or sign-in. A refused step fails closed. Covered
  by 9 tests in `timeoutFetch.test.ts` and 20 in `deleteTrip.test.ts`. Gates
  after this change: typecheck and lint clean, 40 files and 800 tests.
- **C3 (29 October 2026):** the session reconciler retries a read that
  proves nothing (an error, an unreadable store, or a stored live session the
  SDK did not return) with backoff (1, 2, 5, 10, then every 30 s), and again
  whenever the app returns to the foreground; a corrupt stored value is
  removed and re-read. Sign-out no longer dead-ends: when this account's
  session is already gone it only updates the screen, and when another
  account is stored it never touches it and hands the screen over to it. The
  callback screen gives up after 20 s with "Couldn’t finish opening this
  link". Covered by 7 new reconciler tests in `sessionTransitions.test.ts` and
  4 new escape tests in `signOut.test.ts`. Gates after this change: typecheck
  and lint clean, 40 files and 800 tests.
- **L1–L3 (4 November 2026):** Named Amazon SES (Amazon Web Services,
  us-east-1 / United States) as the account-email processor in the in-app and
  site privacy policies, and disclosed suppression-list and delivery-log
  retention in both policies and the account-deletion page. Updated the policy
  effective date and the Data safety worksheet. The site still needs republishing.
