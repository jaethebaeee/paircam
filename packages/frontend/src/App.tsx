import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SafetyModal from './components/SafetyModal';
import PermissionModal from './components/PermissionModal';
import LoadingSpinner from './components/LoadingSpinner';
import SEO from './components/SEO';

// Lazy load heavy components for better performance and SEO
const LandingPage = lazy(() => import('./components/LandingPage'));
const VideoChat = lazy(() => import('./components/VideoChat/index'));

// Lazy load legal pages (rarely visited, so separate bundle)
const TermsOfService = lazy(() => import('./components/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./components/legal/CookiePolicy'));

function App() {
  const [isInCall, setIsInCall] = useState(false);
  const [userName, setUserName] = useState('');
  const [userGender, setUserGender] = useState('');
  const [genderPreference, setGenderPreference] = useState('any');
  const [isTextMode, setIsTextMode] = useState(false);
  const [initialVideoEnabled, setInitialVideoEnabled] = useState(true);
  const [_showSafetyModal, setShowSafetyModal] = useState(false);
  const [_showPermissionModal, setShowPermissionModal] = useState(false);
  const [_safetyAccepted, setSafetyAccepted] = useState(false);
  const [_permissionsGranted, setPermissionsGranted] = useState(false);

  const handleStartCall = (data: { 
    name: string; 
    gender?: string; 
    genderPreference?: string;
    isTextMode?: boolean;
    isVideoEnabled?: boolean;
  }) => {
    setUserName(data.name);
    setUserGender(data.gender || '');
    setGenderPreference(data.genderPreference || 'any');
    setIsTextMode(data.isTextMode || false);
    setInitialVideoEnabled(data.isVideoEnabled ?? true);
    // Show safety modal first
    setShowSafetyModal(true);
  };

  const handleSafetyAccept = () => {
    setSafetyAccepted(true);
    setShowSafetyModal(false);
    // Then show permission modal (skip if text mode)
    if (isTextMode) {
      setPermissionsGranted(true);
      setIsInCall(true);
    } else {
      setShowPermissionModal(true);
    }
  };

  const handleSafetyDecline = () => {
    setShowSafetyModal(false);
    alert('You must accept the safety guidelines to use this service.');
  };

  const handlePermissionsGranted = () => {
    setPermissionsGranted(true);
    setShowPermissionModal(false);
    // Finally start the call
    setIsInCall(true);
  };

  const handlePermissionsDenied = () => {
    setShowPermissionModal(false);
    setSafetyAccepted(false);
    alert('Camera and microphone access is required for video chat. Please allow access and try again.');
  };

  const handleStopChatting = () => {
    setIsInCall(false);
    // Reset permissions for next time
    setPermissionsGranted(false);
    setSafetyAccepted(false);
    setIsTextMode(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Dynamic SEO meta tags */}
      <SEO
        title={isInCall ? 'In Call' : undefined}
        description={
          isInCall
            ? 'You are currently in a video chat. Enjoy your conversation!'
            : undefined
        }
      />

      <Navbar />
      
      <main className="flex-1 relative">
        <Suspense fallback={<LoadingSpinner />}>
          {isInCall ? (
            <VideoChat 
              onStopChatting={handleStopChatting} 
              userName={userName}
              userGender={userGender}
              genderPreference={genderPreference}
              isTextMode={isTextMode}
              initialVideoEnabled={initialVideoEnabled}
            />
          ) : (
            <LandingPage onStartCall={handleStartCall} />
          )}
        </Suspense>
      </main>
      
      <Footer />

      {/* Safety Modal */}
      {_showSafetyModal && (
        <SafetyModal 
          onAccept={handleSafetyAccept}
          onDecline={handleSafetyDecline}
        />
      )}

      {/* Permission Modal */}
      {_showPermissionModal && (
        <PermissionModal 
          onPermissionsGranted={handlePermissionsGranted}
          onPermissionsDenied={handlePermissionsDenied}
        />
      )}
    </div>
  );
}

export default App;