#!/usr/bin/env bash
# Init git + private GitHub repo + push (run once in Terminal if agent shell is down)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -d .git ]]; then
  git init
  git branch -M main
fi

git add .
if git diff --cached --quiet; then
  echo "Nothing to commit (already staged/committed?)"
else
  git commit -m "$(cat <<'EOF'
Initial commit: Kinesis Advantage360 Pro typing tutor

EOF
)"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create AdvantageProTutor --private --source=. --remote=origin --push
else
  git push -u origin HEAD
fi

echo "Done."
git remote -v
gh repo view --json url -q .url
