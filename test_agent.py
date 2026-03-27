"""
Unit tests for the ReconciliationAgent pipeline.

Tests cover:
- EOB parsing accuracy
- Unknown denial code rejection (anti-hallucination guardrail)
- CO-197 consistency logic (outpatient vs. ER exception)
- Cost-sharing codes (PR-1, PR-2) routed to member
- SBC section retrieval (deterministic fallback)
- Script personalization with member data
"""

import json
import pytest
from pathlib import Path

# Adjust import path — tests run from project root
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app import EOBParser, ReconciliationAgent, SBCRetriever, EOBRecord


# ──────────────────────────────────────────────
#  Fixtures
# ──────────────────────────────────────────────

@pytest.fixture
def agent():
    """Initialize the ReconciliationAgent with default data files."""
    return ReconciliationAgent()


@pytest.fixture
def sbc_retriever():
    """Initialize the SBC retriever for section-level tests."""
    sbc_path = Path(__file__).resolve().parent.parent / "data" / "synthetic_sbc.md"
    return SBCRetriever(sbc_path)


# ──────────────────────────────────────────────
#  EOB Parser Tests
# ──────────────────────────────────────────────

class TestEOBParser:
    """Verify structured extraction from raw EOB text."""

    def test_extracts_denial_code(self):
        eob = EOBParser.parse("Code: CO-197\nService: MRI Knee")
        assert eob.code == "CO-197"

    def test_extracts_service(self):
        eob = EOBParser.parse("Code: CO-16\nService: Physical Therapy Evaluation")
        assert eob.service == "Physical Therapy Evaluation"

    def test_extracts_facility(self):
        eob = EOBParser.parse("Facility: Emergency Room\nCode: CO-197")
        assert eob.facility == "Emergency Room"

    def test_extracts_member_id(self):
        eob = EOBParser.parse("Member ID: SFP-882401-A\nCode: CO-197")
        assert eob.member_id == "SFP-882401-A"

    def test_extracts_billed_amount(self):
        eob = EOBParser.parse("Billed Amount: $1,250.00\nCode: CO-197")
        assert eob.billed_amount == "$1,250.00"

    def test_extracts_claim_status(self):
        eob = EOBParser.parse("CLAIM STATUS: DENIED\nCode: CO-197")
        assert eob.status == "DENIED"

    def test_handles_empty_input(self):
        eob = EOBParser.parse("")
        assert eob.code == ""
        assert eob.service == ""

    def test_preserves_raw_text(self):
        raw = "Code: CO-197\nService: MRI Knee"
        eob = EOBParser.parse(raw)
        assert eob.raw_text == raw

    def test_full_eob_parsing(self):
        """Parse a realistic full EOB and verify all fields."""
        eob_text = """CLAIM STATUS: DENIED
Code: CO-197
Service: MRI Knee
Facility: Outpatient Clinic
Member ID: SFP-882401-A
Date of Service: 2026-03-10
Rendering Provider: Dr. James Whitfield, NPI 1234567890
Billed Amount: $1,250.00
Allowed Amount: $0.00
Plan Paid: $0.00
Member Responsibility: $1,250.00"""

        eob = EOBParser.parse(eob_text)
        assert eob.status == "DENIED"
        assert eob.code == "CO-197"
        assert eob.service == "MRI Knee"
        assert eob.facility == "Outpatient Clinic"
        assert eob.member_id == "SFP-882401-A"
        assert eob.date_of_service == "2026-03-10"
        assert eob.billed_amount == "$1,250.00"
        assert eob.member_responsibility == "$1,250.00"


# ──────────────────────────────────────────────
#  Anti-Hallucination: Unknown Code Rejection
# ──────────────────────────────────────────────

