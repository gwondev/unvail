const viteEnv = typeof import.meta !== "undefined" ? import.meta.env : {};
const legacyEnv = typeof process !== "undefined" ? process.env : {};

export const API_BASE_URL = viteEnv.VITE_API_BASE_URL || legacyEnv.REACT_APP_API_BASE_URL || "/api";
export const GOOGLE_CLIENT_ID = viteEnv.VITE_GOOGLE_CLIENT_ID || legacyEnv.REACT_APP_GOOGLE_CLIENT_ID || "";
