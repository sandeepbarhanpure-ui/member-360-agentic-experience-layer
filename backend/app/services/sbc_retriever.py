# Copyright (c) 2026 Sandeep Barhanpure. All Rights Reserved.
# Proprietary software — see LICENSE for terms.

"""SBC Retriever — FAISS/RAG with deterministic fallback."""

from __future__ import annotations
from pathlib import Path

try:
    from langchain_community.vectorstores import FAISS
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_text_splitters import MarkdownHeaderTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False


class SBCRetriever:
    """Retrieves SBC sections — uses FAISS/LangChain when available,
    falls back to deterministic header matching."""

    def __init__(self, sbc_path: Path, vectorstore_dir: Path | None = None):
        self.sbc_text = sbc_path.read_text(encoding="utf-8")
        self.sections = self._parse_sections()
        self.vectorstore = None
        self._vectorstore_dir = vectorstore_dir or sbc_path.parent / "vectorstore"
        self._build_vectorstore()

    def _parse_sections(self) -> dict[str, str]:
        sections: dict[str, str] = {}
        current_header = ""
        current_body: list[str] = []
        for line in self.sbc_text.splitlines():
            if line.startswith("## "):
                if current_header:
                    sections[current_header] = "\n".join(current_body).strip()
                current_header = line.lstrip("# ").strip()
                current_body = []
            elif current_header:
                current_body.append(line)
        if current_header:
            sections[current_header] = "\n".join(current_body).strip()
        return sections

    def _build_vectorstore(self):
        if not LANGCHAIN_AVAILABLE:
            return
        try:
            if self._vectorstore_dir.exists():
                embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
                self.vectorstore = FAISS.load_local(
                    str(self._vectorstore_dir), embeddings,
                    allow_dangerous_deserialization=True,
                )
                return
            splitter = MarkdownHeaderTextSplitter(
                headers_to_split_on=[("##", "Section")],
            )
            docs = splitter.split_text(self.sbc_text)
            if not docs:
                return
            texts = [d.page_content for d in docs]
            metadatas = [d.metadata for d in docs]
            embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            self.vectorstore = FAISS.from_texts(texts, embeddings, metadatas=metadatas)
            self._vectorstore_dir.mkdir(parents=True, exist_ok=True)
            self.vectorstore.save_local(str(self._vectorstore_dir))
        except Exception:
            self.vectorstore = None

    def retrieve(self, section_name: str) -> tuple[str, bool]:
        """Return (text, used_rag). Tries RAG first, then deterministic."""
        if self.vectorstore is not None:
            try:
                results = self.vectorstore.similarity_search(section_name, k=2)
                for doc in results:
                    header = doc.metadata.get("Section", "")
                    if header.lower() == section_name.lower():
                        return doc.page_content.strip(), True
                if results:
                    return results[0].page_content.strip(), True
            except Exception:
                pass

        # Deterministic fallback
        for header, body in self.sections.items():
            if header.lower() == section_name.lower():
                return body, False
        for header, body in self.sections.items():
            if section_name.lower() in header.lower() or header.lower() in section_name.lower():
                return body, False
        return "", False
