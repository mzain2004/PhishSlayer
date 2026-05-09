"""
Ruflo Hierarchical Coordinator adapter.

Adapts the "Queen-led hierarchical swarm" pattern from ruflo's
agent-hierarchical-coordinator skill into PhishSlayer's L1→L2→L3 pipeline.

Pattern source: ruflo/.agents/skills/agent-hierarchical-coordinator/SKILL.md
Integration point: called by agent_executor.run_agent() to determine escalation routing.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

AgentLevel = Literal["l1", "l2", "l3"]


@dataclass
class EscalationDecision:
    target_level: AgentLevel
    reason: str
    confidence_score: float
    should_parallelize: bool = False


@dataclass
class AgentPerformanceRecord:
    """Tracks per-level performance for ruflo-style scoring."""
    level: AgentLevel
    success_count: int = 0
    failure_count: int = 0
    total_duration_ms: int = 0

    @property
    def success_rate(self) -> float:
        total = self.success_count + self.failure_count
        return self.success_count / total if total else 1.0

    @property
    def avg_duration_ms(self) -> float:
        total = self.success_count + self.failure_count
        return self.total_duration_ms / total if total else 0.0


# Ruflo escalation thresholds (from hierarchical-coordinator escalation protocol)
_PERFORMANCE_THRESHOLD = 0.70   # <70% success → reassign / escalate
_CRITICAL_BLAST_RADII = {"org", "tenant"}


def route_escalation(
    current_level: AgentLevel,
    confidence: float,
    severity: str,
    attack_type: str,
    blast_radius: str | None = None,
    perf: AgentPerformanceRecord | None = None,
) -> EscalationDecision:
    """
    Ruflo hierarchical coordinator routing logic adapted for PhishSlayer's three-tier pipeline.

    Mirrors ruflo's conditional edge rules from l1_workflow and adds performance-based
    escalation from the hierarchical-coordinator escalation protocol.
    """
    # Performance-based escalation (ruflo: <70% success rate triggers reassign)
    if perf and perf.success_rate < _PERFORMANCE_THRESHOLD:
        next_level: AgentLevel = _next(current_level)
        return EscalationDecision(
            target_level=next_level,
            reason=f"performance_degraded:{perf.success_rate:.2f}",
            confidence_score=confidence,
        )

    # APT or critical severity → L3 always
    if attack_type == "apt" or severity == "critical":
        return EscalationDecision(
            target_level="l3",
            reason="apt_or_critical_severity",
            confidence_score=confidence,
            should_parallelize=True,
        )

    # Org/tenant blast radius requires human + senior agent
    if blast_radius in _CRITICAL_BLAST_RADII:
        return EscalationDecision(
            target_level="l2",
            reason=f"blast_radius:{blast_radius}",
            confidence_score=confidence,
        )

    # Low confidence or high severity → escalate one level
    if confidence < 0.85 or severity in ("high", "critical"):
        return EscalationDecision(
            target_level=_next(current_level),
            reason=f"low_confidence:{confidence:.2f}",
            confidence_score=confidence,
        )

    # High confidence + low/medium severity → close at current level
    return EscalationDecision(
        target_level=current_level,
        reason="confidence_gate_passed",
        confidence_score=confidence,
    )


def _next(level: AgentLevel) -> AgentLevel:
    return {"l1": "l2", "l2": "l3", "l3": "l3"}[level]
