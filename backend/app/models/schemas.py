# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""Pydantic schemas for Member 360 API."""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── EOB ────────────────────────────────────────────────────────

class EOBRecord(BaseModel):
    """Structured Explanation of Benefits."""
    status: str = ""
    code: str = ""
    service: str = ""
    facility: str = ""
    billed_amount: str = ""
    member_id: str = ""
    date_of_service: str = ""
    provider: str = ""
    allowed_amount: str = ""
    plan_paid: str = ""
    member_responsibility: str = ""
    remark: str = ""
    raw_text: str = ""


# ── Denial Mapping ─────────────────────────────────────────────

class DenialMapping(BaseModel):
    """One entry from the deterministic denial mapping."""
    code: str
    reason: str
    plain_language: str
    sbc_section: str
    action_owner: str
    script: str


# ── Reconciliation ─────────────────────────────────────────────

class ReconciliationResult(BaseModel):
    """Full output of the reconciliation agent."""
    eob: EOBRecord
    mapping: Optional[DenialMapping] = None
    sbc_excerpt: str = ""
    reasoning: str = ""
    is_consistent: bool = True
    confidence: str = "HIGH"
    error: Optional[str] = None
    rag_available: bool = False


class ReconcileRequest(BaseModel):
    """Request body for /api/reconcile."""
    eob_text: str = Field(..., min_length=1, description="Raw EOB text to reconcile")


# ── Member ─────────────────────────────────────────────────────

class Accumulator(BaseModel):
    used: float
    max: float


class MemberProfile(BaseModel):
    """Synthetic member profile."""
    id: str
    name: str
    plan: str
    group: str
    deductible: Accumulator
    oop: Accumulator


# ── Claim ──────────────────────────────────────────────────────

class ClaimSummary(BaseModel):
    """Claim info for the dashboard."""
    status: str
    code: str
    service: str
    facility: str
    provider: str
    npi: str
    date_of_service: str
    billed: str
    allowed: str
    plan_paid: str
    member_owes: str
    remark: str
