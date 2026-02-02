import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { createTag, getTags, generateAIScores, getCountryMetricsSpreadsheet, api } from '../lib/api';
import { Plus, Minus, TrendingUp, TrendingDown, X, History, Sparkles, Loader2, Eye } from 'lucide-react';

const categoryConfig = {
  economic: { displayName: 'Economic Growth', dbCategory: 'ECONOMIC' },
  social: { displayName: 'Social Cohesion', dbCategory: 'SOCIAL' },
  political: { displayName: 'Political Stability', dbCategory: 'POLITICAL' },
  ideological: { displayName: 'Conservative or Progressive', dbCategory: 'IDEOLOGICAL' },
};

export function QualitativeTagsEditor() {
  const { contextData, selectedCountryId, refreshContext, countryUserOverrides, networkUsers, bumpTagsVersion } = useStore();
  
  // Check if viewing another user's data for this country
  const currentOverrideUserId = selectedCountryId ? countryUserOverrides[selectedCountryId] : null;
  const isViewingOtherUser = currentOverrideUserId !== null && currentOverrideUserId !== undefined;
  const overrideUserInfo = isViewingOtherUser ? networkUsers.find(u => u.id === currentOverrideUserId) : null;
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<Record<string, string>>({});
  
  // Tags from the overridden user (if any)
  const [overrideTags, setOverrideTags] = useState<any[]>([]);
  
  // Fetch the override user's tags when viewing another user
  useEffect(() => {
    const fetchOverrideTags = async () => {
      if (!selectedCountryId || !isViewingOtherUser || !currentOverrideUserId) {
        setOverrideTags([]);
        return;
      }
      
      try {
        const response = await getTags('country', selectedCountryId, currentOverrideUserId);
        setOverrideTags(response.data.all || []);
      } catch (error) {
        console.error('Error fetching override tags:', error);
        setOverrideTags([]);
      }
    };
    
    fetchOverrideTags();
  }, [selectedCountryId, isViewingOtherUser, currentOverrideUserId]);
  
  // Use override tags if viewing another user, otherwise use context data tags
  const displayTags = isViewingOtherUser ? overrideTags : (contextData?.tags || []);
  const [hasAggregatedData, setHasAggregatedData] = useState(false);
  const [generatingScores, setGeneratingScores] = useState(false);
  const [aiScores, setAiScores] = useState<{
    economic: number;
    social: number;
    political: number;
    ideological: number;
    reasoning: Record<string, string>;
  } | null>(null);
  
  // Check if aggregated data exists
  useEffect(() => {
    const checkAggregatedData = async () => {
      if (!selectedCountryId) {
        setHasAggregatedData(false);
        return;
      }
      try {
        const response = await getCountryMetricsSpreadsheet(selectedCountryId, new Date().getFullYear());
        // Check if any metrics have values
        const hasData = response.data?.dataPointCount > 0;
        setHasAggregatedData(hasData);
      } catch {
        setHasAggregatedData(false);
      }
    };
    checkAggregatedData();
  }, [selectedCountryId, contextData]);
  
  const handleGenerateScores = async () => {
    if (!selectedCountryId || generatingScores) return;
    
    setGeneratingScores(true);
    setAiScores(null);
    
    try {
      const response = await generateAIScores(selectedCountryId, new Date().getFullYear());
      setAiScores(response.data.scores);
      
      // Pre-fill the score inputs
      setScoreInput({
        economic: response.data.scores.economic.toString(),
        social: response.data.scores.social.toString(),
        political: response.data.scores.political.toString(),
        ideological: response.data.scores.ideological.toString(),
      });
    } catch (error: any) {
      console.error('Error generating scores:', error);
      alert(error?.response?.data?.error || 'Failed to generate scores');
    } finally {
      setGeneratingScores(false);
    }
  };
  
  const handleApplyAllScores = async () => {
    if (!aiScores || !selectedCountryId) return;
    
    const scopeType = 'country';
    const scopeId = selectedCountryId;
    
    setLoading('all');
    try {
      for (const category of ['economic', 'social', 'political', 'ideological'] as const) {
        const score = aiScores[category];
        if (score !== 0) {
          await createTag({
            scopeType,
            scopeId,
            category: categoryConfig[category].dbCategory,
            value: score,
            note: `AI-generated: ${aiScores.reasoning[category]}`,
          });
        }
      }
      await refreshContext();
      bumpTagsVersion();
      setAiScores(null);
      setScoreInput({});
    } catch (error) {
      console.error('Error applying scores:', error);
    } finally {
      setLoading(null);
    }
  };

  if (!contextData) return null;

  const handleAddScore = async (category: keyof typeof categoryConfig) => {
    const scopeType = 'country';
    const scopeId = selectedCountryId;
    const score = parseInt(scoreInput[category] || '0');

    if (!scopeId || score === 0) return;

    setLoading(category);
    try {
      await createTag({
        scopeType,
        scopeId,
        category: categoryConfig[category].dbCategory,
        value: score,
      });
      setScoreInput({ ...scoreInput, [category]: '' });
      await refreshContext();
      bumpTagsVersion();
    } catch (error) {
      console.error('Error adding score:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteTag = async (tagId: string, category: string) => {
    setLoading(category);
    try {
      await api.delete(`/tags/${tagId}`);
      await refreshContext();
      bumpTagsVersion();
    } catch (error) {
      console.error('Error deleting tag:', error);
    } finally {
      setLoading(null);
    }
  };

  const categories = Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>;

  const themeColor = isViewingOtherUser ? 'yellow' : 'orange';
  const borderClass = isViewingOtherUser ? 'border-yellow-500' : 'border-orange-500';
  const textClass = isViewingOtherUser ? 'text-yellow-500' : 'text-orange-500';
  const bgClass = isViewingOtherUser ? 'bg-yellow-500' : 'bg-orange-500';
  const hoverBgClass = isViewingOtherUser ? 'hover:bg-yellow-400' : 'hover:bg-orange-400';

  return (
    <div className="space-y-4">
      {/* Viewing other user indicator */}
      {isViewingOtherUser && overrideUserInfo && (
        <div className="border border-yellow-500/50 p-3 bg-yellow-500/10 flex items-center gap-2">
          <Eye className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-yellow-500">
            Viewing <span className="font-bold">@{overrideUserInfo.username}</span>'s scores (read-only)
          </span>
        </div>
      )}
      
      {/* AI Score Generation Button - only show when editing own data */}
      {selectedCountryId && hasAggregatedData && !isViewingOtherUser && (
        <div className={`border ${borderClass}/50 p-3 ${bgClass.replace('bg-', 'bg-')}/5`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${textClass}`} />
              <span className={`text-sm font-semibold ${textClass} uppercase tracking-wide`}>AI Score Generation</span>
            </div>
          </div>
          
          {!aiScores ? (
            <button
              onClick={handleGenerateScores}
              disabled={generatingScores}
              className={`w-full px-4 py-2 ${bgClass} text-black font-medium uppercase tracking-wide ${hoverBgClass} transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {generatingScores ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing data...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Scores from Aggregated Data
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {categories.map((cat) => (
                  <div key={cat} className={`flex items-center justify-between p-2 bg-black border ${borderClass}/30`}>
                    <span className="text-gray-400">{categoryConfig[cat].displayName}:</span>
                    <span className={`font-bold ${
                      aiScores[cat] > 0 ? 'text-green-400' : 
                      aiScores[cat] < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {aiScores[cat] > 0 ? '+' : ''}{aiScores[cat]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApplyAllScores}
                  disabled={loading === 'all'}
                  className={`flex-1 px-3 py-2 ${bgClass} text-black font-medium uppercase tracking-wide ${hoverBgClass} transition-colors text-xs flex items-center justify-center gap-1 disabled:opacity-50`}
                >
                  {loading === 'all' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Apply All Scores
                </button>
                <button
                  onClick={() => setAiScores(null)}
                  className={`px-3 py-2 bg-gray-800 text-white border ${borderClass}/30 hover:bg-gray-700 transition-colors text-xs uppercase tracking-wide`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {categories.map((category) => {
        const config = categoryConfig[category];
        const categoryTags = displayTags.filter(
          (t: any) => t.category.toLowerCase() === config.dbCategory.toLowerCase()
        );
        
        // Calculate rolling score (sum of all values)
        const totalScore = categoryTags.reduce((sum, tag) => sum + tag.value, 0);
        const isExpanded = expandedCategory === category;

        return (
          <div key={category} className={`border ${borderClass}/30 p-3 bg-black`}>
            {/* Header with category and current score */}
            <div className={`flex items-center justify-between ${isViewingOtherUser ? '' : 'mb-3'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white uppercase tracking-wide">{config.displayName}</span>
                <div className={`flex items-center gap-1 px-2 py-1 text-xs font-bold ${
                  totalScore > 0 ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                  totalScore < 0 ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                  'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                }`}>
                  {totalScore > 0 ? <TrendingUp className="w-3 h-3" /> : 
                   totalScore < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  <span>{totalScore > 0 ? '+' : ''}{totalScore}</span>
                </div>
              </div>
              
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className={`p-1 text-gray-400 hover:${textClass} hover:${bgClass}/10 transition-colors`}
              >
                <History className="w-4 h-4" />
              </button>
            </div>

            {/* Score Input - only show when editing own data */}
            {!isViewingOtherUser && (
              <div className="flex gap-2 mb-3 mt-3">
                <div className="flex-1 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const currentValue = parseInt(scoreInput[category] || '0', 10);
                      const newValue = currentValue - 1;
                      setScoreInput({ ...scoreInput, [category]: newValue.toString() });
                    }}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 transition-colors"
                    title="Decrease by 1"
                    type="button"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={scoreInput[category] || ''}
                    onChange={(e) => setScoreInput({ ...scoreInput, [category]: e.target.value })}
                    onKeyDown={(e) => {
                      // Prevent default behavior for arrow keys to avoid conflicts
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const currentValue = parseInt(scoreInput[category] || '0', 10);
                        if (e.key === 'ArrowUp') {
                          setScoreInput({ ...scoreInput, [category]: (currentValue + 1).toString() });
                        } else {
                          setScoreInput({ ...scoreInput, [category]: (currentValue - 1).toString() });
                        }
                      }
                    }}
                    placeholder="±"
                    className={`flex-1 px-3 py-2 bg-black border ${borderClass}/50 text-white text-sm text-center focus:outline-none focus:${borderClass} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-mono`}
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const currentValue = parseInt(scoreInput[category] || '0', 10);
                      const newValue = currentValue + 1;
                      setScoreInput({ ...scoreInput, [category]: newValue.toString() });
                    }}
                    className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 transition-colors"
                    title="Increase by 1"
                    type="button"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleAddScore(category)}
                  disabled={loading === category || !scoreInput[category]}
                  className={`px-4 py-2 ${bgClass} text-black font-medium uppercase tracking-wide ${hoverBgClass} transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm`}
                >
                  Add
                </button>
              </div>
            )}

            {/* History */}
            {isExpanded && categoryTags.length > 0 && (
              <div className={`space-y-1 border-t ${borderClass}/30 pt-3 max-h-48 overflow-y-auto mt-3`}>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">History ({categoryTags.length} entries)</p>
                {categoryTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`flex items-center justify-between p-2 bg-gray-900/50 border ${borderClass}/20 hover:${borderClass}/40 transition-colors group`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`text-sm font-bold ${
                        tag.value > 0 ? 'text-green-400' : 
                        tag.value < 0 ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {tag.value > 0 ? '+' : ''}{tag.value}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(tag.createdAt).toLocaleDateString()} {new Date(tag.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {tag.note && (
                        <span className="text-xs text-gray-500 italic">• {tag.note}</span>
                      )}
                    </div>
                    {/* Delete button - only show when editing own data */}
                    {!isViewingOtherUser && (
                      <button
                        onClick={() => handleDeleteTag(tag.id, category)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 transition-all"
                        title="Delete entry"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isExpanded && categoryTags.length === 0 && (
              <p className={`text-xs text-gray-500 text-center py-4 border-t ${borderClass}/30 mt-3`}>
                {isViewingOtherUser ? 'No history for this category.' : 'No history yet. Add your first score above.'}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
