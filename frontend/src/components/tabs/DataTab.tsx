import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { updateMetrics, updateIndustry } from '../../lib/api';
import { Save, Plus } from 'lucide-react';

export function DataTab() {
  const { contextData, selectedCountryId, refreshContext } = useStore();
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [metricsForm, setMetricsForm] = useState<any>({});
  const [addingIndustry, setAddingIndustry] = useState(false);
  const [newIndustry, setNewIndustry] = useState({ name: '', share: '' });

  if (!contextData) return null;

  const handleSaveMetrics = async () => {
    if (!selectedCountryId) return;

    try {
      await updateMetrics({
        countryId: selectedCountryId,
        year: metricsForm.year || new Date().getFullYear(),
        ...metricsForm,
      });
      await refreshContext();
      setEditingMetrics(false);
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  };

  const handleAddIndustry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountryId || !newIndustry.name || !newIndustry.share) return;

    try {
      await updateIndustry({
        countryId: selectedCountryId,
        year: contextData.metrics?.year || new Date().getFullYear(),
        industryName: newIndustry.name,
        gdpSharePercent: parseFloat(newIndustry.share),
      });
      await refreshContext();
      setNewIndustry({ name: '', share: '' });
      setAddingIndustry(false);
    } catch (error) {
      console.error('Error adding industry:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Metrics Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">
            Metrics
          </h3>
          {selectedCountryId && (
            <button
              onClick={() => {
                if (editingMetrics) {
                  handleSaveMetrics();
                } else {
                  setMetricsForm(contextData.metrics || {});
                  setEditingMetrics(true);
                }
              }}
              className="p-2 hover:bg-secondary rounded-md transition-colors"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
        </div>

        {editingMetrics ? (
          <div className="space-y-3">
            <InputField
              label="Year"
              type="number"
              value={metricsForm.year || new Date().getFullYear()}
              onChange={(val) => setMetricsForm({ ...metricsForm, year: parseInt(val) })}
            />
            <InputField
              label="Population"
              type="number"
              value={metricsForm.population || ''}
              onChange={(val) => setMetricsForm({ ...metricsForm, population: val })}
            />
            <InputField
              label="Immigration Rate (%)"
              type="number"
              step="0.01"
              value={metricsForm.immigrationRate || ''}
              onChange={(val) => setMetricsForm({ ...metricsForm, immigrationRate: parseFloat(val) })}
            />
            <InputField
              label="Emigration Rate (%)"
              type="number"
              step="0.01"
              value={metricsForm.emigrationRate || ''}
              onChange={(val) => setMetricsForm({ ...metricsForm, emigrationRate: parseFloat(val) })}
            />
            <InputField
              label="Murders per 100k"
              type="number"
              step="0.01"
              value={metricsForm.murdersPerCapita || ''}
              onChange={(val) => setMetricsForm({ ...metricsForm, murdersPerCapita: parseFloat(val) })}
            />
            <InputField
              label="War Deaths (%)"
              type="number"
              step="0.01"
              value={metricsForm.warDeathsPercent || ''}
              onChange={(val) => setMetricsForm({ ...metricsForm, warDeathsPercent: parseFloat(val) })}
            />
            <InputField
              label="Famine Deaths (%)"
              type="number"
              step="0.01"
              value={metricsForm.famineDeathsPercent || ''}
              onChange={(val) => setMetricsForm({ ...metricsForm, famineDeathsPercent: parseFloat(val) })}
            />
            <button
              onClick={() => setEditingMetrics(false)}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {contextData.metrics ? (
              <>
                <DataRow label="Year" value={contextData.metrics.year} />
                <DataRow label="Population" value={contextData.metrics.population || 'N/A'} />
                <DataRow label="Immigration Rate" value={`${contextData.metrics.immigrationRate || 'N/A'}%`} />
                <DataRow label="Emigration Rate" value={`${contextData.metrics.emigrationRate || 'N/A'}%`} />
                <DataRow label="Murders per 100k" value={contextData.metrics.murdersPerCapita || 'N/A'} />
                <DataRow label="War Deaths" value={`${contextData.metrics.warDeathsPercent || 'N/A'}%`} />
                <DataRow label="Famine Deaths" value={`${contextData.metrics.famineDeathsPercent || 'N/A'}%`} />
              </>
            ) : (
              <p className="text-muted-foreground">No metrics data available</p>
            )}
          </div>
        )}
      </div>

      {/* Industries Section */}
      {selectedCountryId && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">
              Industries
            </h3>
            <button
              onClick={() => setAddingIndustry(!addingIndustry)}
              className="p-2 hover:bg-secondary rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {addingIndustry && (
            <form onSubmit={handleAddIndustry} className="space-y-3 mb-4">
              <InputField
                label="Industry Name"
                value={newIndustry.name}
                onChange={(val) => setNewIndustry({ ...newIndustry, name: val })}
              />
              <InputField
                label="GDP Share (%)"
                type="number"
                step="0.1"
                value={newIndustry.share}
                onChange={(val) => setNewIndustry({ ...newIndustry, share: val })}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingIndustry(false);
                    setNewIndustry({ name: '', share: '' });
                  }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {contextData.industries.map((industry) => (
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
            {contextData.industries.length === 0 && (
              <p className="text-sm text-muted-foreground">No industries added yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({
  label,
  type = 'text',
  step,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  step?: string;
  value: any;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
