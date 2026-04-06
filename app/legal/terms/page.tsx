export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0d1117]">
      <div className="border-b border-white/10 px-6 py-4">
        <a href="/" className="text-[#2dd4bf] text-sm hover:underline">
          â† Back to Phish-Slayer
        </a>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#e6edf3] mb-2">Terms of Service</h1>
        <p className="text-[#8b949e] text-sm mb-10">Last updated: March 19, 2026 Â· Effective immediately</p>

        <div className="space-y-8">
          {[
            {
              title: '1. Acceptance of Terms',
              content: 'By accessing or using Phish-Slayer ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users including free Recon tier users and paid subscribers.'
            },
            {
              title: '2. Permitted Use',
              content: 'You may use Phish-Slayer only to scan and monitor systems and networks that you own or have explicit written authorization to test. Using this service to scan systems without authorization is strictly prohibited and may violate computer fraud laws in your jurisdiction.'
            },
            {
              title: '3. Prohibited Activities',
              content: 'You must not: use the service to scan systems you do not own; attempt to reverse-engineer the EDR agent or platform; abuse the API to conduct denial-of-service attacks; share your account credentials; use the platform for any illegal purpose; attempt to extract or scrape our threat intelligence database.'
            },
            {
              title: '4. Service Tiers',
              content: 'The Recon tier is free with usage limits (10 scans/day). SOC Pro and Command & Control tiers are paid subscriptions â€” currently in waitlist mode pending payment processor approval. Tier limits are enforced technically and may change with notice.'
            },
            {
              title: '5. Disclaimer of Warranties',
              content: 'The service is provided "as is" and "as available" without warranty of any kind, express or implied. We do not guarantee that the service will be error-free, uninterrupted, or that scan results will be 100% accurate. Threat intelligence data is provided for informational purposes only.'
            },
            {
              title: '6. Limitation of Liability',
              content: 'To the maximum extent permitted by law, Phish-Slayer and MinionCore shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, revenue, or business arising from your use of the service.'
            },
            {
              title: '7. Data & Privacy',
              content: 'Your use of the service is also governed by our Privacy Policy. By using the service you consent to the collection and use of information as described therein.'
            },
            {
              title: '8. Intellectual Property',
              content: 'All code, design, algorithms, and threat intelligence logic in the Phish-Slayer platform is the intellectual property of MinionCore. You may not copy, modify, distribute, or create derivative works without written permission.'
            },
            {
              title: '9. Termination',
              content: 'We reserve the right to suspend or terminate your account at any time for violation of these terms, abuse of the service, or non-payment. You may cancel your account at any time from your dashboard settings.'
            },
            {
              title: '10. Refund Policy',
              content: 'All paid subscription fees are non-refundable except where required by law. If you believe you were charged in error, contact support@phishslayer.tech within 14 days.'
            },
            {
              title: '11. Changes to Terms',
              content: 'We may update these terms at any time. Material changes will be communicated via email to registered users. Continued use after the effective date constitutes acceptance of the new terms.'
            },
            {
              title: '12. Governing Law',
              content: 'These terms are governed by the laws of Pakistan. Any disputes shall be resolved through good-faith negotiation. Contact: support@phishslayer.tech â€” Phish-Slayer / MinionCore, Bahawalpur, Punjab, Pakistan.'
            },
          ].map((section) => (
            <div key={section.title} className="liquid-glass rounded-xl p-6">
              <h2 className="text-[#e6edf3] font-semibold text-base mb-3">{section.title}</h2>
              <p className="text-[#8b949e] text-sm leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

