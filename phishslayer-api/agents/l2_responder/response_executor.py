"""
response_executor.py — L2 Response Executor.

Hard consequence gates enforced at code level (not config).
Org-specific tokens only — never a shared service account.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

log = logging.getLogger(__name__)

EXECUTION_THRESHOLD = 0.85
BLAST_RADIUS_BLOCKS = {"org", "tenant"}


@dataclass
class ExecutionResult:
    action: str
    target: str
    status: str          # executed | failed | blocked
    message: str
    rollback_possible: bool = False


class ResponseExecutor:
    """
    Executes approved L2 response actions after consequence gate.

    Hard rules enforced as assertions:
      1. consequence_model.confidence >= EXECUTION_THRESHOLD
      2. consequence_model.blast_radius not in {org, tenant}

    All Graph API calls use org-specific OAuth tokens from Supabase integrations.
    """

    def execute(self, action: dict, consequence_model: dict, org_id: str) -> ExecutionResult:
        name = action.get("name", "")
        target = action.get("target", "")
        params = action.get("params", {})

        # Hard gate — never bypass
        confidence = float(consequence_model.get("confidence", 0.0))
        blast = consequence_model.get("blast_radius", "org")

        assert confidence >= EXECUTION_THRESHOLD, (
            f"Execution blocked: confidence {confidence:.2f} < threshold {EXECUTION_THRESHOLD}"
        )
        assert blast not in BLAST_RADIUS_BLOCKS, (
            f"Execution blocked: blast_radius '{blast}' requires human approval"
        )

        try:
            result = self._dispatch(name, target, params, org_id)
            return ExecutionResult(
                action=name, target=target,
                status="executed", message=str(result),
                rollback_possible=consequence_model.get("rollback_possible", False),
            )
        except AssertionError:
            raise
        except Exception as e:
            log.error("ResponseExecutor failed for %s: %s", name, e)
            return ExecutionResult(
                action=name, target=target,
                status="failed", message="EXEC_FAILED",
            )

    @staticmethod
    def _dispatch(name: str, target: str, params: dict, org_id: str) -> dict:
        if name == "graph_revoke_session":
            from tools.identity.graph_tool import graph_revoke_session
            return graph_revoke_session(target, org_id)
        elif name == "graph_disable_account":
            from tools.identity.graph_tool import graph_disable_account
            return graph_disable_account(target, org_id)
        elif name == "graph_reset_mfa":
            from tools.identity.graph_tool import graph_reset_mfa
            return graph_reset_mfa(target, org_id)
        elif name == "wazuh_active_response":
            from tools.edr.wazuh_tool import wazuh_active_response
            return wazuh_active_response(target, params.get("command", "block"), org_id)
        else:
            raise ValueError(f"Unknown action: {name}")
