"""Member 360 — Agentic Experience Layer (FastAPI).

A scalable API layer that interprets adjudication outcomes and translates
them into plain-English member advocacy guidance.

This is an INTERPRETATION layer. Final financial determinations are held
by the Adjudication System of Record.
"""

from __future__ import annotations
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routers import members, claims, reconcile, chat
from app.services.denial_lookup import DenialLookup
from app.services.sbc_retriever import SBCRetriever
from app.services.reconciliation import ReconciliationAgent

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    denial_lookup = DenialLookup(DATA_DIR / "denial_mapping.json")
    sbc_retriever = SBCRetriever(DATA_DIR / "synthetic_sbc.md")
    agent = ReconciliationAgent(denial_lookup, sbc_retriever)

    app.state.denial_lookup = denial_lookup
    app.state.sbc_retriever = sbc_retriever
    app.state.agent = agent
    yield


app = FastAPI(
    title="Member 360 — Agentic Experience Layer",
    description="Interprets adjudication outcomes into member advocacy guidance.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routers ───────────────────────────────────────────────
app.include_router(members.router)
app.include_router(claims.router)
app.include_router(reconcile.router)
app.include_router(chat.router)


# ── Health check ──────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "healthy", "version": "0.2.0"}


# ── Serve frontend ─────────────────────────────────────────
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR / "static"), name="static")
    app.mount("/components", StaticFiles(directory=FRONTEND_DIR / "components"), name="components")

    @app.get("/{path:path}")
    def serve_spa(path: str):
        file_path = FRONTEND_DIR / path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")
