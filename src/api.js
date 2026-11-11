import axios from 'axios';
import { io } from 'socket.io-client';

export const DEFAULT_SERVER_IP = '192.168.18.93';
export const DEFAULT_SERVER_PORT = '5000';

export const getStoredServerIP = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_server_ip');
    if (custom && custom.trim()) return custom.trim();
    if (window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.hostname;
    }
  }
  return DEFAULT_SERVER_IP;
};

export const getServerBaseUrl = () => {
  const ipOrHost = getStoredServerIP();
  if (ipOrHost.startsWith('http://') || ipOrHost.startsWith('https://')) {
    return ipOrHost.replace(/\/+$/, '');
  }
  if (ipOrHost.includes(':')) {
    return `http://${ipOrHost}`;
  }
  return `http://${ipOrHost}:${DEFAULT_SERVER_PORT}`;
};

export const getApiUrl = () => `${getServerBaseUrl()}/api`;

/**
 * Rewrites previously stored upload URLs (e.g. from an older LAN IP or relative path)
 * to the currently active backend server base URL so uploaded files remain accessible
 * across Wi-Fi / IP changes.
 */
export const resolveAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  const uploadIdx = trimmed.indexOf('/uploads/');
  if (uploadIdx !== -1) {
    return `${getServerBaseUrl()}${trimmed.slice(uploadIdx)}`;
  }
  if (trimmed.startsWith('/')) {
    return `${getServerBaseUrl()}${trimmed}`;
  }
  return trimmed;
};

export const testServerHealth = async (customUrl) => {
  const target = (customUrl ? customUrl.replace(/\/+$/, '') : getServerBaseUrl()) + '/api/health';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(target, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch (err) {
    clearTimeout(timer);
    return false;
  }
};

export const API_URL = getApiUrl();

// Live dynamic socket instance with transparent Proxy wrapper
let socketInstance = io(getServerBaseUrl(), { autoConnect: true });

export const reconnectSocket = () => {
  const oldCallbacks = socketInstance._callbacks ? { ...socketInstance._callbacks } : {};
  try {
    socketInstance.disconnect();
  } catch (e) {
    // ignore
  }
  socketInstance = io(getServerBaseUrl(), { autoConnect: true });
  Object.keys(oldCallbacks).forEach((evt) => {
    const eventName = evt.startsWith('$') ? evt.slice(1) : evt;
    if (Array.isArray(oldCallbacks[evt])) {
      oldCallbacks[evt].forEach((fn) => {
        socketInstance.on(eventName, fn);
      });
    }
  });
};

export const setStoredServerIP = (newIp) => {
  if (!newIp || !newIp.trim()) {
    localStorage.removeItem('custom_server_ip');
  } else {
    let clean = newIp.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    localStorage.setItem('custom_server_ip', clean);
  }
  api.defaults.baseURL = getApiUrl();
  reconnectSocket();
  return getServerBaseUrl();
};

const socket = new Proxy(
  {},
  {
    get(_target, prop) {
      const val = socketInstance[prop];
      return typeof val === 'function' ? val.bind(socketInstance) : val;
    },
    set(_target, prop, value) {
      socketInstance[prop] = value;
      return true;
    }
  }
);

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error?.response?.status, error?.message, error?.config?.url);
    return Promise.reject(error);
  }
);

// Inject token into requests and ensure baseURL always uses current dynamic server IP
api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
};

export const logisticsAPI = {
  getPublicOverview: () => api.get('/public/overview'),
  getTrucks: (params) => api.get('/trucks', { params }),
  addTruck: (data) => api.post('/trucks', data),
  updateTruck: (id, data) => api.patch(`/trucks/${id}`, data),
  deleteTruck: (id) => api.delete(`/trucks/${id}`),
  getCargo: (params) => api.get('/cargo', { params }),
  postCargo: (data) => api.post('/cargo', data),
  updateCargo: (id, data) => api.patch(`/cargo/${id}`, data),
  respondToCargo: (id, data) => api.patch(`/cargo/${id}/respond`, data),
  deleteCargo: (id) => api.delete(`/cargo/${id}`),
  getBookings: (params) => api.get('/bookings', { params }),
  createBooking: (data) => api.post('/bookings', data),
  updateBooking: (id, data) => api.patch(`/bookings/${id}`, data),
  completeBooking: (id, data) => api.post(`/bookings/${id}/complete`, data),
  getComplaints: () => api.get('/complaints'),
  postComplaint: (data) => api.post('/complaints', data),
  updateComplaint: (id, data) => api.patch(`/complaints/${id}`, data),
  getNotifications: () => api.get('/notifications'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  getTransporters: () => api.get('/users', { params: { role: 'transporter' } }),
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  },
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/users'),
  updateUserStatus: (id, status, reason) => api.patch(`/users/${id}`, { status, reason }),
  getShipments: () => api.get('/admin/shipments'),
  getActivity: () => api.get('/admin/activity'),
  getWhatsAppStatus: () => api.get('/whatsapp/status'),
  sendWhatsAppTest: (data) => api.post('/whatsapp/test', data),
};

export { socket };
export default api;
