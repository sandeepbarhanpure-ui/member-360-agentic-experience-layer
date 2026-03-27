# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""Chat Agent — conversation flow engine.

Maps user messages to tool-chain simulations and structured responses.
Uses the existing ReconciliationAgent, DenialLookup, and SBCRetriever
under the hood to generate real (synthetic) data.
"""

from __future__ import annotations
from app.models.schemas import MemberProfile, ClaimSummary


def build_flows(member: MemberProfile, claim: ClaimSummary) -> dict:
    """Build conversation flows personalized with member/claim data."""
    return {
        "greeting": {
            "tools": [],
            "response": {
                "type": "greeting",
                "text": (
                    f"Hi {member.name.split()[0]}! I'm your Benefits Advocate agent. "
                    f"I have access to your recent claims and plan documents.\n\n"
                    f"I can see you have a **denied claim** from {claim.date_of_service} "
                    f"that may need attention. Would you like me to look into it?"
                ),
            },
            "suggestions": [
                "Why was my MRI claim denied?",
                "What do I owe right now?",
                "How do I fix this?",
            ],
        },
        "why was my mri claim denied?": {
            "tools": [
                {"name": "read_eob", "label": "Reading EOB",
                 "detail": f"Claim #{member.id} \u2192 {claim.code} \u00b7 {claim.service} \u00b7 {claim.facility}",
                 "duration": 1200},
                {"name": "lookup_denial_code", "label": "Denial Code Lookup",
                 "detail": f"{claim.code} \u2192 Prior Authorization Absent \u2014 mapped to SBC \u00a7 Advanced Imaging",
                 "duration": 1000},
                {"name": "query_sbc_rag", "label": "RAG: Plan Document Search",
                 "detail": "Retrieved \u00a7 Advanced Imaging from 2026 Self-Funded Health Plan SBC (similarity: 0.94)",
                 "duration": 1400},
                {"name": "reconcile", "label": "Reconciliation Engine",
                 "detail": f"EOB facility = '{claim.facility}' \u2260 Emergency Room \u2192 ER exception does NOT apply \u2192 denial is CONSISTENT",
                 "duration": 900},
            ],
            "response": {
                "type": "denial_explanation",
                "headline": "Your MRI was denied because the provider didn't get pre-approval.",
                "details": [
                    "Your plan requires **Prior Authorization** for all MRIs and CT scans at least 5 days before the procedure \u2014 this is in the **Advanced Imaging** section of your plan rules.",
                    f"Your MRI was done at an **{claim.facility}**. There's an exception for Emergency Room visits, but since this wasn't an ER visit, that exception doesn't apply here.",
                    "This means the denial **is consistent** with your plan rules. The good news: this is the **provider's responsibility** to fix, not yours.",
                ],
                "card": {
                    "type": "denial_card",
                    "code": claim.code,
                    "reason": "Prior Authorization Absent",
                    "service": claim.service,
                    "amount": claim.billed,
                    "owner": "Provider",
                    "consistent": True,
                    "sbcRef": "\u00a7 Advanced Imaging",
                },
            },
            "suggestions": [
                "How do I get this fixed?",
                "What exactly should I say to the provider?",
                "Could I appeal this myself?",
            ],
        },
        "how do i get this fixed?": {
            "tools": [
                {"name": "determine_action_path", "label": "Action Path Analysis",
                 "detail": "Action owner = Provider \u2192 retroactive authorization path available within 72hr window",
                 "duration": 800},
                {"name": "check_timeline", "label": "Deadline Check",
                 "detail": f"DOS {claim.date_of_service} \u2192 72hr urgent retro-auth window EXPIRED \u2192 standard appeal path (180 days remaining)",
                 "duration": 1000},
                {"name": "generate_script", "label": "Building Call Script",
                 "detail": "Personalizing script with claim ID, DOS, provider NPI, and facility details",
                 "duration": 700},
            ],
            "response": {
                "type": "action_plan",
                "headline": "Here's your step-by-step plan to resolve this.",
                "steps": [
                    {"num": 1, "title": f"Call {claim.provider}'s billing office",
                     "detail": "The provider needs to submit a **retroactive authorization** or file a **corrected claim** with the prior auth on record. This is their responsibility \u2014 you shouldn't owe anything for their administrative miss.",
                     "time": "10 min call"},
                    {"num": 2, "title": "Reference your claim details",
                     "detail": f"Give them your Member ID **{member.id}**, date of service **{claim.date_of_service}**, and mention the denial code **{claim.code}**. I've prepared a script below you can use.",
                     "time": "During call"},
                    {"num": 3, "title": "Follow up in 14 business days",
                     "detail": "If the provider resubmits, allow 14 business days for reprocessing. If you don't see an updated EOB by then, call us back and I can escalate.",
                     "time": "Set reminder"},
                ],
                "card": {
                    "type": "timeline_card",
                    "deadlineLabel": "Appeal Deadline",
                    "deadline": "September 6, 2026",
                    "daysRemaining": 167,
                },
            },
            "suggestions": [
                "What exactly should I say to the provider?",
                "What if the provider refuses?",
                "Set a reminder for me",
            ],
        },
        "what exactly should i say to the provider?": {
            "tools": [
                {"name": "generate_script", "label": "Personalizing Call Script",
                 "detail": f"Inserting claim specifics: Member {member.id}, DOS {claim.date_of_service}, NPI {claim.npi}, Code {claim.code}",
                 "duration": 600},
            ],
            "response": {
                "type": "script",
                "headline": "Here's a ready-to-use script for your call.",
                "intro": f"When you call {claim.provider}'s office, ask for the **billing department** and say:",
                "script": (
                    f"Hi, I'm calling about a denied claim for patient {member.name}, "
                    f"Member ID {member.id}. The date of service was {claim.date_of_service} "
                    f"for an {claim.service}.\n\n"
                    f"The claim was denied under code {claim.code} because prior authorization "
                    f"was not obtained. My plan requires prior auth for all advanced imaging "
                    f"at outpatient facilities.\n\n"
                    f"As the in-network provider, could you please submit a retroactive "
                    f"authorization or file a corrected claim? The plan allows retroactive "
                    f"auths for urgent situations, and standard appeals are accepted within "
                    f"180 days of the denial."
                ),
                "tips": [
                    "Ask for a **reference number** for the call",
                    "Request they **fax confirmation** once they resubmit",
                    "If they push back, mention you'll file a formal grievance with the plan",
                ],
            },
            "suggestions": [
                "What if the provider refuses?",
                "Can you explain my overall benefits?",
                "What do I owe right now?",
            ],
        },
        "what do i owe right now?": {
            "tools": [
                {"name": "fetch_accumulators", "label": "Fetching Accumulators",
                 "detail": f"Deductible: ${member.deductible.used:,.0f} / ${member.deductible.max:,.0f} \u00b7 OOP Max: ${member.oop.used:,.0f} / ${member.oop.max:,.0f}",
                 "duration": 900},
                {"name": "pending_claims", "label": "Checking Pending Claims",
                 "detail": f"1 denied claim ({claim.billed}) \u2014 if resolved, would not apply to accumulators since plan pays",
                 "duration": 700},
            ],
            "response": {
                "type": "financial_summary",
                "headline": "Here's your current financial snapshot.",
                "details": [
                    f"You've used **${member.deductible.used:,.0f} of your ${member.deductible.max:,.0f} deductible** so far this year \u2014 that's about {int(member.deductible.used / member.deductible.max * 100)}%.",
                    f"Your out-of-pocket spending is at **${member.oop.used:,.0f} of your ${member.oop.max:,.0f} maximum**.",
                    f"The **{claim.billed} denied MRI** is currently showing as your responsibility, but if the provider successfully resubmits with authorization, the plan would reprocess it. After your remaining deductible (${member.deductible.max - member.deductible.used:,.0f}), the plan pays 80% \u2014 so your share would drop to about **$74** in coinsurance.",
                ],
                "card": {
                    "type": "financial_card",
                    "deductible": {"used": member.deductible.used, "max": member.deductible.max},
                    "oop": {"used": member.oop.used, "max": member.oop.max},
                    "potentialSavings": "$1,176.00",
                },
            },
            "suggestions": [
                "How do I get the MRI denial fixed?",
                "What's covered under preventive care?",
                "Explain my coinsurance",
            ],
        },
        "could i appeal this myself?": {
            "tools": [
                {"name": "query_sbc_rag", "label": "RAG: Appeal Procedures",
                 "detail": "Retrieved \u00a7 Claims Procedures \u2014 appeal rights and timelines",
                 "duration": 1100},
                {"name": "evaluate_appeal_path", "label": "Evaluating Options",
                 "detail": "Member-initiated appeal vs. provider retro-auth \u2014 comparing timelines and success rates",
                 "duration": 800},
            ],
            "response": {
                "type": "explanation",
                "headline": "You can, but the provider route is faster and more likely to succeed.",
                "details": [
                    "Under your plan's **Claims Procedures**, you have the right to file an appeal within **180 days** of the denial notice. That gives you until approximately **September 6, 2026**.",
                    f"However, I'd recommend starting with the provider first. Since {claim.code} is specifically about a missing prior auth \u2014 which is the **provider's obligation** for in-network services \u2014 they have the most direct path to resolution by submitting a retroactive authorization.",
                    "If the provider doesn't act within 30 days, **then** filing a member appeal is a strong backup. You can reference that the provider failed their administrative duty as an in-network participant.",
                    "I can help you draft either a provider call script or a formal appeal letter \u2014 whichever you need.",
                ],
            },
            "suggestions": [
                "What exactly should I say to the provider?",
                "Help me draft an appeal letter",
                "What if the provider refuses?",
            ],
        },
        "what if the provider refuses?": {
            "tools": [
                {"name": "escalation_paths", "label": "Escalation Analysis",
                 "detail": "3 paths identified: formal grievance, state insurance dept, member appeal with negligence documentation",
                 "duration": 900},
            ],
            "response": {
                "type": "explanation",
                "headline": "You have several escalation options if the provider won't act.",
                "details": [
                    "**Option 1 \u2014 Formal Grievance:** File a grievance with the plan against the provider for failing their prior authorization obligation as an in-network participant. This creates a documented record and often prompts action.",
                    "**Option 2 \u2014 Member Appeal with Documentation:** Submit your own appeal to the plan, noting that the provider was in-network and failed to obtain required authorization. Include the date you contacted the provider and any reference numbers from your call.",
                    "**Option 3 \u2014 State Insurance Department:** If both the plan and provider are unresponsive, you can file a complaint with your state's Department of Insurance. This is a last resort but very effective.",
                    "In most cases, a firm follow-up call referencing the grievance process is enough to get the provider to act. They don't want a network compliance issue on their record.",
                ],
            },
            "suggestions": [
                "Help me draft a grievance",
                "What exactly should I say to the provider?",
                "What do I owe right now?",
            ],
        },
    }


def find_flow(user_input: str, flows: dict) -> dict | None:
    """Fuzzy-match user input to a conversation flow."""
    lower = user_input.lower().strip().rstrip("?!.").strip()

    # Exact / substring match against flow keys
    for key in flows:
        if key == "greeting":
            continue
        normalized = key.rstrip("?!.").strip()
        if lower == normalized or lower in normalized or normalized in lower:
            return flows[key]

    # Keyword-based fuzzy matching
    keyword_map = [
        (["denied", "why", "mri"], "why was my mri claim denied?"),
        (["fix", "resolve", "next step"], "how do i get this fixed?"),
        (["script", "say", "call"], "what exactly should i say to the provider?"),
        (["owe", "cost", "pay", "financial", "deductible"], "what do i owe right now?"),
        (["appeal"], "could i appeal this myself?"),
        (["refuse", "won't", "escalat"], "what if the provider refuses?"),
    ]
    for keywords, flow_key in keyword_map:
        if any(kw in lower for kw in keywords):
            return flows.get(flow_key)

    return None
