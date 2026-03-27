"""Chat API router."""

from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.chat_agent import build_flows, find_flow
from app.services.synthetic_data import get_member, get_claims

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Default member + claim for chat context
DEFAULT_MEMBER_ID = "SFP-882401-A"


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    member_id: str = DEFAULT_MEMBER_ID


class ChatResponse(BaseModel):
    tools: list = []
    response: dict = {}
    suggestions: list[str] = []
    matched: bool = True


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest):
    """Process a chat message and return agent response with tool chain."""
    member = get_member(body.member_id)
    if not member:
        return ChatResponse(
            matched=False,
            response={"type": "error", "text": f"Member {body.member_id} not found."},
            suggestions=[],
        )

    claims = get_claims(body.member_id)
    claim = claims[0] if claims else None
    if not claim:
        return ChatResponse(
            matched=False,
            response={"type": "error", "text": "No claims found for this member."},
            suggestions=[],
        )

    flows = build_flows(member, claim)
    flow = find_flow(body.message, flows)

    if not flow:
        return ChatResponse(
            matched=False,
            response={
                "type": "fallback",
                "text": (
                    "I can help you understand your denied MRI claim, walk you through "
                    "next steps, or explain your current benefits. Try asking me something "
                    'like "Why was my claim denied?" or "What do I owe?"'
                ),
            },
            suggestions=[
                "Why was my MRI claim denied?",
                "What do I owe right now?",
                "How do I get this fixed?",
            ],
        )

    return ChatResponse(
        tools=flow["tools"],
        response=flow["response"],
        suggestions=flow.get("suggestions", []),
        matched=True,
    )


@router.get("/greeting", response_model=ChatResponse)
def get_greeting(member_id: str = DEFAULT_MEMBER_ID):
    """Get the initial greeting for a member."""
    member = get_member(member_id)
    claims = get_claims(member_id)
    if not member or not claims:
        return ChatResponse(response={"type": "greeting", "text": "Hello! How can I help?"})

    flows = build_flows(member, claims[0])
    greeting = flows["greeting"]
    return ChatResponse(
        tools=greeting["tools"],
        response=greeting["response"],
        suggestions=greeting["suggestions"],
    )