class TestUnknownCodeRejection:
    """The agent MUST refuse to interpret codes not in the mapping.
    This is the core anti-hallucination guardrail."""

    def test_unknown_code_returns_error(self, agent):
        eob = EOBParser.parse("Code: CO-999\nService: Lab Work\nFacility: Quest")
        result = agent.reconcile(eob)
        assert result.error is not None

    def test_unknown_code_error_mentions_code(self, agent):
        eob = EOBParser.parse("Code: CO-999\nService: Lab Work")
        result = agent.reconcile(eob)
        assert "CO-999" in result.error

    def test_unknown_code_has_no_mapping(self, agent):
        eob = EOBParser.parse("Code: CO-999\nService: Lab Work")
        result = agent.reconcile(eob)
        assert result.mapping is None

    def test_unknown_code_suggests_member_services(self, agent):
        eob = EOBParser.parse("Code: XY-123\nService: Unknown")
        result = agent.reconcile(eob)
        assert "Member Services" in result.error

    def test_empty_code_returns_error(self, agent):
        eob = EOBParser.parse("Service: MRI Knee\nFacility: Clinic")
        result = agent.reconcile(eob)
        assert result.error is not None


# ──────────────────────────────────────────────
#  CO-197: Prior Authorization Logic
# ──────────────────────────────────────────────

class TestCO197PriorAuth:
    """CO-197 denial consistency depends on facility type.
    Outpatient → consistent (auth required).
    Emergency Room → inconsistent (ER exception applies)."""

    def test_outpatient_denial_is_consistent(self, agent):
        eob = EOBParser.parse("Code: CO-197\nService: MRI Knee\nFacility: Outpatient Clinic")
        result = agent.reconcile(eob)
        assert result.is_consistent is True

    def test_er_denial_is_inconsistent(self, agent):
        eob = EOBParser.parse("Code: CO-197\nService: MRI Knee\nFacility: Emergency Room")
        result = agent.reconcile(eob)
        assert result.is_consistent is False

    def test_action_owner_is_provider(self, agent):
        eob = EOBParser.parse("Code: CO-197\nService: MRI Knee\nFacility: Outpatient Clinic")
        result = agent.reconcile(eob)
        assert result.mapping.action_owner == "Provider"

    def test_sbc_section_is_advanced_imaging(self, agent):
        eob = EOBParser.parse("Code: CO-197\nService: MRI Knee\nFacility: Outpatient Clinic")
        result = agent.reconcile(eob)
        assert result.mapping.sbc_section == "Advanced Imaging"

    def test_reasoning_cites_sbc_section(self, agent):
        eob = EOBParser.parse("Code: CO-197\nService: MRI Knee\nFacility: Outpatient Clinic")
        result = agent.reconcile(eob)
        assert "Advanced Imaging" in result.reasoning

    def test_reasoning_mentions_facility(self, agent):
        eob = EOBParser.parse("Code: CO-197\nService: MRI Knee\nFacility: Outpatient Clinic")
        result = agent.reconcile(eob)
        assert "Outpatient Clinic" in result.reasoning

    def test_no_error_for_known_code(self, agent):
        eob = EOBParser.parse("Code: CO-197\nService: MRI Knee\nFacility: Outpatient Clinic")
        result = agent.reconcile(eob)
        assert result.error is None


# ──────────────────────────────────────────────
#  CO-16: Missing Medical Records
# ──────────────────────────────────────────────

class TestCO16MissingRecords:

    def test_co16_is_consistent(self, agent):
        eob = EOBParser.parse("Code: CO-16\nService: PT Eval\nFacility: RehabFirst")
        result = agent.reconcile(eob)
        assert result.is_consistent is True

    def test_co16_action_owner_is_provider(self, agent):
        eob = EOBParser.parse("Code: CO-16\nService: PT Eval\nFacility: RehabFirst")
        result = agent.reconcile(eob)
        assert result.mapping.action_owner == "Provider"

    def test_co16_references_claims_procedures(self, agent):
        eob = EOBParser.parse("Code: CO-16\nService: PT Eval\nFacility: RehabFirst")
        result = agent.reconcile(eob)
        assert "Claims Procedures" in result.reasoning


# ──────────────────────────────────────────────
#  PR-1 / PR-2: Member Cost Sharing
# ──────────────────────────────────────────────

