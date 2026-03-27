# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""Synthetic data — in-memory fixtures for the prototype.

When you’re ready to integrate real systems, swap these with
actual DB queries / API calls. The rest of the app stays the same.
"""

from __future__ import annotations
from app.models.schemas import MemberProfile, Accumulator, ClaimSummary


# ── Members ───────────────────────────────────────────────────

MEMBERS: dict[str, MemberProfile] = {
    "SFP-882401-A": MemberProfile(
        id="SFP-882401-A",
        name="Sarah Mitchell",
        plan="2026 Self-Funded Health Plan",
        group="Acme Industries, Inc.",
        deductible=Accumulator(used=620, max=1500),
        oop=Accumulator(used=820, max=4500),
    ),
    "SFP-773502-B": MemberProfile(
        id="SFP-773502-B",
        name="James Rodriguez",
        plan="2026 Self-Funded Health Plan",
        group="Acme Industries, Inc.",
        deductible=Accumulator(used=1500, max=1500),
        oop=Accumulator(used=2100, max=4500),
    ),
    "SFP-664103-C": MemberProfile(
        id="SFP-664103-C",
        name="Priya Chakraborty",
        plan="2026 Self-Funded Health Plan",
        group="Acme Industries, Inc.",
        deductible=Accumulator(used=0, max=1500),
        oop=Accumulator(used=0, max=4500),
    ),
}


# ── Claims ────────────────────────────────────────────────────

CLAIMS: list[ClaimSummary] = [
    ClaimSummary(
        status="DENIED", code="CO-197", service="MRI Knee",
        facility="Outpatient Clinic", provider="Dr. James Whitfield",
        npi="1234567890", date_of_service="2026-03-10",
        billed="$1,250.00", allowed="$0.00",
        plan_paid="$0.00", member_owes="$1,250.00",
        remark="Service requires prior authorization per plan guidelines.",
    ),
    ClaimSummary(
        status="DENIED", code="CO-16", service="Physical Therapy Eval",
        facility="RehabFirst Center", provider="Dr. Emily Chen",
        npi="9876543210", date_of_service="2026-02-28",
        billed="$350.00", allowed="$0.00",
        plan_paid="$0.00", member_owes="$350.00",
        remark="Missing clinical documentation.",
    ),
    ClaimSummary(
        status="PROCESSED", code="PR-1", service="Lab Work — CBC Panel",
        facility="Quest Diagnostics", provider="Quest Diagnostics",
        npi="5551234567", date_of_service="2026-03-01",
        billed="$180.00", allowed="$145.00",
        plan_paid="$0.00", member_owes="$145.00",
        remark="Applied to member deductible.",
    ),
    ClaimSummary(
        status="PROCESSED", code="PR-2", service="Specialist Visit",
        facility="Heart & Vascular Clinic", provider="Dr. Robert Kim",
        npi="5559876543", date_of_service="2026-01-15",
        billed="$420.00", allowed="$380.00",
        plan_paid="$304.00", member_owes="$76.00",
        remark="Coinsurance: member owes 20%.",
    ),
]


def get_member(member_id: str) -> MemberProfile | None:
    return MEMBERS.get(member_id)


def get_all_members() -> list[MemberProfile]:
    return list(MEMBERS.values())


def get_claims(member_id: str | None = None) -> list[ClaimSummary]:
    """Return claims, optionally filtered by member."""
    if member_id is None:
        return CLAIMS
    # For now, all claims belong to SFP-882401-A
    return CLAIMS if member_id == "SFP-882401-A" else []
