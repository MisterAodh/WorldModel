import { useEffect, createContext, useContext, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { useStore } from './store/useStore';
import { setAuthToken, getCreditBalance, getMyFollowing } from './lib/api';
import { ProfilePage } from './components/ProfilePage';
import { MessagesPage } from './components/MessagesPage';
import { BillingPage } from './components/BillingPage';
import { UserSearchPage } from './components/UserSearchPage';
import { PublicProfilePage } from './components/PublicProfilePage';

// Check if auth is enabled
const isAuthEnabled = !!(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && 
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== 'pk_test_placeholder');

// Auth context for checking if auth is available
export const AuthEnabledContext = createContext(isAuthEnabled);
export const useAuthEnabled = () => useContext(AuthEnabledContext);

// Auth wrapper component that conditionally loads Clerk
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [ClerkAuth, setClerkAuth] = useState<any>(null);
  const setCreditBalance = useStore((state) => state.setCreditBalance);

  useEffect(() => {
    if (isAuthEnabled) {
      import('@clerk/clerk-react').then((clerk) => {
        setClerkAuth(clerk);
        setClerkLoaded(true);
      });
    } else {
      // Demo mode - set initial credits
      setCreditBalance(500);
    }
  }, [setCreditBalance]);

  // Demo mode - no auth needed
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // Loading Clerk
  if (!clerkLoaded || !ClerkAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return <AuthProviderContent ClerkAuth={ClerkAuth}>{children}</AuthProviderContent>;
}

function AuthProviderContent({ children, ClerkAuth }: { children: React.ReactNode; ClerkAuth: any }) {
  const { useAuth } = ClerkAuth;
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const setCreditBalance = useStore((state) => state.setCreditBalance);
  const setNetworkUsers = useStore((state) => state.setNetworkUsers);
  const setNetworkUsersLoading = useStore((state) => state.setNetworkUsersLoading);
  const setAuthReady = useStore((state) => state.setAuthReady);

  useEffect(() => {
    const setupAuth = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          setAuthToken(token);
          
          // Fetch user data AFTER token is set
          setNetworkUsersLoading(true);
          try {
            const [balanceResponse, followingResponse] = await Promise.all([
              getCreditBalance(),
              getMyFollowing(),
            ]);
            setCreditBalance(balanceResponse.data.creditBalance);
            setNetworkUsers(followingResponse.data.following || []);
          } catch (error) {
            console.error('Error fetching user data:', error);
          } finally {
            setNetworkUsersLoading(false);
            setAuthReady(true);
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
          setAuthReady(false);
        }
      } else {
        setAuthToken(null);
        setCreditBalance(0);
        setNetworkUsers([]);
        setNetworkUsersLoading(false);
        setAuthReady(true);
      }
    };

    if (isLoaded) {
      setupAuth();
    }
  }, [isSignedIn, isLoaded, getToken, setCreditBalance, setNetworkUsers, setNetworkUsersLoading, setAuthReady]);

  // Refresh token periodically
  useEffect(() => {
    if (!isSignedIn) return;

    const refreshToken = async () => {
      try {
        const token = await getToken();
        setAuthToken(token);
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    };

    const interval = setInterval(refreshToken, 30 * 1000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  return <>{children}</>;
}

// Protected route component - redirects to landing if not signed in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // In demo mode, allow access to all routes
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // When auth is enabled, we need to check with Clerk
  return <ProtectedRouteWithClerk>{children}</ProtectedRouteWithClerk>;
}

function ProtectedRouteWithClerk({ children }: { children: React.ReactNode }) {
  const [ClerkAuth, setClerkAuth] = useState<any>(null);

  useEffect(() => {
    import('@clerk/clerk-react').then((clerk) => {
      setClerkAuth(clerk);
    });
  }, []);

  if (!ClerkAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  const { useAuth } = ClerkAuth;
  return <ProtectedRouteContent useAuth={useAuth}>{children}</ProtectedRouteContent>;
}

function ProtectedRouteContent({ children, useAuth }: { children: React.ReactNode; useAuth: any }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Landing page wrapper - redirects to /app if already signed in
function LandingPageWrapper() {
  if (!isAuthEnabled) {
    return <Navigate to="/app" replace />;
  }

  return <LandingPageWithAuthCheck />;
}

function LandingPageWithAuthCheck() {
  const [ClerkAuth, setClerkAuth] = useState<any>(null);

  useEffect(() => {
    import('@clerk/clerk-react').then((clerk) => {
      setClerkAuth(clerk);
    });
  }, []);

  if (!ClerkAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  const { useAuth } = ClerkAuth;
  return <LandingPageContent useAuth={useAuth} />;
}

function LandingPageContent({ useAuth }: { useAuth: any }) {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/app', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return <LandingPage />;
}

function App() {
  const fetchCountries = useStore((state) => state.fetchCountries);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return (
    <AuthEnabledContext.Provider value={isAuthEnabled}>
      <AuthWrapper>
        <Routes>
          {/* Landing page - redirects to /app if signed in */}
          <Route path="/" element={<LandingPageWrapper />} />
          
          {/* Main app - protected */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          />
          
          {/* Protected routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:userId"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/success"
            element={
              <ProtectedRoute>
                <BillingPage success />
              </ProtectedRoute>
            }
          />
          
          {/* Public routes */}
          <Route path="/users" element={<UserSearchPage />} />
          <Route path="/users/:userId" element={<PublicProfilePage />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthWrapper>
    </AuthEnabledContext.Provider>
  );
}

export default App;
