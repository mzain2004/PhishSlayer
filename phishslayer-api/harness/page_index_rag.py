
"""
page_index_rag.py — C extension in ETCSLV context manager.
Builds a DocumentTree from threat intel PDFs.
Heading-segmented nodes. Query returns relevant sections only.
Decepticon pattern: skill frontmatter injected into system prompt.
"""

import pdfplumber
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from utils.safe_path import safe_path


@dataclass
class DocumentNode:
    """Single heading-segmented section of a threat intel document."""
    heading: str
    content: str
    page_number: int
    source: str
    mitre_techniques: list[str]


class DocumentTree:
    """
    Parses threat intel PDFs into heading-segmented nodes.
    Query by MITRE technique or keyword — returns relevant sections.
    No vector DB needed — pure text matching for Phase 5.
    Phase 6 will add embeddings if needed.
    """

    def __init__(self):
        self._nodes: list[DocumentNode] = []

    def load_pdf(self, path: str) -> int:
        """
        Load PDF, extract text, split by headings.
        Returns number of nodes extracted.
        Never raises — logs and returns 0 on failure.
        """
        try:
            safe_file = safe_path(path, directory="rag_docs")
            source = safe_file.name
            with pdfplumber.open(safe_file) as pdf:
                full_text = ""
                page_map = {}
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    page_map[len(full_text)] = i + 1
                    full_text += text + "\n"

            nodes = self._split_by_headings(full_text, source, page_map)
            self._nodes.extend(nodes)
            return len(nodes)
        except Exception as e:
            print(f"PageIndexRAG: failed to load {path}: {e}")
            return 0

    def query(self, mitre_techniques: list[str] = None,
              keywords: list[str] = None, top_k: int = 3) -> list[DocumentNode]:
        """
        Query nodes by MITRE technique or keyword.
        Returns top_k most relevant nodes.
        """
        if not self._nodes:
            return []

        scored = []
        search_terms = []
        if mitre_techniques:
            search_terms.extend([t.upper() for t in mitre_techniques])
        if keywords:
            search_terms.extend([k.lower() for k in keywords])

        for node in self._nodes:
            score = 0
            text_lower = (node.heading + node.content).lower()
            for term in search_terms:
                if term.lower() in text_lower:
                    score += 1
                if term.upper() in node.mitre_techniques:
                    score += 3
            if score > 0:
                scored.append((score, node))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [n for _, n in scored[:top_k]]

    def _split_by_headings(self, text: str, source: str,
                           page_map: dict) -> list[DocumentNode]:
        """Split full text into heading-segmented nodes."""
        heading_pattern = re.compile(
            r'^(?:\d+\.?\s+)?([A-Z][A-Za-z\s]{3,50})$', re.MULTILINE
        )
        mitre_pattern = re.compile(r'T\d{4}(?:\.\d{3})?')

        matches = list(heading_pattern.finditer(text))
        nodes = []
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            content = text[start:end].strip()
            if len(content) < 50:
                continue
            techniques = list(set(mitre_pattern.findall(content)))
            page = 1
            for pos, pg in sorted(page_map.items()):
                if pos <= start:
                    page = pg
            nodes.append(DocumentNode(
                heading=match.group(1).strip(),
                content=content[:500],
                page_number=page,
                source=source,
                mitre_techniques=techniques,
            ))
        return nodes

    @property
    def node_count(self) -> int:
        return len(self._nodes)
