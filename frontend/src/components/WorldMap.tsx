import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Map, { Source, Layer, MapLayerMouseEvent } from 'react-map-gl';
import { useStore } from '../store/useStore';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getTagsBulk } from '../lib/api';
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
  const { countries, selectCountry, selectedCountryId, colorDimension, setColorDimension, contextData, viewMode, selectedNetworkUserId, countryUserOverrides, authReady } = useStore();
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredIso3, setHoveredIso3] = useState<string | null>(null);
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Track which countries have user overrides (for yellow borders)
  const [countriesWithOverrides, setCountriesWithOverrides] = useState<Set<string>>(new Set());

  // Mapbox map ref so we can push colors via feature-state (much faster than rebuilding huge "match" expressions)
  const mapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const hoveredIso3Ref = useRef<string | null>(null);
  const selectedIso3Ref = useRef<string | null>(null);
  const colorsByIso3Ref = useRef<Record<string, string>>({});
  const overridesIso3Ref = useRef<Set<string>>(new Set());

  const setFeatureStateSafe = useCallback((iso3: string, state: Record<string, any>) => {
    const map = mapRef.current?.getMap?.();
    if (!map || !mapReady) return;
    try {
      map.setFeatureState(
        { source: 'countries', sourceLayer: 'country_boundaries', id: iso3 },
        state
      );
    } catch {
      // If tiles aren't loaded yet, Mapbox may throw. We'll retry on next pass.
    }
  }, [mapReady]);

  const applyInBatches = useCallback(
    (items: string[], applyOne: (iso3: string) => void, batchSize = 40) => {
      let idx = 0;
      const step = () => {
        const end = Math.min(items.length, idx + batchSize);
        for (; idx < end; idx++) applyOne(items[idx]);
        if (idx < items.length) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    []
  );

  // Fetch tags for all countries to color the map
  // Respects per-country user overrides
  useEffect(() => {
    if (!authReady) return;
    console.log('[WorldMap] countries loaded', { count: countries.length });
    const fetchAllTags = async () => {
      const colors: Record<string, string> = {};
      const overrideCountries = new Set<string>();

      // Group countries by which user's tags we should use.
      // This allows us to use the bulk endpoint (1 request per user-group) instead of 190+ requests.
      const groups = new Map<string, { userId?: string; countries: any[] }>();

      for (const country of countries) {
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

        const key = userIdToFetch ?? '__me__';
        const existing = groups.get(key);
        if (existing) {
          existing.countries.push(country);
        } else {
          groups.set(key, { userId: userIdToFetch, countries: [country] });
        }
      }

      const groupResults = await Promise.allSettled(
        Array.from(groups.values()).map(async (group) => {
          const response = await getTagsBulk({
            scopeType: 'country',
            scopeIds: group.countries.map((c) => c.id),
            userId: group.userId,
          });
          return { group, byScopeId: response.data.byScopeId || {} };
        })
      );

      for (const result of groupResults) {
        if (result.status !== 'fulfilled') continue;

        const { group, byScopeId } = result.value as any;
        for (const country of group.countries as any[]) {
          const tags = (byScopeId[country.id] || []) as Array<{ category: string; value: number }>;
          const dimensionTags = tags.filter(
            (tag) => String(tag.category).toLowerCase() === colorDimension
          );

          if (dimensionTags.length > 0) {
            // Bulk endpoint returns latest per category; we only need a single value here.
            colors[country.iso3] = interpolateColor(dimensionTags[0].value || 0, colorDimension);
          } else {
            colors[country.iso3] = '#374151';
          }
        }
      }

      // Ensure overrides are registered even if tag requests fail
      for (const country of countries) {
        if (country.id in countryUserOverrides && countryUserOverrides[country.id]) {
          overrideCountries.add(country.iso3);
        }
      }

      setCountriesWithOverrides(overrideCountries);
      setCountryColors(colors);

      // Push colors onto the map via feature-state in small batches for instant perceived load.
      colorsByIso3Ref.current = colors;
      if (mapReady) {
        const iso3List = Object.keys(colors);
        applyInBatches(
          iso3List,
          (iso3) => setFeatureStateSafe(iso3, { fillColor: colors[iso3] }),
          60
        );
      }
    };

    if (countries.length > 0) {
      fetchAllTags();
    }
  }, [authReady, countries, colorDimension, viewMode, selectedNetworkUserId, countryUserOverrides, mapReady, applyInBatches, setFeatureStateSafe]);

  const onClick = useCallback((event: MapLayerMouseEvent) => {
    console.log('[WorldMap] click event', {
      features: event.features?.length || 0,
      lngLat: event.lngLat,
    });
    const feature = event.features?.[0];
    if (feature && feature.properties) {
      // Mapbox country-boundaries-v1 uses iso_3166_1_alpha_3
      const iso3 = feature.properties.iso_3166_1_alpha_3 || feature.properties.ISO_A3;
      const country = countries.find((c) => c.iso3 === iso3);
      if (country) {
        console.log('[WorldMap] matched country', { iso3, id: country.id, name: country.name });
        selectCountry(country.id);
      } else {
        console.warn('[WorldMap] country not found for ISO3', {
          iso3,
          availableProps: Object.keys(feature.properties),
          countryCount: countries.length,
        });
      }
    } else {
      console.warn('[WorldMap] click without feature');
    }
  }, [countries, selectCountry]);

  const onMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature && feature.properties) {
      const name = feature.properties.name_en || feature.properties.NAME || feature.properties.name;
      const iso3 = feature.properties.iso_3166_1_alpha_3 || feature.properties.ISO_A3;
      setHoveredCountry(name);
      setHoveredIso3(iso3);

      const prev = hoveredIso3Ref.current;
      if (prev && prev !== iso3) setFeatureStateSafe(prev, { hovered: false });
      if (iso3 && prev !== iso3) setFeatureStateSafe(iso3, { hovered: true });
      hoveredIso3Ref.current = iso3 || null;
    }
  }, [setFeatureStateSafe]);

  const onMouseLeave = useCallback(() => {
    setHoveredCountry(null);
    setHoveredIso3(null);
    const prev = hoveredIso3Ref.current;
    if (prev) setFeatureStateSafe(prev, { hovered: false });
    hoveredIso3Ref.current = null;
  }, [setFeatureStateSafe]);

  // Get selected country ISO3 for highlighting
  const selectedIso3 = selectedCountryId 
    ? countries.find(c => c.id === selectedCountryId)?.iso3 
    : null;

  // Keep selected + overrides in feature-state (fast: no huge match expressions)
  useEffect(() => {
    if (!mapReady) return;

    const prevSelected = selectedIso3Ref.current;
    if (prevSelected && prevSelected !== selectedIso3) setFeatureStateSafe(prevSelected, { selected: false });
    if (selectedIso3) setFeatureStateSafe(selectedIso3, { selected: true });
    selectedIso3Ref.current = selectedIso3 || null;
  }, [selectedIso3, mapReady, setFeatureStateSafe]);

  useEffect(() => {
    if (!mapReady) return;

    const next = countriesWithOverrides;
    const prev = overridesIso3Ref.current;
    const toUnset: string[] = [];
    const toSet: string[] = [];

    for (const iso3 of prev) if (!next.has(iso3)) toUnset.push(iso3);
    for (const iso3 of next) if (!prev.has(iso3)) toSet.push(iso3);

    applyInBatches(toUnset, (iso3) => setFeatureStateSafe(iso3, { hasOverride: false }), 80);
    applyInBatches(toSet, (iso3) => setFeatureStateSafe(iso3, { hasOverride: true }), 80);

    overridesIso3Ref.current = new Set(next);
  }, [countriesWithOverrides, mapReady, applyInBatches, setFeatureStateSafe]);

  // When the map becomes ready, apply the latest computed colors immediately.
  useEffect(() => {
    if (!mapReady) return;
    const colors = colorsByIso3Ref.current;
    const iso3List = Object.keys(colors);
    if (iso3List.length === 0) return;
    applyInBatches(
      iso3List,
      (iso3) => setFeatureStateSafe(iso3, { fillColor: colors[iso3] }),
      60
    );
  }, [mapReady, applyInBatches, setFeatureStateSafe]);

  const fallbackFillColorExpression: any = useMemo(() => (
    Object.keys(countryColors).length > 0
      ? [
          'match',
          ['get', 'iso_3166_1_alpha_3'],
          ...Object.entries(countryColors).flatMap(([iso3, color]) => [iso3, color]),
          '#1f2937',
        ]
      : '#1f2937'
  ), [countryColors]);

  const fillColorExpression: any = useMemo(() => ([
    'coalesce',
    ['feature-state', 'fillColor'],
    fallbackFillColorExpression,
  ]), [fallbackFillColorExpression]);

  const borderColorExpression: any = useMemo(() => ([
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    '#3b82f6', // selected
    ['boolean', ['feature-state', 'hasOverride'], false],
    '#eab308', // override
    ['boolean', ['feature-state', 'hovered'], false],
    '#60a5fa', // hover
    '#ffffff',
  ]), []);

  const borderWidthExpression: any = useMemo(() => ([
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    3,
    ['boolean', ['feature-state', 'hasOverride'], false],
    2,
    ['boolean', ['feature-state', 'hovered'], false],
    2,
    1,
  ]), []);

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
        ref={mapRef}
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
        onLoad={() => setMapReady(true)}
        onIdle={() => {
          const colors = colorsByIso3Ref.current;
          const iso3List = Object.keys(colors);
          if (iso3List.length === 0) return;
          applyInBatches(
            iso3List,
            (iso3) => setFeatureStateSafe(iso3, { fillColor: colors[iso3] }),
            80
          );
        }}
      >
        <Source
          id="countries"
          type="vector"
          url="mapbox://mapbox.country-boundaries-v1"
          promoteId={{ country_boundaries: 'iso_3166_1_alpha_3' }}
        >
          <Layer
            id="countries-fill"
            type="fill"
            source-layer="country_boundaries"
            paint={{
              'fill-color': fillColorExpression,
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                0.9, // more opaque for selected
                ['boolean', ['feature-state', 'hovered'], false],
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
                ['boolean', ['feature-state', 'selected'], false],
                1.0, // full opacity for selected
                ['boolean', ['feature-state', 'hovered'], false],
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
