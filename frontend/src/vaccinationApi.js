// src/vaccinationApi.js
import axios from "axios";

/** Resolve API base URL without changing any other files */
const API_BASE_URL = (() => {
  try {
    // Vite
    if (typeof import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch {}
  // CRA
  if (typeof process !== "undefined" &&
      process.env &&
      process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  // Fallback
  return "http://localhost:5000";
})();

/** Dedicated axios instance for /api/vaccinations */
const VaccAPI = axios.create({
  baseURL: `${API_BASE_URL}/api/vaccinations`,
  timeout: 15000,
  withCredentials: false, // header-based auth only
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/** Attach x-user-id from localStorage (no-JWT) */
VaccAPI.interceptors.request.use((config) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const id = user?.userId;
    if (typeof id === "string" && /^[A-Za-z0-9/_-]+$/.test(id)) {
      config.headers["x-user-id"] = id;
    } else {
      delete config.headers["x-user-id"];
    }
  } catch {}
  return config;
});

/** 401 → clear fake session and redirect to /login */
VaccAPI.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      try { localStorage.removeItem("user"); } catch {}
      if (typeof window !== "undefined" && window.location?.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

/** Convenience methods that match your backend routes exactly */
export const Vaccination = {
  // Doctor endpoints
  create: (payload) => VaccAPI.post("/", payload).then(r => r.data),
  listForDoctor: (params) => VaccAPI.get("/doctor", { params }).then(r => r.data),
  resendEmail: (id) => VaccAPI.post(`/${id}/resend`).then(r => r.data),
  update: (id, body) => VaccAPI.put(`/${id}`, body).then(r => r.data),
  remove: (id) => VaccAPI.delete(`/${id}`).then(r => r.data),

  // Shared
  getOne: (id) => VaccAPI.get(`/${id}`).then(r => r.data),

  // Patient endpoint
  listMine: () => VaccAPI.get("/mine").then(r => r.data),
};

/** Blob-based PDF download (works with x-user-id header) */
export async function downloadVaccinationPdfBlob(id) {
  const res = await VaccAPI.get(`/${id}/pdf`, { responseType: "blob" });
  return res.data; // Blob
}

/** Open the PDF in a new tab (helper for buttons) */
export async function openVaccinationPdfInNewTab(id) {
  const blob = await downloadVaccinationPdfBlob(id);
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // release the object URL after a minute
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** (Kept for reference, but NOT used anymore due to headers issue) */
export const vaccinationPdfUrl = (id) =>
  `${API_BASE_URL}/api/vaccinations/${id}/pdf`;

export default VaccAPI;
