import axios from 'axios';

// Automatically configure Axios Base URL for Cloud (Vercel) / Local PC
const apiBase = import.meta.env.VITE_API_BASE_URL;

if (apiBase) {
  // Trim trailing slashes so '/api/...' paths concatenate cleanly
  axios.defaults.baseURL = apiBase.replace(/\/+$/, '');
}

// In development, if VITE_API_BASE_URL is not provided, 
// axios.defaults.baseURL remains unset so Vite's dev proxy forwards requests to http://localhost:5000.
