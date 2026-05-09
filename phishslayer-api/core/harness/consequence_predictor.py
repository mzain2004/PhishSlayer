"""
Consequence predictor — evaluates proposed actions before execution.
Calls Groq to estimate blast radius, FP probability, rollback feasibility.
"""
from __future__ import annotations

import json
import os
import time
from typing import Literal

from groq import Groq
from pydantic import BaseModel, Field
from observability.logger import AgentLogger


class ConsequenceModel(BaseModel):
    blast_radius: Literal["user", "device", "org", "tenant"]
    false_positive_probability: float = Field(ge=0.0, le=1.0)
    estimated_recovery_time_min: int = Field(ge=0)
    success_probability: float = Field(ge=0.0, le=1.0)
    side_effects: list[str]
    rollback_possible: bool
    rollback_steps: list[str]
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str


_SYSTEM_PROMPT = """\
You are a security consequence analyst for a SOC platform.
Given a proposed action and its context, return ONLY a JSON object matching this schema:
{
  "blast_radius": "user" | "device" | "org" | "tenant",
  "false_positive_probability": <0.0-1.0>,
  "estimated_recovery_time_min": <int>,
  "success_probability": <0.0-1.0>,
  "side_effects": [<string>, ...],
  "rollback_possible": <bool>,
  "rollback_steps": [<string>, ...],
  "confidence": <0.0-1.0>,
  "reasoning": "<concise explanation>"
}
Be conservative. When uncertain, increase false_positive_probability and decrease confidence.
"""


class ConsequencePredictor:
    def __init__(self) -> None:
        self._client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))

    def predict(self, proposed_action: str, context: dict) -> ConsequenceModel:
        """Synchronously predict consequences. Uses ModelRouter (FAST tier), falls back to Groq."""
        _log = AgentLogger(
            agent_level="consequence",
            alert_id=context.get("alert_id", ""),
            org_id=context.get("org_id", ""),
            request_id=context.get("request_id", ""),
        )
        _log.info("consequence_prediction_start", proposed_action=proposed_action)
        user_msg = json.dumps({"proposed_action": proposed_action, "context": context}, default=str)
        try:
            from core.harness.anthropic_client import anthropic_client
            raw = anthropic_client.complete(
                agent_name="consequence_predictor",
                system_prompt=_SYSTEM_PROMPT,
                user_message=user_msg,
                response_format="json",
            )
            data = json.loads(raw)
            result = ConsequenceModel(**data)
            _log.info("consequence_prediction_complete", confidence=result.confidence)
            return result
        except Exception:
            pass  # fall through to Groq
        try:
            resp = self._client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                timeout=15,
            )
            raw = resp.choices[0].message.content or "{}"
            data = json.loads(raw)
            result = ConsequenceModel(**data)
            _log.info("consequence_prediction_complete", confidence=result.confidence)
            return result
        except Exception as exc:
            _log.error("consequence_prediction_error", error_code="PREDICTION_FAILED")
            raise
