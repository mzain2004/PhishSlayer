const ORG_SCOPED_TABLES = new Set([
  "alerts",
  "incidents",
  "iocs",
  "reports",
  "halo_proposals",
  "org_integrations",
]);

function normalizePath(filePath) {
  return filePath.replace(/\\\\/g, "/");
}

function isApiTsFile(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.includes("/app/api/") && normalized.endsWith(".ts");
}

function findChainSegment(sourceText, fromIndex) {
  const maxLength = 5000;
  return sourceText.slice(fromIndex, fromIndex + maxLength);
}

function hasOrgEqFilter(segmentText) {
  return /\.eq\(\s*["'`](org_id|organization_id)["'`]/.test(segmentText);
}

function hasOrgFieldInWrite(segmentText) {
  return /\b(org_id|organization_id)\s*:/.test(segmentText);
}

module.exports = {
  "require-auth-check": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Require await auth() in first 20 lines of app/api TypeScript files",
      },
      schema: [],
    },
    create(context) {
      const filePath = context.getFilename();
      if (!isApiTsFile(filePath)) {
        return {};
      }

      return {
        Program(node) {
          const sourceText = context.getSourceCode().text;
          const first20Lines = sourceText
            .split(/\r?\n/)
            .slice(0, 20)
            .join("\n");
          if (!first20Lines.includes("await auth()")) {
            context.report({
              node,
              loc: { line: 1, column: 0 },
              message:
                "Missing required auth check: add `await auth()` within the first 20 lines.",
            });
          }
        },
      };
    },
  },

  "require-org-scope": {
    meta: {
      type: "problem",
      docs: {
        description:
          "Require .eq('org_id', ...) in Supabase chains querying org-scoped tables",
      },
      schema: [],
    },
    create(context) {
      const sourceCode = context.getSourceCode();
      const sourceText = sourceCode.text;
      const fromRegex = /\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/g;

      return {
        Program(node) {
          let match;
          while ((match = fromRegex.exec(sourceText)) !== null) {
            const table = match[1];
            if (!ORG_SCOPED_TABLES.has(table)) {
              continue;
            }

            const chainStart = match.index;
            const segment = findChainSegment(sourceText, chainStart);
            const isWriteChain = /\.(insert|upsert)\(/.test(segment);
            const hasOrgScope = isWriteChain
              ? hasOrgFieldInWrite(segment)
              : hasOrgEqFilter(segment);

            if (!hasOrgScope) {
              const loc = sourceCode.getLocFromIndex(chainStart);
              context.report({
                node,
                loc,
                message:
                  "Supabase chain on '{{table}}' must include org scope (.eq('org_id'|'organization_id', ...) for reads/updates or org_id field in writes).",
                data: { table },
              });
            }
          }
        },
      };
    },
  },
};
