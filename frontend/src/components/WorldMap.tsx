import { useEffect, useState, useCallback } from 'react';
import Map, { Source, Layer, MapLayerMouseEvent } from 'react-map-gl';
import { useStore } from '../store/useStore';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getTags } from '../lib/api';
import { ChevronDown } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Color interpolation functions
function interpolateColor(score: number, category: string): string {
  // Clamp score between -10 and +10
  const clampedScore = Math.max(-10, Math.min(10, score));
  
  // Normalize to 0-1 range
  const normalized = (clampedScore + 10) / 20; // Maps -10 to 0, +10 to 1, 0 to 0.5
  
  if (category === 'political') {
    // Special case: red -> pink -> blue
    if (normalized < 0.5) {
      // Red to Pink (0 to 0.5)
      const t = normalized * 2; // 0 to 1
      const r = Math.round(255);
      const g = Math.round(192 * t);
      const b = Math.round(203 * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Pink to Blue (0.5 to 1)
      const t = (normalized - 0.5) * 2; // 0 to 1
      const r = Math.round(255 - (255 - 100) * t);
      const g = Math.round(192 - (192 - 149) * t);
      const b = Math.round(203 + (255 - 203) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  } else if (category === 'ideological') {
    // Conservative (red) to Progressive (blue)
    const r = Math.round(255 - 155 * normalized); // 255 -> 100
    const g = Math.round(100 * normalized);       // 0 -> 100
    const b = Math.round(255 * normalized);       // 0 -> 255
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Direct red to green (no yellow) for economic and social
    // Red (#FF0000) at -10, Green (#00FF00) at +10
    const r = Math.round(255 * (1 - normalized)); // 255 -> 0
    const g = Math.round(255 * normalized);       // 0 -> 255
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  }
}

const categoryDisplayNames = {
  economic: 'Economic Growth',
  social: 'Social Cohesion',
  political: 'Political Stability',
  ideological: 'Conservative or Progressive',
};

export function WorldMap() {
  const { countries, selectCountry, selectedCountryId, colorDimension, setColorDimension, contextData, viewMode, selectedNetworkUserId, countryUserOverrides } = useStore();
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredIso3, setHoveredIso3] = useState<string | null>(null);
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Track which countries have user overrides (for yellow borders)
  const [countriesWithOverrides, setCountriesWithOverrides] = useState<Set<string>>(new Set());

  // Fetch tags for all countries to color the map
  // Respects per-country user overrides
  useEffect(() => {
    const fetchAllTags = async () => {
      const colors: Record<string, string> = {};
      const overrideCountries = new Set<string>();
      
      for (const country of countries) {
        try {
          // Check for per-country override first, then fall back to global view mode
          let userIdToFetch: string | undefined;
          
          if (country.id in countryUserOverrides) {
            const overrideUserId = countryUserOverrides[country.id];
            if (overrideUserId) {
              userIdToFetch = overrideUserId;
              overrideCountries.add(country.iso3);
            }
          } else if (viewMode === 'network' && selectedNetworkUserId) {
            userIdToFetch = selectedNetworkUserId;
          }
          
          const response = await getTags('country', country.id, userIdToFetch);
          const allTags = response.data.all || [];
          
          // Filter tags for the selected dimension and calculate rolling score
          const dimensionTags = allTags.filter(
            (tag: any) => tag.category.toLowerCase() === colorDimension
          );
          
          if (dimensionTags.length > 0) {
            const totalScore = dimensionTags.reduce((sum: number, tag: any) => sum + tag.value, 0);
            // Use color interpolation for heat map
            colors[country.iso3] = interpolateColor(totalScore, colorDimension);
          } else {
            colors[country.iso3] = '#374151'; // gray (no data)
          }
        } catch (error) {
          colors[country.iso3] = '#374151';
        }
      }
      
      setCountryColors(colors);
      setCountriesWithOverrides(overrideCountries);
    };

    if (countries.length > 0) {
      fetchAllTags();
    }
  }, [countries, colorDimension, contextData, viewMode, selectedNetworkUserId, countryUserOverrides]);

  const onClick = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature && feature.properties) {
      // Mapbox country-boundaries-v1 uses iso_3166_1_alpha_3
      const iso3 = feature.properties.iso_3166_1_alpha_3 || feature.properties.ISO_A3;
      const country = countries.find((c) => c.iso3 === iso3);
      if (country) {
        selectCountry(country.id);
        console.log('Selected country:', country.name, 'ISO3:', iso3);
      } else {
        console.log('Country not found for ISO3:', iso3, 'Available:', Object.keys(feature.properties));
      }
    }
  }, [countries, selectCountry]);

  const onMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature && feature.properties) {
      const name = feature.properties.name_en || feature.properties.NAME || feature.properties.name;
      const iso3 = feature.properties.iso_3166_1_alpha_3 || feature.properties.ISO_A3;
      setHoveredCountry(name);
      setHoveredIso3(iso3);
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredCountry(null);
    setHoveredIso3(null);
  }, []);

  // Get selected country ISO3 for highlighting
  const selectedIso3 = selectedCountryId 
    ? countries.find(c => c.id === selectedCountryId)?.iso3 
    : null;

  // Create color expression for the fill layer
  const fillColorExpression: any = Object.keys(countryColors).length > 0 
    ? [
        'match',
        ['get', 'iso_3166_1_alpha_3'],
        ...Object.entries(countryColors).flatMap(([iso3, color]) => [iso3, color]),
        '#1f2937' // default
      ]
    : '#1f2937'; // Use simple color until we have country data

  // Create border color expression to highlight selected country and countries with overrides
  // Priority: selected (blue) > override (yellow) > hover (light blue) > default (white)
  const overrideIso3List = Array.from(countriesWithOverrides);
  
  const borderColorExpression: any = [
    'case',
    ['==', ['get', 'iso_3166_1_alpha_3'], selectedIso3 || ''],
    '#3b82f6', // blue for selected
    // Check if country has an override (yellow)
    ...(overrideIso3List.length > 0 
      ? [['in', ['get', 'iso_3166_1_alpha_3'], ['literal', overrideIso3List]], '#eab308'] // yellow for overrides
      : []),
    ['==', ['get', 'iso_3166_1_alpha_3'], hoveredIso3 || ''],
    '#60a5fa', // lighter blue for hover
    '#ffffff' // default white
  ];

  const borderWidthExpression: any = [
    'case',
    ['==', ['get', 'iso_3166_1_alpha_3'], selectedIso3 || ''],
    3, // thicker for selected
    // Thicker border for countries with overrides
    ...(overrideIso3List.length > 0 
      ? [['in', ['get', 'iso_3166_1_alpha_3'], ['literal', overrideIso3List]], 2]
      : []),
    ['==', ['get', 'iso_3166_1_alpha_3'], hoveredIso3 || ''],
    2, // medium for hover
    1 // default
  ];

  return (
    <div className="relative w-full h-full">
      {/* Metric Selector Dropdown - positioned below the Select Country button area */}
      <div className="absolute top-16 left-4 z-10">
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="bg-black border border-orange-500 px-4 py-2 shadow-lg flex items-center gap-2 hover:bg-orange-500 hover:text-black transition-colors text-white"
          >
            <span className="text-sm font-medium uppercase tracking-wide">
              {categoryDisplayNames[colorDimension]}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-black border border-orange-500 shadow-lg overflow-hidden min-w-[220px]">
              {(Object.keys(categoryDisplayNames) as Array<keyof typeof categoryDisplayNames>).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setColorDimension(key);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm uppercase tracking-wide transition-colors ${
                    colorDimension === key ? 'bg-orange-500 text-black' : 'text-white hover:bg-orange-500/20'
                  }`}
                >
                  {categoryDisplayNames[key]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 1.5,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        interactiveLayerIds={['countries-fill']}
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        cursor={hoveredCountry ? 'pointer' : 'grab'}
      >
        <Source
          id="countries"
          type="vector"
          url="mapbox://mapbox.country-boundaries-v1"
        >
          <Layer
            id="countries-fill"
            type="fill"
            source-layer="country_boundaries"
            paint={{
              'fill-color': fillColorExpression,
              'fill-opacity': [
                'case',
                ['==', ['get', 'iso_3166_1_alpha_3'], selectedIso3 || ''],
                0.9, // more opaque for selected
                ['==', ['get', 'iso_3166_1_alpha_3'], hoveredIso3 || ''],
                0.85, // slightly more opaque for hover
                0.7 // default
              ],
            }}
          />
          <Layer
            id="countries-border"
            type="line"
            source-layer="country_boundaries"
            paint={{
              'line-color': borderColorExpression,
              'line-width': borderWidthExpression,
              'line-opacity': [
                'case',
                ['==', ['get', 'iso_3166_1_alpha_3'], selectedIso3 || ''],
                1.0, // full opacity for selected
                ['==', ['get', 'iso_3166_1_alpha_3'], hoveredIso3 || ''],
                0.8, // high opacity for hover
                0.3 // default
              ],
            }}
          />
        </Source>
      </Map>

      {/* Hover Tooltip */}
      {hoveredCountry && (
        <div className="absolute top-4 left-4 bg-black border border-orange-500 px-4 py-2 shadow-lg">
          <p className="text-sm font-medium text-white uppercase tracking-wide">{hoveredCountry}</p>
        </div>
      )}

      {/* Color Legend */}
      <div className="absolute bottom-4 left-4 bg-black border border-orange-500 p-4 shadow-lg">
        <p className="text-xs font-semibold mb-3 uppercase text-orange-500 tracking-wide">
          {categoryDisplayNames[colorDimension]} Score
        </p>
        <div className="space-y-2">
          {colorDimension === 'political' ? (
            // Special legend for Political Stability (red -> pink -> blue)
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: interpolateColor(-10, 'political') }}></div>
                <span className="text-xs text-white">-10 (Red)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: interpolateColor(0, 'political') }}></div>
                <span className="text-xs text-white">0 (Pink)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: interpolateColor(10, 'political') }}></div>
                <span className="text-xs text-white">+10 (Blue)</span>
              </div>
            </>
          ) : colorDimension === 'ideological' ? (
            // Conservative (red) to Progressive (blue)
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: interpolateColor(-10, 'ideological') }}></div>
                <span className="text-xs text-white">-10 Conservative</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: interpolateColor(0, 'ideological') }}></div>
                <span className="text-xs text-white">0 (Purple)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: interpolateColor(10, 'ideological') }}></div>
                <span className="text-xs text-white">+10 Progressive</span>
              </div>
            </>
          ) : (
            // Standard legend (red -> green, no yellow)
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: interpolateColor(-10, 'economic') }}></div>
                <span className="text-xs text-white">-10 (Red)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4" style={{ backgroundColor: interpolateColor(10, 'economic') }}></div>
                <span className="text-xs text-white">+10 (Green)</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2 pt-2 border-t border-orange-500/30">
            <div className="w-4 h-4 bg-gray-700"></div>
            <span className="text-xs text-white">No Data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
