#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_REMOTE="git@github.com:MoKangMedical/chronicdiseasemanagement.git"
REMOTE_URL="${REMOTE_URL:-$DEFAULT_REMOTE}"
BRANCH="${BRANCH:-main}"
COMMIT_MSG="${COMMIT_MSG:-feat: bootstrap medical agent os demo}"

cd "$REPO_ROOT"

echo "[1/7] Running local build"
pnpm build

if [ ! -d .git ]; then
  echo "[2/7] Initializing git repository"
  git init
else
  echo "[2/7] Git repository already initialized"
fi

echo "[3/7] Ensuring branch is $BRANCH"
git branch -M "$BRANCH"

echo "[4/7] Staging files"
git add .

if git diff --cached --quiet; then
  echo "[5/7] No staged changes to commit"
else
  echo "[5/7] Creating commit"
  git commit -m "$COMMIT_MSG"
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "[6/7] Updating origin to $REMOTE_URL"
  git remote set-url origin "$REMOTE_URL"
else
  echo "[6/7] Adding origin $REMOTE_URL"
  git remote add origin "$REMOTE_URL"
fi

echo "[7/7] Pushing to $BRANCH"
git push -u origin "$BRANCH"

echo
echo "Done. Next:"
echo "  1. Configure GitHub Actions secrets"
echo "  2. Create Render Blueprint and Railway service"
echo "  3. Run scripts/02_set_github_secrets.sh"
echo "  4. Run scripts/03_trigger_and_verify.sh"
