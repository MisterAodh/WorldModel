import { useState } from 'react';
import { useStore, NetworkUser, ViewMode } from '../store/useStore';
import { User, ChevronDown, Eye, Users } from 'lucide-react';

export function NetworkSelector() {
  const viewMode = useStore((state) => state.viewMode);
  const setViewMode = useStore((state) => state.setViewMode);
  const networkUsers = useStore((state) => state.networkUsers);
  const networkUsersLoading = useStore((state) => state.networkUsersLoading);
  const selectedNetworkUserId = useStore((state) => state.selectedNetworkUserId);
  const setSelectedNetworkUserId = useStore((state) => state.setSelectedNetworkUserId);
  
  const [isOpen, setIsOpen] = useState(false);

  const selectedUser = networkUsers.find((u) => u.id === selectedNetworkUserId);

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'my-analysis') {
      setSelectedNetworkUserId(null);
    }
    setIsOpen(false);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedNetworkUserId(userId);
    setViewMode('network');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 border text-sm font-mono transition-colors ${
          viewMode === 'network'
            ? 'border-orange-500 bg-orange-500/10 text-orange-500'
            : 'border-orange-500/30 text-gray-400 hover:border-orange-500/50 hover:text-white'
        }`}
      >
        {viewMode === 'my-analysis' ? (
          <>
            <Eye className="w-4 h-4" />
            My Analysis
          </>
        ) : (
          <>
            <Users className="w-4 h-4" />
            {selectedUser 
              ? `@${selectedUser.username}`
              : 'Network View'
            }
          </>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-black border border-orange-500 shadow-lg z-50">
            {/* View Modes */}
            <div className="p-2 border-b border-orange-500/30">
              <button
                onClick={() => handleModeChange('my-analysis')}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  viewMode === 'my-analysis'
                    ? 'bg-orange-500 text-black'
                    : 'text-white hover:bg-gray-900'
                }`}
              >
                <Eye className="w-4 h-4" />
                My Analysis
              </button>
            </div>
            
            {/* Network Users */}
            <div className="max-h-64 overflow-y-auto">
              {networkUsersLoading ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  <p>Loading network...</p>
                </div>
              ) : networkUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  <p className="mb-2">You're not following anyone yet</p>
                  <a href="/users" className="text-orange-500 hover:text-orange-400">
                    Find users to follow
                  </a>
                </div>
              ) : (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Network ({networkUsers.length})
                  </div>
                  {networkUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        selectedNetworkUserId === user.id && viewMode === 'network'
                          ? 'bg-orange-500/20 text-orange-500'
                          : 'text-white hover:bg-gray-900'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gray-800 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {user.displayName || user.username}
                        </div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
            
            {/* View All Network Option */}
            {networkUsers.length > 0 && (
              <div className="p-2 border-t border-orange-500/30">
                <button
                  onClick={() => {
                    setSelectedNetworkUserId(null);
                    setViewMode('network');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    viewMode === 'network' && !selectedNetworkUserId
                      ? 'bg-orange-500 text-black'
                      : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  View All Network
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
