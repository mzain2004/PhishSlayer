import Link from "next/link";

export const metadata = {
  title: "API Docs | Phish-Slayer",
  description: "Public REST API documentation for Phish-Slayer.",
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-3">Phish-Slayer Public API</h1>
        <p className="text-[#8B949E] mb-10">
          Use the public scan endpoint with an active API key from your
          dashboard.
        </p>

        <section className="liquid-glass rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Endpoint</h2>
          <p className="text-[#8B949E] mb-2">GET /api/v1/scan</p>
          <p className="text-[#8B949E]">POST /api/v1/scan</p>
        </section>

        <section className="liquid-glass rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
          <p className="text-[#8B949E] mb-2">
            Send your API key in the header:
          </p>
          <pre className="bg-[#0D1117] border border-white/10 rounded-xl p-4 text-sm overflow-x-auto">
            {`x-api-key: your_api_key_here`}
          </pre>
        </section>

        <section className="liquid-glass rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Request Format</h2>
          <p className="text-[#8B949E] mb-2">GET</p>
          <pre className="bg-[#0D1117] border border-white/10 rounded-xl p-4 text-sm overflow-x-auto mb-4">
            {`GET /api/v1/scan?target=example.com`}
          </pre>
          <p className="text-[#8B949E] mb-2">POST</p>
          <pre className="bg-[#0D1117] border border-white/10 rounded-xl p-4 text-sm overflow-x-auto">
            {`{
  "target": "example.com"
}`}
          </pre>
        </section>

        <section className="liquid-glass rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Response Format</h2>
          <pre className="bg-[#0D1117] border border-white/10 rounded-xl p-4 text-sm overflow-x-auto">
            {`{
  "success": true,
  "data": {
    "target": "example.com",
    "verdict": "clean | malicious",
    "risk_score": 0,
    "threat_category": "string",
    "ai_summary": "string",
    "malicious_count": 0,
    "total_engines": 0,
    "source": "virustotal | proprietary_intel | whitelist",
    "scan_date": "ISO-8601"
  }
}`}
          </pre>
        </section>

        <section className="liquid-glass rounded-2xl p-6 mb-10">
          <h2 className="text-2xl font-semibold mb-4">Rate Limits</h2>
          <ul className="space-y-2 text-[#8B949E]">
            <li>Recon: API access locked</li>
            <li>SOC Pro: 1,000 requests/day</li>
            <li>Command & Control: Unlimited</li>
          </ul>
        </section>

        <Link
          href="/dashboard/apikeys"
          className="inline-flex items-center bg-[#2DD4BF] text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
        >
          Manage API Keys
        </Link>
      </div>
    </div>
  );
}

