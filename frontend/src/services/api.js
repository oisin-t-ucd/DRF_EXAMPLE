// src/api.js
import axios from 'axios';

// 1. In-memory storage for the access token
let accessToken = null;

export const setAccessToken = (token) => { 
    console.log(accessToken)
    accessToken = token; };
export const clearAccessToken = () => { accessToken = null; };

// 2. Base Axios instance
const api = axios.create({
    baseURL: 'http://localhost:8000/',
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
                const res = await axios.post('http://localhost:8000/api/refresh/', {}, {
                    withCredentials: true 
                });
                
                // Update our in-memory variable
                setAccessToken(res.data.access);
                
                // Retry the original failed request
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (err) {
                // 1. Clear the token
                clearAccessToken();
                                
                // 2. Reject the promise so AuthContext knows the request failed
                return Promise.reject(err); 
            }
        }
        return Promise.reject(error);
    }
);

export default api;

