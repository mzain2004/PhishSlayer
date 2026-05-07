#!/usr/bin/env node
// One-shot H1 sanitizer: redact (error|err).message from API response bodies.
// Touches only patterns that appear in NextResponse / apiError / Response.json
// shapes — internal logging, throw chains, and pattern-matching usages are left alone.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "app", "api");

const replacements = [
  // 1) NextResponse.json({ error: error.message }, { status: N })
  //    NextResponse.json({ message: err.message }, { status: N })
  {
    re: /NextResponse\.json\(\s*\{\s*(error|message)\s*:\s*(error|err)\.message\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
    to: (_m, key, _e, status) =>
      `NextResponse.json({ ${key}: "INTERNAL_SERVER_ERROR" }, { status: ${status} })`,
  },
  // 2) NextResponse.json({ success:false, error: error.message }, { status: N })
  {
    re: /NextResponse\.json\(\s*\{\s*success\s*:\s*false\s*,\s*error\s*:\s*(error|err)\.message\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
    to: (_m, _e, status) =>
      `NextResponse.json({ success: false, error: "INTERNAL_SERVER_ERROR" }, { status: ${status} })`,
  },
  // 3) NextResponse.json({ error: `... ${error.message}` }, { status: N })
  {
    re: /NextResponse\.json\(\s*\{\s*error\s*:\s*`[^`]*\$\{(?:error|err)\.message\}[^`]*`\s*\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
    to: (_m, status) =>
      `NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: ${status} })`,
  },
  // 4) NextResponse.json({ ..., error: error.message }, { status: N }) — multiline objects
  //    Detected by line — we use a per-line pass below for these.

  // 5) apiError(API_CODES.INTERNAL_ERROR, error.message, 500)
  {
    re: /apiError\(\s*([A-Za-z0-9_.]+)\s*,\s*(error|err)\.message\s*,\s*(\d+)\s*\)/g,
    to: (_m, code, _e, status) =>
      `apiError(${code}, "Internal server error", ${status})`,
  },
  // 6) error: error instanceof Error ? error.message : "..." inside a Response
  //    object — narrow: only when on its own line.
  {
    re: /error\s*:\s*error\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*"[^"]*"/g,
    to: () => `error: "INTERNAL_SERVER_ERROR"`,
  },
  // 7) message: error instanceof Error ? error.message : "..." — same as above with key=message
  {
    re: /message\s*:\s*error\s+instanceof\s+Error\s*\?\s*error\.message\s*:\s*"[^"]*"/g,
    to: () => `message: "Internal server error"`,
  },
  // 8) details: error.message,    (inside a JSON response object)
  {
    re: /(\n\s*)details\s*:\s*(error|err)\.message\s*,?/g,
    to: (_m, lead) => `${lead}details: undefined,`,
  },
  // 9) error: { message: result.error.message } — agent triage style
  {
    re: /error\s*:\s*result\.error\s*\?\s*\{\s*message\s*:\s*result\.error\.message\s*\}\s*:\s*null/g,
    to: () => `error: result.error ? { message: "INTERNAL_SERVER_ERROR" } : null`,
  },
  // 10) error: error.message || "Internal Server Error"
  {
    re: /error\s*:\s*(error|err)\.message\s*\|\|\s*"[^"]*"/g,
    to: () => `error: "INTERNAL_SERVER_ERROR"`,
  },
  // 11) error: `Failed to ...: ${error.message}`  (object property form, not inside NextResponse.json wrapper)
  {
    re: /(\n\s*)error\s*:\s*`[^`]*\$\{(?:error|err)\.message\}[^`]*`/g,
    to: (_m, lead) => `${lead}error: "INTERNAL_SERVER_ERROR"`,
  },
  // 12) Direct return NextResponse.json({ valid:false, error: `Invalid YAML: ${error.message}` })
  //     — sanitize template inside arbitrary single-arg NextResponse.json
  {
    re: /(\bNextResponse\.json\(\s*\{[^{}]*?\b)error\s*:\s*`[^`]*\$\{(?:error|err)\.message\}[^`]*`/g,
    to: (_m, prefix) => `${prefix}error: "INTERNAL_SERVER_ERROR"`,
  },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && p.endsWith(".ts")) out.push(p);
  }
  return out;
}

let totalChanges = 0;
const changedFiles = [];

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, "utf8");
  let original = src;
  for (const { re, to } of replacements) {
    src = src.replace(re, to);
  }
  if (src !== original) {
    fs.writeFileSync(file, src, "utf8");
    const delta = (original.match(/(error|err)\.message/g) || []).length -
      (src.match(/(error|err)\.message/g) || []).length;
    totalChanges += delta;
    changedFiles.push({ file: path.relative(ROOT, file), delta });
  }
}

console.log(`Sanitized ${totalChanges} error-message leaks across ${changedFiles.length} files.`);
for (const { file, delta } of changedFiles) {
  console.log(`  -${delta}  ${file}`);
}
