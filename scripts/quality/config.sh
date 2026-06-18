#!/usr/bin/env bash
# DonutiT Cleopatra — Quality audit target
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

export QUALITY_BASE_URL="${QUALITY_BASE_URL:-http://localhost:3005}"
export QUALITY_API_URL="${QUALITY_API_URL:-http://localhost:3004}"
export QUALITY_TIMEOUT="${QUALITY_TIMEOUT:-10}"
export QUALITY_REPORT_DIR="${QUALITY_REPORT_DIR:-docs/quality/reports}"
export QUALITY_DEV_PASSWORD="${QUALITY_DEV_PASSWORD:-${SEED_DEV_PASSWORD:-}}"

csrf_from_jar() {
  local jar="$1"
  awk -F'\t' '$6=="csrf" {print $7}' "$jar" 2>/dev/null | tail -1
}

api_post() {
  local jar="$1" url="$2" body="$3"
  local csrf
  csrf=$(csrf_from_jar "$jar")
  curl -s -b "$jar" -X POST -H 'Content-Type: application/json' \
    ${csrf:+-H "X-CSRF-Token: $csrf"} \
    -d "$body" "$url"
}

api_post_code() {
  local jar="$1" url="$2" body="$3"
  local csrf
  csrf=$(csrf_from_jar "$jar")
  curl -s -o /dev/null -w "%{http_code}" -b "$jar" -X POST -H 'Content-Type: application/json' \
    ${csrf:+-H "X-CSRF-Token: $csrf"} \
    -d "$body" "$url"
}

api_post_empty() {
  local jar="$1" url="$2"
  local csrf
  csrf=$(csrf_from_jar "$jar")
  curl -s -b "$jar" -X POST \
    ${csrf:+-H "X-CSRF-Token: $csrf"} \
    "$url"
}

api_post_empty_code() {
  local jar="$1" url="$2"
  local csrf
  csrf=$(csrf_from_jar "$jar")
  curl -s -o /dev/null -w "%{http_code}" -b "$jar" -X POST \
    ${csrf:+-H "X-CSRF-Token: $csrf"} \
    "$url"
}

# Core routes (regress-ranger)
export QUALITY_ROUTES=(
  "/"
  "/dashboard"
  "/pos"
  "/inventory"
  "/pawn"
  "/messenger"
  "/cashflow-ledger"
  "/settings"
  "/customers"
  "/hr"
)
