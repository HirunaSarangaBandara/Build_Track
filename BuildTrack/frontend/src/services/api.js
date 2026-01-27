import axios from "axios";
// Import getToken as a named export
import { getToken } from "./auth"; 

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token automatically to every request
API.interceptors.request.use(
  (req) => {
    const token = getToken(); 
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
  },
  (error) => Promise.reject(error)
);

// Global error interceptor for 401/403
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.warn("Session expired or unauthorized. Redirecting to login.");
      // Call a full logout function here
      // window.location.href = "/"; 
    }
    return Promise.reject(error);
  }
);

export default API; 