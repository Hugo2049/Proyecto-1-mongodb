const API_BASE = '/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const res = await fetch(url, config);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Error de conexión con el servidor (status ${res.status})`);
  }

  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
}

// Restaurants
export const getRestaurants = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/restaurants?${query}`);
};
export const getRestaurant = (id) => request(`/restaurants/${id}`);
export const loginRestaurant = (restaurantId, accessCode) => request('/restaurants/login', { method: 'POST', body: { restaurantId, accessCode } });
export const loginAdmin = (password) => request('/restaurants/login/admin', { method: 'POST', body: { password } });
export const createRestaurant = (data) => request('/restaurants', { method: 'POST', body: data });
export const updateRestaurant = (id, data) => request(`/restaurants/${id}`, { method: 'PUT', body: data });
export const deleteRestaurant = (id) => request(`/restaurants/${id}`, { method: 'DELETE' });
export const addCategory = (id, category) => request(`/restaurants/${id}/categories/add`, { method: 'PATCH', body: { category } });
export const removeCategory = (id, category) => request(`/restaurants/${id}/categories/remove`, { method: 'PATCH', body: { category } });
export const updateSchedule = (id, data) => request(`/restaurants/${id}/schedule`, { method: 'PATCH', body: data });
export const getNearbyRestaurants = (lng, lat, maxDistance = 50000) => request(`/restaurants/nearby/${lng}/${lat}?maxDistance=${maxDistance}`);

// Users
export const getUsers = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/users?${query}`);
};
export const getUser = (id) => request(`/users/${id}`);
export const loginUser = (email, password) => request('/users/login', { method: 'POST', body: { email, password } });
export const registerUser = (data) => request('/users/register', { method: 'POST', body: data });
export const createUser = (data) => request('/users', { method: 'POST', body: data });
export const updateUser = (id, data) => request(`/users/${id}`, { method: 'PUT', body: data });
export const deleteUser = (id) => request(`/users/${id}`, { method: 'DELETE' });

// Menu Items
export const getMenuItems = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/menu-items?${query}`);
};
export const getRestaurantMenu = (restaurantId) => request(`/menu-items/restaurant/${restaurantId}`);
export const createMenuItem = (data) => request('/menu-items', { method: 'POST', body: data });
export const updateMenuItem = (id, data) => request(`/menu-items/${id}`, { method: 'PUT', body: data });
export const deleteMenuItem = (id) => request(`/menu-items/${id}`, { method: 'DELETE' });
export const uploadMenuItemImage = (id, file) => {
  const formData = new FormData();
  formData.append('image', file);
  return request(`/menu-items/${id}/image`, { method: 'POST', body: formData });
};
export const getMenuItemImageUrl = (fileId) => `${API_BASE}/files/${fileId}`;

// Orders
export const getOrders = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/orders?${query}`);
};
export const getOrderDetail = (id) => request(`/orders/${id}/detail`);
export const createOrder = (data) => request('/orders', { method: 'POST', body: data });
export const updateOrderStatus = (id, status, note) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status, note } });
export const deleteOrder = (id) => request(`/orders/${id}`, { method: 'DELETE' });

// Reviews
export const getReviews = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/reviews?${query}`);
};
export const getRestaurantReviews = (restaurantId) => request(`/reviews/restaurant/${restaurantId}`);
export const createReview = (data) => request('/reviews', { method: 'POST', body: data });
export const addReviewResponse = (id, text) => request(`/reviews/${id}/response`, { method: 'PATCH', body: { text } });
export const deleteReview = (id) => request(`/reviews/${id}`, { method: 'DELETE' });

// Analytics
export const getDashboard = (restaurantId) => request(`/analytics/dashboard${restaurantId ? `?restaurantId=${restaurantId}` : ''}`);
export const getTopRestaurants = (limit = 10) => request(`/analytics/top-restaurants?limit=${limit}`);
export const getTopItems = (restaurantId) => request(`/analytics/top-items${restaurantId ? `?restaurantId=${restaurantId}` : ''}`);
export const getRevenueByMonth = (year, restaurantId) => {
  let url = `/analytics/revenue-by-month?year=${year}`;
  if (restaurantId) url += `&restaurantId=${restaurantId}`;
  return request(url);
};
export const getMenuFacets = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/analytics/menu-facets?${query}`);
};
export const getRatingDistribution = (restaurantId) => request(`/analytics/rating-distribution/${restaurantId}`);
export const getOrdersCount = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/analytics/orders/count?${query}`);
};

// Files
export const getFiles = () => request('/files');
export const uploadFile = (file, metadata = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify(metadata));
  return request('/files/upload', { method: 'POST', body: formData });
};
export const getFileUrl = (fileId) => `${API_BASE}/files/${fileId}`;
