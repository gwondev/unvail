#!/usr/bin/env bash
set -euo pipefail

ROOT_ENV_FILE="${1:-../.env.production}"
TARGET_ENV_FILE=".env.production"

if [[ ! -f "${ROOT_ENV_FILE}" ]]; then
  echo "[ERROR] Source env file not found: ${ROOT_ENV_FILE}"
  echo "Create it first or pass a path: ./scripts/prepare-env.sh /path/to/.env.production"
  exit 1
fi

set -a
source "${ROOT_ENV_FILE}"
set +a

: "${DB_PORT:?DB_PORT is required in source env}"
: "${DB_PASSWORD:?DB_PASSWORD is required in source env}"
: "${UNVAIL_GEMINI_API_KEY:?UNVAIL_GEMINI_API_KEY is required in source env}"
: "${GOOGLE_CLIENT_ID_UNVAIL:?GOOGLE_CLIENT_ID_UNVAIL is required in source env}"

cat > "${TARGET_ENV_FILE}" <<EOF
DB_HOST=gwon-db
DB_PORT=${DB_PORT}
DB_NAME=unvail
DB_USERNAME=root
DB_PASSWORD=${DB_PASSWORD}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID_UNVAIL}
GEMINI_API_KEY=${UNVAIL_GEMINI_API_KEY}
VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID_UNVAIL}
VITE_API_BASE_URL=/api
ADMIN_EMAILS=${ADMIN_EMAILS:-}
EOF

echo "[OK] ${TARGET_ENV_FILE} generated from ${ROOT_ENV_FILE}"
