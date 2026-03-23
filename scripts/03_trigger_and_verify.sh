#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-MoKangMedical/chronicdiseasemanagement}"
REF="${REF:-main}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required"
  exit 1
fi

gh auth status >/dev/null

echo "[1/4] Recent workflow runs"
gh run list --repo "$REPO" --limit 10

echo
echo "[2/4] Triggering Render deploy workflow_dispatch"
gh workflow run deploy-render.yml --repo "$REPO" --ref "$REF" || true

echo
echo "[3/4] Triggering Railway deploy workflow_dispatch"
gh workflow run deploy-railway.yml --repo "$REPO" --ref "$REF" || true

echo
echo "[4/4] Inspect runs"
echo "Use:"
echo "  gh run list --repo $REPO"
echo "  gh run view --repo $REPO <run-id> --log"
