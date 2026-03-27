# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""Members API router."""

from fastapi import APIRouter, HTTPException
from app.models.schemas import MemberProfile
from app.services.synthetic_data import get_member, get_all_members

router = APIRouter(prefix="/api/members", tags=["members"])


@router.get("", response_model=list[MemberProfile])
def list_members():
    return get_all_members()


@router.get("/{member_id}", response_model=MemberProfile)
def get_member_by_id(member_id: str):
    member = get_member(member_id)
    if not member:
        raise HTTPException(status_code=404, detail=f"Member {member_id} not found")
    return member
