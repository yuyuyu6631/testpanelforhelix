import axios from 'axios';

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const client = axios.create({
    baseURL: `http://${host}:8001`,
    timeout: 10000,
});

// Interceptors for logging or auth header injection if needed
client.interceptors.request.use((config) => {
    // config.headers.Authorization = `Bearer ${token}`; 
    return config;
}, (error) => {
    return Promise.reject(error);
});

client.interceptors.response.use((response) => {
    return response;
}, (error) => {
    return Promise.reject(error);
});

export default client;
