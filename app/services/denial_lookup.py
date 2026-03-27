"""Denial lookup — deterministic denial code mapping service."""

from __future__ import annotations
import json
from pathlib import Path
from app.models.schemas import DenialMapping


class DenialLookup:
    """Loads and serves denial code mappings from JSON."""

    def __init__(self, mapping_path: Path):
        with open(mapping_path, encoding="utf-8") as f:
            raw = json.load(f)
        self.mappings: dict[str, DenialMapping] = {
            code: DenialMapping(code=code, **fields)
            for code, fields in raw.items()
        }

    def lookup(self, code: str) -> DenialMapping | None:
        return self.mappings.get(code)

    def all_codes(self) -> list[DenialMapping]:
        return list(self.mappings.values())
