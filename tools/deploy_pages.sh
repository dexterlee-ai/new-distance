#!/bin/sh
# Publish world/ as committed on HEAD to the gh-pages branch that GitHub Pages serves.
# The branch holds only the contents of world/, one commit per deploy, each naming its source commit.
# Usage (project root, after committing): sh tools/deploy_pages.sh
set -eu
git diff --quiet HEAD -- world || { echo "world/ has uncommitted changes; commit them first" >&2; exit 1; }
src=$(git rev-parse --short HEAD)
tree=$(git rev-parse HEAD:world)
msg=$(printf 'Deploy world/ from %s\n\n%s' "$src" "$(git log -1 --format='%(trailers:key=Co-Authored-By)' HEAD)")
git fetch -q origin gh-pages 2>/dev/null || true
if parent=$(git rev-parse -q --verify refs/remotes/origin/gh-pages); then
  if [ "$(git rev-parse "$parent^{tree}")" = "$tree" ]; then echo "gh-pages already matches $src"; exit 0; fi
  commit=$(printf '%s\n' "$msg" | git commit-tree "$tree" -p "$parent")
else
  commit=$(printf '%s\n' "$msg" | git commit-tree "$tree")
fi
GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git push origin "$commit:refs/heads/gh-pages"
echo "deployed $src -> gh-pages $(git rev-parse --short "$commit")"
