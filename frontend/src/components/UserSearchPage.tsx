import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, User, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { searchUsers, followUser, unfollowUser } from '../lib/api';

type SearchResult = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isFollowing?: boolean;
  _count: {
    followers: number;
    following: number;
  };
};

export function UserSearchPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState<string | null>(null);

  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSearch = async () => {
    if (query.length < 2) return;
    
    setLoading(true);
    try {
      const response = await searchUsers(query, 20);
      setResults(response.data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }

    setFollowingLoading(userId);
    try {
      await followUser(userId);
      setResults(results.map(r => 
        r.id === userId 
          ? { ...r, isFollowing: true, _count: { ...r._count, followers: r._count.followers + 1 } }
          : r
      ));
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setFollowingLoading(null);
    }
  };

  const handleUnfollow = async (userId: string) => {
    setFollowingLoading(userId);
    try {
      await unfollowUser(userId);
      setResults(results.map(r => 
        r.id === userId 
          ? { ...r, isFollowing: false, _count: { ...r._count, followers: r._count.followers - 1 } }
          : r
      ));
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setFollowingLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-orange-500 p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold font-mono">Find Users</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-6">
        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-orange-500/50 text-white font-mono text-lg focus:outline-none focus:border-orange-500"
            autoFocus
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 border border-orange-500/30 hover:bg-gray-900 transition-colors"
              >
                <Link
                  to={`/users/${user.id}`}
                  className="w-14 h-14 bg-gray-800 border border-orange-500/30 flex items-center justify-center flex-shrink-0"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-gray-500" />
                  )}
                </Link>
                <Link to={`/users/${user.id}`} className="flex-1 min-w-0">
                  <div className="font-semibold">{user.displayName || user.username}</div>
                  <div className="text-sm text-gray-400">@{user.username}</div>
                  {user.bio && (
                    <div className="text-sm text-gray-500 truncate mt-1">{user.bio}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {user._count.followers} followers · {user._count.following} following
                  </div>
                </Link>
                {isSignedIn && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (user.isFollowing) {
                        handleUnfollow(user.id);
                      } else {
                        handleFollow(user.id);
                      }
                    }}
                    disabled={followingLoading === user.id}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      user.isFollowing
                        ? 'bg-gray-800 text-white border border-orange-500/30 hover:bg-gray-700'
                        : 'bg-orange-500 text-black hover:bg-orange-400'
                    }`}
                  >
                    {followingLoading === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : user.isFollowing ? (
                      <>
                        <UserMinus className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : query.length >= 2 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users found matching "{query}"</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter at least 2 characters to search</p>
          </div>
        )}
      </main>
    </div>
  );
}
