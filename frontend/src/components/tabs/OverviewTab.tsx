import { useStore } from '../../store/useStore';
import { QualitativeTagsEditor } from '../QualitativeTagsEditor';
import { formatNumber, formatPercent } from '../../lib/utils';
import { Users, TrendingUp, AlertTriangle, Flame } from 'lucide-react';

export function OverviewTab() {
  const { contextData } = useStore();

  if (!contextData) return null;

  const { metrics, aggregatedMetrics } = contextData;
  const displayMetrics = metrics || aggregatedMetrics;

  return (
    <div className="p-6 space-y-6">
      {/* Qualitative Tags */}
      <div>
        <h3 className="text-sm font-semibold mb-3 uppercase text-muted-foreground">
          Rolling Score Analysis
        </h3>
        <QualitativeTagsEditor />
      </div>

      {/* Key Metrics */}
      {displayMetrics && (
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase text-muted-foreground">
            Key Metrics {metrics?.year && `(${metrics.year})`}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={<Users className="w-4 h-4" />}
              label="Population"
              value={formatNumber(displayMetrics.population || displayMetrics.totalPopulation)}
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Immigration"
              value={formatPercent(displayMetrics.immigrationRate || displayMetrics.avgImmigrationRate)}
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Emigration"
              value={formatPercent(displayMetrics.emigrationRate || displayMetrics.avgEmigrationRate)}
            />
            <MetricCard
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Murders/100k"
              value={displayMetrics.murdersPerCapita?.toFixed(2) || displayMetrics.avgMurdersPerCapita?.toFixed(2) || 'N/A'}
            />
            <MetricCard
              icon={<Flame className="w-4 h-4" />}
              label="War Deaths"
              value={formatPercent(displayMetrics.warDeathsPercent || displayMetrics.avgWarDeathsPercent)}
            />
            <MetricCard
              icon={<Flame className="w-4 h-4" />}
              label="Famine Deaths"
              value={formatPercent(displayMetrics.famineDeathsPercent || displayMetrics.avgFamineDeathsPercent)}
            />
          </div>
        </div>
      )}

      {/* Top Industries */}
      {contextData.industries && contextData.industries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase text-muted-foreground">
            Top Industries
          </h3>
          <div className="space-y-2">
            {contextData.industries.slice(0, 5).map((industry) => (
              <div
                key={industry.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-md"
              >
                <span className="text-sm font-medium">{industry.industryName}</span>
                <span className="text-sm text-muted-foreground">
                  {industry.gdpSharePercent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {contextData.notes && contextData.notes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase text-muted-foreground">
            Notes
          </h3>
          <div className="space-y-2">
            {contextData.notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-secondary/50 rounded-md text-sm"
              >
                {note.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
