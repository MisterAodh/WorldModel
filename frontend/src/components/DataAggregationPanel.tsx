import { useEffect, useRef, useState } from 'react';
import { Play, Square, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import {
  cancelAggregationJob,
  getActiveAggregationJob,
  getAggregationJobLogs,
  getAggregationJobs,
  startAggregationJob,
} from '../lib/api';

type JobLog = {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
};

type Job = {
  id: string;
  countryId: string;
  year: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalMetrics: number;
  completedMetrics: number;
  failedMetrics: number;
  currentMetric: string | null;
  logs: JobLog[];
  startedAt: string | null;
  completedAt: string | null;
};

type Props = {
  countryId: string;
  onJobComplete: () => void;
  onYearChange: (year: number) => void;
};

export function DataAggregationPanel({ countryId, onJobComplete, onYearChange }: Props) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onYearChange(year);
  }, [year, onYearChange]);

  useEffect(() => {
    loadJobs();
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [countryId]);

  useEffect(() => {
    if (activeJob && ['pending', 'running'].includes(activeJob.status)) {
      pollInterval.current = setInterval(pollJobStatus, 2000);
    } else if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
      if (activeJob?.status === 'completed') {
        onJobComplete();
      }
    }
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [activeJob?.status]);

  const loadJobs = async () => {
    try {
      const [activeRes, recentRes] = await Promise.all([
        getActiveAggregationJob(countryId),
        getAggregationJobs(countryId),
      ]);
      setActiveJob(activeRes.data);
      setRecentJobs(recentRes.data);
    } catch (error) {
      console.error('Failed to load aggregation jobs:', error);
    }
  };

  const pollJobStatus = async () => {
    if (!activeJob) return;
    try {
      const response = await getAggregationJobLogs(activeJob.id);
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              status: response.data.status,
              currentMetric: response.data.currentMetric,
              completedMetrics: response.data.progress.completed,
              failedMetrics: response.data.progress.failed,
              logs: response.data.logs,
              totalMetrics: response.data.progress.total,
            }
          : null
      );
    } catch (error) {
      console.error('Failed to poll job status:', error);
    }
  };

  const handleStart = async () => {
    const confirmMessage =
      `This will run AI aggregation for ${year}. ` +
      'This may incur API costs. Continue?';
    if (!window.confirm(confirmMessage)) return;

    setIsStarting(true);
    try {
      const response = await startAggregationJob({
        countryId,
        year,
      });
      setActiveJob(response.data);
    } catch (error: any) {
      if (error.response?.status === 409) {
        setActiveJob(error.response.data.job);
      } else {
        console.error('Failed to start job:', error);
      }
    }
    setIsStarting(false);
  };

  const handleCancel = async () => {
    if (!activeJob) return;
    try {
      await cancelAggregationJob(activeJob.id);
      await loadJobs();
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const getLogIcon = (level: JobLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const isJobActive = activeJob && ['pending', 'running'].includes(activeJob.status);
  const progressPercent = activeJob?.totalMetrics
    ? Math.round((activeJob.completedMetrics / activeJob.totalMetrics) * 100)
    : 0;

  return (
    <div className="bg-black border border-orange-500/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-orange-500">Deep Data Aggregation</h3>
        <button 
          onClick={loadJobs} 
          className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-500/10 transition-colors" 
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 uppercase tracking-wide">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value || '0', 10))}
            className="w-24 px-2 py-1 bg-black border border-orange-500/50 text-orange-500 text-xs font-mono focus:outline-none focus:border-orange-500"
            disabled={!!isJobActive}
          />
        </div>
        {isJobActive ? (
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white text-xs uppercase tracking-wide font-medium hover:bg-red-400 transition-colors"
          >
            <Square className="w-3 h-3" />
            Cancel
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="flex items-center gap-2 px-3 py-2 bg-orange-500 text-black text-xs uppercase tracking-wide font-medium disabled:opacity-50 hover:bg-orange-400 transition-colors"
          >
            <Play className="w-3 h-3" />
            {isStarting ? 'Starting...' : 'Run Aggregation'}
          </button>
        )}
      </div>

      {activeJob && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {activeJob.status === 'running'
                ? `Processing: ${activeJob.currentMetric || 'Starting'}`
                : `Status: ${activeJob.status}`}
            </span>
            <span className="font-medium text-orange-500">
              {activeJob.completedMetrics}/{activeJob.totalMetrics} points
            </span>
          </div>

          <div className="h-2 bg-gray-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                activeJob.status === 'completed'
                  ? 'bg-green-500'
                  : activeJob.status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="border border-orange-500/30 bg-black p-2 h-48 overflow-auto text-xs font-mono">
            {activeJob.logs?.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 py-0.5">
                {getLogIcon(log.level)}
                <span className="text-gray-500">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={
                    log.level === 'error'
                      ? 'text-red-500'
                      : log.level === 'warning'
                      ? 'text-yellow-500'
                      : log.level === 'success'
                      ? 'text-green-500'
                      : 'text-white'
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentJobs.length > 0 && !isJobActive && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Recent Jobs</h4>
          <div className="space-y-1">
            {recentJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center justify-between text-xs p-2 bg-gray-900/50 border border-orange-500/20">
                <span className="text-white">{job.year}</span>
                <span
                  className={`px-2 py-0.5 text-xs uppercase tracking-wide ${
                    job.status === 'completed'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : job.status === 'failed'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                  }`}
                >
                  {job.status}
                </span>
                <span className="text-gray-400">
                  {job.completedMetrics}/{job.totalMetrics}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
