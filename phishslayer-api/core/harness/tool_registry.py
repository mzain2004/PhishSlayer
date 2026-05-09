"""
Agent-level tool registry using agentscope.tool.Toolkit.
Tools are registered per agent level (l1/l2/l3).
"""
from __future__ import annotations

from typing import Callable

from agentscope.tool import Toolkit

# One toolkit per agent level — populated by each phase as tools are added
_registries: dict[str, Toolkit] = {
    "l1": Toolkit(),
    "l2": Toolkit(),
    "l3": Toolkit(),
}


def register_tool(level: str, fn: Callable, name: str | None = None) -> None:
    """Register a callable tool with the toolkit for the given agent level."""
    if level not in _registries:
        raise ValueError(f"Unknown agent level: {level!r}. Must be l1, l2, or l3.")
    _registries[level].register_tool_function(
        tool_func=fn,
        func_name=name or fn.__name__,
    )


def get_toolkit(level: str) -> Toolkit:
    """Return the Toolkit for the given agent level."""
    if level not in _registries:
        raise ValueError(f"Unknown agent level: {level!r}")
    return _registries[level]


def list_tools(level: str) -> list[str]:
    """Return tool names registered for an agent level."""
    return list(get_toolkit(level).tools.keys())
