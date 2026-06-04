// API client to replace Supabase
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getAuthHeaders(body) {
    const headers = {};
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const body = options.body;
    const headers = {
      ...this.getAuthHeaders(body),
      ...options.headers,
    };
    const config = {
      ...options,
      headers,
    };

    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        const errorMessage = error.message || error.error || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async signUp(email, password, fullName, role = 'customer') {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async signIn(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async signOut() {
    this.setToken(null);
    return { success: true };
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(updates) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updatePassword(currentPassword, newPassword) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Product methods
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/products?${queryString}`);
  }

  async getAssistantProducts(query) {
    const queryString = new URLSearchParams({ query }).toString();
    return this.request(`/products/assistant?${queryString}`);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async getStores() {
    return this.request('/products/stores/list');
  }

  async getCategories() {
    return this.request('/products/categories/list');
  }

  async getSellerStore(sellerId) {
    return this.request(`/products/stores/seller/${encodeURIComponent(sellerId)}`);
  }

  async createStore(sellerId: string, formData: FormData) {
    return this.request(`/products/stores/seller/${encodeURIComponent(sellerId)}`, {
      method: 'POST',
      body: formData,
    });
  }

  async getSellerProducts(storeSlug) {
    return this.request(`/products/stores/manage/${encodeURIComponent(storeSlug)}`);
  }

  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: productData,
    });
  }

  async updateProduct(id, updates) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Cart methods (these will need to be implemented in the backend)
  async getCart() {
    // This would need to be implemented in the backend
    // For now, return empty cart
    return { items: [] };
  }

  async addToCart(productId, quantity = 1) {
    // This would need to be implemented in the backend
    return { success: true };
  }

  async updateCartItem(itemId, quantity) {
    // This would need to be implemented in the backend
    return { success: true };
  }

  async removeFromCart(itemId) {
    // This would need to be implemented in the backend
    return { success: true };
  }

  async clearCart() {
    // This would need to be implemented in the backend
    return { success: true };
  }

  // Order methods
  async getOrders() {
    return this.request('/orders');
  }

  async getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(id, status) {
    return this.request(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getSellerOrders() {
    return this.request('/orders/seller/orders');
  }

  // Admin methods
  async getAdminStats() {
    return this.request('/admin/stats');
  }

  async getAdminUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/users?${queryString}`);
  }

  async banUser(userId, banned) {
    return this.request(`/admin/users/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ banned }),
    });
  }

  async getAdminStores(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/stores?${queryString}`);
  }

  async getAdminVendorPayouts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/vendor-payouts?${queryString}`);
  }

  async getAdminVendorSettlements(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/vendor-settlements?${queryString}`);
  }

  async markStorePaid(storeId: string | number, note?: string) {
    return this.request(`/admin/stores/${storeId}/mark-paid`, { method: 'POST', body: JSON.stringify({ note }) });
  }

  async approveStore(storeId, approved) {
    return this.request(`/admin/stores/${storeId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved }),
    });
  }

  async getAdminProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/products?${queryString}`);
  }

  async approveProduct(productId, approved) {
    return this.request(`/admin/products/${productId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved }),
    });
  }

  async getAdminOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/admin/orders?${queryString}`);
  }

  // Payment methods (Konnect)
  async createPaymentSession(paymentPayload) {
    return this.request('/payments/create-payment', {
      method: 'POST',
      body: JSON.stringify(paymentPayload),
    });
  }

  async verifyPayment(paymentId) {
    return this.request(`/payments/verify/${paymentId}`);
  }

  async getPaymentStatus(paymentId) {
    return this.request(`/payments/verify/${paymentId}`);
  }

  async getSubscriptionPlans() {
    return this.request('/subscriptions/plans');
  }

  async getSellerSubscription() {
    return this.request('/subscriptions/current');
  }

  async getSubscriptionNotifications() {
    return this.request('/subscriptions/notifications');
  }

  async markSubscriptionNotificationRead(notificationId: string | number) {
    return this.request(`/subscriptions/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async requestSellerSubscription(comment?: string) {
    return this.request('/subscriptions/request', {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
  }

  async paySellerSubscription(subscriptionId, payload = {}) {
    return this.request(`/subscriptions/seller/pay/${subscriptionId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async requestSellerSubscriptionRenewal(payload = {}) {
    return this.request("/subscriptions/seller/request-renewal", {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createSubscription(planId: number, paymentMethod = 'card') {
    return this.request('/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify({ planId, paymentMethod }),
    });
  }

  async confirmSubscription(subscriptionId: number | string) {
    return this.request(`/subscriptions/confirm/${subscriptionId}`, {
      method: 'POST',
    });
  }

  async mockSubscriptionPayment(subscriptionId: number | string, payload) {
    return this.request(`/subscriptions/mock-pay/${subscriptionId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async simulatePaymentSuccess(subscriptionId: number | string) {
    return this.request(`/subscriptions/simulate-success/${subscriptionId}`, {
      method: 'POST',
    });
  }

  async verifySubscription(subscriptionId: number | string) {
    return this.request(`/subscriptions/verify/${subscriptionId}`);
  }

  // Generic HTTP methods
  async get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint: string, data?: any) {
    return this.request(endpoint, { method: 'POST', body: data });
  }

  async put(endpoint: string, data?: any) {
    return this.request(endpoint, { method: 'PUT', body: data });
  }

  async delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// For backward compatibility, create a mock supabase object
export const supabase = {
  auth: {
    signUp: ({ email, password, options }) => api.signUp(email, password, options?.data?.full_name, options?.data?.role),
    signInWithPassword: ({ email, password }) => api.signIn(email, password),
    signOut: () => api.signOut(),
    onAuthStateChange: (callback) => {
      // This is a simplified version - in a real app you'd need proper auth state management
      const checkAuth = () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          callback('SIGNED_IN', { user: { id: 'mock-id' } });
        } else {
          callback('SIGNED_OUT', null);
        }
      };
      checkAuth();
      window.addEventListener('storage', checkAuth);
      return () => window.removeEventListener('storage', checkAuth);
    },
    getSession: async () => {
      const token = localStorage.getItem('auth_token');
      return { data: { session: token ? { user: { id: 'mock-id' } } : null } };
    },
  },
  from: (table) => ({
    select: (columns = '*', options = {}) => ({
      eq: (column, value) => ({
        single: async () => {
          // This is a mock - you'd need to implement actual queries
          return { data: null, error: null };
        },
      }),
      order: (column, options = {}) => ({
        limit: (limit) => ({
          range: (from, to) => ({
            // Mock implementation
            data: [],
            error: null,
          }),
        }),
      }),
    }),
    insert: (data) => ({
      // Mock implementation
      error: null,
    }),
    update: (data) => ({
      eq: (column, value) => ({
        // Mock implementation
        error: null,
      }),
    }),
    delete: () => ({
      eq: (column, value) => ({
        // Mock implementation
        error: null,
      }),
    }),
  }),
};