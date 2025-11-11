import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getSuggestions, approveSuggestion, rejectSuggestion } from '../../lib/api';
import { Check, X, ExternalLink } from 'lucide-react';

type Suggestion = {
  id: string;
  suggestionType: string;
  payload: any;
  citations: any;
  createdAt: string;
};

export function SuggestionsTab() {
  const { selectedCountryId, selectedRegionId, refreshContext } = useStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, [selectedCountryId, selectedRegionId]);

  const fetchSuggestions = async () => {
    const scopeType = selectedCountryId ? 'country' : 'region';
    const scopeId = selectedCountryId || selectedRegionId;

    if (!scopeId) return;

    setLoading(true);
    try {
      const response = await getSuggestions(scopeType, scopeId, 'PENDING');
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveSuggestion(id);
      await fetchSuggestions();
      await refreshContext();
    } catch (error) {
      console.error('Error approving suggestion:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectSuggestion(id);
      await fetchSuggestions();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading suggestions...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-sm font-semibold uppercase text-muted-foreground">
        Pending AI Suggestions ({suggestions.length})
      </h3>

      {suggestions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No pending suggestions. Ask the AI assistant to analyze current conditions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApprove={() => handleApprove(suggestion.id)}
              onReject={() => handleReject(suggestion.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApprove,
  onReject,
}: {
  suggestion: Suggestion;
  onApprove: () => void;
  onReject: () => void;
}) {
  const renderContent = () => {
    const { payload } = suggestion;

    switch (suggestion.suggestionType) {
      case 'qualitative_tag':
        return (
          <div>
            <p className="text-sm font-medium mb-1">
              {payload.category} Tag: {payload.value === 1 ? 'Positive' : payload.value === -1 ? 'Negative' : 'Neutral'}
            </p>
            <p className="text-xs text-muted-foreground">{payload.note}</p>
            {payload.confidence && (
              <p className="text-xs text-muted-foreground mt-1">
                Confidence: {(payload.confidence * 100).toFixed(0)}%
              </p>
            )}
          </div>
        );

      case 'metric_update':
        return (
          <div>
            <p className="text-sm font-medium mb-1">Metrics Update ({payload.year})</p>
            <div className="text-xs text-muted-foreground space-y-1">
              {Object.entries(payload.metrics).map(([key, value]) => (
                <div key={key}>
                  {key}: {String(value)}
                </div>
              ))}
            </div>
          </div>
        );

      case 'industry_update':
        return (
          <div>
            <p className="text-sm font-medium mb-1">Industry Update</p>
            <p className="text-xs text-muted-foreground">
              {payload.industryName}: {payload.gdpSharePercent}% of GDP ({payload.year})
            </p>
          </div>
        );

      default:
        return (
          <p className="text-sm">{suggestion.suggestionType}</p>
        );
    }
  };

  return (
    <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
      {renderContent()}

      {suggestion.citations && suggestion.citations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Sources:</p>
          {suggestion.citations.map((citation: string, idx: number) => (
            <a
              key={idx}
              href={citation}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {new URL(citation).hostname}
            </a>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm font-medium"
        >
          <Check className="w-4 h-4" />
          Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm font-medium"
        >
          <X className="w-4 h-4" />
          Reject
        </button>
      </div>
    </div>
  );
}
