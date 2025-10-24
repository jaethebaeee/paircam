import { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SafetyModal from './components/SafetyModal';
import PermissionModal from './components/PermissionModal';
import PreferencesModal from './components/PreferencesModal';
import LoadingSpinner from './components/LoadingSpinner';
import SEO from './components/SEO';
import { useAuthContext } from './contexts/AuthContext';
import PremiumModal from './components/PremiumModal';

// Lazy load heavy components for better performance and SEO
const LandingPage = lazy(() => import('./components/LandingPage'));
const VideoChat = lazy(() => import('./components/VideoChat/index'));

// Lazy load legal pages (rarely visited, so separate bundle)
const TermsOfService = lazy(() => import('./components/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./components/legal/CookiePolicy'));

// Schema.org structured data for homepage
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "PairCam",
  "applicationCategory": "VideoChatApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "ratingCount": "10247"
  },
  "description": "Free random video chat with strangers worldwide. Safe, anonymous, and instant connections with no signup required.",
  "url": "https://paircam.live",
  "screenshot": "https://paircam.live/screenshot.jpg",
  "featureList": [
    "Random video chat matching",
    "Text-only chat mode",
    "Gender filters (Premium)",
    "Real-time translation",
    "Anonymous connections",
    "No signup required"
  ],
  "softwareVersion": "2.0",
  "datePublished": "2024-01-01",
  "author": {
    "@type": "Organization",
    "name": "PairCam"
  }
};

// Inner component to access useLocation
function AppRoutes({
  appState,
  handleStartCall,
  handleStopChatting,
  handlePreferencesSet,
  handlePreferencesCancel,
  handleSafetyAccept,
  handleSafetyDecline,
  handlePermissionsGranted,
  handlePermissionsDenied,
  handleWaitingCancel,
  showPremiumModal,
  setShowPremiumModal,
  userName,
  userGender,
  genderPreference,
  isTextMode,
  initialVideoEnabled,
  isPremium,
}: any) {
  const location = useLocation();
  const [currentRoute, setCurrentRoute] = useState<string>(location.pathname);

  useEffect(() => {
    setCurrentRoute(location.pathname);
  }, [location.pathname]);

  // Get SEO props based on current route and app state
  const getSEOProps = () => {
    if (appState === 'chatting') {
      return {
        title: 'In Call',
        description: 'You are currently in a video chat. Enjoy your conversation!',
      };
    }

    switch (currentRoute) {
      case '/':
        return {
          jsonLd: softwareAppSchema,
        };
      case '/terms-of-service':
        return {
          title: 'Terms of Service',
          description: 'Read PairCam\'s Terms of Service, including our community guidelines, prohibited content, and user responsibilities.',
          url: 'https://paircam.live/terms-of-service',
        };
      case '/privacy-policy':
        return {
          title: 'Privacy Policy',
          description: 'Learn how PairCam protects your privacy. GDPR and CCPA compliant. We never store your video chats.',
          url: 'https://paircam.live/privacy-policy',
        };
      case '/cookie-policy':
        return {
          title: 'Cookie Policy',
          description: 'Understand how PairCam uses cookies to improve your experience. Manage your cookie preferences.',
          url: 'https://paircam.live/cookie-policy',
        };
      default:
        return {};
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Dynamic SEO meta tags */}
      <SEO {...getSEOProps()} />

      <Navbar />
      
      <main className="flex-1 relative">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Main App Routes */}
            <Route 
              path="/" 
              element={
                (appState === 'chatting' || appState === 'waiting') ? (
                  <VideoChat 
                    onStopChatting={handleStopChatting} 
                    userName={userName}
                    userGender={userGender}
                    genderPreference={genderPreference}
                    isTextMode={isTextMode}
                    initialVideoEnabled={initialVideoEnabled}
                    showWaitingQueue={appState === 'waiting'}
                    onMatched={() => {}}
                    onWaitingCancel={handleWaitingCancel}
                  />
                ) : (
                  <LandingPage onStartCall={handleStartCall} />
                )
              }
            />
            
            {/* Legal Pages */}
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      
      <Footer />

      {/* Preferences Modal */}
      {appState === 'preferences' && (
        <PreferencesModal
          onStart={handlePreferencesSet}
          onCancel={handlePreferencesCancel}
          isPremium={isPremium}
          onUpgrade={() => setShowPremiumModal(true)}
        />
      )}

      {/* Safety Modal */}
      {appState === 'safety' && (
        <SafetyModal 
          onAccept={handleSafetyAccept}
          onDecline={handleSafetyDecline}
        />
      )}

      {/* Permission Modal */}
      {appState === 'permissions' && (
        <PermissionModal 
          onPermissionsGranted={handlePermissionsGranted}
          onPermissionsDenied={handlePermissionsDenied}
        />
      )}

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  );
}

