import { useEffect, useState, useCallback } from 'react';
import Map, { Source, Layer, MapLayerMouseEvent } from 'react-map-gl';
import { useStore } from '../store/useStore';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getTags } from '../lib/api';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export function WorldMap() {
  const { countries, selectCountry, selectedCountryId, colorDimension } = useStore();
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredIso3, setHoveredIso3] = useState<string | null>(null);
  const [countryColors, setCountryColors] = useState<Record<string, string>>({});

  // Fetch tags for all countries to color the map
  useEffect(() => {
    const fetchAllTags = async () => {
      const colors: Record<string, string> = {};
      
      for (const country of countries) {
        try {
          const response = await getTags('country', country.id);
          const allTags = response.data.all || [];
          
          // Filter tags for the selected dimension and calculate rolling score
          const dimensionTags = allTags.filter(
            (tag: any) => tag.category.toLowerCase() === colorDimension
          );
          
          if (dimensionTags.length > 0) {
            const totalScore = dimensionTags.reduce((sum: number, tag: any) => sum + tag.value, 0);
            
            if (totalScore > 0) colors[country.iso3] = '#10b981'; // green
            else if (totalScore < 0) colors[country.iso3] = '#ef4444'; // red
            else colors[country.iso3] = '#f59e0b'; // yellow/amber (neutral)
          } else {
            colors[country.iso3] = '#374151'; // gray (no data)
          }
        } catch (error) {
          colors[country.iso3] = '#374151';
        }
      }
      
      setCountryColors(colors);
    };

    if (countries.length > 0) {
      fetchAllTags();
    }
  }, [countries, colorDimension]);

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
  const fillColorExpression: any = [
    'match',
    ['get', 'iso_3166_1_alpha_3'],
    ...Object.entries(countryColors).flatMap(([iso3, color]) => [iso3, color]),
    '#1f2937' // default
  ];

  // Create border color expression to highlight selected country
  const borderColorExpression: any = [
    'case',
    ['==', ['get', 'iso_3166_1_alpha_3'], selectedIso3 || ''],
    '#3b82f6', // blue for selected
    ['==', ['get', 'iso_3166_1_alpha_3'], hoveredIso3 || ''],
    '#60a5fa', // lighter blue for hover
    '#ffffff' // default white
  ];

  const borderWidthExpression: any = [
    'case',
    ['==', ['get', 'iso_3166_1_alpha_3'], selectedIso3 || ''],
    3, // thicker for selected
    ['==', ['get', 'iso_3166_1_alpha_3'], hoveredIso3 || ''],
    2, // medium for hover
    1 // default
  ];

  return (
    <div className="relative w-full h-full">
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
        <div className="absolute top-4 left-4 bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
          <p className="text-sm font-medium">{hoveredCountry}</p>
        </div>
      )}

      {/* Color Legend */}
      <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-4 shadow-lg">
        <p className="text-xs font-semibold mb-2 uppercase text-muted-foreground">
          {colorDimension} Score ({countries.length})
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-xs">Positive (Score {'>'} 0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-xs">Neutral (Score = 0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-xs">Negative (Score {'<'} 0)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-700 rounded"></div>
            <span className="text-xs">No Data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
