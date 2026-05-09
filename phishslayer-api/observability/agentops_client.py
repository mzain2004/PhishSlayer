"""
AgentOps observability client for PhishSlayer.
All session lifecycle and event recording goes through here.
"""
import agentops
from agentops import ActionEvent, LLMEvent, ToolEvent


def init_agentops(api_key: str, env: str = "development") -> None:
    agentops.init(
        api_key=api_key,
        default_tags=["phishslayer", f"env:{env}"],
        auto_start_session=False,
    )


def record_tool_call(
    tool_name: str,
    tool_input: dict,
    tool_output: dict,
    duration_ms: int,
) -> None:
    agentops.record(ToolEvent(
        name=tool_name,
        params=tool_input,
        returns=tool_output,
        duration=duration_ms,
    ))


def record_llm_call(
    prompt_tokens: int,
    completion_tokens: int,
    model: str,
    duration_ms: int,
) -> None:
    agentops.record(LLMEvent(
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        duration=duration_ms,
    ))
