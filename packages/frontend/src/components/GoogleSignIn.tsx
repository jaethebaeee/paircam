import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { supabase } from '../lib/supabase';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: () => void;
}

export default function GoogleSignInButton({ onSuccess, onError }: GoogleSignInButtonProps) {
  const handleSuccess = async (credentialResponse: any) => {
    try {
      // Sign in with Google token via Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      });

      if (error) throw error;

      console.log('Signed in with Google:', data.user);
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      } else {
        // Refresh page to update auth state
        window.location.reload();
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert('Failed to sign in with Google. Please try again.');
      if (onError) onError();
    }
  };

  const handleError = () => {
    console.error('Google sign-in failed');
    if (onError) onError();
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="text-sm text-gray-500 text-center p-4 bg-yellow-50 rounded-lg">
        Google Sign-In not configured. Please add VITE_GOOGLE_CLIENT_ID to your environment variables.
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          theme="filled_blue"
          size="large"
          text="continue_with"
          shape="rectangular"
          width="100%"
        />
      </div>
    </GoogleOAuthProvider>
  );
}

