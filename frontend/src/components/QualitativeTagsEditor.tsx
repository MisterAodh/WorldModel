import { useState } from 'react';
import { useStore } from '../store/useStore';
import { createTag, getTags } from '../lib/api';
import { Plus, Minus, TrendingUp, TrendingDown, X, History } from 'lucide-react';
import axios from 'axios';

export function QualitativeTagsEditor() {
  const { contextData, selectedCountryId, selectedRegionId, refreshContext } = useStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<Record<string, string>>({});

  if (!contextData) return null;

  const handleAddScore = async (category: string) => {
    const scopeType = selectedCountryId ? 'country' : 'region';
    const scopeId = selectedCountryId || selectedRegionId;
    const score = parseInt(scoreInput[category] || '0');

    if (!scopeId || score === 0) return;

    setLoading(category);
    try {
      await createTag({
        scopeType,
        scopeId,
        category: category.toUpperCase(),
        value: score,
      });
      setScoreInput({ ...scoreInput, [category]: '' });
      await refreshContext();
    } catch (error) {
      console.error('Error adding score:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteTag = async (tagId: string, category: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    setLoading(category);
    try {
      await axios.delete(`${apiUrl}/api/tags/${tagId}`);
      await refreshContext();
    } catch (error) {
      console.error('Error deleting tag:', error);
    } finally {
      setLoading(null);
    }
  };

  const categories = ['economic', 'social', 'political'];

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const categoryTags = contextData.tags.filter(
          (t) => t.category.toLowerCase() === category
        );
        
        // Calculate rolling score (sum of all values)
        const totalScore = categoryTags.reduce((sum, tag) => sum + tag.value, 0);
        const isExpanded = expandedCategory === category;

        return (
          <div key={category} className="border border-border rounded-lg p-3 bg-secondary/30">
            {/* Header with category and current score */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold capitalize">{category}</span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
                  totalScore > 0 ? 'bg-green-500/20 text-green-400' :
                  totalScore < 0 ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {totalScore > 0 ? <TrendingUp className="w-3 h-3" /> : 
                   totalScore < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  <span>{totalScore > 0 ? '+' : ''}{totalScore}</span>
                </div>
              </div>
              
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="p-1 hover:bg-secondary rounded-md transition-colors"
              >
                <History className="w-4 h-4" />
              </button>
            </div>

            {/* Score Input */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex gap-1">
                <button
                  onClick={() => setScoreInput({ ...scoreInput, [category]: '-1' })}
                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-colors"
                  title="Add -1"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={scoreInput[category] || ''}
                  onChange={(e) => setScoreInput({ ...scoreInput, [category]: e.target.value })}
                  placeholder="±"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setScoreInput({ ...scoreInput, [category]: '+1' })}
                  className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-md transition-colors"
                  title="Add +1"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => handleAddScore(category)}
                disabled={loading === category || !scoreInput[category]}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Add
              </button>
            </div>

            {/* History */}
            {isExpanded && categoryTags.length > 0 && (
              <div className="space-y-1 border-t border-border pt-3 max-h-48 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2">History ({categoryTags.length} entries)</p>
                {categoryTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-2 bg-background/50 rounded-md hover:bg-background transition-colors group"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`text-sm font-bold ${
                        tag.value > 0 ? 'text-green-400' : 
                        tag.value < 0 ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {tag.value > 0 ? '+' : ''}{tag.value}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tag.createdAt).toLocaleDateString()} {new Date(tag.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {tag.note && (
                        <span className="text-xs text-muted-foreground italic">• {tag.note}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTag(tag.id, category)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"
                      title="Delete entry"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isExpanded && categoryTags.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4 border-t border-border mt-3">
                No history yet. Add your first score above.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

