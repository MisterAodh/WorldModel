import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { ArrowLeft, User, Settings, CreditCard, Users, MessageSquare, Save, Loader2 } from 'lucide-react';
import { getCurrentUser, updateCurrentUser, getMyFollowers, getMyFollowing, getUsageHistory } from '../lib/api';
import { useStore } from '../store/useStore';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const creditBalance = useStore((state) => state.creditBalance);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    bio: '',
    isPublic: true,
  });
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'followers' | 'following' | 'usage'>('profile');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profileRes, followersRes, followingRes, usageRes] = await Promise.all([
        getCurrentUser(),
        getMyFollowers(),
        getMyFollowing(),
        getUsageHistory(20),
      ]);
      
      setProfile(profileRes.data);
      setFormData({
        username: profileRes.data.username || '',
        displayName: profileRes.data.displayName || '',
        bio: profileRes.data.bio || '',
        isPublic: profileRes.data.isPublic,
      });
      setFollowers(followersRes.data.followers || []);
      setFollowing(followingRes.data.following || []);
      setUsageHistory(usageRes.data.history || []);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCurrentUser(formData);
      await loadProfile();
      setEditMode(false);
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-orange-500 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold font-mono">My Profile</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/billing"
              className="flex items-center gap-2 px-4 py-2 border border-orange-500 text-orange-500 hover:bg-orange-500/10 transition-colors text-sm font-mono"
            >
              <CreditCard className="w-4 h-4" />
              ${(creditBalance / 100).toFixed(2)}
            </Link>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gray-800 text-white border border-orange-500/30 hover:bg-gray-700 transition-colors text-sm font-mono"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Profile Card */}
        <div className="border border-orange-500 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-800 border border-orange-500/30 flex items-center justify-center">
              {clerkUser?.imageUrl ? (
                <img src={clerkUser.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-orange-500/50 text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-orange-500/50 text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Bio</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-900 border border-orange-500/50 text-white font-mono focus:outline-none focus:border-orange-500 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isPublic" className="text-sm text-gray-400">Public profile</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-black font-semibold hover:bg-orange-400 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-gray-800 text-white border border-orange-500/30 hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold font-mono">{profile?.displayName || profile?.username}</h2>
                    <span className="text-sm text-gray-400 font-mono">@{profile?.username}</span>
                  </div>
                  {profile?.bio && <p className="text-gray-400 mb-4">{profile.bio}</p>}
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="font-bold text-white">{followers.length}</span>
                      <span className="text-gray-400 ml-1">followers</span>
                    </div>
                    <div>
                      <span className="font-bold text-white">{following.length}</span>
                      <span className="text-gray-400 ml-1">following</span>
                    </div>
                    <div>
                      <span className="font-bold text-white">{profile?._count?.articles || 0}</span>
                      <span className="text-gray-400 ml-1">articles</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 border border-orange-500 text-orange-500 hover:bg-orange-500/10 transition-colors text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-orange-500 mb-6">
          <div className="flex">
            {(['profile', 'followers', 'following', 'usage'] as const).map((tab) => (
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
        {activeTab === 'followers' && (
          <div className="space-y-3">
            {followers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No followers yet</p>
            ) : (
              followers.map((follower) => (
                <Link
                  key={follower.id}
                  to={`/users/${follower.id}`}
                  className="flex items-center gap-4 p-4 border border-orange-500/30 hover:bg-gray-900 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-800 border border-orange-500/30 flex items-center justify-center">
                    {follower.avatarUrl ? (
                      <img src={follower.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{follower.displayName || follower.username}</div>
                    <div className="text-sm text-gray-400">@{follower.username}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="space-y-3">
            {following.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">You're not following anyone yet</p>
                <Link
                  to="/users"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-black font-semibold hover:bg-orange-400 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Find Users
                </Link>
              </div>
            ) : (
              following.map((user) => (
                <Link
                  key={user.id}
                  to={`/users/${user.id}`}
                  className="flex items-center gap-4 p-4 border border-orange-500/30 hover:bg-gray-900 transition-colors"
                >
                  <div className="w-12 h-12 bg-gray-800 border border-orange-500/30 flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{user.displayName || user.username}</div>
                    <div className="text-sm text-gray-400">@{user.username}</div>
                  </div>
                  <Link
                    to={`/messages/${user.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Link>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'usage' && (
          <div className="space-y-3">
            <div className="border border-orange-500/30 p-4 bg-gray-900 mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-500 mb-2">Usage Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold font-mono">{profile?.usageStats?.totalRequests || 0}</div>
                  <div className="text-xs text-gray-400">Total Requests</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {((profile?.usageStats?.totalInputTokens || 0) + (profile?.usageStats?.totalOutputTokens || 0)).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">Total Tokens</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-orange-500">
                    ${((profile?.usageStats?.totalCostCents || 0) / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">Total Spent</div>
                </div>
              </div>
            </div>
            
            {usageHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No usage history yet</p>
            ) : (
              usageHistory.map((usage) => (
                <div key={usage.id} className="flex items-center justify-between p-4 border border-orange-500/30">
                  <div>
                    <div className="font-mono text-sm">{usage.endpoint}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(usage.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-orange-500">${(usage.costCents / 100).toFixed(4)}</div>
                    <div className="text-xs text-gray-400">
                      {usage.inputTokens + usage.outputTokens} tokens
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="border border-orange-500/30 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-500 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/users"
                  className="flex items-center gap-3 p-4 border border-orange-500/30 hover:bg-gray-900 transition-colors"
                >
                  <Users className="w-6 h-6 text-orange-500" />
                  <div>
                    <div className="font-semibold">Find Users</div>
                    <div className="text-xs text-gray-400">Discover analysts to follow</div>
                  </div>
                </Link>
                <Link
                  to="/messages"
                  className="flex items-center gap-3 p-4 border border-orange-500/30 hover:bg-gray-900 transition-colors"
                >
                  <MessageSquare className="w-6 h-6 text-orange-500" />
                  <div>
                    <div className="font-semibold">Messages</div>
                    <div className="text-xs text-gray-400">View conversations</div>
                  </div>
                </Link>
                <Link
                  to="/billing"
                  className="flex items-center gap-3 p-4 border border-orange-500/30 hover:bg-gray-900 transition-colors"
                >
                  <CreditCard className="w-6 h-6 text-orange-500" />
                  <div>
                    <div className="font-semibold">Billing</div>
                    <div className="text-xs text-gray-400">Manage credits</div>
                  </div>
                </Link>
                <Link
                  to="/app"
                  className="flex items-center gap-3 p-4 border border-orange-500/30 hover:bg-gray-900 transition-colors"
                >
                  <Settings className="w-6 h-6 text-orange-500" />
                  <div>
                    <div className="font-semibold">World Map</div>
                    <div className="text-xs text-gray-400">Back to analysis</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
