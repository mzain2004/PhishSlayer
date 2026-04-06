"use client";

import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Globe,
  Mail,
  Lock,
  Eye,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DSData = any;

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-7 h-7 animate-spin text-teal-500" />
      <span className="ml-3 text-sm text-[#8B949E] font-medium">
        Running deep scanâ€¦
      </span>
    </div>
  );
}

function Unavailable({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Shield className="w-10 h-10 text-slate-600 mb-3" />
      <p className="text-sm text-[#8B949E]">{label} data unavailable</p>
    </div>
  );
}

function MonoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between items-center py-2 px-4 border-b border-white/10">
      <span className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wide">
        {label}
      </span>
      <span className="font-mono text-xs text-slate-300 text-right max-w-[60%] truncate">
        {value || "â€”"}
      </span>
    </div>
  );
}

function RiskFlagList({ flags }: { flags: string[] }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div className="px-4 py-3 space-y-2">
      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
        Risk Flags
      </span>
      {flags.map((f, i) => (
        <div key={i} className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
          <span className="text-xs text-orange-300">{f}</span>
        </div>
      ))}
    </div>
  );
}

// â”€â”€â”€ WHOIS Panel â”€â”€â”€
export function WhoisPanel({
  data,
  loading,
}: {
  data: DSData;
  loading: boolean;
}) {
  if (loading) return <Spinner />;
  const w = data?.whois;
  if (!w) return <Unavailable label="WHOIS" />;

  let ageBadge = null;
  if (w.creation_date) {
    const created = new Date(w.creation_date);
    const now = new Date();
    const days = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );
    const years = (days / 365).toFixed(1);
    if (days < 90) {
      ageBadge = (
        <span className="text-[10px] font-black text-red-400 bg-red-950 px-2 py-0.5 rounded">
          Newly Registered ({days} days)
        </span>
      );
    } else if (days > 730) {
      ageBadge = (
        <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
          Established Domain ({years} yrs)
        </span>
      );
    } else {
      ageBadge = (
        <span className="text-[10px] font-black text-[#8B949E] bg-white/10 px-2 py-0.5 rounded">
          Age: {years} yrs
        </span>
      );
    }
  }

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-teal-400" />
          <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
            WHOIS Intelligence
          </span>
        </div>
        {ageBadge}
      </div>
      <MonoRow label="Domain" value={w.domain} />
      <MonoRow label="Registrar" value={w.registrar} />
      <MonoRow label="Created" value={w.creation_date} />
      <MonoRow label="Expires" value={w.expiry_date} />
      <MonoRow label="Updated" value={w.updated_date} />
      <MonoRow label="Country" value={w.registrant_country} />
      <div className="px-4 py-2 border-b border-white/10">
        <span className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wide">
          Name Servers
        </span>
        <div className="mt-1 space-y-0.5">
          {w.name_servers?.length > 0 ? (
            w.name_servers.map((ns: string, i: number) => (
              <div key={i} className="font-mono text-xs text-slate-300">
                {ns}
              </div>
            ))
          ) : (
            <span className="font-mono text-xs text-slate-600">â€”</span>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Ghost Mail Panel â”€â”€â”€
export function GhostMailPanel({
  data,
  loading,
}: {
  data: DSData;
  loading: boolean;
}) {
  if (loading) return <Spinner />;
  const d = data?.dns;
  if (!d) return <Unavailable label="Ghost Mail" />;

  const isGhost = d.ghostMailFlag;

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      {/* Status Banner */}
      <div
        className={`px-4 py-4 ${isGhost ? "bg-red-950 border-b border-red-900" : "bg-emerald-950 border-b border-emerald-900"}`}
      >
        <div className="flex items-center gap-3">
          <Mail
            className={`w-6 h-6 ${isGhost ? "text-red-400" : "text-emerald-400"}`}
          />
          <div>
            <h4
              className={`font-black text-sm ${isGhost ? "text-red-300" : "text-emerald-300"}`}
            >
              {isGhost
                ? "ðŸš¨ NO EMAIL INFRASTRUCTURE DETECTED"
                : "âœ“ Mail Infrastructure Present"}
            </h4>
            <p className="text-[11px] text-[#8B949E] mt-0.5">
              {isGhost
                ? "Domain cannot receive email â€” common in disposable phishing domains"
                : "MX records found â€” domain has active mail routing"}
            </p>
          </div>
        </div>
      </div>

      {/* MX Records */}
      <div className="px-4 py-3 border-b border-white/10">
        <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
          MX Records
        </span>
        {d.mxRecords?.length > 0 ? (
          <div className="mt-2 space-y-1">
            {d.mxRecords.map(
              (mx: { exchange: string; priority: number }, i: number) => (
                <div key={i} className="flex justify-between font-mono text-xs">
                  <span className="text-slate-300">{mx.exchange}</span>
                  <span className="text-[#8B949E]">
                    Priority: {mx.priority}
                  </span>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="font-mono text-xs text-slate-600 mt-1">None found</p>
        )}
      </div>

      {/* Email Auth Status */}
      <div className="px-4 py-3 border-b border-white/10">
        <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest mb-2 block">
          Email Authentication
        </span>
        <div className="space-y-2">
          {[
            { label: "SPF", active: d.hasSpf },
            { label: "DKIM", active: d.hasDkim },
            { label: "DMARC", active: d.hasDmarc },
          ].map(({ label, active }) => (
            <div key={label} className="flex items-center gap-2">
              {active ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span
                className={`font-mono text-xs font-bold ${active ? "text-emerald-300" : "text-red-300"}`}
              >
                {label}
              </span>
              <span className="text-[10px] text-[#8B949E]">
                {active ? "Configured" : "Not detected"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <RiskFlagList flags={d.riskFlags} />
    </div>
  );
}

// â”€â”€â”€ SSL Panel â”€â”€â”€
export function SslPanel({
  data,
  loading,
}: {
  data: DSData;
  loading: boolean;
}) {
  if (loading) return <Spinner />;
  const s = data?.ssl;
  if (!s) return <Unavailable label="SSL" />;

  const days = s.daysRemaining;
  const daysColor =
    days === null
      ? "text-[#8B949E]"
      : days > 90
        ? "text-emerald-400"
        : days > 30
          ? "text-orange-400"
          : "text-red-400";
  const daysBg =
    days === null
      ? "bg-white/10"
      : days > 90
        ? "bg-emerald-950"
        : days > 30
          ? "bg-orange-950"
          : "bg-red-950";

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Lock className="w-4 h-4 text-teal-400" />
        <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
          SSL Certificate Profile
        </span>
      </div>
      <MonoRow label="Issuer" value={s.issuer} />
      <MonoRow label="Organization" value={s.issuerOrganization} />
      <MonoRow label="Subject" value={s.subject} />
      <MonoRow label="Valid From" value={s.validFrom} />
      <MonoRow label="Valid To" value={s.validTo} />
      <div className="flex justify-between items-center py-2 px-4 border-b border-white/10">
        <span className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wide">
          Days Remaining
        </span>
        <span
          className={`font-mono text-xs font-black px-2 py-0.5 rounded ${daysColor} ${daysBg}`}
        >
          {days !== null ? `${days} days` : "Unknown"}
        </span>
      </div>
      <div className="px-4 py-2 border-b border-white/10 flex gap-2 flex-wrap">
        {s.isLetsEncrypt && (
          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded">
            Let&apos;s Encrypt
          </span>
        )}
        {s.isSelfSigned && (
          <span className="text-[10px] font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded">
            Self-Signed
          </span>
        )}
        {s.isShortLived && (
          <span className="text-[10px] font-bold text-orange-400 bg-orange-950 px-2 py-0.5 rounded">
            Short-Lived
          </span>
        )}
        {s.valid && (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
            Valid
          </span>
        )}
        {!s.valid && (
          <span className="text-[10px] font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded">
            Invalid
          </span>
        )}
      </div>
      <RiskFlagList flags={s.riskFlags} />
    </div>
  );
}

// â”€â”€â”€ Typosquat Panel â”€â”€â”€
export function TyposquatPanel({
  data,
  loading,
}: {
  data: DSData;
  loading: boolean;
}) {
  if (loading) return <Spinner />;
  const t = data?.typosquat;
  if (!t) return <Unavailable label="Typosquat" />;

  // Character diff visualization
  const renderCharDiff = () => {
    if (!t.isTyposquat || !t.matchedBrand) return null;
    const scanned = (data?.target || "").toLowerCase();
    const brand = t.matchedBrand.toLowerCase();
    const maxLen = Math.max(scanned.length, brand.length);
    return (
      <div className="px-4 py-3 border-b border-white/10">
        <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest block mb-2">
          Character Comparison
        </span>
        <div className="flex gap-0.5 font-mono text-sm mb-1">
          {Array.from({ length: maxLen }).map((_, i) => {
            const c = scanned[i] || " ";
            const match = brand[i] === scanned[i];
            return (
              <span
                key={i}
                className={`px-1 rounded ${match ? "text-slate-300" : "text-red-400 bg-red-950 font-black"}`}
              >
                {c}
              </span>
            );
          })}
        </div>
        <div className="flex gap-0.5 font-mono text-sm">
          {Array.from({ length: maxLen }).map((_, i) => {
            const c = brand[i] || " ";
            const match = brand[i] === scanned[i];
            return (
              <span
                key={i}
                className={`px-1 rounded ${match ? "text-emerald-300" : "text-emerald-400 bg-emerald-950 font-black"}`}
              >
                {c}
              </span>
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-600">Scanned</span>
          <span className="text-[10px] text-slate-600">Brand</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      {t.isTyposquat ? (
        <div className="px-4 py-4 bg-red-950 border-b border-red-900">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-red-400" />
            <div>
              <h4 className="font-black text-sm text-red-300">
                âš  TYPOSQUATTING DETECTED
              </h4>
              <p className="text-[11px] text-red-400 mt-0.5">
                Attempting to impersonate{" "}
                <span className="font-mono font-black">{t.matchedBrand}</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 bg-emerald-950 border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h4 className="font-black text-sm text-emerald-300">
                âœ“ No brand impersonation detected
              </h4>
              <p className="text-[11px] text-[#8B949E] mt-0.5">
                Domain does not closely match any monitored brands
              </p>
            </div>
          </div>
        </div>
      )}

      <MonoRow label="Closest Match" value={t.matchedBrand} />
      <MonoRow
        label="Levenshtein Distance"
        value={t.distance !== null ? String(t.distance) : null}
      />
      <div className="flex justify-between items-center py-2 px-4 border-b border-white/10">
        <span className="text-[11px] font-bold text-[#8B949E] uppercase tracking-wide">
          Homoglyphs
        </span>
        <span
          className={`font-mono text-xs font-bold ${t.homoglyphsDetected ? "text-red-400" : "text-emerald-400"}`}
        >
          {t.homoglyphsDetected ? "Detected" : "None"}
        </span>
      </div>
      {renderCharDiff()}
      <RiskFlagList flags={t.riskFlags} />
    </div>
  );
}

// â”€â”€â”€ DOM Tree Panel â”€â”€â”€
export function DomTreePanel({
  data,
  loading,
}: {
  data: DSData;
  loading: boolean;
}) {
  if (loading) return <Spinner />;
  const d = data?.domTree;
  if (!d) return <Unavailable label="DOM Tree" />;

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <Eye className="w-4 h-4 text-teal-400" />
        <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest">
          DOM Analysis
        </span>
      </div>

      {d.hasLoginForm && (
        <div className="px-4 py-3 bg-red-950 border-b border-red-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs font-black text-red-300">
            Login / Credential Harvesting Form Detected
          </span>
        </div>
      )}

      <MonoRow label="Page Title" value={d.title} />
      <MonoRow label="Meta Description" value={d.metaDescription} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-white/10">
        {[
          { label: "Forms", value: d.formCount },
          { label: "Inputs", value: d.inputCount },
          { label: "Password Fields", value: d.passwordInputCount },
          { label: "External Links", value: d.externalLinks?.length || 0 },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="p-3 text-center border-r border-white/10 last:border-r-0"
          >
            <div className="font-mono text-lg font-black text-slate-200">
              {value}
            </div>
            <div className="text-[10px] text-[#8B949E] uppercase">{label}</div>
          </div>
        ))}
      </div>

      {/* Suspicious Keywords */}
      {d.suspiciousKeywords?.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2">
            Suspicious Keywords
          </span>
          <div className="flex flex-wrap gap-1.5">
            {d.suspiciousKeywords.map((kw: string, i: number) => (
              <span
                key={i}
                className="text-[10px] font-bold text-orange-300 bg-orange-950 px-2 py-0.5 rounded"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      <RiskFlagList flags={d.riskFlags} />

      {/* External Links */}
      {d.externalLinks?.length > 0 && (
        <div className="px-4 py-3">
          <span className="text-[10px] font-black text-[#8B949E] uppercase tracking-widest block mb-2">
            External Links ({d.externalLinks.length})
          </span>
          <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
            {d.externalLinks.slice(0, 50).map((link: string, i: number) => (
              <div
                key={i}
                className="font-mono text-[10px] text-[#8B949E] truncate"
              >
                {link}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

