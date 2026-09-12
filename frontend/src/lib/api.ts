const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// API Endpoints Constants
const ENDPOINTS = {
  // Auth
  REGISTER: 'auth/register',
  LOGIN: 'auth/login',
  PROFILE: 'auth/profile',
  PASSWORD: 'auth/password',
  
  // Products
  PRODUCTS: 'products',
  PRODUCTS_ASSISTANT: 'products/assistant',
  PRODUCTS_STORES_LIST: 'products/stores/list',
  PRODUCTS_CATEGORIES_LIST: 'products/categories/list',
  
  // Orders
  ORDERS: 'orders',
  ORDERS_SELLER: 'orders/seller/orders',
  
  // Admin
  ADMIN_STATS: 'admin/stats',
  ADMIN_USERS: 'admin/users',
  ADMIN_STORES: 'admin/stores',
  ADMIN_VENDOR_PAYOUTS: 'admin/vendor-payouts',
  ADMIN_VENDOR_SETTLEMENTS: 'admin/vendor-settlements',
  ADMIN_PRODUCTS: 'admin/products',
  ADMIN_ORDERS: 'admin/orders',
  
  // Payments
  PAYMENTS_CREATE: 'payments/create-payment',
  PAYMENTS_VERIFY: 'payments/verify',
  
  // Subscriptions
  SUBSCRIPTIONS_PLANS: 'subscriptions/plans',
  SUBSCRIPTIONS_CURRENT: 'subscriptions/current',
  SUBSCRIPTIONS_NOTIFICATIONS: 'subscriptions/notifications',
  SUBSCRIPTIONS_REQUEST: 'subscriptions/request',
  SUBSCRIPTIONS_CREATE: 'subscriptions/create',
};

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
    const response = await this.request(`/${ENDPOINTS.REGISTER}`, {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async signIn(email, password) {
    const response = await this.request(`/${ENDPOINTS.LOGIN}`, {
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
    return this.request(`/${ENDPOINTS.PROFILE}`);
  }

  async updateProfile(updates) {
    return this.request(`/${ENDPOINTS.PROFILE}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updatePassword(currentPassword, newPassword) {
    return this.request(`/${ENDPOINTS.PASSWORD}`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Product methods
  async getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/${ENDPOINTS.PRODUCTS}?${queryString}`);
  }

  async getAssistantProducts(query) {
    const queryString = new URLSearchParams({ query }).toString();
    return this.request(`/${ENDPOINTS.PRODUCTS_ASSISTANT}?${queryString}`);
  }

  async getProduct(id) {
    return this.request(`/${ENDPOINTS.PRODUCTS}/${id}`);
  }

  async getStores() {
    return this.request(`/${ENDPOINTS.PRODUCTS_STORES_LIST}`);
  }

  async getCategories() {
    return this.request(`/${ENDPOINTS.PRODUCTS_CATEGORIES_LIST}`);
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
    return this.request(`/${ENDPOINTS.PRODUCTS}`, {
      method: 'POST',
      body: productData,
    });
  }

  async updateProduct(id, updates) {
    return this.request(`/${ENDPOINTS.PRODUCTS}/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async deleteProduct(id) {
    return this.request(`/${ENDPOINTS.PRODUCTS}/${id}`, {
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
    return this.request(`/${ENDPOINTS.ORDERS}`);
  }

  async getOrder(id) {
    return this.request(`/${ENDPOINTS.ORDERS}/${id}`);
  }

  async createOrder(orderData) {
    return this.request(`/${ENDPOINTS.ORDERS}`, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(id, status) {
    return this.request(`/${ENDPOINTS.ORDERS}/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getSellerOrders() {
    return this.request(`/${ENDPOINTS.ORDERS_SELLER}`);
  }

  // Admin methods
  async getAdminStats() {
    return this.request(`/${ENDPOINTS.ADMIN_STATS}`);
  }

  async getAdminUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/${ENDPOINTS.ADMIN_USERS}?${queryString}`);
  }

  async banUser(userId, banned) {
    return this.request(`/${ENDPOINTS.ADMIN_USERS}/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ banned }),
    });
  }

  async getAdminStores(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/${ENDPOINTS.ADMIN_STORES}?${queryString}`);
  }

  async getAdminVendorPayouts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/${ENDPOINTS.ADMIN_VENDOR_PAYOUTS}?${queryString}`);
  }

  async getAdminVendorSettlements(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/${ENDPOINTS.ADMIN_VENDOR_SETTLEMENTS}?${queryString}`);
  }

  async markStorePaid(storeId: string | number, note?: string) {
    return this.request(`/${ENDPOINTS.ADMIN_STORES}/${storeId}/mark-paid`, { method: 'POST', body: JSON.stringify({ note }) });
  }

  async approveStore(storeId, approved) {
    return this.request(`/${ENDPOINTS.ADMIN_STORES}/${storeId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved }),
    });
  }

  async getAdminProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/${ENDPOINTS.ADMIN_PRODUCTS}?${queryString}`);
  }

  async getAdminOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/${ENDPOINTS.ADMIN_ORDERS}?${queryString}`);
  }

  // Payment methods (Konnect)
  async createPaymentSession(paymentPayload) {
    return this.request(`/${ENDPOINTS.PAYMENTS_CREATE}`, {
      method: 'POST',
      body: JSON.stringify(paymentPayload),
    });
  }

  async verifyPayment(paymentId) {
    return this.request(`/${ENDPOINTS.PAYMENTS_VERIFY}/${paymentId}`);
  }

  async getPaymentStatus(paymentId) {
    return this.request(`/${ENDPOINTS.PAYMENTS_VERIFY}/${paymentId}`);
  }

  async getSubscriptionPlans() {
    return this.request(`/${ENDPOINTS.SUBSCRIPTIONS_PLANS}`);
  }

  async getSellerSubscription() {
    return this.request(`/${ENDPOINTS.SUBSCRIPTIONS_CURRENT}`);
  }

  async getSubscriptionNotifications() {
    return this.request(`/${ENDPOINTS.SUBSCRIPTIONS_NOTIFICATIONS}`);
  }

  async markSubscriptionNotificationRead(notificationId: string | number) {
    return this.request(`/${ENDPOINTS.SUBSCRIPTIONS_NOTIFICATIONS}/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async requestSellerSubscription(comment?: string) {
    return this.request(`/${ENDPOINTS.SUBSCRIPTIONS_REQUEST}`, {
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
    return this.request(`/${ENDPOINTS.SUBSCRIPTIONS_CREATE}`, {
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