import { useStore } from '../store/useStore';
import { OverviewTab } from './tabs/OverviewTab';
import { ArticlesTab } from './tabs/ArticlesTab';
import { DataTab } from './tabs/DataTab';
import { SuggestionsTab } from './tabs/SuggestionsTab';
import { ChatPanel } from './ChatPanel';
import { RegionCreator } from './RegionCreator';
import { useState } from 'react';
import { Globe, X } from 'lucide-react';

type SidebarProps = {
  onOpenArticle: (article: { url: string; title?: string }) => void;
};

export function Sidebar({ onOpenArticle }: SidebarProps) {
  const { contextData, selectedCountryId, selectedRegionId, clearSelection, colorDimension, setColorDimension } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'articles' | 'data' | 'suggestions'>('overview');
  const [showRegionCreator, setShowRegionCreator] = useState(false);

  if (!contextData) {
    return (
      <div className="w-[500px] bg-card border-l border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">World Tracker</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a country or region on the map to view details
          </p>
        </div>

        {/* Color Dimension Selector */}
        <div className="p-6 border-b border-border">
          <p className="text-sm font-semibold mb-3">Color Map By:</p>
          <div className="flex gap-2">
            {(['economic', 'social', 'political'] as const).map((dimension) => (
              <button
                key={dimension}
                onClick={() => setColorDimension(dimension)}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  colorDimension === dimension
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {dimension.charAt(0).toUpperCase() + dimension.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Region Creator */}
        <div className="p-6">
          <button
            onClick={() => setShowRegionCreator(true)}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Create Region
          </button>
        </div>

        {showRegionCreator && (
          <RegionCreator onClose={() => setShowRegionCreator(false)} />
        )}

        <div className="flex-1" />
        
        <ChatPanel />
      </div>
    );
  }

  const contextName = contextData.country?.name || contextData.region?.name || 'Unknown';
  const contextType = selectedCountryId ? 'Country' : 'Region';

  return (
    <div className="w-[500px] bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              {contextType}
            </div>
            <h2 className="text-2xl font-bold">{contextName}</h2>
          </div>
          <button
            onClick={clearSelection}
            className="p-1 hover:bg-secondary rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background">
        <div className="flex">
          {(['overview', 'articles', 'data', 'suggestions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'articles' && <ArticlesTab />}
        {activeTab === 'data' && <DataTab />}
        {activeTab === 'suggestions' && <SuggestionsTab />}
      </div>

      {/* Chat Panel - Always Visible */}
      <ChatPanel onOpenArticle={onOpenArticle} />
    </div>
  );
}
