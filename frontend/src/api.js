import { getAuth } from 'firebase/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.tokenCache = null;
    this.tokenExpiry = 0;
  }

  async getAuthToken(forceRefresh = false) {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return null;
    }

    // Check if cached token is still valid (with 5 min buffer)
    const now = Date.now();
    if (!forceRefresh && this.tokenCache && now < this.tokenExpiry - 5 * 60 * 1000) {
      return this.tokenCache;
    }

    try {
      const token = await user.getIdToken(forceRefresh);
      this.tokenCache = token;
      // Token expires in 1 hour, cache for 50 minutes
      this.tokenExpiry = now + 50 * 60 * 1000;
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      this.tokenCache = null;
      this.tokenExpiry = 0;
      return null;
    }
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const token = await this.getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle token expiration (401)
      if (response.status === 401 && retryCount === 0) {
        // Force refresh token and retry once
        const newToken = await this.getAuthToken(true);
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return this.handleResponse(retryResponse);
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server');
      }
      throw error;
    }
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    const data = isJson ? await response.json() : await response.text();
    
    if (!response.ok) {
      const message = isJson && data.message ? data.message : data;
      throw new Error(message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  }

  // Sites API
  async getSites(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/sites${query ? `?${query}` : ''}`);
  }

  async getSite(wid) {
    return this.request(`/api/sites/${encodeURIComponent(wid)}`);
  }

  async getSiteRelated(wid) {
    return this.request(`/api/sites/${encodeURIComponent(wid)}/related`);
  }

  async getSiteFields() {
    return this.request('/api/sites/fields');
  }

  async createSite(data) {
    return this.request('/api/sites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSite(wid, data) {
    return this.request(`/api/sites/${encodeURIComponent(wid)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSite(wid) {
    return this.request(`/api/sites/${encodeURIComponent(wid)}`, {
      method: 'DELETE',
    });
  }

  // Teams API
  async getTeams(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/teams${query ? `?${query}` : ''}`);
  }

  async getTeam(id) {
    return this.request(`/api/teams/${id}`);
  }

  async createTeam(data) {
    return this.request('/api/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(id, data) {
    return this.request(`/api/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(id) {
    return this.request(`/api/teams/${id}`, {
      method: 'DELETE',
    });
  }

  // Materials API
  async getMaterials(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/materials${query ? `?${query}` : ''}`);
  }

  async getMaterial(id) {
    return this.request(`/api/materials/${id}`);
  }

  async createMaterial(data) {
    return this.request('/api/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMaterial(id, data) {
    return this.request(`/api/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMaterial(id) {
    return this.request(`/api/materials/${id}`, {
      method: 'DELETE',
    });
  }

  // Validations API
  async getValidations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/validations${query ? `?${query}` : ''}`);
  }

  async getValidation(id) {
    return this.request(`/api/validations/${id}`);
  }

  async createValidation(data) {
    return this.request('/api/validations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateValidation(id, data) {
    return this.request(`/api/validations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteValidation(id) {
    return this.request(`/api/validations/${id}`, {
      method: 'DELETE',
    });
  }

  // Upgrades API
  async getUpgrades(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/upgrades${query ? `?${query}` : ''}`);
  }

  async getUpgrade(id) {
    return this.request(`/api/upgrades/${id}`);
  }

  async createUpgrade(data) {
    return this.request('/api/upgrades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUpgrade(id, data) {
    return this.request(`/api/upgrades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUpgrade(id) {
    return this.request(`/api/upgrades/${id}`, {
      method: 'DELETE',
    });
  }

  // Work Orders API
  async getWorkOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/workorders${query ? `?${query}` : ''}`);
  }

  async getWorkOrder(id) {
    return this.request(`/api/workorders/${id}`);
  }

  async createWorkOrder(data) {
    return this.request('/api/workorders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkOrder(id, data) {
    return this.request(`/api/workorders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkOrder(id) {
    return this.request(`/api/workorders/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard API
  async getDashboardSummary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/summary${query ? `?${query}` : ''}`);
  }

  async getDashboardSulawesi(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/sulawesi${query ? `?${query}` : ''}`);
  }

  async getProductivity(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/productivity${query ? `?${query}` : ''}`);
  }

  // KPI / Analytics API
  async getKPIAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/kpi${query ? `?${query}` : ''}`);
  }

  async getKPISummary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/kpi${query ? `?${query}` : ''}`);
  }

  async getKPITrends(params = {}) {
    // Monthly time-series endpoint (/api/dashboard/kpi/trends).
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/kpi/trends${query ? `?${query}` : ''}`);
  }

  async getKPIBreakdown(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/kpi/breakdown${query ? `?${query}` : ''}`);
  }

  async getRegionalAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/regional${query ? `?${query}` : ''}`);
  }

  async getWorkItems(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dashboard/workitems${query ? `?${query}` : ''}`);
  }

  // Health check (no auth required)
  async healthCheck() {
    return this.request('/health', { method: 'GET' });
  }
}

export const api = new ApiClient();