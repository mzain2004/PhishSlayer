"""
hybrid_rag.py — Hybrid sparse+dense RAG adapter.

Ruflo source: plugins/ruflo-rag-memory/skills/memory-search/SKILL.md
Pattern: hybrid (sparse + dense) retrieval with RRF fusion, recency weighting,
         MMR diversity reranking.

PhishSlayer mapping:
  Wraps existing DocumentTree (page_index_rag.py) — NO replacement.
  Adds TF-IDF sparse scoring + cosine dense scoring + RRF fusion.
  No external dependencies beyond stdlib + existing DocumentTree.

Usage:
    from memory.rag.hybrid_rag import HybridRAGAdapter
    from harness.page_index_rag import DocumentTree

    tree = DocumentTree()
    tree.load_pdf("intel/mitre-attack.pdf")

    adapter = HybridRAGAdapter(tree)
    results = adapter.query("lateral movement T1021 SSH", top_k=5)
"""
from __future__ import annotations

import math
import re
from collections import Counter
from typing import Optional

from harness.page_index_rag import DocumentTree


class HybridRAGAdapter:
    """
    Ruflo memory-search hybrid retrieval adapted for PhishSlayer's DocumentTree.

    Retrieval strategy (RRF fusion, matches ruflo memory-search pattern):
      sparse_score = TF-IDF cosine similarity
      dense_score  = keyword overlap cosine (proxy — no embedding model required)
      final_score  = sparse * 0.4 + dense * 0.6

    Call build_index() after loading all PDFs, then query() as needed.
    Index is rebuilt automatically on first query if not yet built.
    """

    def __init__(self, doc_tree: DocumentTree):
        self._tree = doc_tree
        self._idf: dict[str, float] = {}
        self._tf_matrix: list[dict[str, float]] = []
        self._built = False

    def build_index(self) -> int:
        """
        Build TF-IDF index from loaded DocumentTree nodes.
        Returns number of nodes indexed.
        """
        nodes = self._tree._nodes
        if not nodes:
            self._built = True
            return 0

        df: Counter = Counter()
        tf_docs: list[dict[str, float]] = []

        for node in nodes:
            tokens = self._tokenize(node.heading + " " + node.content)
            tf = Counter(tokens)
            total = sum(tf.values()) or 1
            tf_docs.append({t: c / total for t, c in tf.items()})
            for token in set(tokens):
                df[token] += 1

        n = len(nodes)
        self._idf = {t: math.log((n + 1) / (c + 1)) + 1.0 for t, c in df.items()}
        self._tf_matrix = tf_docs
        self._built = True
        return n

    def query(
        self,
        query: str,
        top_k: int = 5,
        mitre_filter: Optional[list[str]] = None,
        mmr_lambda: float = 0.7,
    ) -> list[dict]:
        """
        Hybrid query with RRF fusion and MMR diversity reranking.

        Args:
            query:       free-text or MITRE technique string
            top_k:       max results to return
            mitre_filter: if set, only return nodes mentioning these techniques
            mmr_lambda:  relevance weight for MMR (0=diversity, 1=relevance)

        Returns:
            list of dicts: heading, content (truncated), source, page_number,
                           mitre_techniques, score
        """
        if not self._built:
            self.build_index()

        nodes = self._tree._nodes
        if not nodes:
            return []

        q_tokens = self._tokenize(query)
        if not q_tokens:
            return []

        q_tf = Counter(q_tokens)
        q_total = sum(q_tf.values()) or 1
        q_vec = {t: (c / q_total) * self._idf.get(t, 1.0) for t, c in q_tf.items()}
        q_set = set(q_tokens)

        candidates: list[tuple[float, int]] = []
        for i, node in enumerate(nodes):
            if mitre_filter and not any(m in node.mitre_techniques for m in mitre_filter):
                continue

            # Sparse: TF-IDF cosine
            doc_vec = {t: tf * self._idf.get(t, 1.0)
                       for t, tf in self._tf_matrix[i].items()}
            sparse = self._cosine(q_vec, doc_vec)

            # Dense: keyword overlap cosine (no embedding model needed)
            d_set = set(self._tokenize(node.heading + " " + node.content))
            denom = math.sqrt(len(q_set) * len(d_set)) + 1e-9
            dense = len(q_set & d_set) / denom

            # RRF fusion (matches ruflo sparse*0.4 + dense*0.6)
            score = sparse * 0.4 + dense * 0.6
            candidates.append((score, i))

        if not candidates:
            return []

        candidates.sort(reverse=True)

        # MMR diversity reranking
        selected: list[tuple[float, int]] = []
        remaining = list(candidates)

        while remaining and len(selected) < top_k:
            if not selected:
                selected.append(remaining.pop(0))
                continue

            best_idx = 0
            best_score = float("-inf")
            sel_vecs = [
                {t: tf * self._idf.get(t, 1.0) for t, tf in self._tf_matrix[i].items()}
                for _, i in selected
            ]

            for r_pos, (score, idx) in enumerate(remaining):
                doc_vec = {t: tf * self._idf.get(t, 1.0)
                           for t, tf in self._tf_matrix[idx].items()}
                max_sim = max(self._cosine(doc_vec, sv) for sv in sel_vecs)
                mmr_score = mmr_lambda * score - (1 - mmr_lambda) * max_sim
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = r_pos

            selected.append(remaining.pop(best_idx))

        return [
            {
                "heading": nodes[i].heading,
                "content": nodes[i].content[:500],
                "source": nodes[i].source,
                "page_number": nodes[i].page_number,
                "mitre_techniques": nodes[i].mitre_techniques,
                "score": round(score, 4),
            }
            for score, i in selected
        ]

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return re.findall(r"[a-z0-9]+", text.lower())

    @staticmethod
    def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
        dot = sum(a.get(t, 0.0) * v for t, v in b.items())
        mag_a = math.sqrt(sum(v * v for v in a.values()))
        mag_b = math.sqrt(sum(v * v for v in b.values()))
        return dot / (mag_a * mag_b + 1e-9)
