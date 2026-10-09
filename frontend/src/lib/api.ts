import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

/**
 * Single source of truth for the API base URL.
 *
 * Set VITE_API_URL in one of:
 *   - frontend/.env.local          → loaded in dev (gitignored)
 *   - frontend/.env.production     → used by `vite build`
 *   - hosting env var              → overrides at deploy time if you build on Render/Vercel
 *
 * The app points at the deployed Render API by default (in dev and prod).
 * Examples:
 *   VITE_API_URL=https://erpback-tnsv.onrender.com
 *   VITE_API_URL=http://localhost:5000   (only if you want a local backend)
 */
export const getApiBaseUrl = () => {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  // Fallback only if VITE_API_URL is missing (never prefer this over env).
  const fallback = 'https://erpback-tnsv.onrender.com';
  const base = (configured || fallback).replace(/\/+$/, '');
  return `${base}/api`;
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
