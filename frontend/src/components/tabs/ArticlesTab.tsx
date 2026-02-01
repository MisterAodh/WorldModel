import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { createArticle, getArticles, api } from '../../lib/api';
import { ExternalLink, Plus, Loader2, Edit2, Save, X, Eye } from 'lucide-react';

export function ArticlesTab() {
  const { contextData, selectedCountryId, selectedRegionId, refreshContext, countryUserOverrides, networkUsers } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [keyNotes, setKeyNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editKeyNotes, setEditKeyNotes] = useState('');
  
  // Check if viewing another user's data for this country
  const currentOverrideUserId = selectedCountryId ? countryUserOverrides[selectedCountryId] : null;
  const isViewingOtherUser = currentOverrideUserId !== null && currentOverrideUserId !== undefined;
  const overrideUserInfo = isViewingOtherUser ? networkUsers.find(u => u.id === currentOverrideUserId) : null;
  
  // Override articles when viewing another user
  const [overrideArticles, setOverrideArticles] = useState<any[]>([]);
  
  // Fetch the override user's articles
  useEffect(() => {
    const fetchOverrideArticles = async () => {
      if (!selectedCountryId || !isViewingOtherUser || !currentOverrideUserId) {
        setOverrideArticles([]);
        return;
      }
      
      try {
        const response = await getArticles({ countryId: selectedCountryId, userId: currentOverrideUserId });
        setOverrideArticles(response.data || []);
      } catch (error) {
        console.error('Error fetching override articles:', error);
        setOverrideArticles([]);
      }
    };
    
    fetchOverrideArticles();
  }, [selectedCountryId, isViewingOtherUser, currentOverrideUserId]);
  
  // Use override articles if viewing another user, otherwise use context data articles
  const displayArticles = isViewingOtherUser ? overrideArticles : (contextData?.articles || []);
  
  // Theme colors
  const borderClass = isViewingOtherUser ? 'border-yellow-500' : 'border-orange-500';
  const textClass = isViewingOtherUser ? 'text-yellow-500' : 'text-orange-500';
  const bgClass = isViewingOtherUser ? 'bg-yellow-500' : 'bg-orange-500';

  if (!contextData) return null;

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const scopeId = selectedCountryId || selectedRegionId;
    if (!scopeId) return;

    setLoading(true);
    try {
      await createArticle({
        url: url.trim(),
        countryIds: selectedCountryId ? [selectedCountryId] : [],
        keyNotes: keyNotes.trim() || undefined,
        title: title.trim() || undefined,
      });
      await refreshContext();
      setUrl('');
      setTitle('');
      setKeyNotes('');
      setShowAddForm(false);
    } catch (error: any) {
      console.error('Error adding article:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to add article. Please check the URL and try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article.id);
    setEditTitle(article.title);
    setEditKeyNotes(article.keyNotes || '');
  };

  const handleSaveEdit = async (articleId: string) => {
    setLoading(true);
    try {
      await api.patch(`/articles/${articleId}`, {
        title: editTitle,
        keyNotes: editKeyNotes,
      });
      await refreshContext();
      setEditingArticle(null);
    } catch (error) {
      console.error('Error updating article:', error);
      alert('Failed to update article.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingArticle(null);
    setEditTitle('');
    setEditKeyNotes('');
  };

  return (
    <div className="p-6 space-y-4 bg-black">
      {/* Viewing other user indicator */}
      {isViewingOtherUser && overrideUserInfo && (
        <div className="border border-yellow-500/50 p-3 bg-yellow-500/10 flex items-center gap-2">
          <Eye className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-yellow-500">
            Viewing <span className="font-bold">@{overrideUserInfo.username}</span>'s articles (read-only)
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${textClass}`}>
          Linked Articles ({displayArticles.length})
        </h3>
        {/* Only show add button when editing own data */}
        {!isViewingOtherUser && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`p-2 text-white hover:${bgClass} hover:text-black border ${borderClass}/50 transition-colors`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {showAddForm && !isViewingOtherUser && (
        <form onSubmit={handleAddArticle} className={`space-y-3 bg-black p-4 border ${borderClass}/50`}>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block uppercase tracking-wide">Article URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className={`w-full px-3 py-2 bg-black border ${borderClass}/50 text-white text-sm focus:outline-none focus:${borderClass} font-mono`}
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block uppercase tracking-wide">Custom Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave blank to auto-fetch from URL"
              className={`w-full px-3 py-2 bg-black border ${borderClass}/50 text-white text-sm focus:outline-none focus:${borderClass}`}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 mb-1 block uppercase tracking-wide">Key Notes (Optional)</label>
            <textarea
              value={keyNotes}
              onChange={(e) => setKeyNotes(e.target.value)}
              placeholder="Add your notes about this article..."
              className={`w-full px-3 py-2 bg-black border ${borderClass}/50 text-white text-sm focus:outline-none focus:${borderClass} resize-none`}
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 ${bgClass} text-black font-medium uppercase tracking-wide hover:opacity-80 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Article'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setUrl('');
                setTitle('');
                setKeyNotes('');
              }}
              className={`px-4 py-2 bg-gray-800 text-white border ${borderClass}/30 hover:bg-gray-700 transition-colors text-sm font-medium uppercase tracking-wide`}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {displayArticles.map((article: any) => (
          <div
            key={article.id}
            className={`p-4 bg-gray-900/50 border ${borderClass}/20 space-y-3`}
          >
            {editingArticle === article.id && !isViewingOtherUser ? (
              // Edit mode
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1 block uppercase tracking-wide">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className={`w-full px-3 py-2 bg-black border ${borderClass}/50 text-white text-sm focus:outline-none focus:${borderClass}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1 block uppercase tracking-wide">Key Notes</label>
                  <textarea
                    value={editKeyNotes}
                    onChange={(e) => setEditKeyNotes(e.target.value)}
                    className={`w-full px-3 py-2 bg-black border ${borderClass}/50 text-white text-sm focus:outline-none focus:${borderClass} resize-none`}
                    rows={3}
                    placeholder="Add your key notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(article.id)}
                    disabled={loading}
                    className={`flex items-center gap-1 px-3 py-1 ${bgClass} text-black font-medium uppercase tracking-wide hover:opacity-80 transition-colors text-xs disabled:opacity-50`}
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className={`flex items-center gap-1 px-3 py-1 bg-gray-800 text-white border ${borderClass}/30 hover:bg-gray-700 transition-colors text-xs uppercase tracking-wide`}
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold line-clamp-2 flex-1 text-white">{article.title}</h4>
                  <div className="flex gap-1 flex-shrink-0">
                    {/* Only show edit button when editing own data */}
                    {!isViewingOtherUser && (
                      <button
                        onClick={() => handleEditArticle(article)}
                        className={`p-1 text-gray-400 hover:${textClass} hover:${bgClass}/10 transition-colors`}
                        title="Edit article"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-1 ${textClass} hover:${bgClass} hover:text-black transition-colors`}
                      title={`Open: ${article.url}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                {article.keyNotes && (
                  <div className={`bg-black/50 p-2 border-l-2 ${borderClass}`}>
                    <p className={`text-xs font-semibold ${textClass} mb-1 uppercase tracking-wide`}>Key Notes:</p>
                    <p className="text-xs text-gray-300 whitespace-pre-wrap">{article.keyNotes}</p>
                  </div>
                )}
                {article.summary && (
                  <p className="text-xs text-gray-400 line-clamp-3">
                    {article.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">{article.source}</span>
                  {article.publishDate && (
                    <span className="text-xs text-gray-500">
                      • {new Date(article.publishDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {article.countryLinks && article.countryLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.countryLinks.map((link: any) => (
                      <span
                        key={link.country.id}
                        className={`px-2 py-1 ${bgClass}/20 ${textClass} text-xs border ${borderClass}/50`}
                      >
                        {link.country.name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {displayArticles.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            {isViewingOtherUser 
              ? `No articles linked by @${overrideUserInfo?.username || 'this user'}.`
              : 'No articles linked yet. Add one above.'
            }
          </p>
        )}
      </div>
    </div>
  );
}
