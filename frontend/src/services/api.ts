import axios from 'axios';

const API_BASE_URL = 'https://sports-jf8d.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Umpire API
export const umpireAPI = {
  getAll: () => api.get('/umpires'),
  getById: (id: string) => api.get(`/umpires/${id}`),
  create: (data: any) => api.post('/umpires', data),
  update: (id: string, data: any) => api.put(`/umpires/${id}`, data),
  delete: (id: string) => api.delete(`/umpires/${id}`),
};

// Match API
export const matchAPI = {
  getAll: () => api.get('/matches'),
  getById: (id: string) => api.get(`/matches/${id}`),
  create: (data: any) => api.post('/matches', data),
  updateStatus: (id: string, status: string) => api.put(`/matches/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/matches/${id}`),
};

// Score API
export const scoreAPI = {
  getByMatchId: (matchId: string) => api.get(`/scores/match/${matchId}`),
  updateCricketScore: (matchId: string, data: any) => api.put(`/scores/cricket/${matchId}`, data),
  updateBadmintonScore: (matchId: string, data: any) => api.put(`/scores/badminton/${matchId}`, data),
  addCricketRuns: (matchId: string, data: any) => api.post(`/scores/cricket/${matchId}/add-runs`, data),
  addBadmintonPoint: (matchId: string, data: any) => api.post(`/scores/badminton/${matchId}/add-point`, data),
};

// Venue API
export const venueAPI = {
  getAll: (params?: any) => api.get('/venues', { params }),
  getById: (id: string) => api.get(`/venues/${id}`),
  create: (data: any) => api.post('/venues', data),
  update: (id: string, data: any) => api.put(`/venues/${id}`, data),
  delete: (id: string) => api.delete(`/venues/${id}`),
};

// Booking API
export const bookingAPI = {
  create: (data: any) => api.post('/bookings', data),
  getByVenue: (venueId: string, params?: any) => api.get(`/bookings/by-venue/${venueId}`, { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
};

export default api;
