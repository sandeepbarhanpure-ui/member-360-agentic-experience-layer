# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""Claims API router."""

from fastapi import APIRouter, Query
from app.models.schemas import ClaimSummary
from app.services.synthetic_data import get_claims

router = APIRouter(prefix="/api/claims", tags=["claims"])


@router.get("", response_model=list[ClaimSummary])
def list_claims(member_id: str | None = Query(None, description="Filter by member ID")):
    return get_claims(member_id)
