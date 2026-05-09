"""
Page Index RAG — parent-child retrieval over Supabase pgvector.

Parent chunks: 2000 chars (page-level context returned to LLM)
Child chunks:  400 chars  (fine-grained vectors for similarity search)

Table: document_chunks
Columns: id, org_id, parent_id, content, embedding (vector), chunk_type (parent|child)

query() returns parent content for the top_k most similar child chunks.
"""
from __future__ import annotations

import os
from typing import Any

from langchain_text_splitters import RecursiveCharacterTextSplitter
from supabase import create_client, Client


def _supabase() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL", ""),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    )


_parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=100)
_child_splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=40)


class PageIndexRAG:
    """
    Retriever backed by Supabase pgvector `document_chunks` table.
    Requires `match_document_chunks` RPC on the database.
    """

    def __init__(self) -> None:
        self._db = _supabase()

    def query(self, query_str: str, org_id: str, top_k: int = 5) -> list[dict]:
        """
        Embed query_str, find top_k child chunks via pgvector similarity,
        then return their parent content for full context.
        Returns empty list on any failure.
        """
        try:
            embedding = self._embed(query_str)
            result = self._db.rpc(
                "match_document_chunks",
                {
                    "query_embedding": embedding,
                    "match_count": top_k,
                    "p_org_id": org_id,
                    "chunk_type": "child",
                },
            ).execute()
            chunks = result.data or []
            parent_ids = list({c["parent_id"] for c in chunks if c.get("parent_id")})
            if not parent_ids:
                return []
            parents = (
                self._db.table("document_chunks")
                .select("id, content")
                .in_("id", parent_ids)
                .execute()
            )
            return parents.data or []
        except Exception:
            return []

    def index_document(self, text: str, org_id: str, metadata: dict | None = None) -> int:
        """
        Split text into parent/child chunks and upsert into document_chunks.
        Returns number of child chunks indexed.
        """
        parent_chunks = _parent_splitter.split_text(text)
        indexed = 0
        for parent_text in parent_chunks:
            parent_row = (
                self._db.table("document_chunks")
                .insert({"org_id": org_id, "content": parent_text, "chunk_type": "parent", **(metadata or {})})
                .execute()
            )
            parent_id = (parent_row.data or [{}])[0].get("id")
            if not parent_id:
                continue
            for child_text in _child_splitter.split_text(parent_text):
                embedding = self._embed(child_text)
                self._db.table("document_chunks").insert({
                    "org_id": org_id,
                    "parent_id": parent_id,
                    "content": child_text,
                    "chunk_type": "child",
                    "embedding": embedding,
                }).execute()
                indexed += 1
        return indexed

    @staticmethod
    def _embed(text: str) -> list[float]:
        """
        Generate embedding via Supabase edge function or a local model.
        Falls back to zero vector (1536-dim) so the pipeline never hard-fails.
        """
        try:
            import httpx
            url = f"{os.getenv('SUPABASE_URL', '')}/functions/v1/embed"
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
            resp = httpx.post(
                url,
                json={"input": text[:8000]},
                headers={"Authorization": f"Bearer {key}"},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()["embedding"]
        except Exception:
            return [0.0] * 1536
