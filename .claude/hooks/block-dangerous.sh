#!/usr/bin/env bash
# PreToolUse hook: block dangerous commands
set -euo pipefail

COMMAND="${CLAUDE_COMMAND:-}"

BLOCKED_PATTERNS=(
  "rm -rf /"
  "DROP TABLE"
  "DROP DATABASE"
  "git push --force.*main"
  "git push --force.*master"
  "git push -f.*main"
  "git push -f.*master"
  ":(){ :|:& };:"
  "truncate.*agents"
  "truncate.*alerts"
  "truncate.*incidents"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qEi "$pattern"; then
    echo "BLOCKED: Command matches dangerous pattern: $pattern" >&2
    exit 1
  fi
done
