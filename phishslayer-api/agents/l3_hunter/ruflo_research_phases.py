"""
Ruflo Researcher phase-tracking adapter for DeerFlow L3 Hunter.

Adapts ruflo's Research Agent 3-phase methodology from agent-researcher/SKILL.md
into a phase-tracking wrapper around PhishSlayer's DeerFlow pipeline.

Phases:
  1. Gather  — multi-strategy information collection (scrapling, VT, AbuseIPDB)
  2. Analyze — pattern recognition and dependency mapping
  3. Synthesize — knowledge compilation → HuntReport

Integration point: agents/l3_hunter/deerflow/researcher.py
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ResearchPhase(Enum):
    GATHER = "gather"
    ANALYZE = "analyze"
    SYNTHESIZE = "synthesize"
    COMPLETE = "complete"


@dataclass
class ResearchFinding:
    """Single finding from a research phase."""
    source: str
    content: str
    confidence: float = 1.0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class PhaseState:
    phase: ResearchPhase
    findings: list[ResearchFinding] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    complete: bool = False

    def add_finding(self, source: str, content: str, confidence: float = 1.0, **meta: Any) -> None:
        self.findings.append(ResearchFinding(source=source, content=content, confidence=confidence, metadata=meta))

    def record_error(self, msg: str) -> None:
        self.errors.append(msg)

    def mark_complete(self) -> None:
        self.complete = True


class RufloResearchTracker:
    """
    Phase tracker that wraps DeerFlow researcher with ruflo's 3-phase methodology.

    Usage:
        tracker = RufloResearchTracker(alert_id, org_id)
        async with tracker.phase(ResearchPhase.GATHER):
            tracker.current.add_finding("scrapling", domain_text)
            tracker.current.add_finding("virustotal", vt_result)
        async with tracker.phase(ResearchPhase.ANALYZE):
            ...
        report = tracker.synthesize()
    """

    def __init__(self, alert_id: str, org_id: str) -> None:
        self.alert_id = alert_id
        self.org_id = org_id
        self._phases: dict[ResearchPhase, PhaseState] = {}
        self.current: PhaseState | None = None

    def phase(self, p: ResearchPhase) -> "_PhaseContext":
        state = PhaseState(phase=p)
        self._phases[p] = state
        return _PhaseContext(self, state)

    def get_phase(self, p: ResearchPhase) -> PhaseState | None:
        return self._phases.get(p)

    def synthesize(self) -> dict[str, Any]:
        """
        Combine all phases into a structured summary for DeerFlow reporter.
        Mirrors ruflo researcher's yaml output format (research_findings).
        """
        all_findings = []
        for phase in (ResearchPhase.GATHER, ResearchPhase.ANALYZE, ResearchPhase.SYNTHESIZE):
            state = self._phases.get(phase)
            if state:
                all_findings.extend(
                    {"phase": phase.value, "source": f.source, "content": f.content, "confidence": f.confidence}
                    for f in state.findings
                )

        gather = self._phases.get(ResearchPhase.GATHER)
        analyze = self._phases.get(ResearchPhase.ANALYZE)

        return {
            "alert_id": self.alert_id,
            "org_id": self.org_id,
            "research_findings": {
                "summary": f"{len(all_findings)} findings across {len(self._phases)} research phases",
                "sources": list({f["source"] for f in all_findings}),
                "findings": all_findings,
                "patterns": [f.content for f in (analyze.findings if analyze else [])],
                "errors": [
                    err
                    for phase_state in self._phases.values()
                    for err in phase_state.errors
                ],
            },
        }


class _PhaseContext:
    def __init__(self, tracker: RufloResearchTracker, state: PhaseState) -> None:
        self._tracker = tracker
        self._state = state

    def __enter__(self) -> PhaseState:
        self._tracker.current = self._state
        return self._state

    def __exit__(self, *_: Any) -> None:
        self._state.mark_complete()
        self._tracker.current = None

    async def __aenter__(self) -> PhaseState:
        return self.__enter__()

    async def __aexit__(self, *args: Any) -> None:
        self.__exit__(*args)
