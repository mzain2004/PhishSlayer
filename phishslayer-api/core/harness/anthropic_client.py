"""
Anthropic SDK wrapper. Uses model_router to select model per agent.
Falls back to Groq on 429. Records success/error counts.
"""
from __future__ import annotations

import json
import os
import logging
from typing import Any

from core.harness.model_router import model_router

log = logging.getLogger(__name__)


class AnthropicClient:
    def __init__(self):
        self._anthropic = None
        self._groq = None

    def _get_anthropic(self):
        if self._anthropic is None:
            from anthropic import Anthropic
            self._anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
        return self._anthropic

    def _get_groq(self):
        if self._groq is None:
            from groq import Groq
            self._groq = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
        return self._groq

    def complete(
        self,
        agent_name: str,
        system_prompt: str,
        user_message: str,
        response_format: str = "text",
    ) -> str:
        config = model_router.get_model(agent_name)
        provider = config["provider"]
        model = config["model"]

        try:
            if provider == "anthropic":
                return self._complete_anthropic(config, system_prompt, user_message, response_format)
            else:
                return self._complete_groq(config, system_prompt, user_message, response_format)
        except Exception as exc:
            status = getattr(exc, "status_code", None)
            if provider == "anthropic" and status == 429:
                log.warning("Anthropic rate-limited for %s, falling back to Groq", agent_name)
                model_router.record_error(provider, model)
                from config.settings import settings
                fallback_config = {
                    "model": "llama3-70b-8192",
                    "max_tokens": 4096,
                    "temperature": 0.2,
                }
                return self._complete_groq(fallback_config, system_prompt, user_message, response_format)
            model_router.record_error(provider, model)
            raise

    def _complete_anthropic(self, config: dict, system_prompt: str, user_message: str, response_format: str) -> str:
        client = self._get_anthropic()
        response = client.messages.create(
            model=config["model"],
            max_tokens=config["max_tokens"],
            temperature=config.get("temperature", 0.1),
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        model_router.record_success("anthropic", config["model"])
        return response.content[0].text

    def _complete_groq(self, config: dict, system_prompt: str, user_message: str, response_format: str) -> str:
        client = self._get_groq()
        kwargs: dict[str, Any] = {
            "model": config["model"],
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": config.get("temperature", 0.1),
            "max_tokens": config.get("max_tokens", 4096),
        }
        if response_format == "json":
            kwargs["response_format"] = {"type": "json_object"}
        resp = client.chat.completions.create(**kwargs)
        model_router.record_success("groq", config["model"])
        return resp.choices[0].message.content or ""


# Singleton
anthropic_client = AnthropicClient()
