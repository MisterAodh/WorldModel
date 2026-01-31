import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => authToken;

// ============================================
// COUNTRIES & REGIONS
// ============================================

export const getCountries = () => api.get('/countries');
export const getCountry = (id: string) => api.get(`/countries/${id}`);

export const getRegions = () => api.get('/regions');
export const getRegion = (id: string) => api.get(`/regions/${id}`);
export const createRegion = (data: { name: string; type?: string; countryIds: string[] }) =>
  api.post('/regions', data);
export const addCountryToRegion = (regionId: string, countryId: string) =>
  api.post(`/regions/${regionId}/members`, { countryId });
export const removeCountryFromRegion = (regionId: string, countryId: string) =>
  api.delete(`/regions/${regionId}/members/${countryId}`);
export const deleteRegion = (id: string) => api.delete(`/regions/${id}`);

// ============================================
// USERS
// ============================================

export const getCurrentUser = () => api.get('/users/me');
export const updateCurrentUser = (data: {
  username?: string;
  displayName?: string;
  bio?: string;
  isPublic?: boolean;
}) => api.patch('/users/me', data);
export const searchUsers = (query: string, limit?: number) =>
  api.get('/users/search', { params: { q: query, limit } });
export const getUserProfile = (userId: string) => api.get(`/users/${userId}`);
export const getUserWorld = (userId: string, countryId?: string) =>
  api.get(`/users/${userId}/world`, { params: { countryId } });
export const getUserFollowers = (userId: string) => api.get(`/users/${userId}/followers`);
export const getUserFollowing = (userId: string) => api.get(`/users/${userId}/following`);

// ============================================
// FOLLOWS
// ============================================

export const followUser = (userId: string) => api.post('/follows', { userId });
export const unfollowUser = (userId: string) => api.delete(`/follows/${userId}`);
export const getMyFollowers = () => api.get('/follows/followers');
export const getMyFollowing = () => api.get('/follows/following');
export const getNetworkData = (countryId: string) => api.get(`/follows/network/${countryId}`);

// ============================================
// MESSAGES
// ============================================

export const getConversations = () => api.get('/messages');
export const getMessages = (userId: string, limit?: number, before?: string) =>
  api.get(`/messages/${userId}`, { params: { limit, before } });
export const sendMessage = (data: { receiverId: string; content: string; articleId?: string }) =>
  api.post('/messages', data);
export const markMessageRead = (messageId: string) => api.patch(`/messages/${messageId}/read`);
export const getUnreadCount = () => api.get('/messages/unread/count');

// ============================================
// BILLING
// ============================================

export const getCreditBalance = () => api.get('/billing/balance');
export const getUsageHistory = (limit?: number) => api.get('/billing/usage', { params: { limit } });
export const createCheckoutSession = (successUrl: string, cancelUrl: string) =>
  api.post('/billing/checkout', { successUrl, cancelUrl });
export const verifyCheckoutSession = (sessionId: string) =>
  api.post('/billing/verify-session', { sessionId });
export const getPurchaseHistory = (limit?: number) =>
  api.get('/billing/purchases', { params: { limit } });

// ============================================
// TAGS
// ============================================

export const getTags = (scopeType: string, scopeId: string, userId?: string) =>
  api.get(`/tags/${scopeType}/${scopeId}`, { params: { userId } });
export const createTag = (data: {
  scopeType: string;
  scopeId: string;
  category: string;
  value: number;
  note?: string;
}) => api.post('/tags', data);
export const deleteTag = (id: string) => api.delete(`/tags/${id}`);

// ============================================
// METRICS
// ============================================

export const getMetrics = (countryId: string) => api.get(`/metrics/${countryId}`);
export const updateMetrics = (data: any) => api.post('/metrics', data);

// ============================================
// INDUSTRIES
// ============================================

export const getIndustries = (countryId: string, year: number) =>
  api.get(`/industries/${countryId}/${year}`);
export const updateIndustry = (data: any) => api.post('/industries', data);
export const deleteIndustry = (id: string) => api.delete(`/industries/${id}`);

// ============================================
// ARTICLES
// ============================================

export const getArticles = (params?: { countryId?: string; regionId?: string; userId?: string }) =>
  api.get('/articles', { params });
export const createArticle = (data: { url: string; countryIds?: string[]; title?: string; keyNotes?: string }) =>
  api.post('/articles', data);
export const updateArticle = (articleId: string, data: { title?: string; keyNotes?: string }) =>
  api.patch(`/articles/${articleId}`, data);
export const deleteArticle = (articleId: string) => api.delete(`/articles/${articleId}`);
export const linkArticleToCountry = (articleId: string, countryId: string) =>
  api.post(`/articles/${articleId}/countries`, { countryId });
export const unlinkArticleFromCountry = (articleId: string, countryId: string) =>
  api.delete(`/articles/${articleId}/countries/${countryId}`);

// ============================================
// NOTES
// ============================================

export const getNotes = (scopeType: string, scopeId: string, userId?: string) =>
  api.get(`/notes/${scopeType}/${scopeId}`, { params: { userId } });
export const saveNote = (data: {
  id?: string;
  scopeType: string;
  scopeId: string;
  content: string;
}) => api.post('/notes', data);
export const deleteNote = (id: string) => api.delete(`/notes/${id}`);

// ============================================
// SUGGESTIONS
// ============================================

export const getSuggestions = (scopeType: string, scopeId: string, status?: string) =>
  api.get(`/suggestions/${scopeType}/${scopeId}`, { params: { status } });
export const approveSuggestion = (id: string) => api.post(`/suggestions/${id}/approve`);
export const rejectSuggestion = (id: string) => api.post(`/suggestions/${id}/reject`);

// ============================================
// CHAT
// ============================================

export const sendChatMessage = (data: {
  message: string;
  contextType?: string;
  contextId?: string;
  conversationHistory?: any[];
}) => api.post('/chat', data);

// ============================================
// METRIC DEFINITIONS & COUNTRY METRICS
// ============================================

export const getMetricDefinitions = () => api.get('/metric-definitions');
export const getCountryMetricsSpreadsheet = (countryId: string, year?: number) =>
  api.get(`/country-metrics/${countryId}/spreadsheet`, { params: { year } });
export const upsertCountryMetric = (data: any) => api.post('/country-metrics', data);
export const deleteCountryMetric = (id: string) => api.delete(`/country-metrics/${id}`);

// ============================================
// AGGREGATION JOBS
// ============================================

export const getAggregationJobs = (countryId: string) => api.get(`/aggregation-jobs/${countryId}`);
export const getActiveAggregationJob = (countryId: string) => api.get(`/aggregation-jobs/${countryId}/active`);
export const getAggregationJobLogs = (id: string) => api.get(`/aggregation-jobs/${id}/logs`);
export const startAggregationJob = (data: { countryId: string; year: number }) =>
  api.post('/aggregation-jobs', data);
export const cancelAggregationJob = (id: string) => api.post(`/aggregation-jobs/${id}/cancel`);

// ============================================
// AI SCORE GENERATION
// ============================================

export const generateAIScores = (countryId: string, year?: number) =>
  api.post(`/tags/generate-scores/${countryId}`, { year });
