import axios from 'axios';

// Detect hostname to allow access from LAN
const host = window.location.hostname;

export const client = axios.create({
    // Base URL handled by Vite Proxy
    timeout: 10000,
});

client.interceptors.response.use(
    res => res.data,
    err => {
        const error = {
            message: err.response?.data?.detail || err.message || "Server Error",
            code: err.response?.status,
        };
        return Promise.reject(error);
    }
);
