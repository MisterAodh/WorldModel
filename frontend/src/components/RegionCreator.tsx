import { useState } from 'react';
import { useStore } from '../store/useStore';
import { createRegion } from '../lib/api';
import { X } from 'lucide-react';

export function RegionCreator({ onClose }: { onClose: () => void }) {
  const { countries } = useStore();
  const [name, setName] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const toggleCountry = (countryId: string) => {
    const newSet = new Set(selectedCountries);
    if (newSet.has(countryId)) {
      newSet.delete(countryId);
    } else {
      newSet.add(countryId);
    }
    setSelectedCountries(newSet);
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedCountries.size === 0) return;

    setLoading(true);
    try {
      await createRegion({
        name: name.trim(),
        countryIds: Array.from(selectedCountries),
      });
      onClose();
    } catch (error) {
      console.error('Error creating region:', error);
      alert('Failed to create region');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-bold">Create Region</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium mb-2">Region Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Gulf States, My Watchlist"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select Countries ({selectedCountries.size} selected)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-2 bg-secondary/30 rounded-md">
              {countries.map((country) => (
                <label
                  key={country.id}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    selectedCountries.has(country.id)
                      ? 'bg-primary/20 border border-primary'
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCountries.has(country.id)}
                    onChange={() => toggleCountry(country.id)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm">{country.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || selectedCountries.size === 0}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Region'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
