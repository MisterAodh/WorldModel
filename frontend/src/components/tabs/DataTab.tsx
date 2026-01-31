import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { updateMetrics, updateIndustry } from '../../lib/api';
import { Save, Plus, X, Maximize2 } from 'lucide-react';
import { CountryDataSpreadsheet } from '../CountryDataSpreadsheet';
import { DataAggregationPanel } from '../DataAggregationPanel';
import { createPortal } from 'react-dom';

export function DataTab() {
  const { contextData, selectedCountryId, refreshContext } = useStore();
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [metricsForm, setMetricsForm] = useState<any>({});
  const [addingIndustry, setAddingIndustry] = useState(false);
  const [newIndustry, setNewIndustry] = useState({ name: '', share: '' });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Fullscreen modal for the data spreadsheet
  const fullscreenModal = isFullscreen && selectedCountryId ? createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90">
      <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-black border-2 border-orange-500 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-orange-500 bg-black">
          <h2 className="text-lg font-bold text-orange-500 uppercase tracking-wide">
            {contextData.country?.name || 'Country'} - Data Spreadsheet
          </h2>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-2 text-white hover:bg-orange-500 hover:text-black transition-colors border border-orange-500"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <CountryDataSpreadsheet
            countryId={selectedCountryId}
            year={selectedYear}
            onYearChange={setSelectedYear}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="p-6 space-y-6 h-full flex flex-col bg-black">
      {fullscreenModal}
      
      {!selectedCountryId && (
        <p className="text-sm text-gray-400">Select a country to view deep data.</p>
      )}

      {selectedCountryId && (
        <DataAggregationPanel
          countryId={selectedCountryId}
          onJobComplete={() => {
            setRefreshKey((prev) => prev + 1);
            refreshContext();
          }}
          onYearChange={(year) => {
            setSelectedYear(year);
          }}
        />
      )}

      {selectedCountryId && (
        <div 
          className="flex-1 min-h-[300px] border border-orange-500/30 overflow-hidden relative group cursor-pointer"
          onClick={() => setIsFullscreen(true)}
        >
          {/* Expand overlay hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors z-10 flex items-center justify-center pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-orange-500 bg-black/80 px-4 py-2 border border-orange-500">
              <Maximize2 className="w-5 h-5" />
              <span className="text-sm font-medium uppercase tracking-wide">Click to expand</span>
            </div>
          </div>
          
          <CountryDataSpreadsheet
            countryId={selectedCountryId}
            year={selectedYear}
            onYearChange={setSelectedYear}
            refreshKey={refreshKey}
          />
        </div>
      )}

      <details className="border border-orange-500/30 p-4 bg-black">
        <summary className="text-sm font-semibold uppercase tracking-wide text-gray-400 cursor-pointer hover:text-orange-500 transition-colors">
          Legacy Metrics and Industries
        </summary>

        <div className="mt-4 space-y-6">
      {/* Metrics Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-500">
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
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
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
              className="w-full px-4 py-2 bg-gray-800 text-white border border-orange-500/30 hover:bg-gray-700 transition-colors text-sm uppercase tracking-wide"
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
              <p className="text-gray-500">No metrics data available</p>
            )}
          </div>
        )}
      </div>

      {/* Industries Section */}
      {selectedCountryId && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-500">
              Industries
            </h3>
            <button
              onClick={() => setAddingIndustry(!addingIndustry)}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
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
                  className="flex-1 px-4 py-2 bg-orange-500 text-black font-medium uppercase tracking-wide hover:bg-orange-400 transition-colors text-sm"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingIndustry(false);
                    setNewIndustry({ name: '', share: '' });
                  }}
                  className="px-4 py-2 bg-gray-800 text-white border border-orange-500/30 hover:bg-gray-700 transition-colors text-sm uppercase tracking-wide"
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
                className="flex items-center justify-between p-3 bg-gray-900/50 border border-orange-500/20"
              >
                <span className="text-sm font-medium text-white">{industry.industryName}</span>
                <span className="text-sm text-orange-500 font-mono">
                  {industry.gdpSharePercent.toFixed(1)}%
                </span>
              </div>
            ))}
            {contextData.industries.length === 0 && (
              <p className="text-sm text-gray-500">No industries added yet</p>
            )}
          </div>
        </div>
      )}
        </div>
      </details>
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
      <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-black border border-orange-500/50 text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
      />
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-900/50 border border-orange-500/20">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-white font-mono">{value}</span>
    </div>
  );
}
