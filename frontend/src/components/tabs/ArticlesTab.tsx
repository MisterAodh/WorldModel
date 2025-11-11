import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { createArticle } from '../../lib/api';
import { ExternalLink, Plus, Loader2 } from 'lucide-react';

export function ArticlesTab() {
  const { contextData, selectedCountryId, selectedRegionId, refreshContext } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

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
      });
      await refreshContext();
      setUrl('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding article:', error);
      alert('Failed to add article. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
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
        <form onSubmit={handleAddArticle} className="space-y-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
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
            className="p-4 bg-secondary/50 rounded-lg space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold line-clamp-2">{article.title}</h4>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-secondary rounded-md transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
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
                {article.countryLinks.map((link) => (
                  <span
                    key={link.country.id}
                    className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-md"
                  >
                    {link.country.name}
                  </span>
                ))}
              </div>
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
