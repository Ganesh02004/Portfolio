#!/bin/sh
# Full quality gate, run inside the test container.
#
#   docker compose -f docker-compose.test.yml run --rm ci
#
# Stages run in increasing order of cost, so a cheap failure stops the run
# before an expensive stage starts:
#
#   1. format check  2. lint  3. typecheck  4. migrate + seed
#   5. unit tests    6. integration tests    7. build  8. E2E tests
#
# Every stage result is reported at the end, and the script exits non-zero if
# any stage failed. Nothing is skipped silently.

set -eu

GREEN=''
RED=''
BOLD=''
RESET=''
if [ -t 1 ]; then
  GREEN=$(printf '\033[32m')
  RED=$(printf '\033[31m')
  BOLD=$(printf '\033[1m')
  RESET=$(printf '\033[0m')
fi

STAGE_RESULTS=''
FAILED=0

stage() {
  name="$1"
  shift
  printf '\n%s=== %s ===%s\n' "$BOLD" "$name" "$RESET"

  if "$@"; then
    printf '%s✓ %s passed%s\n' "$GREEN" "$name" "$RESET"
    STAGE_RESULTS="${STAGE_RESULTS}PASS  ${name}\n"
  else
    printf '%s✗ %s FAILED%s\n' "$RED" "$name" "$RESET"
    STAGE_RESULTS="${STAGE_RESULTS}FAIL  ${name}\n"
    FAILED=1
  fi
}

# A stage whose failure makes every later stage meaningless.
required_stage() {
  name="$1"
  shift
  printf '\n%s=== %s ===%s\n' "$BOLD" "$name" "$RESET"

  if "$@"; then
    printf '%s✓ %s passed%s\n' "$GREEN" "$name" "$RESET"
    STAGE_RESULTS="${STAGE_RESULTS}PASS  ${name}\n"
  else
    printf '%s✗ %s FAILED — cannot continue%s\n' "$RED" "$name" "$RESET"
    STAGE_RESULTS="${STAGE_RESULTS}FAIL  ${name}\n"
    printf '\n%sStage results:%s\n' "$BOLD" "$RESET"
    printf "$STAGE_RESULTS"
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Static checks
# ---------------------------------------------------------------------------

stage "format"    npm run format:check
stage "lint"      npm run lint
stage "typecheck" npm run typecheck

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

required_stage "migrate"      npx tsx scripts/migrate.ts
required_stage "seed"         npx tsx scripts/seed.ts

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

stage "unit tests"        npm run test:unit
stage "integration tests" npm run test:integration

# ---------------------------------------------------------------------------
# Build and end-to-end
# ---------------------------------------------------------------------------

required_stage "production build" npm run build

printf '\n%s=== provisioning E2E staff account ===%s\n' "$BOLD" "$RESET"
E2E_STAFF_EMAIL="${E2E_STAFF_EMAIL:-e2e-staff@example.test}"
E2E_STAFF_PASSWORD="${E2E_STAFF_PASSWORD:-e2e-staff-password-123}"
export E2E_STAFF_EMAIL E2E_STAFF_PASSWORD

STAFF_PASSWORD="$E2E_STAFF_PASSWORD" npx tsx scripts/create-staff.ts \
  --email "$E2E_STAFF_EMAIL" --name "E2E Staff" --role ADMIN

printf '\n%s=== seeding E2E fixtures ===%s\n' "$BOLD" "$RESET"
# The integration suite truncates these tables, so fixtures are created after
# it runs and before the browser tests start.
npx tsx scripts/seed-test-data.ts

printf '\n%s=== starting application server ===%s\n' "$BOLD" "$RESET"
npm run start > /tmp/next-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Wait for the health endpoint rather than sleeping a fixed amount.
ATTEMPTS=0
until node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 60 ]; then
    printf '%s✗ server did not become healthy within 60s%s\n' "$RED" "$RESET"
    echo '--- server log ---'
    cat /tmp/next-server.log
    STAGE_RESULTS="${STAGE_RESULTS}FAIL  server startup\n"
    printf '\n%sStage results:%s\n' "$BOLD" "$RESET"
    printf "$STAGE_RESULTS"
    exit 1
  fi
  sleep 1
done

printf '%s✓ server healthy%s\n' "$GREEN" "$RESET"
STAGE_RESULTS="${STAGE_RESULTS}PASS  server startup\n"

export E2E_BASE_URL=http://127.0.0.1:3000
stage "e2e tests" npx playwright test

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

printf '\n%s================ stage results ================%s\n' "$BOLD" "$RESET"
printf "$STAGE_RESULTS"
printf '%s===============================================%s\n' "$BOLD" "$RESET"

if [ "$FAILED" -ne 0 ]; then
  printf '%sOne or more stages failed.%s\n' "$RED" "$RESET"
  exit 1
fi

printf '%sAll stages passed.%s\n' "$GREEN" "$RESET"
