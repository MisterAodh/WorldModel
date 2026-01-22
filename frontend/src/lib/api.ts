import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Countries
export const getCountries = () => api.get('/countries');
export const getCountry = (id: string) => api.get(`/countries/${id}`);

// Regions
export const getRegions = () => api.get('/regions');
export const getRegion = (id: string) => api.get(`/regions/${id}`);
export const createRegion = (data: { name: string; type?: string; countryIds: string[] }) =>
  api.post('/regions', data);
export const addCountryToRegion = (regionId: string, countryId: string) =>
  api.post(`/regions/${regionId}/members`, { countryId });
export const removeCountryFromRegion = (regionId: string, countryId: string) =>
  api.delete(`/regions/${regionId}/members/${countryId}`);
export const deleteRegion = (id: string) => api.delete(`/regions/${id}`);

// Tags
export const getTags = (scopeType: string, scopeId: string) =>
  api.get(`/tags/${scopeType}/${scopeId}`);
export const createTag = (data: {
  scopeType: string;
  scopeId: string;
  category: string;
  value: number;
  note?: string;
}) => api.post('/tags', data);

// Metrics
export const getMetrics = (countryId: string) => api.get(`/metrics/${countryId}`);
export const updateMetrics = (data: any) => api.post('/metrics', data);

// Industries
export const getIndustries = (countryId: string, year: number) =>
  api.get(`/industries/${countryId}/${year}`);
export const updateIndustry = (data: any) => api.post('/industries', data);
export const deleteIndustry = (id: string) => api.delete(`/industries/${id}`);

// Articles
export const getArticles = (params?: { countryId?: string; regionId?: string }) =>
  api.get('/articles', { params });
export const createArticle = (data: { url: string; countryIds?: string[]; title?: string; keyNotes?: string }) =>
  api.post('/articles', data);
export const linkArticleToCountry = (articleId: string, countryId: string) =>
  api.post(`/articles/${articleId}/countries`, { countryId });
export const unlinkArticleFromCountry = (articleId: string, countryId: string) =>
  api.delete(`/articles/${articleId}/countries/${countryId}`);

// Notes
export const getNotes = (scopeType: string, scopeId: string) =>
  api.get(`/notes/${scopeType}/${scopeId}`);
export const saveNote = (data: {
  id?: string;
  scopeType: string;
  scopeId: string;
  content: string;
}) => api.post('/notes', data);
export const deleteNote = (id: string) => api.delete(`/notes/${id}`);

// Suggestions
export const getSuggestions = (scopeType: string, scopeId: string, status?: string) =>
  api.get(`/suggestions/${scopeType}/${scopeId}`, { params: { status } });
export const approveSuggestion = (id: string) => api.post(`/suggestions/${id}/approve`);
export const rejectSuggestion = (id: string) => api.post(`/suggestions/${id}/reject`);

// Chat
export const sendChatMessage = (data: {
  message: string;
  contextType?: string;
  contextId?: string;
  conversationHistory?: any[];
}) => api.post('/chat', data);

// Metric definitions
export const getMetricDefinitions = () => api.get('/metric-definitions');

// Country metrics (new system)
export const getCountryMetricsSpreadsheet = (countryId: string, year?: number) =>
  api.get(`/country-metrics/${countryId}/spreadsheet`, { params: { year } });
export const upsertCountryMetric = (data: any) => api.post('/country-metrics', data);
export const deleteCountryMetric = (id: string) => api.delete(`/country-metrics/${id}`);

// Aggregation jobs
export const getAggregationJobs = (countryId: string) => api.get(`/aggregation-jobs/${countryId}`);
export const getActiveAggregationJob = (countryId: string) => api.get(`/aggregation-jobs/${countryId}/active`);
export const getAggregationJobLogs = (id: string) => api.get(`/aggregation-jobs/${id}/logs`);
export const startAggregationJob = (data: { countryId: string; year: number }) =>
  api.post('/aggregation-jobs', data);
export const cancelAggregationJob = (id: string) => api.post(`/aggregation-jobs/${id}/cancel`);

// AI Score generation
export const generateAIScores = (countryId: string, year?: number) =>
  api.post(`/tags/generate-scores/${countryId}`, { year });
