import { useStore } from '../store/useStore';
import { OverviewTab } from './tabs/OverviewTab';
import { ArticlesTab } from './tabs/ArticlesTab';
import { DataTab } from './tabs/DataTab';
import { SuggestionsTab } from './tabs/SuggestionsTab';
import { ChatPanel } from './ChatPanel';
import { useEffect, useState } from 'react';
import { Globe, Maximize2, Minimize2, X, ChevronDown, User } from 'lucide-react';

type SidebarProps = {
  onOpenArticle: (article: { url: string; title?: string }) => void;
};

export function Sidebar({ onOpenArticle }: SidebarProps) {
  const { 
    contextData, 
    selectedCountryId, 
    clearSelection, 
    colorDimension, 
    setColorDimension,
    networkUsers,
    countryUserOverrides,
    setCountryUserOverride,
  } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'data' | 'suggestions'>('overview');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener('change', updateIsMobile);
    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  const sidebarWidth = isExpanded ? 'w-[85vw]' : 'w-[500px]';
  const mobileHeight = isExpanded ? 'h-[70vh]' : 'h-[22vh]';
  const sidebarClassName = isMobile
    ? `fixed bottom-0 left-0 right-0 ${mobileHeight} bg-black border-t border-orange-500 flex flex-col z-20`
    : `${sidebarWidth} bg-black border-l border-orange-500 flex flex-col`;

  // Get the current user override for this country
  const currentCountryUserId = selectedCountryId 
    ? countryUserOverrides[selectedCountryId] 
    : null;
  
  // Find the selected user's info
  const selectedUserInfo = currentCountryUserId 
    ? networkUsers.find(u => u.id === currentCountryUserId)
    : null;

  // Handle user selection for this country
  const handleUserSelect = (userId: string | null) => {
    if (selectedCountryId) {
      setCountryUserOverride(selectedCountryId, userId);
    }
    setShowUserDropdown(false);
  };

  if (!contextData) {
    return (
      <div className={sidebarClassName}>
        {isMobile && (
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center justify-center gap-2 py-2 border-b border-orange-500/30 text-xs font-mono uppercase tracking-wide text-orange-500"
            title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
          >
            <div className="w-10 h-1.5 rounded-full bg-orange-500/60" />
            {isExpanded ? 'Pull Down' : 'Pull Up'}
          </button>
        )}
        <div className="p-6 border-b border-orange-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-orange-500" />
              <h1 className="text-xl font-bold text-white uppercase tracking-wide">Atlascast</h1>
            </div>
            {/* Expand/Collapse button even when no country selected */}
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1 text-white hover:bg-orange-500 hover:text-black transition-colors border border-orange-500/50"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-sm text-gray-400">
            Select a country on the map to view details
          </p>
        </div>

        {/* Color Dimension Selector */}
        <div className="p-6 border-b border-orange-500/30">
          <p className="text-sm font-semibold mb-3 text-orange-500 uppercase tracking-wide">Color Map By:</p>
          <div className="flex flex-wrap gap-2">
            {(['economic', 'social', 'political'] as const).map((dimension) => (
              <button
                key={dimension}
                onClick={() => setColorDimension(dimension)}
                className={`flex-1 min-w-[80px] px-3 py-2 text-xs font-medium uppercase tracking-wide transition-colors border ${
                  colorDimension === dimension
                    ? 'bg-orange-500 text-black border-orange-500'
                    : 'bg-transparent text-white border-orange-500/50 hover:border-orange-500 hover:bg-orange-500/10'
                }`}
              >
                {dimension}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1" />
        
        <ChatPanel />
      </div>
    );
  }

  const contextName = contextData.country?.name || 'Unknown';
  const contextType = 'Country';
  
  // Check if viewing someone else's data for this country
  const isViewingOtherUser = currentCountryUserId !== null && currentCountryUserId !== undefined;

    return (
    <div className={isMobile
      ? `fixed bottom-0 left-0 right-0 ${mobileHeight} bg-black border-t ${isViewingOtherUser ? 'border-yellow-500' : 'border-orange-500'} flex flex-col z-20`
      : `${sidebarWidth} bg-black border-l ${isViewingOtherUser ? 'border-yellow-500' : 'border-orange-500'} flex flex-col`
    }>
      {isMobile && (
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`flex items-center justify-center gap-2 py-2 border-b text-xs font-mono uppercase tracking-wide ${
            isViewingOtherUser ? 'text-yellow-500 border-yellow-500/30' : 'text-orange-500 border-orange-500/30'
          }`}
          title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
        >
          <div className={`w-10 h-1.5 rounded-full ${isViewingOtherUser ? 'bg-yellow-500/60' : 'bg-orange-500/60'}`} />
          {isExpanded ? 'Pull Down' : 'Pull Up'}
        </button>
      )}
      {/* Header */}
      <div className={`p-6 border-b ${isViewingOtherUser ? 'border-yellow-500/30' : 'border-orange-500/30'}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className={`text-xs uppercase tracking-wide mb-1 ${isViewingOtherUser ? 'text-yellow-500' : 'text-orange-500'}`}>
              {contextType}
            </div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">{contextName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className={`p-1 text-white hover:text-black transition-colors border ${
                isViewingOtherUser 
                  ? 'hover:bg-yellow-500 border-yellow-500/50' 
                  : 'hover:bg-orange-500 border-orange-500/50'
              }`}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={clearSelection}
              className={`p-1 text-white hover:text-black transition-colors border ${
                isViewingOtherUser 
                  ? 'hover:bg-yellow-500 border-yellow-500/50' 
                  : 'hover:bg-orange-500 border-orange-500/50'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Per-Country User Selector - Only for countries */}
        {selectedCountryId && networkUsers.length > 0 && (
          <div className="mt-3 relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className={`w-full flex items-center justify-between px-3 py-2 border text-sm font-mono ${
                isViewingOtherUser
                  ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500'
                  : 'border-orange-500/50 bg-black text-white hover:border-orange-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {selectedUserInfo ? (
                  <span>@{selectedUserInfo.username}</span>
                ) : (
                  <span>My Data</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showUserDropdown && (
              <div className={`absolute top-full left-0 right-0 mt-1 border bg-black z-50 max-h-48 overflow-y-auto ${
                isViewingOtherUser ? 'border-yellow-500/50' : 'border-orange-500/50'
              }`}>
                {/* My Data option */}
                <button
                  onClick={() => handleUserSelect(null)}
                  className={`w-full px-3 py-2 text-left text-sm font-mono flex items-center gap-2 ${
                    !currentCountryUserId
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'text-white hover:bg-orange-500/10'
                  }`}
                >
                  <User className="w-4 h-4" />
                  My Data
                </button>
                
                {/* Network users */}
                {networkUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    className={`w-full px-3 py-2 text-left text-sm font-mono flex items-center gap-2 ${
                      currentCountryUserId === user.id
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'text-white hover:bg-yellow-500/10'
                    }`}
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    @{user.username}
                    {user.displayName && (
                      <span className="text-gray-500 text-xs">({user.displayName})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Viewing indicator */}
        {isViewingOtherUser && selectedUserInfo && (
          <div className="mt-2 px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 text-xs font-mono">
            Viewing @{selectedUserInfo.username}'s analysis
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`border-b ${isViewingOtherUser ? 'border-yellow-500/30' : 'border-orange-500/30'} bg-black`}>
        <div className="flex">
          {(['overview', 'articles', 'data', 'suggestions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium uppercase tracking-wide transition-colors ${
                activeTab === tab
                  ? isViewingOtherUser
                    ? 'text-yellow-500 border-b-2 border-yellow-500 bg-yellow-500/10'
                    : 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-orange-500/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'articles' && <ArticlesTab />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'suggestions' && <SuggestionsTab />}
      </div>

      {/* Chat Panel - Always Visible */}
      <ChatPanel onOpenArticle={onOpenArticle} />
    </div>
  );
}
