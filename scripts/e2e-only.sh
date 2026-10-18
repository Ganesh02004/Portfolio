#!/bin/sh
# Prepares the test stack and runs only the end-to-end suite, so a browser
# failure can be investigated without re-running the whole gate.
#
#   docker compose -f docker-compose.test.yml run --rm --entrypoint sh ci \
#     scripts/e2e-only.sh [playwright args...]

set -eu

npx tsx scripts/migrate.ts
npx tsx scripts/seed.ts

E2E_STAFF_EMAIL="${E2E_STAFF_EMAIL:-e2e-staff@example.test}"
E2E_STAFF_PASSWORD="${E2E_STAFF_PASSWORD:-e2e-staff-password-123}"
export E2E_STAFF_EMAIL E2E_STAFF_PASSWORD

STAFF_PASSWORD="$E2E_STAFF_PASSWORD" npx tsx scripts/create-staff.ts \
  --email "$E2E_STAFF_EMAIL" --name "E2E Staff" --role ADMIN
npx tsx scripts/seed-test-data.ts

if [ ! -d .next ]; then
  npm run build
fi

npm run start > /tmp/next-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ATTEMPTS=0
until node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 60 ]; then
    echo 'server did not become healthy'
    cat /tmp/next-server.log
    exit 1
  fi
  sleep 1
done

export E2E_BASE_URL=http://127.0.0.1:3000
npx playwright test "$@"
