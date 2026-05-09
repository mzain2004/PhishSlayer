import os
from collections import deque
from enum import Enum
from threading import Lock
from time import monotonic


class ModelTier(Enum):
    FAST = "fast"
    BALANCED = "balanced"
    DEEP = "deep"
    EXPERT = "expert"
    FALLBACK = "fallback"


MODEL_CONFIGS = {
    ModelTier.FAST: {
        "provider": "anthropic",
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 2048,
        "temperature": 0.1,
        "cost_per_1k_input": 0.001,
        "cost_per_1k_output": 0.005,
    },
    ModelTier.BALANCED: {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "max_tokens": 4096,
        "temperature": 0.2,
        "cost_per_1k_input": 0.003,
        "cost_per_1k_output": 0.015,
    },
    ModelTier.DEEP: {
        "provider": "anthropic",
        "model": "claude-opus-4-7",
        "max_tokens": 8192,
        "temperature": 0.3,
        "cost_per_1k_input": 0.015,
        "cost_per_1k_output": 0.075,
    },
    ModelTier.EXPERT: {
        "provider": "anthropic",
        "model": "claude-opus-4-7",
        "max_tokens": 16384,
        "temperature": 0.4,
        "cost_per_1k_input": 0.015,
        "cost_per_1k_output": 0.075,
    },
    ModelTier.FALLBACK: {
        "provider": "groq",
        "model": "llama3-70b-8192",
        "max_tokens": 4096,
        "temperature": 0.2,
        "cost_per_1k_input": 0.0,
        "cost_per_1k_output": 0.0,
    },
}

MODEL_RATE_LIMITS = {
    "claude-opus-4-7": {
        "rpm": 50,
        "input_tpm": 500000,
        "output_tpm": 80000,
    },
    "claude-sonnet-4-6": {
        "rpm": 50,
        "input_tpm": 30000,
        "output_tpm": 8000,
    },
    "claude-haiku-4-5-20251001": {
        "rpm": 50,
        "input_tpm": 50000,
        "output_tpm": 10000,
    },
}

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_BUFFER = float(os.getenv("RATE_LIMIT_BUFFER", "0.8"))

MODEL_FALLBACK_TIERS = {
    ModelTier.FAST: [ModelTier.FAST, ModelTier.FALLBACK],
    ModelTier.BALANCED: [ModelTier.BALANCED, ModelTier.FAST, ModelTier.FALLBACK],
    ModelTier.DEEP: [ModelTier.DEEP, ModelTier.BALANCED, ModelTier.FAST, ModelTier.FALLBACK],
    ModelTier.EXPERT: [ModelTier.EXPERT, ModelTier.BALANCED, ModelTier.FAST, ModelTier.FALLBACK],
    ModelTier.FALLBACK: [ModelTier.FALLBACK],
}

AGENT_TO_TIER = {
    "l1_triage": ModelTier.FAST,
    "l2_responder": ModelTier.BALANCED,
    "l3_hunter": ModelTier.DEEP,
    "l3_reporter": ModelTier.DEEP,
    "reveng_engine": ModelTier.EXPERT,
    "forensics": ModelTier.EXPERT,
    "rule_forge": ModelTier.BALANCED,
    "consequence_predictor": ModelTier.FAST,
    "osint_analyzer": ModelTier.BALANCED,
}


class ModelRouter:
    def __init__(self):
        self._call_counts = {}
        self._error_counts = {}
        self._request_windows = {}
        self._lock = Lock()

    def get_model(self, agent_name: str) -> dict:
        return self.get_available_model(agent_name)

    def get_available_model(self, agent_name: str) -> dict:
        return self._resolve_model_config(agent_name, reserve_request=True)

    def _resolve_model_config(self, agent_name: str, reserve_request: bool) -> dict:
        tier = AGENT_TO_TIER.get(agent_name, ModelTier.BALANCED)
        for candidate_tier in MODEL_FALLBACK_TIERS[tier]:
            config = MODEL_CONFIGS[candidate_tier].copy()
            error_key = f"{config['provider']}:{config['model']}"
            if self._error_counts.get(error_key, 0) > 5:
                continue
            if config["provider"] == "anthropic":
                if reserve_request:
                    if not self._reserve_request(config["model"]):
                        continue
                elif self._is_near_rate_limit(config["model"]):
                    continue
            return config
        return MODEL_CONFIGS[ModelTier.FALLBACK].copy()

    def _reserve_request(self, model: str) -> bool:
        with self._lock:
            window = self._request_windows.setdefault(model, deque())
            now = monotonic()
            self._prune_window(window, now)
            rate_limit = MODEL_RATE_LIMITS.get(model)
            if not rate_limit:
                return True
            if len(window) >= rate_limit["rpm"] * RATE_LIMIT_BUFFER:
                return False
            window.append(now)
            return True

    def _is_near_rate_limit(self, model: str) -> bool:
        rate_limit = MODEL_RATE_LIMITS.get(model)
        if not rate_limit:
            return False

        with self._lock:
            window = self._request_windows.setdefault(model, deque())
            self._prune_window(window)
            return len(window) >= rate_limit["rpm"] * RATE_LIMIT_BUFFER

    def _prune_window(self, window, now: float | None = None):
        cutoff = (now if now is not None else monotonic()) - RATE_LIMIT_WINDOW_SECONDS
        while window and window[0] < cutoff:
            window.popleft()

    def record_error(self, provider: str, model: str):
        key = f"{provider}:{model}"
        self._error_counts[key] = self._error_counts.get(key, 0) + 1

    def record_success(self, provider: str, model: str):
        key = f"{provider}:{model}"
        self._error_counts[key] = max(0, self._error_counts.get(key, 0) - 1)

    def estimate_cost(self, agent_name: str, input_tokens: int, output_tokens: int) -> float:
        config = self._resolve_model_config(agent_name, reserve_request=False)
        return (input_tokens / 1000 * config["cost_per_1k_input"] +
                output_tokens / 1000 * config["cost_per_1k_output"])


def get_available_model(agent_name: str) -> dict:
    return model_router.get_available_model(agent_name)


# Singleton
model_router = ModelRouter()
