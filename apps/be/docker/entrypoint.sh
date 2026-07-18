#!/bin/sh
set -eu

log() {
  printf '%s\n' "[entrypoint] $*"
}

is_enabled() {
  value="${1}"
  name="${2}"

  case "${value}" in
    true)
      return 0
      ;;
    false)
      return 1
      ;;
    *)
      log "${name} must be true or false, received: ${value}"
      exit 1
      ;;
  esac
}

mkdir -p "${LOCAL_STORAGE_ROOT:-/app/storage}"
mkdir -p "${WHATSAPP_AUTH_ROOT:-/app/wa_auth}"

if [ -z "${DATABASE_URL:-}" ]; then
  log "DATABASE_URL is required."
  exit 1
fi

log "Waiting for database..."
node docker/wait-for-db.mjs

if is_enabled "${RUN_MIGRATIONS_ON_STARTUP:-true}" "RUN_MIGRATIONS_ON_STARTUP"; then
  log "Running prisma migrate deploy..."
  npx prisma migrate deploy
else
  log "Skipping prisma migrate deploy."
fi

if is_enabled "${RUN_SEED_ON_STARTUP:-false}" "RUN_SEED_ON_STARTUP"; then
  log "Running full baseline seed..."
  node dist/src/scripts/seed-all.js
else
  log "Skipping full baseline seed."
fi

if is_enabled "${RUN_JAKARTA_SEED_ON_STARTUP:-false}" "RUN_JAKARTA_SEED_ON_STARTUP"; then
  if [ -d /app/seed-storage ]; then
    log "Preparing Jakarta demo photo assets..."
    cp -R /app/seed-storage/. "${LOCAL_STORAGE_ROOT:-/app/storage}/"
  fi

  log "Running Jakarta presentation seed..."
  node dist/src/scripts/seed-jakarta-demo.js
else
  log "Skipping Jakarta presentation seed."
fi

log "Starting NestJS backend on port ${PORT:-3001}..."
exec node dist/src/main.js