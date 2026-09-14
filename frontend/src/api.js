import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
});

// Her istekte JWT token'ı Authorization başlığına ekle
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gelen yanıtlarda oturum süresi dolma (401 Unauthorized) durumunu yakala
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token geçersizse veya 24 saatlik süresi dolmuşsa
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('temp_token');

      // Kullanıcı zaten login sayfasında değilse ana giriş ekranına yönlendir
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default API;