import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eco_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired, clear invalid token
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        localStorage.removeItem('eco_token');
        localStorage.removeItem('eco_user');
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  logout: () => {
    localStorage.removeItem('eco_token');
    localStorage.removeItem('eco_user');
  }
};

// Properties Services
export const propertyService = {
  list: (params) => api.get('/properties', { params }),
  get: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  addRoomType: (id, data) => api.post(`/properties/${id}/room-types`, data),
  getInventory: (id, params) => api.get(`/properties/${id}/inventory`, { params }),
  getQuote: (id, params) => api.get(`/properties/${id}/quote`, { params }),
};

// Booking Services (Customer & Manager)
export const bookingService = {
  getMyBookings: () => api.get('/bookings/my-bookings'),
  create: (data) => api.post('/bookings', data),
  get: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.post(`/bookings/${id}/cancel`),
  listAll: (params) => api.get('/bookings', { params }),
};

// Events Services
export const eventService = {
  list: (params) => api.get('/events', { params }),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  scrape: (sourceId) => api.post('/events/scrape', { source_id: sourceId }),
  getScrapingRuns: () => api.get('/events/scraping-runs'),
};

// Machine Learning & Predictions Services
export const mlService = {
  predictDemand: (data) => api.post('/predictions/predict', data),
  getPredictionHistory: (params) => api.get('/predictions/history', { params }),
  trainModel: () => api.post('/ml/train'),
  getStatus: () => api.get('/ml/status'),
  explain: (features, modelName = null) => api.post('/ml/explain', { features, model_name: modelName }),
};

// Dynamic Pricing Services
export const pricingService = {
  recommend: (data) => api.post('/pricing/recommend', data),
  listRecommendations: (params) => api.get('/pricing/recommendations', { params }),
  approve: (id) => api.post(`/pricing/recommendations/${id}/approve`),
  override: (id, overridePrice) => api.post(`/pricing/recommendations/${id}/override`, { override_price: overridePrice }),
  reject: (id, reason) => api.post(`/pricing/recommendations/${id}/reject`, { reason }),
  getHistory: (params) => api.get('/pricing/history', { params }),
};

// Analytics Services
export const analyticsService = {
  getKPIs: (params) => api.get('/analytics/kpis', { params }),
  getTrends: (params) => api.get('/analytics/trends', { params }),
  getEventImpact: (params) => api.get('/analytics/event-impact', { params }),
  getSimulation: (params) => api.get('/analytics/simulation', { params }),
  getRevenueAnalytics: (params) => api.get('/analytics/revenue', { params }),
};

// Weather & Climate Services
export const weatherService = {
  getDestinations: () => api.get('/weather/destinations'),
  getForecast: (propertyId, days = 7) => api.get('/weather/forecast', { params: { property_id: propertyId, days } }),
  lookup: (params) => api.get('/weather/lookup', { params }),
};

// Data & System Services
export const dataService = {
  resetSeed: () => api.post('/data/reset-seed'),
  getExportUrl: () => `${API_BASE_URL}/data/export-revenue-report`,
  getDatasetsOverview: () => api.get('/data/datasets-overview'),
  getSources: () => api.get('/data/sources'),
  refreshLive: (sourceId = 'all', force = false) => api.post('/data/refresh-live', { source_id: sourceId, force }),
  getHolidays: (params) => api.get('/data/holidays', { params }),
  getAttractions: (params) => api.get('/data/attractions', { params }),
  importCsv: (formData) => api.post('/data/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export default api;

