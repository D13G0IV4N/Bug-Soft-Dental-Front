import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // lo ponemos en .env
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Interceptor: agrega token automáticamente a cada request si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});