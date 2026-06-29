// ─── API Client ─────────────────────────────────────────────────
const BASE_URL = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('sw_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const request = async (method, path, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return data;
};

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),
};

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  getMe:    ()     => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

// ─── Products ────────────────────────────────────────────────────
export const productApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/products${qs ? '?' + qs : ''}`);
  },
  getById:   (id)   => api.get(`/products/${id}`),
  create:    (data) => api.post('/products', data),
  update:    (id, data) => api.put(`/products/${id}`, data),
  delete:    (id)   => api.delete(`/products/${id}`),
  addReview: (id, data) => api.post(`/products/${id}/reviews`, data),
};

// ─── Orders ──────────────────────────────────────────────────────
export const orderApi = {
  create:  (data) => api.post('/orders', data),
  getMy:   ()     => api.get('/orders/my'),
  getById: (id)   => api.get(`/orders/${id}`),
  pay:     (id)   => api.put(`/orders/${id}/pay`),
};