function App() {
  const [appState, setAppState] = useState<'landing' | 'preferences' | 'safety' | 'permissions' | 'waiting' | 'chatting'>('landing');
  const [userName, setUserName] = useState('');
  const [userGender, setUserGender] = useState('');
  const [genderPreference, setGenderPreference] = useState('any');
  const [isTextMode, setIsTextMode] = useState(false);
  const [initialVideoEnabled, setInitialVideoEnabled] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  const { isPremium } = useAuthContext();

  // Flow: Landing → Preferences → Safety → Permissions → Waiting → Chatting
  const handleStartCall = (data: { 
    name: string; 
    gender?: string; 
    genderPreference?: string;
    isTextMode?: boolean;
    isVideoEnabled?: boolean;
  }) => {
    setUserName(data.name);
    setIsTextMode(data.isTextMode || false);
    setInitialVideoEnabled(data.isVideoEnabled ?? true);
    // Show preferences modal
    setAppState('preferences');
  };

  const handlePreferencesSet = (preferences: { gender?: string; genderPreference: string }) => {
    setUserGender(preferences.gender || '');
    setGenderPreference(preferences.genderPreference);
    // Show safety modal
    setAppState('safety');
  };

  const handlePreferencesCancel = () => {
    setAppState('landing');
  };

  const handleSafetyAccept = () => {
    // Show permissions modal if video, otherwise go to waiting
    if (isTextMode) {
      setAppState('waiting');
    } else {
      setAppState('permissions');
    }
  };

  const handleSafetyDecline = () => {
    setAppState('landing');
    alert('You must accept the safety guidelines to use this service.');
  };

  const handlePermissionsGranted = () => {
    setAppState('waiting');
  };

  const handlePermissionsDenied = () => {
    setAppState('landing');
    alert('Camera and microphone access is required for video chat. Please allow access and try again.');
  };

  const handleWaitingCancel = () => {
    setAppState('landing');
  };

  const handleStopChatting = () => {
    setAppState('landing');
    // Reset state
    setIsTextMode(false);
  };

  return (
    <BrowserRouter>
      <AppRoutes
        appState={appState}
        handleStartCall={handleStartCall}
        handleStopChatting={handleStopChatting}
        handlePreferencesSet={handlePreferencesSet}
        handlePreferencesCancel={handlePreferencesCancel}
        handleSafetyAccept={handleSafetyAccept}
        handleSafetyDecline={handleSafetyDecline}
        handlePermissionsGranted={handlePermissionsGranted}
        handlePermissionsDenied={handlePermissionsDenied}
        handleWaitingCancel={handleWaitingCancel}
        showPremiumModal={showPremiumModal}
        setShowPremiumModal={setShowPremiumModal}
        userName={userName}
        userGender={userGender}
        genderPreference={genderPreference}
        isTextMode={isTextMode}
        initialVideoEnabled={initialVideoEnabled}
        isPremium={isPremium}
      />
    </BrowserRouter>
  );
}

export default App;