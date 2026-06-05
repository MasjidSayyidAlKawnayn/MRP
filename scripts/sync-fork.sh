#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-upstream}"
FORK_REMOTE="${FORK_REMOTE:-origin}"
BRANCH="${1:-$(git branch --show-current)}"

if [[ -z "$BRANCH" ]]; then
  echo "Could not determine the current branch. Pass one explicitly, e.g.:"
  echo "  ./scripts/sync-fork.sh main"
  exit 1
fi

if ! git remote get-url "$UPSTREAM_REMOTE" >/dev/null 2>&1; then
  echo "Missing upstream remote: $UPSTREAM_REMOTE"
  echo "Add it with:"
  echo "  git remote add upstream <source-repo-url>"
  exit 1
fi

if ! git remote get-url "$FORK_REMOTE" >/dev/null 2>&1; then
  echo "Missing fork remote: $FORK_REMOTE"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes. Commit or stash them first."
  exit 1
fi

echo "Fetching $UPSTREAM_REMOTE and $FORK_REMOTE..."
git fetch "$UPSTREAM_REMOTE"
git fetch "$FORK_REMOTE"

echo "Checking out $BRANCH..."
git checkout "$BRANCH"

echo "Merging $UPSTREAM_REMOTE/$BRANCH into $BRANCH..."
git merge --ff-only "$UPSTREAM_REMOTE/$BRANCH"

echo "Pushing $BRANCH to $FORK_REMOTE..."
git push "$FORK_REMOTE" "$BRANCH"

echo "Done. $FORK_REMOTE/$BRANCH is synced with $UPSTREAM_REMOTE/$BRANCH."
