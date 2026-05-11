"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type Token = { type: string; value: string };
type Pattern = { type: string; regex: RegExp };

function getPatterns(lang: string): Pattern[] {
  switch (lang) {
    case "bash": case "sh": case "shell":
      return [
        { type: "comment", regex: /#[^\n]*/ },
        { type: "string", regex: /"(?:[^"\\]|\\.)*"/ },
        { type: "string", regex: /'[^']*'/ },
        { type: "variable", regex: /\$\{?[\w]+\}?/ },
        { type: "flag", regex: /--[\w-]+/ },
        { type: "flag", regex: /-[a-zA-Z]\b/ },
        { type: "keyword", regex: /\b(?:curl|export|echo|npm|npx|git|sudo|chmod|chown|cat|grep|sed|cd|ls|mkdir|cp|mv|rm|wget|apt|apt-get|yum|systemctl|service|docker|node|python3|python|pip|pip3|source|bash|zsh|env|which)\b/ },
        { type: "number", regex: /\b\d+\b/ },
      ];
    case "json":
      return [
        { type: "key", regex: /"(?:[^"\\]|\\.)*"(?=\s*:)/ },
        { type: "string", regex: /"(?:[^"\\]|\\.)*"/ },
        { type: "keyword", regex: /\b(?:true|false|null)\b/ },
        { type: "number", regex: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/ },
      ];
    case "js": case "javascript": case "ts": case "typescript": case "tsx": case "jsx":
      return [
        { type: "comment", regex: /\/\/[^\n]*/ },
        { type: "comment", regex: /\/\*[\s\S]*?\*\// },
        { type: "string", regex: /`(?:[^`\\]|\\.)*`/ },
        { type: "string", regex: /"(?:[^"\\]|\\.)*"/ },
        { type: "string", regex: /'(?:[^'\\]|\\.)*'/ },
        { type: "keyword", regex: /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|class|extends|new|this|async|await|try|catch|finally|throw|typeof|instanceof|null|undefined|true|false|interface|type|enum|readonly|public|private|protected|static)\b/ },
        { type: "number", regex: /\b\d+\.?\d*\b/ },
      ];
    case "python": case "py":
      return [
        { type: "comment", regex: /#[^\n]*/ },
        { type: "string", regex: /"""[\s\S]*?"""/ },
        { type: "string", regex: /'''[\s\S]*?'''/ },
        { type: "string", regex: /"(?:[^"\\]|\\.)*"/ },
        { type: "string", regex: /'(?:[^'\\]|\\.)*'/ },
        { type: "keyword", regex: /\b(?:def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|in|not|and|or|is|None|True|False|pass|break|continue|raise|lambda|yield|async|await|global|nonlocal|print)\b/ },
        { type: "number", regex: /\b\d+\.?\d*\b/ },
      ];
    case "yaml": case "yml":
      return [
        { type: "comment", regex: /#[^\n]*/ },
        { type: "string", regex: /"(?:[^"\\]|\\.)*"/ },
        { type: "string", regex: /'[^']*'/ },
        { type: "keyword", regex: /\b(?:true|false|null|yes|no)\b/ },
        { type: "number", regex: /\b\d+\.?\d*\b/ },
        { type: "key", regex: /\b[\w-]+(?=\s*:)/ },
      ];
    default:
      return [
        { type: "comment", regex: /#[^\n]*/ },
        { type: "string", regex: /"(?:[^"\\]|\\.)*"/ },
        { type: "string", regex: /'[^']*'/ },
        { type: "number", regex: /\b\d+\b/ },
      ];
  }
}

function tokenize(code: string, lang: string): Token[] {
  const patterns = getPatterns(lang);
  try {
    const combined = new RegExp(patterns.map((p) => `(${p.regex.source})`).join("|"), "g");
    const tokens: Token[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    combined.lastIndex = 0;
    while ((match = combined.exec(code)) !== null) {
      if (match.index > lastIndex) tokens.push({ type: "plain", value: code.slice(lastIndex, match.index) });
      let type = "plain";
      for (let i = 1; i < match.length; i++) {
        if (match[i] !== undefined) { type = patterns[i - 1]?.type ?? "plain"; break; }
      }
      tokens.push({ type, value: match[0] });
      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) combined.lastIndex++;
    }
    if (lastIndex < code.length) tokens.push({ type: "plain", value: code.slice(lastIndex) });
    return tokens;
  } catch {
    return [{ type: "plain", value: code }];
  }
}

const TOKEN_STYLES: Record<string, React.CSSProperties> = {
  comment:  { color: "#5C6270", fontStyle: "italic" },
  string:   { color: "#10B981" },
  keyword:  { color: "#9175FF", fontWeight: 600 },
  flag:     { color: "#7C5CFF" },
  number:   { color: "#F97316" },
  key:      { color: "#60A5FA" },
  variable: { color: "#F97316" },
  plain:    { color: "#CBD5E0" },
};

export default function CodeBlock({ code, lang = "bash", filename }: { code: string; lang?: string; filename?: string }) {
  const [copied, setCopied] = useState(false);
  const trimmed = code.trim();
  const tokens = tokenize(trimmed, lang);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(trimmed); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div style={{ borderRadius: 8, border: "1px solid var(--bg-border)", overflow: "hidden", margin: "16px 0" }}>
      {filename && (
        <div style={{ background: "var(--bg-elevated)", padding: "6px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)", borderBottom: "1px solid var(--bg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{filename}</span>
          <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{lang}</span>
        </div>
      )}
      <div style={{ position: "relative", background: "var(--bg-surface)" }}>
        <pre style={{ padding: "16px 56px 16px 20px", overflowX: "auto", margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: "1.65" }}>
          <code>
            {tokens.map((t, i) => (
              <span key={i} style={TOKEN_STYLES[t.type] ?? TOKEN_STYLES.plain}>{t.value}</span>
            ))}
          </code>
        </pre>
        <button onClick={handleCopy} aria-label="Copy code" style={{ position: "absolute", top: 10, right: 10, background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: copied ? "#10B981" : "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4, fontSize: 12, transition: "color 0.2s", whiteSpace: "nowrap" }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
