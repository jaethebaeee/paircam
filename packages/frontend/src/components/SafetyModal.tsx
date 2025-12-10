import { memo } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface SafetyModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

function SafetyModal({ onAccept, onDecline }: SafetyModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-3xl w-full p-8 animate-scaleIn max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mb-4" aria-hidden="true">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>
          <h2 id="safety-modal-title" className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Safety Guidelines & Community Rules
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please read and accept these guidelines before using our service
          </p>
        </div>

        {/* Age Verification Warning */}
        <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-2xl p-5 mb-6" role="alert">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="font-bold text-red-900 dark:text-red-200 text-lg mb-2">18+ Only - Age Requirement</h3>
              <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
                You must be <strong>at least 18 years old</strong> to use this service.
                By proceeding, you confirm that you are 18 or older.
                Providing false information about your age is a violation of our terms and may result in legal consequences.
              </p>
            </div>
          </div>
        </div>

        {/* Safety Rules */}
        <div className="space-y-4 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6 text-pink-600 dark:text-pink-400" aria-hidden="true" />
            Safety Rules
          </h3>

          <ul className="space-y-3" role="list">
            {[
              {
                title: 'Protect Your Privacy',
                description: 'Never share personal information including your full name, address, phone number, email, school, workplace, or social media accounts.'
              },
              {
                title: 'No Inappropriate Content',
                description: 'Nudity, sexual content, violence, harassment, hate speech, or illegal activities are strictly prohibited and will result in immediate ban.'
              },
              {
                title: 'Respect Others',
                description: 'Treat everyone with respect. Bullying, harassment, discrimination, or threatening behavior is not tolerated.'
              },
              {
                title: 'Report Abuse',
                description: 'If someone violates these rules or makes you uncomfortable, use the report button immediately. We take all reports seriously.'
              },
              {
                title: 'You Can Leave Anytime',
                description: 'You have full control. Use the "Skip" button to move to the next person or "End Call" to exit completely at any time.'
              },
              {
                title: 'No Recording',
                description: 'Recording, screenshotting, or sharing content from calls without consent is prohibited and may be illegal in your jurisdiction.'
              }
            ].map((rule, index) => (
              <li key={index} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl" role="listitem">
                <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{rule.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{rule.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Consequences */}
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-yellow-900 dark:text-yellow-200 text-lg mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-6 h-6" aria-hidden="true" />
            Consequences of Violations
          </h3>
          <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-bold" aria-hidden="true">•</span>
              <span><strong>First Offense:</strong> Warning and temporary suspension</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" aria-hidden="true">•</span>
              <span><strong>Serious Violations:</strong> Immediate permanent ban</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" aria-hidden="true">•</span>
              <span><strong>Illegal Activity:</strong> Report to law enforcement authorities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" aria-hidden="true">•</span>
              <span><strong>IP Bans:</strong> Repeated violations may result in device/IP blocking</span>
            </li>
          </ul>
        </div>

        {/* Your Responsibilities */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-200 text-lg mb-3">Your Responsibilities</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-bold" aria-hidden="true">✓</span>
              <span>You are responsible for your own safety and privacy</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" aria-hidden="true">✓</span>
              <span>You must follow all applicable laws in your jurisdiction</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" aria-hidden="true">✓</span>
              <span>You must be in a safe, appropriate environment for video chat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold" aria-hidden="true">✓</span>
              <span>You must respect the privacy and consent of others</span>
            </li>
          </ul>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">Legal Disclaimer</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            This service connects you with random strangers. We cannot control or monitor all interactions.
            Use at your own risk. We are not responsible for the actions of other users.
            All video and voice connections are peer-to-peer and not recorded by us.
            However, other users may record without your knowledge - never do anything on camera you wouldn't want shared publicly.
            By using this service, you acknowledge these risks and agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        {/* Acceptance Checkbox */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/30 dark:to-purple-900/30 rounded-2xl p-5 mb-6 border-2 border-pink-200 dark:border-pink-700">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-pink-600 dark:text-pink-400 flex-shrink-0 mt-1" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                By clicking "I Accept", you confirm that:
              </p>
              <ul className="text-xs text-gray-700 dark:text-gray-400 mt-2 space-y-1 ml-4">
                <li>• You are at least 18 years old</li>
                <li>• You have read and understood these safety guidelines</li>
                <li>• You agree to follow all community rules</li>
                <li>• You accept the risks of connecting with strangers</li>
                <li>• You agree to our Terms of Service and Privacy Policy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-6 py-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-500/30"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
            I Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-700 hover:to-purple-700 shadow-lg shadow-pink-500/30 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
          >
            <CheckCircleIcon className="w-5 h-5" aria-hidden="true" />
            I Accept & Continue
          </button>
        </div>

        {/* Help Link */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          Questions? Read our{' '}
          <a href="#" className="text-pink-600 dark:text-pink-400 hover:underline font-medium">Safety Center</a>
          {' '}or{' '}
          <a href="#" className="text-pink-600 dark:text-pink-400 hover:underline font-medium">Contact Support</a>
        </p>
      </div>
    </div>
  );
}

export default memo(SafetyModal);
