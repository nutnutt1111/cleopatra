#!/usr/bin/env bash
# DonutiT Cleopatra — Quality audit target
export QUALITY_BASE_URL="${QUALITY_BASE_URL:-http://localhost:3003}"
export QUALITY_TIMEOUT="${QUALITY_TIMEOUT:-10}"
export QUALITY_REPORT_DIR="${QUALITY_REPORT_DIR:-docs/quality/reports}"

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
