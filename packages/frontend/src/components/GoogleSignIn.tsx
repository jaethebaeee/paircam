import { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface GoogleSignInProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  width?: number;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function GoogleSignIn({
  onSuccess,
  onError,
  text = 'continue_with',
  theme = 'outline',
  size = 'large',
  width = 300,
}: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { signInWithGoogle } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID not configured');
      return;
    }

    // Check if script is already loaded
    if (window.google?.accounts) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Sign-In script');
      onError?.('Failed to load Google Sign-In');
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount as other components might need it
    };
  }, [onError]);

  // Initialize Google Sign-In when script loads
  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current || !GOOGLE_CLIENT_ID) return;

    const handleCredentialResponse = async (response: { credential: string }) => {
      setIsLoading(true);
      try {
        await signInWithGoogle(response.credential);
        onSuccess?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sign-in failed';
        onError?.(message);
      } finally {
        setIsLoading(false);
      }
    };

    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    window.google?.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme,
      size,
      text,
      shape: 'rectangular',
      logo_alignment: 'left',
      width,
    });
  }, [scriptLoaded, signInWithGoogle, onSuccess, onError, text, theme, size, width]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="text-center text-sm text-gray-500 py-3">
        Google Sign-In not configured
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={buttonRef}
        className={isLoading ? 'opacity-50 pointer-events-none' : ''}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded">
          <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
