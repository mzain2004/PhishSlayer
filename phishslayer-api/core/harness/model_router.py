from enum import Enum
from dataclasses import dataclass
from config.settings import settings


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

    def get_model(self, agent_name: str) -> dict:
        tier = AGENT_TO_TIER.get(agent_name, ModelTier.BALANCED)
        config = MODEL_CONFIGS[tier].copy()
        error_key = f"{config['provider']}:{config['model']}"
        if self._error_counts.get(error_key, 0) > 5:
            config = MODEL_CONFIGS[ModelTier.FALLBACK].copy()
        return config

    def record_error(self, provider: str, model: str):
        key = f"{provider}:{model}"
        self._error_counts[key] = self._error_counts.get(key, 0) + 1

    def record_success(self, provider: str, model: str):
        key = f"{provider}:{model}"
        self._error_counts[key] = max(0, self._error_counts.get(key, 0) - 1)

    def estimate_cost(self, agent_name: str, input_tokens: int, output_tokens: int) -> float:
        config = self.get_model(agent_name)
        return (input_tokens / 1000 * config["cost_per_1k_input"] +
                output_tokens / 1000 * config["cost_per_1k_output"])


# Singleton
model_router = ModelRouter()
