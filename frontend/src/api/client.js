import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4500";

export const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const wsBase = API_BASE.replace(/^http/, "ws");
