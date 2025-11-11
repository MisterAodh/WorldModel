import { useState } from 'react';
import { WorldMap } from './WorldMap';
import { Sidebar } from './Sidebar';
import { ArticlePreview } from './ArticlePreview';
import { CountrySelector } from './CountrySelector';
import { Globe } from 'lucide-react';

export function Layout() {
  const [previewArticle, setPreviewArticle] = useState<{ url: string; title?: string } | null>(null);
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">
      {/* Map Container */}
      <div className="flex-1 relative">
        {previewArticle ? (
          <ArticlePreview
            url={previewArticle.url}
            title={previewArticle.title}
            onClose={() => setPreviewArticle(null)}
          />
        ) : (
          <>
            <WorldMap />
            {/* Floating "Select Country" button */}
            <button
              onClick={() => setShowCountrySelector(true)}
              className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-lg hover:bg-primary/90 transition-colors z-10"
            >
              <Globe className="w-4 h-4" />
              Select Country
            </button>
          </>
        )}
      </div>

      {/* Sidebar */}
      <Sidebar onOpenArticle={setPreviewArticle} />

      {/* Country Selector Modal */}
      {showCountrySelector && <CountrySelector onClose={() => setShowCountrySelector(false)} />}
    </div>
  );
}

