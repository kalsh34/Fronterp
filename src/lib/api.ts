import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Deployed backend. Used in every mode (dev, preview, production) unless VITE_API_URL overrides it.
export const DEFAULT_API_ORIGIN = 'https://erpback-tnsv.onrender.com';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

// Origin of the backend without a trailing slash and without /api,
// e.g. https://erpback-tnsv.onrender.com
export const getApiOrigin = (): string => {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  return trimTrailingSlash(configured || DEFAULT_API_ORIGIN);
};

// Full API base URL, e.g. https://erpback-tnsv.onrender.com/api
export const getApiBaseUrl = (): string => `${getApiOrigin()}/api`;

// The backend stores uploads as root-relative paths (e.g. "/uploads/file.pdf").
// Resolve them against the backend origin so links keep working when the
// frontend and the API are served from different hosts.
export const getAssetUrl = (path?: string | null): string => {
  if (!path) return '';
  const value = path.trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }
  return `${getApiOrigin()}${value.startsWith('/') ? value : `/${value}`}`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
