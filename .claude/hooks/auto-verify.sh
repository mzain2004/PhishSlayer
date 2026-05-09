#!/usr/bin/env bash
# PostToolUse hook: syntax-verify Python and TypeScript after edits.
# Ruflo post-edit hook pattern (hooks/post-edit.sh) adapted for PhishSlayer.
# Non-blocking: failures are printed but exit 0 so they don't halt Claude.
set -euo pipefail

FILE="${CLAUDE_FILE_PATH:-}"
[ -z "$FILE" ] && exit 0

EXT="${FILE##*.}"

case "$EXT" in
  py)
    # Skip venv files
    echo "$FILE" | grep -q "venv/" && exit 0
    python -m py_compile "$FILE" 2>&1 | head -5 || echo "[auto-verify] py_compile failed: $FILE"
    ;;
  ts|tsx)
    # Skip node_modules
    echo "$FILE" | grep -q "node_modules" && exit 0
    # Lightweight check: only run tsc if tsconfig exists at repo root
    [ -f "tsconfig.json" ] && npx tsc --noEmit 2>&1 | head -10 || true
    ;;
esac

exit 0
