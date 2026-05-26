#!/usr/bin/env bash
set -e

REMOTE_URL="$1"
BRANCH="${2:-main}"
MESSAGE="${3:-Update from local}"

if [ -z "$REMOTE_URL" ]; then
  echo "Usage: ./git_push.sh <remote-url> [branch] [commit-message]"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git not found. Install git first."; exit 1
fi

# Set or update origin
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
  echo "Set origin to $REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
  echo "Added origin $REMOTE_URL"
fi

# Add and commit
git add . || true
if git commit -m "$MESSAGE" >/dev/null 2>&1; then
  echo "Committed changes: $MESSAGE"
else
  echo "No changes to commit or commit failed. Proceeding to push."
fi

# Push
git push -u origin "$BRANCH"

echo "Push completed (or attempted)."