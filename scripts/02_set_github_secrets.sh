#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-MoKangMedical/chronicdiseasemanagement}"
ENV_FILE="${ENV_FILE:-.env.github.local}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required"
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

gh auth status >/dev/null

required=(
  RENDER_DEPLOY_HOOK_URL
  RAILWAY_TOKEN
  RAILWAY_PROJECT_ID
  RAILWAY_ENVIRONMENT
  RAILWAY_SERVICE
)

missing=0
for key in "${required[@]}"; do
  if [ -z "${!key:-}" ]; then
    echo "Missing $key"
    missing=1
  fi
done

if [ "$missing" -ne 0 ]; then
  echo
  echo "Define missing values in environment or $ENV_FILE, then rerun."
  exit 1
fi

echo "Setting GitHub Actions secrets on $REPO"
gh secret set RENDER_DEPLOY_HOOK_URL --repo "$REPO" --body "$RENDER_DEPLOY_HOOK_URL"
gh secret set RAILWAY_TOKEN --repo "$REPO" --body "$RAILWAY_TOKEN"
gh secret set RAILWAY_PROJECT_ID --repo "$REPO" --body "$RAILWAY_PROJECT_ID"
gh secret set RAILWAY_ENVIRONMENT --repo "$REPO" --body "$RAILWAY_ENVIRONMENT"
gh secret set RAILWAY_SERVICE --repo "$REPO" --body "$RAILWAY_SERVICE"

echo "Secrets configured."
