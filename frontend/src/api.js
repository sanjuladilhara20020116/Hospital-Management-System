// src/api.js
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000" }); // backend root

API.interceptors.request.use((config) => {
  // Attach actor userId for no-JWT auth
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user?.userId) {
      config.headers["x-user-id"] = user.userId;   // 👈 important
    }
  } catch {}
  return config;
});

API.interceptors.response.use(
  (r) => r,
  (err) => {
    // if backend ever sends 401, just bounce to login
    if (err?.response?.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;
