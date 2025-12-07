/**
 * Terms of Service - Legal Page Component
 *
 * ⚠️  IMPORTANT: This is a template. You MUST have this reviewed by a lawyer
 * before using in production. Different jurisdictions have different requirements.
 */

import { Link } from 'react-router-dom';
import BackButton from '../BackButton';

export default function TermsOfService() {
  const lastUpdated = "October 24, 2025";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <BackButton to="/" label="Back to Home" />
          <div className="flex gap-3">
            <Link
              to="/privacy-policy"
              className="text-sm text-gray-500 hover:text-pink-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/cookie-policy"
              className="text-sm text-gray-500 hover:text-pink-600 transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last Updated: {lastUpdated}</p>
        
        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to PairCam ("Service", "we", "us", or "our"). By accessing or using PairCam, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>You must be at least 18 years old to use this Service.</strong> By using PairCam, you represent and warrant that:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You are at least 18 years of age</li>
              <li>You have the legal capacity to enter into these Terms</li>
              <li>You are not prohibited by law from using the Service</li>
              <li>You will comply with all applicable local, state, national, and international laws</li>
            </ul>
          </section>

          {/* Service Description */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Service Description</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              PairCam is a peer-to-peer video chat platform that connects users randomly for video, audio, and text conversations. Our Service:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Facilitates anonymous connections between users</li>
              <li>Uses WebRTC technology for peer-to-peer communications</li>
              <li>Does not record or store video/audio content</li>
              <li>Provides optional premium features for enhanced matching</li>
            </ul>
          </section>

          {/* User Conduct */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. User Conduct & Prohibited Activities</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              When using our Service, you agree NOT to:
            </p>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-4">
              <h3 className="font-bold text-red-900 mb-3">Strictly Prohibited:</h3>
              <ul className="list-disc list-inside text-red-900 space-y-2">
                <li><strong>Share child sexual abuse material (CSAM)</strong> - Zero tolerance, reported to NCMEC</li>
                <li><strong>Engage in sexual conduct involving minors</strong> - Reported to authorities</li>
                <li><strong>Display nudity or sexual content</strong> without explicit consent from matched user</li>
                <li><strong>Harass, threaten, or bully</strong> other users</li>
                <li><strong>Share personal information</strong> of others without consent</li>
                <li><strong>Impersonate</strong> any person or entity</li>
                <li><strong>Spam or advertise</strong> commercial products/services</li>
                <li><strong>Use bots or automated scripts</strong></li>
                <li><strong>Attempt to hack, disrupt, or reverse engineer</strong> the Service</li>
                <li><strong>Record or screenshot</strong> other users without their explicit consent</li>
                <li><strong>Share hate speech, racism, or discriminatory content</strong></li>
                <li><strong>Promote violence or illegal activities</strong></li>
              </ul>
            </div>
            <p className="text-gray-700 leading-relaxed">
              Violations may result in immediate termination of your access, permanent ban, and reporting to law enforcement authorities.
            </p>
          </section>

          {/* Privacy & Data */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Privacy & Data Collection</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Your privacy is important to us. Our data practices:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>No Recording:</strong> We do not record video or audio conversations</li>
              <li><strong>Minimal Data:</strong> We collect only device identifiers for matching and ban enforcement</li>
              <li><strong>Temporary Storage:</strong> Session data is deleted after your call ends</li>
              <li><strong>Third Parties:</strong> We may use analytics services (see Privacy Policy)</li>
              <li><strong>User Responsibility:</strong> Other users may record without your knowledge</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              For complete details, please review our <a href="/privacy-policy" className="text-blue-600 underline hover:text-blue-700">Privacy Policy</a>.
            </p>
          </section>

          {/* Disclaimers */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Disclaimers & Limitations of Liability</h2>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-4">
              <p className="text-gray-900 font-bold mb-3">⚠️  IMPORTANT DISCLAIMER:</p>
              <p className="text-gray-800 leading-relaxed mb-3">
                THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
              </p>
              <ul className="list-disc list-inside text-gray-800 space-y-2 ml-4">
                <li>The safety, conduct, or identity of other users</li>
                <li>The accuracy of any information provided by users</li>
                <li>Uninterrupted or error-free service</li>
                <li>That the service meets your specific needs</li>
              </ul>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>YOU USE THIS SERVICE AT YOUR OWN RISK.</strong> We are not responsible for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Actions or conduct of other users</li>
              <li>Content shared by users during conversations</li>
              <li>Any recordings made by other users</li>
              <li>Direct, indirect, incidental, or consequential damages</li>
              <li>Loss of data, profits, or goodwill</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4 font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY SHALL NOT EXCEED $100 USD.
            </p>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify, defend, and hold harmless PairCam, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-3">
              <li>Your use or misuse of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another person</li>
              <li>Your violation of any applicable laws</li>
            </ul>
          </section>

          {/* Content Moderation */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Content Moderation & Enforcement</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We employ both automated and human moderation to maintain community safety:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>User Reports:</strong> All reports are reviewed by our moderation team</li>
              <li><strong>Automated Detection:</strong> AI systems detect inappropriate content</li>
              <li><strong>Consequences:</strong> Violations result in warnings, temporary bans, or permanent bans</li>
              <li><strong>Appeals:</strong> Banned users may contact us to appeal decisions</li>
              <li><strong>Law Enforcement:</strong> Illegal content is reported to appropriate authorities</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to terminate or suspend your access to the Service immediately, without notice, for any reason, including but not limited to breach of these Terms. You may also terminate your use at any time by ceasing to use the Service.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Governing Law & Dispute Resolution</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of [YOUR JURISDICTION], without regard to its conflict of law provisions.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in [YOUR JURISDICTION], except for claims related to intellectual property or violations of these Terms that may be pursued in court.
            </p>
          </section>

          {/* Changes to Service */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Service</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Information</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              If you have any questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-gray-800"><strong>Email:</strong> legal@paircam.live</p>
              <p className="text-gray-800"><strong>Address:</strong> [YOUR BUSINESS ADDRESS]</p>
            </div>
          </section>

          {/* Entire Agreement */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Entire Agreement</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and PairCam regarding the Service and supersede all prior agreements and understandings.
            </p>
          </section>

          {/* Severability */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Severability</h2>
            <p className="text-gray-700 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          {/* Acknowledgment */}
          <section className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-3">Your Acknowledgment</h3>
            <p className="text-blue-900 leading-relaxed">
              BY USING THIS SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE. IF YOU DO NOT AGREE, YOU MUST NOT USE THE SERVICE.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-between">
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
            <Link to="/privacy-policy" className="text-gray-500 hover:text-pink-600 text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link to="/cookie-policy" className="text-gray-500 hover:text-pink-600 text-sm transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

