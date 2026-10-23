#!/usr/bin/env bash
# End-to-end check of the delete-account Edge Function against the LOCAL
# Supabase stack (`supabase start` must be running).
#
# It signs up two throwaway users, has A create a solo and a shared trip, B
# join the shared one through a server-minted invite, A upload covers and an
# avatar, then deletes A through the function and checks the result in the
# database: solo trip and its cover gone, shared trip and its cover handed to
# B, nothing left owned by A. Both users are removed at the end.
#
# The local API URL and anon key are read from `supabase status` into
# variables and never printed. Run from the repository root:
#   tools/e2e/delete-account.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

if command -v podman >/dev/null 2>&1 && podman ps --format '{{.Names}}' | grep -q supabase_db_waymark; then
  RUNTIME=podman
else
  RUNTIME=docker
fi
psqlq() { "$RUNTIME" exec supabase_db_waymark psql -U postgres -d postgres -Atc "$1" 2>/dev/null; }

STATUS=$(npx supabase status -o env 2>/dev/null)
API_URL=$(printf '%s\n' "$STATUS" | sed -n 's/^API_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')
ANON_KEY=$(printf '%s\n' "$STATUS" | sed -n 's/^ANON_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')
unset STATUS
[ -n "$API_URL" ] && [ -n "$ANON_KEY" ] || { echo "Local Supabase isn't running (supabase start)."; exit 1; }

TINY=$(mktemp --suffix=.jpg)
trap 'rm -f "$TINY"' EXIT
# A valid 1x1 JPEG.
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\x27 ",#\x1c\x1c(7),01444\x1f\x279=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\t\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00T\xbf\xff\xd9' > "$TINY"

PW="E2e-only-$(date +%s)-pw"
R=$RANDOM$RANDOM
signup() { curl -s -X POST "$API_URL/auth/v1/signup" -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$PW\"}"; }
field() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
rpc() { curl -s -X POST "$API_URL/rest/v1/rpc/$2" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $1" -H 'Content-Type: application/json' -d "$3"; }
upload() { curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/storage/v1/object/$2" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $1" -H "Content-Type: ${3:-image/jpeg}" --data-binary @"$TINY"; }
fail=0
check() { if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1 (got '$2', want '$3')"; fail=1; fi; }

A_JSON=$(signup "e2e-owner-$R@example.test"); B_JSON=$(signup "e2e-heir-$R@example.test")
A_TOK=$(printf '%s' "$A_JSON" | field 'd.get("access_token","")'); A_ID=$(printf '%s' "$A_JSON" | field '(d.get("user") or d).get("id","")')
B_TOK=$(printf '%s' "$B_JSON" | field 'd.get("access_token","")'); B_ID=$(printf '%s' "$B_JSON" | field '(d.get("user") or d).get("id","")')
unset A_JSON B_JSON
[ -n "$A_TOK" ] && [ -n "$B_TOK" ] || { echo "Sign-up failed (are local email confirmations off?)"; exit 1; }

SOLO=$(rpc "$A_TOK" create_trip '{"_name":"E2E solo","_destination":"Japan"}' | field 'd["id"]')
SHARED=$(rpc "$A_TOK" create_trip '{"_name":"E2E shared","_destination":"Portugal"}' | field 'd["id"]')
CODE=$(rpc "$A_TOK" get_or_create_trip_invite "{\"_trip_id\":\"$SHARED\"}" | field 'd["code"]')
check "invite code is 8 characters without lookalikes" "$([[ $CODE =~ ^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$ ]] && echo yes)" yes
check "B joins with the lowercase code" "$(rpc "$B_TOK" accept_trip_invite "{\"_code\":\"$(echo "$CODE" | tr 'A-Z' 'a-z')\"}")" "\"$SHARED\""
check "A uploads the solo cover" "$(upload "$A_TOK" "trip-covers/$SOLO/cover.jpg")" 200
check "A uploads the shared cover" "$(upload "$A_TOK" "trip-covers/$SHARED/cover.jpg")" 200
check "A uploads an avatar" "$(upload "$A_TOK" "avatars/$A_ID/avatar.jpg")" 200
check "B (member, not owner) can't upload a cover" "$(upload "$B_TOK" "trip-covers/$SHARED/b.jpg")" 400
check "the bucket refuses a text file" "$(upload "$A_TOK" "trip-covers/$SHARED/x.txt" text/plain)" 400
OWNER_LEAVE=$(curl -s -X DELETE "$API_URL/rest/v1/trip_members?trip_id=eq.$SHARED&user_id=eq.$A_ID" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $A_TOK" | field 'd.get("message","") if isinstance(d, dict) else ""')
check "the owner can't leave their trip" "$OWNER_LEAVE" "The trip owner can't leave the trip. Delete it instead."

DELETE=$(curl -s -X POST "$API_URL/functions/v1/delete-account" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $A_TOK" -H 'Content-Type: application/json' -d '{}')
check "delete-account answers ok" "$DELETE" '{"ok":true}'
check "A's auth user is gone" "$(psqlq "select count(*) from auth.users where id = '$A_ID'")" 0
check "the solo trip is gone" "$(psqlq "select count(*) from trips where id = '$SOLO'")" 0
check "the shared trip now belongs to B" "$(psqlq "select created_by = '$B_ID' from trips where id = '$SHARED'")" t
check "B is the owner member" "$(psqlq "select role from trip_members where trip_id = '$SHARED' and user_id = '$B_ID'")" owner
check "nothing is owned by A any more" "$(psqlq "select count(*) from storage.objects where owner = '$A_ID' or owner_id = '$A_ID'")" 0
check "the solo cover and the avatar are removed" "$(psqlq "select count(*) from storage.objects where name like '$SOLO/%' or name like '$A_ID/%'")" 0
check "the shared cover stays, owned by B" "$(psqlq "select count(*) from storage.objects where name = '$SHARED/cover.jpg' and owner = '$B_ID'")" 1
check "the deletion log is cleaned up" "$(psqlq "select count(*) from account_deletion_trips where user_id = '$A_ID'")" 0
check "A's old token is refused" "$(curl -s -X POST "$API_URL/functions/v1/delete-account" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $A_TOK" -d '{}')" '{"error":"unauthorized"}'

# Clean up B (and with it the shared trip and its cover) through the same function.
curl -s -X POST "$API_URL/functions/v1/delete-account" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $B_TOK" -d '{}' >/dev/null
check "no throwaway users are left" "$(psqlq "select count(*) from auth.users where email like 'e2e-%-$R@example.test'")" 0
exit $fail
