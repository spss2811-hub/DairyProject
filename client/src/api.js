import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 403) {
      alert("ACTION RESTRICTED: This bill period is locked. Contact admin to unlock.");
    }
    return Promise.reject(error);
  }
);

export default api;
