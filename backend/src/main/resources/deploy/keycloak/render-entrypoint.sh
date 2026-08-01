#!/usr/bin/env bash
set -euo pipefail

: "${KC_DB_URL_HOST:?KC_DB_URL_HOST is required}"
: "${KC_DB_URL_DATABASE:?KC_DB_URL_DATABASE is required}"
: "${KC_DB_USERNAME:?KC_DB_USERNAME is required}"
: "${KC_DB_PASSWORD:?KC_DB_PASSWORD is required}"

db_port="${KC_DB_URL_PORT:-5432}"
db_schema="${KC_DB_SCHEMA:-keycloak}"
if [[ ! "${db_schema}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "KC_DB_SCHEMA must be a valid unquoted PostgreSQL identifier" >&2
  exit 1
fi

export PGPASSWORD="${KC_DB_PASSWORD}"
until pg_isready \
  --host "${KC_DB_URL_HOST}" \
  --port "${db_port}" \
  --username "${KC_DB_USERNAME}" \
  --dbname "${KC_DB_URL_DATABASE}"; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

psql \
  --host "${KC_DB_URL_HOST}" \
  --port "${db_port}" \
  --username "${KC_DB_USERNAME}" \
  --dbname "${KC_DB_URL_DATABASE}" \
  --set ON_ERROR_STOP=1 \
  --command "CREATE SCHEMA IF NOT EXISTS \"${db_schema}\""
unset PGPASSWORD

exec /opt/keycloak/bin/kc.sh "$@"
