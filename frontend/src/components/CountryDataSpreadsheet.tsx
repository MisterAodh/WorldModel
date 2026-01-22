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

const CATEGORY_COLORS: Record<string, string> = {
  ECONOMIC_CORE: 'bg-blue-50 border-blue-200',
  ECONOMIC_MARKET: 'bg-blue-100 border-blue-300',
  LABOR_INCOME: 'bg-green-50 border-green-200',
  COST_OF_LIVING: 'bg-green-100 border-green-300',
  INDUSTRY: 'bg-yellow-50 border-yellow-200',
  DEMOGRAPHICS: 'bg-purple-50 border-purple-200',
  HEALTH_WELLBEING: 'bg-red-50 border-red-200',
  EDUCATION: 'bg-orange-50 border-orange-200',
  POLITICAL_STRUCTURE: 'bg-gray-50 border-gray-200',
  POLITICAL_SENTIMENT: 'bg-gray-100 border-gray-300',
  SOCIAL_SENTIMENT: 'bg-pink-50 border-pink-200',
  SECURITY: 'bg-red-100 border-red-300',
  INFRASTRUCTURE: 'bg-teal-50 border-teal-200',
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
      OFFICIAL: 'bg-green-100 text-green-800 border-green-300',
      AGGREGATOR: 'bg-blue-100 text-blue-800 border-blue-300',
      NEWS_DERIVED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      INTERPOLATED: 'bg-orange-100 text-orange-800 border-orange-300',
      MANUAL: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return (
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colors[value.sourceType] || 'bg-gray-100 text-gray-700'}`}>
        {value.sourceType.slice(0, 3)}
        {value.confidenceScore && <span className="ml-1">{value.confidenceScore}/10</span>}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground p-4">No data available.</div>;
  }

  const filledCount = Object.values(data.metrics).filter(v => v !== null).length;
  const totalCount = data.columns.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with year selector and stats */}
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <select
              value={year}
              onChange={(e) => onYearChange?.(parseInt(e.target.value))}
              className="px-3 py-1.5 border rounded-md text-sm font-semibold bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{filledCount}</span> / {totalCount} metrics populated
          </span>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 p-3 overflow-x-auto border-b bg-background">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            selectedCategory === null ? 'bg-primary text-primary-foreground' : 'bg-secondary text-gray-700 hover:bg-secondary/80'
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
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-primary text-primary-foreground' : `${CATEGORY_COLORS[cat]?.split(' ')[0] || 'bg-secondary'} text-gray-700`
              }`}
            >
              {cat.replace(/_/g, ' ')} ({filled}/{count})
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 p-2 text-xs border-b bg-secondary/30 text-gray-700">
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded border bg-green-100 text-green-800 border-green-300 text-[10px] font-medium">OFF</span> Official
        </span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded border bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-medium">AGG</span> Aggregator
        </span>
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded border bg-yellow-100 text-yellow-800 border-yellow-300 text-[10px] font-medium">NEW</span> AI Estimated
        </span>
      </div>

      {/* Data grid */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <div key={category} className={`rounded-lg border overflow-hidden ${CATEGORY_COLORS[category] || ''}`}>
              <div className="px-3 py-2 font-semibold text-sm text-gray-800 border-b bg-white/50">
                {category.replace(/_/g, ' ')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-white/30">
                {groupedMetrics[category]?.map((metric) => {
                  const value = data.metrics[metric.code];
                  const isHovered = hoveredMetric === metric.code;
                  
                  return (
                    <div
                      key={metric.id}
                      className={`p-3 bg-white relative transition-shadow ${value ? '' : 'opacity-60'} ${isHovered ? 'shadow-lg z-10' : ''}`}
                      onMouseEnter={() => setHoveredMetric(metric.code)}
                      onMouseLeave={() => setHoveredMetric(null)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-xs text-gray-600 truncate flex-1 font-medium" title={metric.name}>
                          {metric.name}
                        </div>
                        {value?.sourceUrl && (
                          <a
                            href={value.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-primary shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-lg font-bold ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                          {formatValue(value, metric)}
                        </div>
                        {getSourceBadge(value)}
                      </div>
                      
                      {metric.unit && value && (
                        <div className="text-[10px] text-gray-500 mt-0.5">{metric.unit}</div>
                      )}
                      
                      {/* Tooltip on hover */}
                      {isHovered && value?.aiReasoning && (
                        <div className="absolute left-0 right-0 top-full mt-1 p-2 bg-white border rounded-lg shadow-lg z-20 text-xs">
                          <div className="flex items-start gap-1">
                            <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-800 mb-1">Source: {value.sourceName || value.sourceType}</div>
                              <div className="text-gray-600">{value.aiReasoning}</div>
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
