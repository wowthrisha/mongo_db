#!/usr/bin/env bash

BASE_URL="http://localhost:4000"
EMAIL="thrisha+$(date +%s)@example.com"
PASSWORD="Password123!"

echo "== Health =="
curl -i "$BASE_URL/health"

echo
echo "== Register =="
REGISTER_RES=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Thrisha\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$REGISTER_RES"
TOKEN=$(printf '%s\n' "$REGISTER_RES" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "ERROR: No token returned from register"
  exit 1
fi
echo "Token acquired."

AUTH_HDR="Authorization: Bearer $TOKEN"

echo
echo "== Get profile =="
curl -i -H "$AUTH_HDR" "$BASE_URL/api/auth/profile"

echo
echo "== Update profile (theme: dark) =="
curl -i -X PUT "$BASE_URL/api/auth/profile" \
  -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"preferences":{"theme":"dark"}}'

echo
echo "== Create memory =="
MEMORY_RES=$(curl -s -X POST "$BASE_URL/api/memories" \
  -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"key":"favorite_drink","value":"Latte with oat milk","type":"preference","tags":["coffee","morning"]}')
echo "$MEMORY_RES"
MEM_ID=$(printf '%s\n' "$MEMORY_RES" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p')

echo
echo "== List memories =="
curl -i -H "$AUTH_HDR" "$BASE_URL/api/memories"

echo
echo "== Search memories (coffee) =="
curl -i -H "$AUTH_HDR" "$BASE_URL/api/memories/search?q=coffee"

echo
echo "== Get memory by id =="
curl -i -H "$AUTH_HDR" "$BASE_URL/api/memories/$MEM_ID"

echo
echo "== Update memory =="
curl -i -X PUT "$BASE_URL/api/memories/$MEM_ID" \
  -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"value":"Cappuccino","tags":["coffee","afternoon"]}'

echo
echo "== Create interaction =="
INT_RES=$(curl -s -X POST "$BASE_URL/api/interactions" \
  -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"sessionId":"session-1","rawInput":"Remind me to drink water","assistantResponse":"Okay!","detectedIntent":"create_reminder","entities":[{"type":"time","value":"15:00"}],"processingMode":"cloud"}')
echo "$INT_RES"
INT_ID=$(printf '%s\n' "$INT_RES" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p')

echo
echo "== List interactions =="
curl -i -H "$AUTH_HDR" "$BASE_URL/api/interactions?sessionId=session-1&intent=create_reminder&limit=5"

echo
echo "== Create task =="
TASK_RES=$(curl -s -X POST "$BASE_URL/api/tasks" \
  -H "$AUTH_HDR" -H "Content-Type: application/json" \
  -d '{"title":"Doctor appointment","description":"Annual checkup","type":"schedule","priority":"high","scheduledTime":"2026-03-01T09:00:00.000Z"}')
echo "$TASK_RES"
TASK_ID=$(printf '%s\n' "$TASK_RES" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p')

echo
echo "== List tasks =="
curl -i -H "$AUTH_HDR" "$BASE_URL/api/tasks?status=pending&type=schedule&priority=high"

echo
echo "== Complete task =="
curl -i -X PATCH "$BASE_URL/api/tasks/$TASK_ID/complete" \
  -H "$AUTH_HDR"

echo
echo "== Get context =="
curl -i -H "$AUTH_HDR" "$BASE_URL/api/context"

echo
echo "ALL CHECKS RAN (inspect responses above)."
