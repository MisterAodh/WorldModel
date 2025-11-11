import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '../store/useStore';

type Country = {
  id: string;
  name: string;
  iso3: string;
};

export function CountrySelector({ onClose }: { onClose: () => void }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { selectCountry } = useStore();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/countries`);
      if (!res.ok) throw new Error('Failed to fetch countries');
      const data = await res.json();
      setCountries(data);
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.iso3.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCountry = (country: Country) => {
    selectCountry(country.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl w-[600px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold">Select Country</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading countries...</div>
          ) : filteredCountries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No countries found</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredCountries.map((country) => (
                <button
                  key={country.id}
                  onClick={() => handleSelectCountry(country)}
                  className="px-4 py-3 text-left border border-border rounded-md hover:bg-secondary hover:border-primary transition-colors"
                >
                  <div className="font-medium">{country.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{country.iso3}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border text-sm text-muted-foreground text-center">
          {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'}
        </div>
      </div>
    </div>
  );
}

