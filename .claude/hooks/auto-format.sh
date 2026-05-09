#!/usr/bin/env bash
# PostToolUse hook: auto-format edited files by type
set -euo pipefail

FILE="${CLAUDE_FILE_PATH:-}"
[ -z "$FILE" ] && exit 0

EXT="${FILE##*.}"

case "$EXT" in
  ts|tsx|js|jsx|json|css|md)
    npx prettier --write "$FILE" 2>/dev/null || true
    ;;
  py)
    ruff format "$FILE" 2>/dev/null || true
    ruff check --fix "$FILE" 2>/dev/null || true
    ;;
esac
