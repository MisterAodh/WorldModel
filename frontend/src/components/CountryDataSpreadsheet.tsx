import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Info, Calendar } from 'lucide-react';
import { getCountryMetricsSpreadsheet } from '../lib/api';

type MetricValue = {
  value: number | string | null;
  sourceType: 'OFFICIAL' | 'AGGREGATOR' | 'NEWS_DERIVED' | 'INTERPOLATED' | 'MANUAL';
  confidenceScore: number | null;
  sourceUrl: string | null;
  sourceName?: string | null;
  aiReasoning?: string | null;
  id: string;
};

type MetricDefinition = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string | null;
  dataType: string;
};

type SpreadsheetData = {
  columns: MetricDefinition[];
  year: number;
  metrics: Record<string, MetricValue | null>;
  dataPointCount: number;
};

// Bloomberg-style category colors (dark theme)
const CATEGORY_COLORS: Record<string, string> = {
  ECONOMIC_CORE: 'border-orange-500/50',
  ECONOMIC_MARKET: 'border-orange-500/40',
  LABOR_INCOME: 'border-green-500/50',
  COST_OF_LIVING: 'border-green-500/40',
  INDUSTRY: 'border-yellow-500/50',
  DEMOGRAPHICS: 'border-purple-500/50',
  HEALTH_WELLBEING: 'border-red-500/50',
  EDUCATION: 'border-blue-500/50',
  POLITICAL_STRUCTURE: 'border-gray-500/50',
  POLITICAL_SENTIMENT: 'border-gray-500/40',
  SOCIAL_SENTIMENT: 'border-pink-500/50',
  SECURITY: 'border-red-500/40',
  INFRASTRUCTURE: 'border-teal-500/50',
};

type Props = {
  countryId: string;
  year: number;
  onYearChange?: (year: number) => void;
  refreshKey?: number;
};

// Generate year options (current year back to 2015)
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 2014 }, (_, i) => currentYear - i);

