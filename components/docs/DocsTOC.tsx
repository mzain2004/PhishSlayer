"use client";

import { useEffect, useState } from "react";

interface Heading { id: string; text: string; level: number }

export default function DocsTOC() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const els = Array.from(document.querySelectorAll("main h2[id], main h3[id]"));
    setHeadings(els.map((el) => ({ id: el.id, text: el.textContent ?? "", level: el.tagName === "H2" ? 2 : 3 })));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-56px 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <div style={{ padding: "24px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-tertiary)", marginBottom: 12 }}>
        On this page
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {headings.map((h) => (
          <li key={h.id} style={{ borderLeft: h.level === 3 ? "1px solid var(--bg-border)" : "none", marginLeft: h.level === 3 ? 8 : 0 }}>
            <a
              href={`#${h.id}`}
              style={{
                display: "block",
                padding: h.level === 2 ? "4px 0" : "3px 0 3px 10px",
                fontSize: h.level === 2 ? 13 : 12,
                color: activeId === h.id ? "var(--accent)" : "var(--text-tertiary)",
                textDecoration: "none",
                lineHeight: "1.4",
                transition: "color 0.15s",
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
