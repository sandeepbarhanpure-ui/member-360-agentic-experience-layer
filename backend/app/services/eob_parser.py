# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""EOB Parser — extracts structured records from raw EOB text."""

from __future__ import annotations
from app.models.schemas import EOBRecord


class EOBParser:
    """Parses an EOB text file into a structured record."""

    _FIELD_MAP = {
        "CLAIM STATUS": "status",
        "Code": "code",
        "Service": "service",
        "Facility": "facility",
        "Billed Amount": "billed_amount",
        "Member ID": "member_id",
        "Date of Service": "date_of_service",
        "Rendering Provider": "provider",
        "Allowed Amount": "allowed_amount",
        "Plan Paid": "plan_paid",
        "Member Responsibility": "member_responsibility",
        "Remark": "remark",
    }

    @staticmethod
    def parse(text: str) -> EOBRecord:
        data = {"raw_text": text}
        for line in text.splitlines():
            line = line.strip()
            for label, attr in EOBParser._FIELD_MAP.items():
                if line.upper().startswith(label.upper()):
                    value = line.split(":", 1)[-1].strip()
                    data[attr] = value
        return EOBRecord(**data)
