/**
 * Privacy Policy - Legal Page Component
 * 
 * ⚠️  IMPORTANT: This is a GDPR-compliant template. You MUST have this reviewed 
 * by a lawyer before using in production to ensure compliance with your jurisdiction.
 */

export default function PrivacyPolicy() {
  const lastUpdated = "December 7, 2025";
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last Updated: {lastUpdated}</p>
        
        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              At PairCam ("we", "us", or "our"), we take your privacy seriously. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our anonymous video chat service.
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <p className="text-blue-900 font-semibold mb-2">🔒 Our Privacy Commitment:</p>
              <ul className="list-disc list-inside text-blue-900 space-y-1 ml-4">
                <li>We do NOT record your video or audio conversations</li>
                <li>We collect MINIMAL data necessary for service operation</li>
                <li>We do NOT sell your personal information</li>
                <li>You have FULL control over your data (GDPR rights)</li>
              </ul>
            </div>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">1.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
              <li><strong>Name/Nickname:</strong> Optional display name for conversations</li>
              <li><strong>Age Verification:</strong> Confirmation that you are 18+ years old</li>
              <li><strong>Gender (Optional):</strong> For matching preferences (premium feature)</li>
              <li><strong>Premium Account:</strong> Payment information if you purchase premium (processed by Stripe)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">1.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
              <li><strong>Device Identifier:</strong> Unique identifier for your device (for ban enforcement)</li>
              <li><strong>IP Address:</strong> Temporarily stored for abuse prevention (24-hour retention)</li>
              <li><strong>Browser Information:</strong> Browser type, version, language</li>
              <li><strong>Session Data:</strong> Time, duration, and number of connections (deleted after 30 days)</li>
              <li><strong>Technical Logs:</strong> Error logs, performance metrics (anonymized after 7 days)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 mb-3">1.3 Information We DO NOT Collect</h3>
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
              <ul className="list-disc list-inside text-green-900 space-y-1 ml-4">
                <li>Video or audio recordings of your conversations</li>
                <li>Chat message content (text chat is not stored)</li>
                <li>Your real name, email, or phone number (unless you provide for premium)</li>
                <li>Your exact location or GPS coordinates</li>
                <li>Social media profiles or personal accounts</li>
              </ul>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Service Operation:</strong> Match you with other users, establish P2P connections</li>
              <li><strong>Safety & Security:</strong> Detect and prevent abuse, enforce bans, comply with law enforcement</li>
              <li><strong>Analytics:</strong> Understand usage patterns, improve service quality</li>
              <li><strong>Premium Features:</strong> Process payments, provide gender filtering</li>
              <li><strong>Customer Support:</strong> Respond to your inquiries and issues</li>
              <li><strong>Legal Compliance:</strong> Comply with applicable laws and regulations</li>
            </ul>
          </section>

          {/* Legal Basis (GDPR) */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Legal Basis for Processing (GDPR)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              For users in the European Economic Area (EEA), we process your data based on:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Consent:</strong> You provide explicit consent when using the service</li>
              <li><strong>Contractual Necessity:</strong> Processing is necessary to provide the service</li>
              <li><strong>Legitimate Interests:</strong> Preventing fraud, ensuring security</li>
              <li><strong>Legal Obligations:</strong> Complying with law enforcement requests</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How We Share Your Information</h2>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-4">
              <p className="text-red-900 font-bold mb-2">⚠️  We DO NOT sell your personal information to third parties.</p>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              We may share information with:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Service Providers:</strong> Stripe (payments), Cloudflare (CDN), AWS/Digital Ocean (hosting)</li>
              <li><strong>Advertising Partners:</strong> Google AdSense (to display relevant advertisements)</li>
              <li><strong>Analytics:</strong> Google Analytics (anonymized data only)</li>
              <li><strong>Law Enforcement:</strong> When required by law or to prevent harm</li>
              <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
            <table className="w-full border-collapse border border-gray-300 mb-4">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-3 text-left font-semibold">Data Type</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold">Retention Period</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-3">Session data (active)</td>
                  <td className="border border-gray-300 p-3">Deleted immediately after call ends</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3">IP addresses</td>
                  <td className="border border-gray-300 p-3">24 hours</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3">Technical logs</td>
                  <td className="border border-gray-300 p-3">7 days (anonymized after)</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3">Usage analytics</td>
                  <td className="border border-gray-300 p-3">30 days</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3">Ban records</td>
                  <td className="border border-gray-300 p-3">Permanent (device IDs only)</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3">Premium account data</td>
                  <td className="border border-gray-300 p-3">Until account deletion requested</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Your Rights (GDPR) */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights Under GDPR</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you are located in the EEA, you have the following rights:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">✓ Right to Access</h4>
                <p className="text-sm text-blue-800">Request a copy of your personal data</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">✓ Right to Rectification</h4>
                <p className="text-sm text-blue-800">Correct inaccurate personal data</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">✓ Right to Erasure</h4>
                <p className="text-sm text-blue-800">Request deletion of your data</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">✓ Right to Portability</h4>
                <p className="text-sm text-blue-800">Receive your data in machine-readable format</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">✓ Right to Object</h4>
                <p className="text-sm text-blue-800">Object to certain data processing</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">✓ Right to Restriction</h4>
                <p className="text-sm text-blue-800">Request limited processing of your data</p>
              </div>
            </div>
            <div className="bg-gray-100 rounded-xl p-4">
              <p className="text-gray-800 font-semibold mb-2">How to Exercise Your Rights:</p>
              <p className="text-gray-700 text-sm">
                Email us at <a href="mailto:privacy@livecam.app" className="text-blue-600 underline">privacy@livecam.app</a> with your request. 
                We will respond within 30 days.
              </p>
            </div>
          </section>

          {/* California Privacy Rights (CCPA) */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. California Privacy Rights (CCPA)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Right to Know:</strong> What personal information we collect and how we use it</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt-out of the sale of personal information (we don't sell data)</li>
              <li><strong>Right to Non-Discrimination:</strong> We won't discriminate for exercising your rights</li>
            </ul>
          </section>

          {/* Advertising */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Advertising</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We display advertisements on our Service using Google AdSense. This helps us keep the Service free for all users.
            </p>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-4">
              <p className="text-yellow-900 font-semibold mb-2">How Google AdSense Works:</p>
              <ul className="list-disc list-inside text-yellow-900 space-y-1 ml-4">
                <li>Google may use cookies to display personalized ads based on your browsing history</li>
                <li>You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Ads Settings</a></li>
                <li>Third-party vendors may also use cookies to serve ads based on your visits to this and other websites</li>
                <li>You can opt out of third-party cookies at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">aboutads.info</a></li>
              </ul>
            </div>
            <p className="text-gray-700 leading-relaxed">
              For more information on how Google uses your data, please review <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google's Privacy & Terms</a>.
            </p>
          </section>

          {/* Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies & Similar Technologies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use cookies and similar technologies to improve your experience:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Essential Cookies:</strong> Required for service functionality (cannot be disabled)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use the service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              See our <a href="/cookie-policy" className="text-blue-600 underline hover:text-blue-700">Cookie Policy</a> for more details. 
              You can manage cookie preferences in your browser settings.
            </p>
          </section>

          {/* Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-semibold text-green-900 mb-1">🔒 End-to-End Encryption</p>
                <p className="text-sm text-green-800">Video/audio uses DTLS-SRTP</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-semibold text-green-900 mb-1">🔐 HTTPS/WSS</p>
                <p className="text-sm text-green-800">All connections encrypted in transit</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-semibold text-green-900 mb-1">🛡️ Secure Infrastructure</p>
                <p className="text-sm text-green-800">Hosted on secure cloud providers</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-semibold text-green-900 mb-1">🔑 Access Controls</p>
                <p className="text-sm text-green-800">Limited staff access to data</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4 text-sm">
              However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Third-Party Links */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Third-Party Links</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Service may contain links to third-party websites. We are not responsible for the privacy practices of those sites. We encourage you to read their privacy policies.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Children's Privacy</h2>
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
              <p className="text-red-900 font-bold mb-2">🚫 Our Service is NOT for children under 18.</p>
              <p className="text-red-800 leading-relaxed">
                We do not knowingly collect personal information from anyone under 18 years old. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately and we will delete it.
              </p>
            </div>
          </section>

          {/* International Transfers */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers, including Standard Contractual Clauses (SCCs) for EEA users.
            </p>
          </section>

          {/* Changes to Policy */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about this Privacy Policy or want to exercise your rights, contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-gray-800 mb-2"><strong>Email:</strong> privacy@livecam.app</p>
              <p className="text-gray-800 mb-2"><strong>Data Protection Officer:</strong> dpo@livecam.app</p>
              <p className="text-gray-800"><strong>Address:</strong> [YOUR BUSINESS ADDRESS]</p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4 text-sm">
              For EEA users: You have the right to lodge a complaint with your local supervisory authority.
            </p>
          </section>
        </div>

        {/* Back Button */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}

