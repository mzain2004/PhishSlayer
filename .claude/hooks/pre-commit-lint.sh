#!/usr/bin/env bash
# PreToolUse hook: run lint before any git commit
set -euo pipefail

COMMAND="${CLAUDE_COMMAND:-}"

if echo "$COMMAND" | grep -q "git commit"; then
  echo "Running lint check before commit..."
  npm run lint
fi
