/**
 * Cookie Policy - Legal Page Component
 *
 * Explains how cookies are used on the site for GDPR compliance
 */

import { Link } from 'react-router-dom';
import BackButton from '../BackButton';

export default function CookiePolicy() {
  const lastUpdated = "October 24, 2025";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <BackButton to="/" label="Back to Home" />
          <div className="flex gap-3">
            <Link
              to="/terms-of-service"
              className="text-sm text-gray-500 hover:text-pink-600 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy-policy"
              className="text-sm text-gray-500 hover:text-pink-600 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
        <p className="text-gray-600 mb-8">Last Updated: {lastUpdated}</p>
        
        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed mb-4">
              This Cookie Policy explains how PairCam ("we", "us", or "our") uses cookies and similar tracking technologies when you visit our website.
            </p>
          </section>

          {/* What are Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <p className="text-blue-900 leading-relaxed">
                <strong>🍪 In simple terms:</strong> Cookies help us remember you, understand how you use our service, and improve your experience. They're like a memory card for your browser!
              </p>
            </div>
          </section>

          {/* Types of Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              {/* Essential Cookies */}
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl">
                <h3 className="text-xl font-bold text-green-900 mb-3">✅ Essential Cookies (Required)</h3>
                <p className="text-green-800 mb-3">
                  These cookies are necessary for the website to function and cannot be disabled.
                </p>
                <table className="w-full text-sm">
                  <thead className="bg-green-100">
                    <tr>
                      <th className="p-2 text-left font-semibold">Cookie Name</th>
                      <th className="p-2 text-left font-semibold">Purpose</th>
                      <th className="p-2 text-left font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-green-900">
                    <tr className="border-t border-green-200">
                      <td className="p-2 font-mono text-xs">auth_token</td>
                      <td className="p-2">Maintains your session</td>
                      <td className="p-2">Session</td>
                    </tr>
                    <tr className="border-t border-green-200">
                      <td className="p-2 font-mono text-xs">device_id</td>
                      <td className="p-2">Identifies your device for matchmaking</td>
                      <td className="p-2">30 days</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Analytics Cookies */}
              <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl">
                <h3 className="text-xl font-bold text-purple-900 mb-3">📊 Analytics Cookies (Optional)</h3>
                <p className="text-purple-800 mb-3">
                  These cookies help us understand how visitors use our website so we can improve it.
                </p>
                <table className="w-full text-sm">
                  <thead className="bg-purple-100">
                    <tr>
                      <th className="p-2 text-left font-semibold">Cookie Name</th>
                      <th className="p-2 text-left font-semibold">Purpose</th>
                      <th className="p-2 text-left font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-purple-900">
                    <tr className="border-t border-purple-200">
                      <td className="p-2 font-mono text-xs">_ga</td>
                      <td className="p-2">Google Analytics - tracks visitors</td>
                      <td className="p-2">2 years</td>
                    </tr>
                    <tr className="border-t border-purple-200">
                      <td className="p-2 font-mono text-xs">_gid</td>
                      <td className="p-2">Google Analytics - session tracking</td>
                      <td className="p-2">24 hours</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Preference Cookies */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
                <h3 className="text-xl font-bold text-blue-900 mb-3">⚙️ Preference Cookies (Optional)</h3>
                <p className="text-blue-800 mb-3">
                  These cookies remember your settings and preferences for a better experience.
                </p>
                <table className="w-full text-sm">
                  <thead className="bg-blue-100">
                    <tr>
                      <th className="p-2 text-left font-semibold">Cookie Name</th>
                      <th className="p-2 text-left font-semibold">Purpose</th>
                      <th className="p-2 text-left font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="text-blue-900">
                    <tr className="border-t border-blue-200">
                      <td className="p-2 font-mono text-xs">language</td>
                      <td className="p-2">Remembers your language preference</td>
                      <td className="p-2">1 year</td>
                    </tr>
                    <tr className="border-t border-blue-200">
                      <td className="p-2 font-mono text-xs">video_quality</td>
                      <td className="p-2">Remembers video quality settings</td>
                      <td className="p-2">30 days</td>
                    </tr>
                    <tr className="border-t border-blue-200">
                      <td className="p-2 font-mono text-xs">cookie_consent</td>
                      <td className="p-2">Remembers your cookie preferences</td>
                      <td className="p-2">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Third-Party Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Third-Party Cookies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use services from trusted third parties that may set their own cookies:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Google Analytics:</strong> To analyze website traffic and usage patterns</li>
              <li><strong>Stripe:</strong> To process payments for premium features (if you purchase)</li>
              <li><strong>Cloudflare:</strong> For security and performance optimization</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4 text-sm">
              These third parties have their own privacy policies. We recommend reviewing them.
            </p>
          </section>

          {/* How to Control Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. How to Control Cookies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have several options to manage cookies:
            </p>
            
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl p-6 mb-4">
              <h3 className="font-bold text-pink-900 mb-3">🎛️ Cookie Preference Center</h3>
              <p className="text-pink-800 mb-4">
                Click the button below to open our Cookie Preference Center where you can enable/disable optional cookies:
              </p>
              <button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all">
                Manage Cookie Preferences
              </button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Browser Settings</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Most browsers allow you to control cookies through their settings. Here's how:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Privacy, search, and services → Cookies</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4 text-sm italic">
              ⚠️  Note: Blocking essential cookies may prevent the service from working properly.
            </p>
          </section>

          {/* Do Not Track */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Do Not Track Signals</h2>
            <p className="text-gray-700 leading-relaxed">
              Some browsers offer a "Do Not Track" (DNT) signal. We respect DNT signals and will not track users who have enabled it. However, essential cookies will still be used for service functionality.
            </p>
          </section>

          {/* Changes */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Changes to This Cookie Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Cookie Policy from time to time. The "Last Updated" date at the top indicates when the last changes were made. We encourage you to review this policy periodically.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Questions?</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions about our use of cookies, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-800"><strong>Email:</strong> privacy@paircam.live</p>
              <p className="text-gray-800 mt-1"><strong>Subject:</strong> Cookie Policy Inquiry</p>
            </div>
          </section>

          {/* More Info */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Learn More About Cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              To learn more about cookies and how they work, visit:
            </p>
            <ul className="list-disc list-inside text-blue-600 space-y-1 ml-4 mt-2">
              <li><a href="https://www.allaboutcookies.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">AllAboutCookies.org</a></li>
              <li><a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">Your Online Choices (EU)</a></li>
            </ul>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
            <div className="flex gap-4">
              <Link
                to="/terms-of-service"
                className="text-gray-500 hover:text-pink-600 transition-colors text-sm"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy-policy"
                className="text-gray-500 hover:text-pink-600 transition-colors text-sm"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

