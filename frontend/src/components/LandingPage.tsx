import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';

// Check if auth is enabled
const isAuthEnabled = !!(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && 
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== 'pk_test_placeholder');

export function LandingPage() {
  const navigate = useNavigate();
  const [ClerkAuth, setClerkAuth] = useState<any>(null);
  const [authView, setAuthView] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isAuthEnabled) {
      import('@clerk/clerk-react').then((clerk) => {
        setClerkAuth(clerk);
      });
    }
  }, []);

  // Check auth status and redirect if signed in
  useEffect(() => {
    if (ClerkAuth) {
      const checkAuth = async () => {
        // We need to use the hook inside a component that's wrapped by ClerkProvider
        // So we'll handle this differently
      };
    }
  }, [ClerkAuth]);

  // Redirect to app if already signed in (handled by AuthWrapper in parent)
  
  if (!isAuthEnabled) {
    // Demo mode - redirect to app
    navigate('/app');
    return null;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      >
        <source src="/background_movie.mp4" type="video/mp4" />
      </video>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

      {/* Header */}
      <header className="relative z-10 p-6 border-b border-orange-500/30">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-orange-500" />
          <h1 className="text-xl font-bold text-white uppercase tracking-wide font-mono">Atlascast</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative z-10">
        {/* Left Section - Hero */}
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center">
            <h2 className="text-6xl font-bold text-white mb-4 uppercase tracking-tight">
              Do You See?
            </h2>
            <h3 className="text-5xl font-bold text-orange-500 uppercase tracking-tight">
              Peer Upon This World!
            </h3>
          </div>
        </div>

        {/* Right Section - Auth Panel */}
        <div className="w-full max-w-md bg-black/90 border-l border-orange-500 flex flex-col">
          {/* Auth Toggle */}
          <div className="flex border-b border-orange-500/30">
            <button
              onClick={() => setAuthView('sign-in')}
              className={`flex-1 py-4 text-sm font-mono uppercase tracking-wide transition-colors ${
                authView === 'sign-in'
                  ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthView('sign-up')}
              className={`flex-1 py-4 text-sm font-mono uppercase tracking-wide transition-colors ${
                authView === 'sign-up'
                  ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Auth Content */}
          <div className="flex-1 flex items-center justify-center p-8">
            {ClerkAuth ? (
              <ClerkAuthContent 
                ClerkAuth={ClerkAuth} 
                authView={authView} 
                onSignedIn={() => navigate('/app')}
              />
            ) : (
              <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-orange-500/30 text-center">
            <p className="text-xs text-gray-500">
              New users start with $1.00 in free AI credits
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Clerk auth content component
function ClerkAuthContent({ 
  ClerkAuth, 
  authView, 
  onSignedIn 
}: { 
  ClerkAuth: any; 
  authView: 'sign-in' | 'sign-up';
  onSignedIn: () => void;
}) {
  const { SignIn, SignUp, useAuth } = ClerkAuth;
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      onSignedIn();
    }
  }, [isLoaded, isSignedIn, onSignedIn]);

  if (!isLoaded) {
    return <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />;
  }

  if (isSignedIn) {
    return <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />;
  }

  // Custom appearance for Clerk components
  const appearance = {
    baseTheme: undefined,
    variables: {
      colorPrimary: '#f97316',
      colorBackground: '#000000',
      colorText: '#ffffff',
      colorTextSecondary: '#9ca3af',
      colorInputBackground: '#000000',
      colorInputText: '#ffffff',
      borderRadius: '0px',
    },
    elements: {
      card: 'bg-transparent shadow-none',
      headerTitle: 'text-white font-mono uppercase tracking-wide',
      headerSubtitle: 'text-gray-400',
      formButtonPrimary: 'bg-orange-500 hover:bg-orange-400 text-black font-mono uppercase tracking-wide',
      formFieldInput: 'bg-black border-orange-500/50 text-white focus:border-orange-500',
      formFieldLabel: 'text-gray-400 font-mono uppercase text-xs tracking-wide',
      footerActionLink: 'text-orange-500 hover:text-orange-400',
      identityPreviewEditButton: 'text-orange-500',
      formFieldAction: 'text-orange-500',
      alert: 'bg-red-500/20 border-red-500 text-red-400',
    },
  };

  return authView === 'sign-in' ? (
    <SignIn 
      appearance={appearance}
      routing="hash"
      afterSignInUrl="/app"
    />
  ) : (
    <SignUp 
      appearance={appearance}
      routing="hash"
      afterSignUpUrl="/app"
    />
  );
}
