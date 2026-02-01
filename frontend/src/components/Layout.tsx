import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WorldMap } from './WorldMap';
import { Sidebar } from './Sidebar';
import { ArticlePreview } from './ArticlePreview';
import { CountrySelector } from './CountrySelector';
import { NetworkSelector } from './NetworkSelector';
import { Globe, CreditCard, MessageSquare, Users, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getMyFollowing, getCreditBalance, getUnreadCount } from '../lib/api';

// Check if auth is enabled
const isAuthEnabled = !!(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && 
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== 'pk_test_placeholder');

// Clerk auth wrapper component - only loads Clerk if enabled
function ClerkAuthSection() {
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [ClerkComponents, setClerkComponents] = useState<{
    useAuth: any;
    SignInButton: any;
    UserButton: any;
  } | null>(null);

  useEffect(() => {
    import('@clerk/clerk-react').then((clerk) => {
      setClerkComponents({
        useAuth: clerk.useAuth,
        SignInButton: clerk.SignInButton,
        UserButton: clerk.UserButton,
      });
      setClerkLoaded(true);
    });
  }, []);

  if (!clerkLoaded || !ClerkComponents) {
    return <div className="w-8 h-8 bg-gray-800 animate-pulse" />;
  }

  return <ClerkAuthContent ClerkComponents={ClerkComponents} />;
}

function ClerkAuthContent({ ClerkComponents }: { ClerkComponents: any }) {
  const { useAuth, SignInButton, UserButton } = ClerkComponents;
  const { isSignedIn, isLoaded } = useAuth();
  const creditBalance = useStore((state) => state.creditBalance);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (isSignedIn) {
      getUnreadCount().then(res => setUnreadMessages(res.data.count || 0)).catch(() => {});
    }
  }, [isSignedIn]);

  if (!isLoaded) {
    return <div className="w-8 h-8 bg-gray-800 animate-pulse" />;
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="flex items-center gap-2 px-4 py-1.5 bg-orange-500 text-black text-sm font-semibold hover:bg-orange-400 transition-colors">
          <User className="w-4 h-4" />
          Sign In
        </button>
      </SignInButton>
    );
  }

  return (
    <>
      {/* Credits */}
      <Link
        to="/billing"
        className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-500/50 text-orange-500 text-sm font-mono hover:bg-orange-500/10 transition-colors"
      >
        <CreditCard className="w-4 h-4" />
        ${(creditBalance / 100).toFixed(2)}
      </Link>
      
      {/* Messages */}
      <Link
        to="/messages"
        className="relative p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
        {unreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-black text-xs font-bold flex items-center justify-center">
            {unreadMessages > 9 ? '9+' : unreadMessages}
          </span>
        )}
      </Link>
      
      {/* Find Users */}
      <Link
        to="/users"
        className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
        title="Find Users"
      >
        <Users className="w-5 h-5" />
      </Link>
      
      {/* User Menu */}
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: 'w-8 h-8 border border-orange-500/50',
          },
        }}
      />
    </>
  );
}

// Demo mode header (no auth)
function DemoModeHeader() {
  const creditBalance = useStore((state) => state.creditBalance);

  return (
    <>
      {/* Credits */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border border-orange-500/50 text-orange-500 text-sm font-mono">
        <CreditCard className="w-4 h-4" />
        ${(creditBalance / 100).toFixed(2)}
        <span className="text-xs text-gray-500 ml-1">(Demo)</span>
      </div>
      
      {/* Demo User */}
      <div className="flex items-center gap-2 px-3 py-1.5 border border-orange-500/50 text-orange-500 text-sm font-mono">
        <User className="w-4 h-4" />
        Demo Mode
      </div>
    </>
  );
}

export function Layout() {
  const [previewArticle, setPreviewArticle] = useState<{ url: string; title?: string } | null>(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  
  const setCreditBalance = useStore((state) => state.setCreditBalance);
  const setNetworkUsers = useStore((state) => state.setNetworkUsers);
  const setNetworkUsersLoading = useStore((state) => state.setNetworkUsersLoading);
  const viewMode = useStore((state) => state.viewMode);

  // Set demo credits on mount if in demo mode
  useEffect(() => {
    if (!isAuthEnabled) {
      setCreditBalance(500); // $5.00 demo credits
    }
  }, [setCreditBalance]);

  // Load user data when auth is enabled
  useEffect(() => {
    if (isAuthEnabled) {
      loadUserData();
    }
  }, []);

  const loadUserData = async () => {
    setNetworkUsersLoading(true);
    try {
      const [followingRes, balanceRes] = await Promise.all([
        getMyFollowing(),
        getCreditBalance(),
      ]);
      
      setNetworkUsers(followingRes.data.following || []);
      setCreditBalance(balanceRes.data.creditBalance);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setNetworkUsersLoading(false);
    }
  };

  // Determine if we're in network view mode (viewing someone else's data)
  const isNetworkView = viewMode === 'network';

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden bg-black ${isNetworkView ? 'network-view-mode' : ''}`}>
      {/* Top Header Bar */}
      <header className="h-12 border-b border-orange-500 bg-black flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/app" className="flex items-center gap-2 text-orange-500 hover:text-orange-400">
            <Globe className="w-5 h-5" />
            <span className="font-bold font-mono text-sm uppercase tracking-wider">Atlascast</span>
          </Link>
          
          {/* View Mode Toggle - only shown when auth is enabled */}
          {isAuthEnabled && <NetworkSelector />}
        </div>

        <div className="flex items-center gap-3">
          {isAuthEnabled ? <ClerkAuthSection /> : <DemoModeHeader />}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Container */}
        <div className="flex-1 relative">
          {previewArticle ? (
            <ArticlePreview
              url={previewArticle.url}
              title={previewArticle.title}
              onClose={() => setPreviewArticle(null)}
            />
          ) : (
            <>
              <WorldMap />
              {/* Floating "Select Country" button */}
              <button
                onClick={() => setShowCountrySelector(true)}
                className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-orange-500 text-black font-semibold shadow-lg hover:bg-orange-400 transition-colors z-10"
              >
                <Globe className="w-4 h-4" />
                Select Country
              </button>
              
              {/* Network View Indicator */}
              {viewMode === 'network' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black border border-orange-500 text-orange-500 text-sm font-mono z-10">
                  Viewing Network Analysis
                </div>
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <Sidebar onOpenArticle={setPreviewArticle} />

        {/* Country Selector Modal */}
        {showCountrySelector && <CountrySelector onClose={() => setShowCountrySelector(false)} />}
      </div>
    </div>
  );
}
