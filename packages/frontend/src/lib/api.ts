import axios, { AxiosError, AxiosInstance } from 'axios';

// API base URL - works regardless of location
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

// Create axios instance with retry logic for location-independent connectivity
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 30000, // 30 second timeout for slow connections
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('paircam_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor with retry logic
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as typeof error.config & { _retry?: number };

      // Retry logic for network errors (location-independent connectivity)
      if (
        (error.code === 'ECONNABORTED' ||
         error.code === 'ERR_NETWORK' ||
         error.message.includes('Network Error') ||
         !error.response) &&
        originalRequest &&
        (!originalRequest._retry || originalRequest._retry < 3)
      ) {
        originalRequest._retry = (originalRequest._retry || 0) + 1;

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, originalRequest._retry - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        console.log(`Retrying request (attempt ${originalRequest._retry}/3)...`);
        return client(originalRequest);
      }

      // Handle 401 Unauthorized - refresh token or re-authenticate
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = 1;

        try {
          // Try to refresh the token
          const deviceId = localStorage.getItem('paircam_device_id');
          if (deviceId) {
            const response = await axios.post(`${API_URL}/auth/token`, { deviceId });
            const { accessToken } = response.data;
            localStorage.setItem('paircam_access_token', accessToken);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }
            return client(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

export const api = createApiClient();

// Auth API endpoints
export const authApi = {
  // Generate token with device ID
  getToken: async (deviceId: string) => {
    const response = await api.post('/auth/token', { deviceId });
    return response.data;
  },

  // Verify existing token
  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  // Refresh token
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  // Get TURN credentials for WebRTC
  getTurnCredentials: async () => {
    const response = await api.post('/turn/credentials');
    return response.data;
  },
};

// Health check for connectivity testing
export const healthApi = {
  check: async () => {
    try {
      const response = await api.get('/health', { timeout: 5000 });
      return { connected: true, data: response.data };
    } catch {
      return { connected: false, data: null };
    }
  },
};

export default api;
