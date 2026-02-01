import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, UserPlus, UserMinus, MessageSquare, Globe, FileText, Tag, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { getUserProfile, getUserWorld, followUser, unfollowUser } from '../lib/api';

type UserProfile = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  isFollowing: boolean;
  isFollowedBy: boolean;
  isOwner: boolean;
  _count: {
    followers: number;
    following: number;
    articles: number;
    tags: number;
  };
};

type UserWorldData = {
  user: {
    id: string;
    username: string;
    displayName: string | null;
  };
  tags: any[];
  articles: any[];
  notes: any[];
};

export function PublicProfilePage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { isSignedIn } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [worldData, setWorldData] = useState<UserWorldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'tags'>('overview');

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const [profileRes, worldRes] = await Promise.all([
        getUserProfile(userId),
        getUserWorld(userId),
      ]);
      
      setProfile(profileRes.data);
      setWorldData(worldRes.data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      if (error?.response?.status === 404) {
        navigate('/users');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!isSignedIn) {
      navigate('/');
      return;
    }
    if (!userId || !profile) return;

    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await unfollowUser(userId);
        setProfile({
          ...profile,
          isFollowing: false,
          _count: { ...profile._count, followers: profile._count.followers - 1 },
        });
      } else {
        await followUser(userId);
        setProfile({
          ...profile,
          isFollowing: true,
          _count: { ...profile._count, followers: profile._count.followers + 1 },
        });
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">User not found</p>
          <Link to="/users" className="text-orange-500 hover:text-orange-400">
            Search for users
          </Link>
        </div>
      </div>
    );
  }

  // Group tags by country
  const tagsByCountry: Record<string, any[]> = {};
  worldData?.tags.forEach((tag) => {
    if (!tagsByCountry[tag.scopeId]) {
      tagsByCountry[tag.scopeId] = [];
    }
    tagsByCountry[tag.scopeId].push(tag);
  });

  // Group articles by country
  const articlesByCountry: Record<string, any[]> = {};
  worldData?.articles.forEach((article) => {
    article.countryLinks?.forEach((link: any) => {
      if (!articlesByCountry[link.country.name]) {
        articlesByCountry[link.country.name] = [];
      }
      articlesByCountry[link.country.name].push(article);
    });
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-orange-500 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold font-mono">@{profile.username}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Profile Card */}
        <div className="border border-orange-500 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-800 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold font-mono">{profile.displayName || profile.username}</h2>
                {profile.isFollowedBy && (
                  <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 border border-orange-500/30">
                    Follows you
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400 mb-2">@{profile.username}</div>
              {profile.bio && <p className="text-gray-400 mb-4">{profile.bio}</p>}
              <div className="flex items-center gap-6 text-sm mb-4">
                <div>
                  <span className="font-bold text-white">{profile._count.followers}</span>
                  <span className="text-gray-400 ml-1">followers</span>
                </div>
                <div>
                  <span className="font-bold text-white">{profile._count.following}</span>
                  <span className="text-gray-400 ml-1">following</span>
                </div>
                <div>
                  <span className="font-bold text-white">{profile._count.articles}</span>
                  <span className="text-gray-400 ml-1">articles</span>
                </div>
              </div>
              
              {!profile.isOwner && (
                <div className="flex gap-3">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      profile.isFollowing
                        ? 'bg-gray-800 text-white border border-orange-500/30 hover:bg-gray-700'
                        : 'bg-orange-500 text-black hover:bg-orange-400'
                    }`}
                  >
                    {followLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : profile.isFollowing ? (
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
                  {isSignedIn && (
                    <Link
                      to={`/messages/${profile.id}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-orange-500 text-orange-500 hover:bg-orange-500/10 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Link>
                  )}
                </div>
              )}
              
              {profile.isOwner && (
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-orange-500 text-orange-500 hover:bg-orange-500/10 transition-colors"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-orange-500 mb-6">
          <div className="flex">
            {(['overview', 'articles', 'tags'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-mono uppercase tracking-wide transition-colors ${
                  activeTab === tab
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="border border-orange-500/30 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-500 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                World Analysis
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {profile.displayName || profile.username} has analyzed {Object.keys(tagsByCountry).length} countries
                and saved {worldData?.articles.length || 0} articles.
              </p>
              <Link
                to={`/?viewUser=${profile.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-black font-semibold hover:bg-orange-400 transition-colors text-sm"
              >
                <Globe className="w-4 h-4" />
                View Their World Map
              </Link>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-orange-500/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <h4 className="font-semibold">Recent Articles</h4>
                </div>
                {worldData?.articles.slice(0, 3).map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2 mb-2 bg-gray-900 hover:bg-gray-800 transition-colors"
                  >
                    <div className="text-sm font-medium truncate">{article.title}</div>
                    <div className="text-xs text-gray-500">{article.source}</div>
                  </a>
                ))}
                {(!worldData?.articles || worldData.articles.length === 0) && (
                  <p className="text-sm text-gray-500">No articles yet</p>
                )}
              </div>
              
              <div className="border border-orange-500/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5 text-orange-500" />
                  <h4 className="font-semibold">Recent Scores</h4>
                </div>
                {worldData?.tags.slice(0, 5).map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2 mb-2 bg-gray-900"
                  >
                    <span className="text-sm text-gray-400">{tag.category}</span>
                    <span className={`font-mono font-bold ${
                      tag.value > 0 ? 'text-green-500' : tag.value < 0 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {tag.value > 0 ? '+' : ''}{tag.value}
                    </span>
                  </div>
                ))}
                {(!worldData?.tags || worldData.tags.length === 0) && (
                  <p className="text-sm text-gray-500">No scores yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'articles' && (
          <div className="space-y-3">
            {worldData?.articles.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No articles saved yet</p>
            ) : (
              worldData?.articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 border border-orange-500/30 hover:bg-gray-900 transition-colors"
                >
                  <div className="font-semibold mb-1">{article.title}</div>
                  {article.summary && (
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">{article.summary}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{article.source}</span>
                    {article.publishDate && (
                      <span>{new Date(article.publishDate).toLocaleDateString()}</span>
                    )}
                    {article.countryLinks?.length > 0 && (
                      <span>
                        {article.countryLinks.map((l: any) => l.country.name).join(', ')}
                      </span>
                    )}
                  </div>
                </a>
              ))
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-4">
            {Object.keys(tagsByCountry).length === 0 ? (
              <p className="text-center py-8 text-gray-400">No scores recorded yet</p>
            ) : (
              Object.entries(tagsByCountry).map(([scopeId, tags]) => (
                <div key={scopeId} className="border border-orange-500/30 p-4">
                  <h4 className="font-semibold mb-3 text-orange-500">Country: {scopeId}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-2 bg-gray-900"
                      >
                        <span className="text-sm text-gray-400">{tag.category}</span>
                        <span className={`font-mono font-bold ${
                          tag.value > 0 ? 'text-green-500' : tag.value < 0 ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {tag.value > 0 ? '+' : ''}{tag.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
