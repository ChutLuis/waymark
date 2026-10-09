# Local storage deletion proof — fifth pass

Both destructive actions were performed through the Android app against local
Supabase. Rows were queried from `storage.objects` in `supabase_db_waymark`
immediately before and after the action. No backend deletion code was changed.

Disposable account: `4b779113-c4fe-471c-95db-e4e56123125b` (Storage Proof).
The avatar was uploaded through Profile; each cover through New trip's photo
picker. Every row below has that account's `owner_id`.

## Delete trip

Solo trip **Delete Trip Proof**: `7cea95db-b7a6-4ce1-8d9a-0b0745e3674c`.
The app's typed-name Delete trip confirmation was used.

### Before

| bucket_id | name | id | owner_id |
|-----------|------|----|----------|
| avatars | `4b779113-c4fe-471c-95db-e4e56123125b/avatar-1791505573390.png` | `ff812fa5-d856-4dc1-87ba-70446a1cc1c7` | `4b779113-c4fe-471c-95db-e4e56123125b` |
| trip-covers | `7cea95db-b7a6-4ce1-8d9a-0b0745e3674c/cover-1791505756169.png` | `4bcc7c94-4a67-41d4-9016-ec2f764bf9a1` | `4b779113-c4fe-471c-95db-e4e56123125b` |

### After

| bucket_id | name | id | owner_id |
|-----------|------|----|----------|
| avatars | `4b779113-c4fe-471c-95db-e4e56123125b/avatar-1791505573390.png` | `ff812fa5-d856-4dc1-87ba-70446a1cc1c7` | `4b779113-c4fe-471c-95db-e4e56123125b` |

The cover row is gone; the avatar row and object ID are unchanged.
The deleted trip's `public.trips` count is **0**.

## Delete account

Created a second solo trip **Delete Account Proof**:
`b6c279c3-2c60-43ca-ae0e-0869170381db`, with a real cover upload.
Profile → Delete account → Delete account was used.

### Before

| bucket_id | name | id | owner_id |
|-----------|------|----|----------|
| avatars | `4b779113-c4fe-471c-95db-e4e56123125b/avatar-1791505573390.png` | `ff812fa5-d856-4dc1-87ba-70446a1cc1c7` | `4b779113-c4fe-471c-95db-e4e56123125b` |
| trip-covers | `b6c279c3-2c60-43ca-ae0e-0869170381db/cover-1791506498067.png` | `b8e17b04-9340-4616-ad70-7fba731a0cfe` | `4b779113-c4fe-471c-95db-e4e56123125b` |

### After

```text
 bucket_id | name | id | owner_id
-----------+------+----+----------
(0 rows)

 profile_rows
--------------
            0
(1 row)

 solo_trip_rows
----------------
              0
(1 row)
```

The avatar and second solo-trip cover are both gone. The profile and solo trip
are gone, and the app returned to its signed-out screen. The zero-row result
was checked again at **2026-10-08 19:50 local (UTC-6)**.

## Queries

```sql
SELECT bucket_id, name, id, owner_id
FROM storage.objects
WHERE owner_id = '4b779113-c4fe-471c-95db-e4e56123125b';

SELECT count(*) AS profile_rows
FROM public.profiles
WHERE id = '4b779113-c4fe-471c-95db-e4e56123125b';

SELECT count(*) AS solo_trip_rows
FROM public.trips
WHERE id = 'b6c279c3-2c60-43ca-ae0e-0869170381db';
```

This is local execution proof. It does not claim a hosted function deployment.
