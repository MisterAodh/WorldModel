import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isAuthEnabled = clerkPubKey && clerkPubKey !== 'pk_test_placeholder';

if (!isAuthEnabled) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY not set - running in demo mode without authentication');
}

// Custom appearance for Clerk to match our Bloomberg theme
const clerkAppearance = {
  variables: {
    colorPrimary: '#f97316', // Orange-500
    colorText: '#ffffff',
    colorBackground: '#000000',
    colorInputBackground: '#111827', // Gray-900
    colorInputText: '#ffffff',
    fontFamily: '"IBM Plex Mono", monospace',
  },
  elements: {
    card: 'bg-black border border-orange-500',
    headerTitle: 'text-white font-mono',
    headerSubtitle: 'text-gray-400 font-mono',
    socialButtonsBlockButton: 'bg-gray-900 border border-orange-500/30 text-white hover:bg-gray-800',
    formButtonPrimary: 'bg-orange-500 text-black font-semibold hover:bg-orange-400',
    formFieldInput: 'bg-gray-900 border-orange-500/50 text-white font-mono',
    formFieldLabel: 'text-gray-400 font-mono text-xs uppercase tracking-wide',
    footerActionLink: 'text-orange-500 hover:text-orange-400',
  },
};

// Render with or without Clerk based on whether auth is configured
const AppWithProviders = isAuthEnabled ? (
  <ClerkProvider 
    publishableKey={clerkPubKey} 
    appearance={clerkAppearance}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>
) : (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {AppWithProviders}
  </React.StrictMode>,
);
