import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { createArticle } from '../../lib/api';
import { ExternalLink, Plus, Loader2, Edit2, Save, X } from 'lucide-react';
import axios from 'axios';

export function ArticlesTab() {
  const { contextData, selectedCountryId, selectedRegionId, refreshContext } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [keyNotes, setKeyNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editKeyNotes, setEditKeyNotes] = useState('');

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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    setLoading(true);
    try {
      await axios.patch(`${apiUrl}/api/articles/${articleId}`, {
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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">
          Linked Articles ({contextData.articles.length})
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-2 hover:bg-secondary rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddArticle} className="space-y-3 bg-secondary/30 p-4 rounded-lg border border-border">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Article URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Custom Title (Optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Leave blank to auto-fetch from URL"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Key Notes (Optional)</label>
            <textarea
              value={keyNotes}
              onChange={(e) => setKeyNotes(e.target.value)}
              placeholder="Add your notes about this article..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {contextData.articles.map((article) => (
          <div
            key={article.id}
            className="p-4 bg-secondary/50 rounded-lg space-y-3"
          >
            {editingArticle === article.id ? (
              // Edit mode
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Key Notes</label>
                  <textarea
                    value={editKeyNotes}
                    onChange={(e) => setEditKeyNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    placeholder="Add your key notes..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(article.id)}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-xs disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-xs"
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
                  <h4 className="text-sm font-semibold line-clamp-2 flex-1">{article.title}</h4>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEditArticle(article)}
                      className="p-1 hover:bg-secondary rounded-md transition-colors"
                      title="Edit article"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-secondary rounded-md transition-colors"
                      title={`Open: ${article.url}`}
                      onClick={(e) => {
                        console.log('🔗 Clicking article link:', {
                          url: article.url,
                          urlLength: article.url.length,
                          startsWithHttp: article.url.startsWith('http'),
                          title: article.title,
                        });
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                {article.keyNotes && (
                  <div className="bg-background/50 p-2 rounded border-l-2 border-primary">
                    <p className="text-xs font-semibold text-primary mb-1">Key Notes:</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{article.keyNotes}</p>
                  </div>
                )}
                {article.summary && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {article.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{article.source}</span>
                  {article.publishDate && (
                    <span className="text-xs text-muted-foreground">
                      • {new Date(article.publishDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {article.countryLinks && article.countryLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {article.countryLinks.map((link: any) => (
                      <span
                        key={link.country.id}
                        className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-md"
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
        {contextData.articles.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No articles linked yet. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}
