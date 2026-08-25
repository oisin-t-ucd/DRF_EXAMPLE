// src/api.js
import axios from 'axios';

// 1. In-memory storage for the access token
let accessToken = null;

export const setAccessToken = (token) => { accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };

// 2. Base Axios instance
const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/',
    withCredentials: true, // IMPORTANT: Forces browser to send/receive the HttpOnly cookies
});

// 3. Request Interceptor: Attach the token to outgoing requests
api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

// 4. Response Interceptor: Handle 401 Unauthorized errors silently
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Attempt to refresh. The browser automatically sends the refresh_token cookie!
                const res = await axios.post('http://127.0.0.1:8000/api/refresh/', {}, {
                    withCredentials: true 
                });
                
                // Update our in-memory variable
                setAccessToken(res.data.access);
                
                // Retry the original failed request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (err) {
                // If refresh fails (cookie expired), clear everything and redirect
                clearAccessToken();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

