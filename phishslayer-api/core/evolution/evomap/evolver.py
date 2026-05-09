"""
core/evolution/evomap/evolver.py — EvoMap capability evolution adapter.

EvoMap SDK: pip install git+https://github.com/EvoMap/evolver.git
API reference: EvoAgent, CapabilityGraph, EvolutionConfig

Proposals stored in capabilities table with active=false.
NEVER auto-activated — admin review required via Evolution Dashboard.

SDK_REQUIRED: evolver.EvoAgent
SDK_REQUIRED: evolver.CapabilityGraph
SDK_REQUIRED: evolver.EvolutionConfig
"""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

log = logging.getLogger(__name__)

MIN_EPISODES_BEFORE_EVOLUTION = 20
PATTERN_FREQUENCY_THRESHOLD = 3


class EvoMapIntegration:
    """
    EvoMap capability evolution for L3 Hunter.

    Feeds hunt reports as episodes; proposes new capabilities when a pattern
    exceeds PATTERN_FREQUENCY_THRESHOLD across MIN_EPISODES_BEFORE_EVOLUTION runs.
    All proposals stored as active=false — never auto-activated.
    """

    def __init__(self, org_id: str):
        self.org_id = org_id
        self._agent = self._init_evomap(org_id)
        self._episode_count = 0

    def _init_evomap(self, org_id: str) -> Optional[Any]:
        api_key = os.getenv("EVOMAP_API_KEY", "")
        if not api_key:
            log.info("EVOMAP_API_KEY not set — EvoMap running in no-op mode")
            return None
        try:
            from evolver import EvoAgent, CapabilityGraph, EvolutionConfig  # type: ignore[import]
            config = EvolutionConfig(
                population_size=10,
                mutation_rate=0.15,
                fitness_threshold=0.80,
                min_episodes_before_evolution=MIN_EPISODES_BEFORE_EVOLUTION,
            )
            agent = EvoAgent(
                api_key=api_key,
                project_id=f"phishslayer-{org_id}",
                config=config,
            )
            return agent
        except ImportError:
            log.warning(
                "EvoMap SDK not installed — running in no-op mode. "
                "Install: pip install git+https://github.com/EvoMap/evolver.git"
            )
            return None

    def evaluate_evolution(self, hunt_report: dict, alert_id: str) -> None:
        """
        Feed hunt report as an episode. If pattern frequency exceeds threshold,
        EvoMap proposes new capabilities stored in capabilities table with active=false.
        """
        self._episode_count += 1

        if self._agent is None:
            self._fallback_evaluate(hunt_report, alert_id)
            return

        try:
            from evolver import Episode  # type: ignore[import]
            episode = Episode(
                id=alert_id,
                data=hunt_report,
                fitness=hunt_report.get("confidence", 0.0),
                metadata={
                    "mitre_techniques": hunt_report.get("mitre_techniques", []),
                    "ioc_count": len(hunt_report.get("ioc_table", [])),
                    "episode_num": self._episode_count,
                },
            )
            self._agent.add_episode(episode)

            if self._episode_count >= MIN_EPISODES_BEFORE_EVOLUTION:
                proposals = self._agent.evolve()
                if proposals:
                    self._persist_proposals(proposals)
        except Exception as e:
            log.warning("EvoMap evaluate_evolution failed: %s", e)

    def get_capability_graph(self) -> dict:
        """Return capability graph for Evolution Dashboard DAG visualization."""
        if self._agent is None:
            return {"nodes": [], "edges": []}
        try:
            graph = self._agent.get_capability_graph()
            return graph.to_dict() if hasattr(graph, "to_dict") else {}
        except Exception as e:
            log.warning("EvoMap get_capability_graph failed: %s", e)
            return {"nodes": [], "edges": []}

    def _fallback_evaluate(self, hunt_report: dict, alert_id: str) -> None:
        """
        No-op fallback: track pattern frequency in Supabase evomap_episodes table.
        Proposes capability if mitre_technique appears 3+ times across recent hunts.
        """
        try:
            from supabase import create_client
            url = os.getenv("SUPABASE_URL", "")
            key = os.getenv("SUPABASE_SERVICE_KEY", "")
            if not url or not key:
                return
            sb = create_client(url, key)

            for technique in hunt_report.get("mitre_techniques", []):
                tech_id = technique.get("id", "")
                if not tech_id:
                    continue

                rows = (
                    sb.table("evomap_episodes")
                    .select("id")
                    .eq("organization_id", self.org_id)
                    .eq("technique_id", tech_id)
                    .execute()
                )
                count = len(rows.data or [])

                sb.table("evomap_episodes").insert({
                    "organization_id": self.org_id,
                    "alert_id": alert_id,
                    "technique_id": tech_id,
                    "confidence": hunt_report.get("confidence", 0.0),
                }).execute()

                if count + 1 >= PATTERN_FREQUENCY_THRESHOLD:
                    self._persist_proposals([{
                        "type": "new_capability",
                        "technique_id": tech_id,
                        "technique_name": technique.get("name", ""),
                        "tactic": technique.get("tactic", ""),
                        "frequency": count + 1,
                        "rationale": f"Technique {tech_id} observed {count + 1} times across recent hunts",
                    }])
        except Exception as e:
            log.warning("EvoMap fallback_evaluate failed: %s", e)

    def _persist_proposals(self, proposals: list) -> None:
        """Store EvoMap proposals in capabilities table (active=false, never auto-activated)."""
        try:
            from supabase import create_client
            url = os.getenv("SUPABASE_URL", "")
            key = os.getenv("SUPABASE_SERVICE_KEY", "")
            if not url or not key:
                return
            sb = create_client(url, key)
            for proposal in proposals:
                sb.table("agent_evolution").insert({
                    "organization_id": self.org_id,
                    "source": "evomap",
                    "proposal_type": "new_capability",
                    "proposal_data": proposal if isinstance(proposal, dict) else {"value": str(proposal)},
                    "applied": False,
                }).execute()
        except Exception as e:
            log.warning("EvoMap _persist_proposals failed: %s", e)
