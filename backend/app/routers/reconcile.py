# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""Reconciliation API router."""

from fastapi import APIRouter, Request
from app.models.schemas import ReconcileRequest, ReconciliationResult, DenialMapping
from app.services.eob_parser import EOBParser

router = APIRouter(prefix="/api", tags=["reconciliation"])


@router.post("/reconcile", response_model=ReconciliationResult)
def reconcile_eob(body: ReconcileRequest, request: Request):
    """Run the full reconciliation pipeline on raw EOB text."""
    agent = request.app.state.agent
    eob = EOBParser.parse(body.eob_text)
    return agent.reconcile(eob)


@router.get("/denial-codes", response_model=list[DenialMapping])
def list_denial_codes(request: Request):
    """List all recognized denial codes."""
    return request.app.state.denial_lookup.all_codes()
