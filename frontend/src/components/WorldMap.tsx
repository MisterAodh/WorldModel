import { useCallback, useEffect, useMemo, useState } from 'react';
import Map, { Layer, MapLayerMouseEvent, Source } from 'react-map-gl';
import { ChevronDown } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getCountry } from '../lib/api';
import { useStore } from '../store/useStore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const NO_DATA_COLOR = '#374151';
const DEFAULT_MAP_COLOR = '#1f2937';

const categoryDisplayNames = {
  economic: 'Economic Growth',
  social: 'Social Cohesion',
  political: 'Political Stability',
  ideological: 'Conservative or Progressive',
};

function interpolateColor(score: number, category: string): string {
  const clampedScore = Math.max(-10, Math.min(10, score));
  const normalized = (clampedScore + 10) / 20;

  if (category === 'political') {
    if (normalized < 0.5) {
      const t = normalized * 2;
      const r = Math.round(255);
      const g = Math.round(192 * t);
      const b = Math.round(203 * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
    const t = (normalized - 0.5) * 2;
    const r = Math.round(255 - (255 - 100) * t);
    const g = Math.round(192 - (192 - 149) * t);
    const b = Math.round(203 + (255 - 203) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  if (category === 'ideological') {
    const r = Math.round(255 - 155 * normalized);
    const g = Math.round(100 * normalized);
    const b = Math.round(255 * normalized);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const r = Math.round(255 * (1 - normalized));
  const g = Math.round(255 * normalized);
  return `rgb(${r}, ${g}, 0)`;
}

export function WorldMap() {
  const {
    countries,
    selectCountry,
    selectedCountryId,
    colorDimension,
    setColorDimension,
    viewMode,
    selectedNetworkUserId,
    countryUserOverrides,
    authReady,
    tagsVersion,
  } = useStore();

  useEffect(() => {
    console.log('[WorldMap] mounted');
    return () => console.log('[WorldMap] unmounted');
  }, []);

  useEffect(() => {
    console.log('[WorldMap] authReady changed', { authReady });
  }, [authReady]);

  useEffect(() => {
    console.log('[WorldMap] countries length changed', { count: countries.length });
  }, [countries.length]);

  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredIso3, setHoveredIso3] = useState<string | null>(null);
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});
  const [countriesWithOverrides, setCountriesWithOverrides] = useState<Set<string>>(new Set());
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!authReady || countries.length === 0) {
      console.log('[WorldMap] skip color fetch', {
        authReady,
        countries: countries.length,
      });
      setCountryColors({});
      setCountriesWithOverrides(new Set());
      return;
    }

    let cancelled = false;

    const fetchAllTags = async () => {
      console.log('[WorldMap] fetching tag colors', {
        countries: countries.length,
        colorDimension,
        viewMode,
        selectedNetworkUserId,
        overrides: Object.keys(countryUserOverrides || {}).length,
      });
      const colors: Record<string, string> = {};
      const overrideIso3 = new Set<string>();
      const groups = new globalThis.Map<string, { userId?: string; countries: typeof countries }>();

      for (const country of countries) {
        let userIdToFetch: string | undefined;
        const overrideUserId = countryUserOverrides[country.id];

        if (overrideUserId) {
          userIdToFetch = overrideUserId;
          overrideIso3.add(country.iso3);
        } else if (viewMode === 'network' && selectedNetworkUserId) {
          userIdToFetch = selectedNetworkUserId;
        }

        const key = userIdToFetch ?? '__me__';
        const group = groups.get(key);
        if (group) {
          group.countries.push(country);
        } else {
          groups.set(key, { userId: userIdToFetch, countries: [country] });
        }
      }

      const batchSize = 20;
      for (const group of groups.values()) {
        console.log('[WorldMap] country fetch group', {
          userId: group.userId || 'me',
          countryCount: group.countries.length,
        });

        for (let i = 0; i < group.countries.length; i += batchSize) {
          const batch = group.countries.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map((country) => getCountry(country.id, group.userId))
          );

          results.forEach((result, idx) => {
            const country = batch[idx];
            if (result.status !== 'fulfilled') {
              console.warn('[WorldMap] country fetch failed', {
                countryId: country.id,
                iso3: country.iso3,
              });
              colors[country.iso3] = NO_DATA_COLOR;
              return;
            }

            const tags = result.value.data?.tags || [];
            if (tags.length === 0) {
              colors[country.iso3] = NO_DATA_COLOR;
              return;
            }

            const dimensionTags = tags.filter(
              (tag: any) => String(tag.category).toLowerCase() === colorDimension
            );

            if (dimensionTags.length > 0) {
              const score = dimensionTags.reduce((sum: number, tag: any) => sum + (tag.value || 0), 0);
              colors[country.iso3] = interpolateColor(score, colorDimension);
            } else {
              colors[country.iso3] = NO_DATA_COLOR;
            }

            if (country.iso3 === 'USA' || country.name === 'United States') {
              console.log('[WorldMap] US tags snapshot', {
                countryId: country.id,
                iso3: country.iso3,
                totalTags: tags.length,
                dimension: colorDimension,
                dimensionTags,
              });
            }
          });
        }
      }

      for (const country of countries) {
        if (!colors[country.iso3]) {
          colors[country.iso3] = NO_DATA_COLOR;
        }
      }

      if (!cancelled) {
        console.log('[WorldMap] colors computed', {
          coloredCountries: Object.keys(colors).length,
          overrideIso3: overrideIso3.size,
        });
        setCountryColors(colors);
        setCountriesWithOverrides(overrideIso3);
      }
    };

    fetchAllTags().catch((error) => {
      if (!cancelled) {
        console.error('[WorldMap] failed to fetch tag colors', error);
        setCountryColors({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, countries, colorDimension, viewMode, selectedNetworkUserId, countryUserOverrides, tagsVersion]);

  const selectedIso3 = selectedCountryId
    ? countries.find((c) => c.id === selectedCountryId)?.iso3 || null
    : null;

  const isoProperty: any = useMemo(
    () => ['coalesce', ['get', 'iso_3166_1_alpha_3'], ['get', 'ISO_A3']],
    []
  );

  const fillColorExpression: any = useMemo(() => {
    const entries = Object.entries(countryColors);
    if (entries.length === 0) return DEFAULT_MAP_COLOR;
    return [
      'match',
      isoProperty,
      ...entries.flatMap(([iso3, color]) => [iso3, color]),
      DEFAULT_MAP_COLOR,
    ];
  }, [countryColors, isoProperty]);

  const overrideIso3List = useMemo(
    () => Array.from(countriesWithOverrides),
    [countriesWithOverrides]
  );

  const borderColorExpression: any = useMemo(() => [
    'case',
    ['==', isoProperty, selectedIso3 || ''],
    '#3b82f6',
    ['in', isoProperty, ['literal', overrideIso3List]],
    '#eab308',
    ['==', isoProperty, hoveredIso3 || ''],
    '#60a5fa',
    '#ffffff',
  ], [selectedIso3, hoveredIso3, overrideIso3List, isoProperty]);

  const borderWidthExpression: any = useMemo(() => [
    'case',
    ['==', isoProperty, selectedIso3 || ''],
    3,
    ['in', isoProperty, ['literal', overrideIso3List]],
    2,
    ['==', isoProperty, hoveredIso3 || ''],
    2,
    1,
  ], [selectedIso3, hoveredIso3, overrideIso3List, isoProperty]);

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature?.properties) {
        console.warn('[WorldMap] click with no feature');
        return;
      }

      const iso3 = feature.properties.iso_3166_1_alpha_3 || feature.properties.ISO_A3;
      const country = countries.find((c) => c.iso3 === iso3);
      if (country) {
        console.log('[WorldMap] select country', { iso3, id: country.id, name: country.name });
        selectCountry(country.id);
      } else {
        console.warn('[WorldMap] country not found for ISO3', { iso3 });
      }
    },
    [countries, selectCountry]
  );

  const onMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature?.properties) return;
    const name = feature.properties.name_en || feature.properties.NAME || feature.properties.name;
    const iso3 = feature.properties.iso_3166_1_alpha_3 || feature.properties.ISO_A3;
    setHoveredCountry(name);
    setHoveredIso3(iso3);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHoveredCountry(null);
    setHoveredIso3(null);
  }, []);

  return (
    <div className="relative w-full h-full">
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
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        interactiveLayerIds={['countries-fill']}
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        cursor={hoveredCountry ? 'pointer' : 'grab'}
      >
        <Source id="countries" type="vector" url="mapbox://mapbox.country-boundaries-v1">
          <Layer
            id="countries-fill"
            type="fill"
            source-layer="country_boundaries"
            paint={{
              'fill-color': fillColorExpression,
              'fill-opacity': [
                'case',
                ['==', isoProperty, selectedIso3 || ''],
                0.9,
                ['==', isoProperty, hoveredIso3 || ''],
                0.85,
                0.7,
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
                ['==', isoProperty, selectedIso3 || ''],
                1.0,
                ['==', isoProperty, hoveredIso3 || ''],
                0.8,
                0.3,
              ],
            }}
          />
        </Source>
      </Map>

      {hoveredCountry && (
        <div className="absolute top-4 left-4 bg-black border border-orange-500 px-4 py-2 shadow-lg">
          <p className="text-sm font-medium text-white uppercase tracking-wide">{hoveredCountry}</p>
        </div>
      )}

      <div className="absolute bottom-4 left-4 bg-black border border-orange-500 p-4 shadow-lg">
        <p className="text-xs font-semibold mb-3 uppercase text-orange-500 tracking-wide">
          {categoryDisplayNames[colorDimension]} Score
        </p>
        <div className="space-y-2">
          {colorDimension === 'political' ? (
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
