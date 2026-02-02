import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { createArticle } from '../lib/api';

type ArticlePreviewProps = {
  url: string;
  title?: string;
  onClose: () => void;
};

export function ArticlePreview({ url, title, onClose }: ArticlePreviewProps) {
  const { selectedCountryId, refreshContext } = useStore();
  const [adding, setAdding] = useState(false);

  const handleAddArticle = async () => {
    if (!selectedCountryId) return;
    
    setAdding(true);
    try {
      await createArticle({
        url,
        countryIds: selectedCountryId ? [selectedCountryId] : [],
      });
      await refreshContext();
      alert('Article added successfully!');
    } catch (error: any) {
      console.error('Error adding article:', error);
      alert(error?.response?.data?.error || 'Failed to add article');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex-1 mr-4">
          <h3 className="text-sm font-semibold line-clamp-1">{title || 'Article Preview'}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{url}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddArticle}
            disabled={adding || !selectedCountryId}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Adding...' : 'Add to Articles'}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={url}
          className="w-full h-full border-0"
          title="Article Preview"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
}