export function CountryDataSpreadsheet({ countryId, year, onYearChange, refreshKey = 0 }: Props) {
  const [data, setData] = useState<SpreadsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    getCountryMetricsSpreadsheet(countryId, year)
      .then((response) => {
        if (!isMounted) return;
        setData(response.data);
      })
      .catch((error) => {
        console.error('Failed to load spreadsheet data:', error);
        if (!isMounted) return;
        setData(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [countryId, year, refreshKey]);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.columns.map((c) => c.category)));
  }, [data]);

  const groupedMetrics = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, MetricDefinition[]> = {};
    data.columns.forEach((col) => {
      if (!groups[col.category]) groups[col.category] = [];
      groups[col.category].push(col);
    });
    return groups;
  }, [data]);

  const filteredCategories = useMemo(() => {
    if (selectedCategory) return [selectedCategory];
    return categories;
  }, [categories, selectedCategory]);

  const formatValue = (value: MetricValue | null, metric: MetricDefinition) => {
    if (!value || value.value === null || value.value === undefined) return '—';
    const v = value.value;
    if (typeof v === 'number') {
      if (metric.unit === '%') return `${v.toFixed(1)}%`;
      if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
      if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
      if (v >= 1000) return v.toLocaleString();
      if (Number.isInteger(v)) return v.toString();
      return v.toFixed(2);
    }
    return String(v);
  };

  const getSourceBadge = (value: MetricValue | null) => {
    if (!value) return null;
    const colors: Record<string, string> = {
      OFFICIAL: 'bg-green-500/20 text-green-400 border-green-500/50',
      AGGREGATOR: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      NEWS_DERIVED: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      INTERPOLATED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      MANUAL: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    };
    return (
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 border ${colors[value.sourceType] || 'bg-gray-500/20 text-gray-400'}`}>
        {value.sourceType.slice(0, 3)}
        {value.confidenceScore && <span className="ml-1">{value.confidenceScore}/10</span>}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-black">
        <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-gray-400 p-4 bg-black">No data available.</div>;
  }

  const filledCount = Object.values(data.metrics).filter(v => v !== null).length;
  const totalCount = data.columns.length;

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header with year selector and stats */}
      <div className="flex items-center justify-between p-3 border-b border-orange-500/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            <select
              value={year}
              onChange={(e) => onYearChange?.(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-orange-500 text-sm font-semibold bg-black text-orange-500 focus:outline-none uppercase tracking-wide"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-400">
            <span className="font-semibold text-orange-500">{filledCount}</span> / {totalCount} metrics
          </span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 p-3 overflow-x-auto border-b border-orange-500/30">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 text-xs font-medium whitespace-nowrap uppercase tracking-wide transition-colors border ${
            selectedCategory === null 
              ? 'bg-orange-500 text-black border-orange-500' 
              : 'bg-transparent text-white border-orange-500/50 hover:border-orange-500'
          }`}
        >
          All ({totalCount})
        </button>
        {categories.map((cat) => {
          const count = groupedMetrics[cat]?.length || 0;
          const filled = groupedMetrics[cat]?.filter(m => data.metrics[m.code] !== null).length || 0;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-medium whitespace-nowrap uppercase tracking-wide transition-colors border ${
                selectedCategory === cat 
                  ? 'bg-orange-500 text-black border-orange-500' 
                  : 'bg-transparent text-gray-400 border-orange-500/30 hover:border-orange-500 hover:text-white'
              }`}
            >
              {cat.replace(/_/g, ' ')} ({filled}/{count})
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 p-2 text-xs border-b border-orange-500/30 text-gray-400">
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 border bg-green-500/20 text-green-400 border-green-500/50 text-[10px] font-medium">OFF</span> Official
        </span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 border bg-blue-500/20 text-blue-400 border-blue-500/50 text-[10px] font-medium">AGG</span> Aggregator
        </span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 border bg-orange-500/20 text-orange-400 border-orange-500/50 text-[10px] font-medium">NEW</span> AI
        </span>
      </div>

      {/* Data grid */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <div key={category} className={`border overflow-hidden ${CATEGORY_COLORS[category] || 'border-orange-500/30'}`}>
              <div className="px-3 py-2 font-semibold text-sm text-orange-500 border-b border-orange-500/30 bg-orange-500/5 uppercase tracking-wide">
                {category.replace(/_/g, ' ')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-orange-500/10">
                {groupedMetrics[category]?.map((metric) => {
                  const value = data.metrics[metric.code];
                  const isHovered = hoveredMetric === metric.code;
                  
                  return (
                    <div
                      key={metric.id}
                      className={`p-3 bg-black relative transition-all ${value ? '' : 'opacity-50'} ${isHovered ? 'bg-orange-500/10' : ''}`}
                      onMouseEnter={() => setHoveredMetric(metric.code)}
                      onMouseLeave={() => setHoveredMetric(null)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-xs text-gray-400 truncate flex-1 font-medium" title={metric.name}>
                          {metric.name}
                        </div>
                        {value?.sourceUrl && (
                          <a
                            href={value.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500/50 hover:text-orange-500 shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-lg font-bold ${value ? 'text-white' : 'text-gray-600'}`}>
                          {formatValue(value, metric)}
                        </div>
                        {getSourceBadge(value)}
                      </div>
                      
                      {metric.unit && value && (
                        <div className="text-[10px] text-gray-500 mt-0.5">{metric.unit}</div>
                      )}
                      
                      {/* Tooltip on hover */}
                      {isHovered && value?.aiReasoning && (
                        <div className="absolute left-0 right-0 top-full mt-1 p-2 bg-black border border-orange-500 shadow-lg z-20 text-xs">
                          <div className="flex items-start gap-1">
                            <Info className="w-3 h-3 shrink-0 mt-0.5 text-orange-500" />
                            <div>
                              <div className="font-medium text-orange-500 mb-1">Source: {value.sourceName || value.sourceType}</div>
                              <div className="text-gray-400">{value.aiReasoning}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
