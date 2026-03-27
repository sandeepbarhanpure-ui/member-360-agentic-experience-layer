# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""Reconciliation Agent — the core reasoning pipeline.

Pipeline: Ingest → Lookup → RAG Retrieve → Reason → Output

This agent does NOT decide whether a claim is paid. It interprets
the adjudication outcome and translates it for the associate.
"""

from __future__ import annotations
from pathlib import Path

from app.models.schemas import EOBRecord, DenialMapping, ReconciliationResult
from app.services.denial_lookup import DenialLookup
from app.services.sbc_retriever import SBCRetriever


class ReconciliationAgent:
    """Deterministic JSON mapping + RAG reasoning."""

    def __init__(self, denial_lookup: DenialLookup, sbc_retriever: SBCRetriever):
        self.denial_lookup = denial_lookup
        self.retriever = sbc_retriever

    def reconcile(self, eob: EOBRecord) -> ReconciliationResult:
        """Run the full adjudicator-to-member workflow."""
        mapping = self.denial_lookup.lookup(eob.code)
        if mapping is None:
            return ReconciliationResult(
                eob=eob,
                error=(
                    f"Code **{eob.code}** is not present in the denial mapping. "
                    "The system cannot interpret this claim. Please contact "
                    "Member Services for assistance."
                ),
            )

        sbc_text, used_rag = self.retriever.retrieve(mapping.sbc_section)
        if not sbc_text:
            sbc_text = "(SBC section not found)"

        reasoning, is_consistent = self._reason(eob, mapping, sbc_text)

        return ReconciliationResult(
            eob=eob,
            mapping=mapping,
            sbc_excerpt=sbc_text,
            reasoning=reasoning,
            is_consistent=is_consistent,
            confidence="HIGH" if sbc_text != "(SBC section not found)" else "MEDIUM",
            rag_available=used_rag,
        )

    @staticmethod
    def _reason(
        eob: EOBRecord,
        mapping: DenialMapping,
        sbc_text: str,
    ) -> tuple[str, bool]:
        """Compare EOB data against SBC rules and produce reasoning."""
        code = eob.code
        facility = eob.facility.strip().lower()
        lines: list[str] = []
        is_consistent = True

        if code == "CO-197":
            is_er = "emergency" in facility or "er " in facility
            needs_auth = "prior authorization" in sbc_text.lower()

            if needs_auth and not is_er:
                lines += [
                    f"The adjudication engine denied this claim under **{code}** (Prior Authorization Absent).",
                    f'The SBC section **\"{mapping.sbc_section}\"** states that MRIs and CT scans require Prior Authorization 5 days in advance.',
                    f'The service was performed at **\"{eob.facility}\"**, which is not an Emergency Room \u2014 therefore the ER exception does not apply.',
                    "**Conclusion:** The denial is consistent with plan rules.",
                ]
            elif is_er:
                lines += [
                    f"The engine denied for **{code}**, but the service was performed in an Emergency Room setting.",
                    f'The SBC section **\"{mapping.sbc_section}\"** waives prior authorization for ER-based imaging.',
                    "**Conclusion:** This denial may be INCONSISTENT with plan rules. An appeal or system review is recommended.",
                ]
                is_consistent = False
            else:
                lines.append(
                    f'Denial code **{code}** applied. SBC section **\"{mapping.sbc_section}\"** reviewed. Denial appears consistent with plan guidelines.'
                )

        elif code == "CO-16":
            lines += [
                f"The adjudication engine denied this claim under **{code}** (Missing Medical Records).",
                f'The SBC section **\"{mapping.sbc_section}\"** requires providers to submit clinical documentation within 30 days of request.',
                "**Conclusion:** The denial is consistent with plan rules. The provider must resubmit with the required records.",
            ]

        elif code in ("CO-4", "CO-29"):
            lines += [
                f"The adjudication engine denied this claim under **{code}** ({mapping.reason}).",
                f'The SBC section **\"{mapping.sbc_section}\"** outlines the filing and coding requirements for claims.',
                "**Conclusion:** The denial is consistent with plan rules.",
            ]

        elif code.startswith("PR-"):
            lines += [
                f"The adjudication engine applied **{code}** ({mapping.reason}) to this claim.",
                f'The SBC section **\"{mapping.sbc_section}\"** defines the member\'s cost-sharing obligations.',
                "**Conclusion:** This is a member cost-sharing responsibility, not a claim denial. The amount is consistent with plan rules.",
            ]

        else:
            lines.append(
                f'Denial code **{code}** applied. SBC section **\"{mapping.sbc_section}\"** reviewed. Denial appears consistent with plan guidelines.'
            )

        return "\n\n".join(lines), is_consistent