class TestCostSharingCodes:
    """PR- codes are member responsibility, not provider errors."""

    def test_pr1_action_owner_is_member(self, agent):
        eob = EOBParser.parse("Code: PR-1\nService: Blood Panel\nFacility: LabCorp")
        result = agent.reconcile(eob)
        assert result.mapping.action_owner == "Member"

    def test_pr1_no_error(self, agent):
        eob = EOBParser.parse("Code: PR-1\nService: Blood Panel\nFacility: LabCorp")
        result = agent.reconcile(eob)
        assert result.error is None

    def test_pr1_is_consistent(self, agent):
        eob = EOBParser.parse("Code: PR-1\nService: Blood Panel\nFacility: LabCorp")
        result = agent.reconcile(eob)
        assert result.is_consistent is True

    def test_pr2_action_owner_is_member(self, agent):
        eob = EOBParser.parse("Code: PR-2\nService: X-Ray\nFacility: Imaging Center")
        result = agent.reconcile(eob)
        assert result.mapping.action_owner == "Member"

    def test_pr2_references_cost_sharing(self, agent):
        eob = EOBParser.parse("Code: PR-2\nService: X-Ray\nFacility: Imaging Center")
        result = agent.reconcile(eob)
        assert "Cost Sharing" in result.reasoning


# ──────────────────────────────────────────────
#  SBC Retriever
# ──────────────────────────────────────────────

class TestSBCRetriever:
    """Verify section-level retrieval from the SBC document."""

    def test_retrieves_advanced_imaging(self, sbc_retriever):
        text, _ = sbc_retriever.retrieve("Advanced Imaging")
        assert "Prior Authorization" in text

    def test_retrieves_claims_procedures(self, sbc_retriever):
        text, _ = sbc_retriever.retrieve("Claims Procedures")
        assert "30 days" in text

    def test_retrieves_cost_sharing(self, sbc_retriever):
        text, _ = sbc_retriever.retrieve("Cost Sharing")
        assert "deductible" in text.lower()

    def test_unknown_section_returns_empty(self, sbc_retriever):
        text, _ = sbc_retriever.retrieve("Nonexistent Section XYZ")
        assert text == ""

    def test_case_insensitive_retrieval(self, sbc_retriever):
        text, _ = sbc_retriever.retrieve("advanced imaging")
        assert "Prior Authorization" in text


# ──────────────────────────────────────────────
#  Script Personalization
# ──────────────────────────────────────────────

class TestScriptPersonalization:
    """Verify that call scripts contain placeholder tokens
    for runtime personalization."""

    def test_script_has_id_placeholder(self, agent):
        mapping = agent.denial_map.get("CO-197")
        assert "[ID]" in mapping.script

    def test_script_has_date_placeholder(self, agent):
        mapping = agent.denial_map.get("CO-16")
        assert "[Date]" in mapping.script


# ──────────────────────────────────────────────
#  Confidence Scoring
# ──────────────────────────────────────────────

class TestConfidenceScoring:

    def test_known_section_returns_high_confidence(self, agent):
        eob = EOBParser.parse("Code: CO-197\nService: MRI\nFacility: Clinic")
        result = agent.reconcile(eob)
        assert result.confidence == "HIGH"


# ──────────────────────────────────────────────
#  Denial Mapping Integrity
# ──────────────────────────────────────────────

class TestDenialMappingIntegrity:
    """Verify the mapping file structure is valid."""

    def test_all_codes_have_required_fields(self, agent):
        required = {"reason", "plain_language", "sbc_section", "action_owner", "script"}
        for code, mapping in agent.denial_map.items():
            for field in required:
                assert getattr(mapping, field, None), f"{code} missing {field}"

    def test_all_action_owners_are_valid(self, agent):
        valid_owners = {"Provider", "Member"}
        for code, mapping in agent.denial_map.items():
            assert mapping.action_owner in valid_owners, f"{code} has invalid owner: {mapping.action_owner}"

    def test_mapping_has_minimum_codes(self, agent):
        assert len(agent.denial_map) >= 6, "Expected at least 6 denial codes"
