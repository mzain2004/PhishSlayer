export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0d1117]">
      <div className="border-b border-white/10 px-6 py-4">
        <a href="/" className="text-[#2dd4bf] text-sm hover:underline">
          â† Back to Phish-Slayer
        </a>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#e6edf3] mb-2">Privacy Policy</h1>
        <p className="text-[#8b949e] text-sm mb-10">Last updated: March 19, 2026</p>

        <div className="space-y-8">
          {[
            {
              title: '1. Who We Are',
              content: 'Phish-Slayer ("we", "us", "our") is an enterprise cybersecurity SaaS platform operated by MinionCore, based in Bahawalpur, Punjab, Pakistan. Contact: support@phishslayer.tech'
            },
            {
              title: '2. What Information We Collect',
              content: 'We collect: (a) Account information â€” email address, name, job title when you register. (b) Endpoint telemetry â€” IP addresses, process names, hostnames, and network connection data collected by the EDR agent you install on systems you own. (c) Payment information â€” handled entirely by our payment processor; we never store card numbers. (d) Usage data â€” scan targets, scan results, and threat intelligence data you submit.'
            },
            {
              title: '3. How We Use Your Information',
              content: 'We use your data to: provide and improve our threat intelligence services; authenticate your account; send security alerts and product updates with your consent; comply with legal obligations. We never sell your personal data to third parties.'
            },
            {
              title: '4. Data Storage & Security',
              content: 'All data is stored in Supabase (PostgreSQL) hosted on Microsoft Azure infrastructure. Data is encrypted at rest and in transit using TLS 1.2+. Row Level Security (RLS) policies ensure users can only access their own data. We implement HTTP security headers, input sanitization, and rate limiting across all endpoints.'
            },
            {
              title: '5. EDR Agent Data',
              content: 'The Phish-Slayer EDR agent collects: running process names and PIDs, outbound network connections (remote IP and port), file system change events in monitored directories, and hostname and operating system information. This data is transmitted encrypted to our servers and used solely for threat detection. You control which endpoints run the agent.'
            },
            {
              title: '6. Cookies & Tracking',
              content: 'We use essential cookies for authentication (Supabase session tokens). We use Termly for consent management. You can manage your cookie preferences at any time using the Consent Preferences link in our footer. We do not use advertising cookies or sell tracking data.'
            },
            {
              title: '7. Data Retention',
              content: 'We retain your account data for as long as your account is active. Scan results and incident data are retained for the duration of your subscription. You may request deletion of all your data at any time by contacting support@phishslayer.tech.'
            },
            {
              title: '8. Your Rights (GDPR / CCPA)',
              content: 'Depending on your location, you have the right to: access your personal data; correct inaccurate data; request deletion ("right to be forgotten"); data portability; withdraw consent at any time. To exercise these rights, submit a request at: https://app.termly.io/dsar/830853a6-ef0c-4574-af45-fcb5e787fa37 or email support@phishslayer.tech.'
            },
            {
              title: '9. Third-Party Services',
              content: 'We use: Supabase (database and auth), Microsoft Azure (hosting), Google Gemini AI (threat analysis), VirusTotal (threat intelligence), Discord (alert webhooks), Termly (consent management). Each provider operates under their own privacy policy.'
            },
            {
              title: '10. Children\'s Privacy',
              content: 'Our services are not directed at children under 18. We do not knowingly collect data from minors. If you believe a minor has provided us data, contact support@phishslayer.tech immediately.'
            },
            {
              title: '11. Changes to This Policy',
              content: 'We may update this Privacy Policy periodically. We will notify registered users of material changes via email. Continued use of the service after changes constitutes acceptance.'
            },
            {
              title: '12. Contact Us',
              content: 'Phish-Slayer / MinionCore â€” Bahawalpur, Punjab, Pakistan. Email: support@phishslayer.tech'
            },
          ].map((section) => (
            <div key={section.title} className="liquid-glass rounded-xl p-6">
              <h2 className="text-[#e6edf3] font-semibold text-base mb-3">{section.title}</h2>
              <p className="text-[#8b949e] text-sm leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-white/10">
          <a
            href="https://app.termly.io/dsar/830853a6-ef0c-4574-af45-fcb5e787fa37"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2dd4bf] text-sm hover:underline"
          >
            Submit a Data Subject Access Request â†’
          </a>
        </div>
      </div>
    </main>
  )
}

