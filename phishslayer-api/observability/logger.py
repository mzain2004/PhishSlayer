"""
Structured JSON logger for PhishSlayer FastAPI backend.
Outputs machine-readable log entries compatible with log aggregators.
"""
import logging
import json
import os
from datetime import datetime, timezone
from typing import Optional


class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "event": record.getMessage(),
            "request_id": getattr(record, "request_id", None),
            "user_id": getattr(record, "user_id", None),
            "org_id": getattr(record, "org_id", None),
            "alert_id": getattr(record, "alert_id", None),
            "agent_level": getattr(record, "agent_level", None),
            "duration_ms": getattr(record, "duration_ms", None),
            "error_code": getattr(record, "error_code", None),
            "module": record.module,
            "metadata": getattr(record, "metadata", None),
        }
        entry = {k: v for k, v in entry.items() if v is not None}
        return json.dumps(entry)


def get_logger(name: str) -> logging.Logger:
    _debug = os.getenv("DEBUG", "false").lower() == "true"
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG if _debug else logging.INFO)
    return logger


class AgentLogger:
    """Context-aware logger for agent operations."""

    def __init__(self, agent_level: str, alert_id: str, org_id: str, request_id: str):
        self._logger = get_logger(f"phishslayer.agents.{agent_level}")
        self._ctx = {
            "agent_level": agent_level,
            "alert_id": alert_id,
            "org_id": org_id,
            "request_id": request_id,
        }

    def info(self, event: str, **kwargs):
        self._logger.info(event, extra={**self._ctx, "metadata": kwargs or None})

    def warn(self, event: str, **kwargs):
        self._logger.warning(event, extra={**self._ctx, "metadata": kwargs or None})

    def error(self, event: str, error_code: str = "UNKNOWN", **kwargs):
        self._logger.error(
            event,
            extra={**self._ctx, "error_code": error_code, "metadata": kwargs or None},
        )

    def tool_call(self, tool_name: str, duration_ms: int, success: bool, **kwargs):
        self._logger.info(
            f"tool_call:{tool_name}",
            extra={
                **self._ctx,
                "duration_ms": duration_ms,
                "metadata": {"tool": tool_name, "success": success, **kwargs},
            },
        )
