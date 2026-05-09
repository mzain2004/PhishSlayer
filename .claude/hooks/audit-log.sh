#!/usr/bin/env bash
# PostToolUse hook: append tool usage to audit log
LOG="$(dirname "$0")/../audit.log"
echo "$(date -Iseconds) tool=${CLAUDE_TOOL_NAME:-unknown} file=${CLAUDE_FILE_PATH:-} cmd=${CLAUDE_COMMAND:0:80}" >> "$LOG"
