const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'inspector' | 'supervisor' | 'admin';
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: 'inspector' | 'supervisor' | 'admin';
  username: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ProductionLine {
  id: string;
  name: string;
  location?: string;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
}

export interface Defect {
  id: string;
  defect_type: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  x_min?: number;
  y_min?: number;
  x_max?: number;
  y_max?: number;
  explanation?: string;
  suggested_action?: string;
  created_at: string;
}

export interface InspectionImage {
  id: string;
  original_url: string;
  annotated_url: string;
  storage_provider: string;
}

export interface Inspection {
  id: string;
  product_id: string;
  production_line_id: string;
  inspector_id: string;
  status: 'pass' | 'rework' | 'reject';
  shift: 'morning' | 'afternoon' | 'night';
  avg_confidence: number;
  notes?: string;
  created_at: string;
}

export interface InspectionDetail extends Inspection {
  product: Product;
  production_line: ProductionLine;
  inspector: UserProfile;
  image?: InspectionImage;
  defects: Defect[];
}

export interface Report {
  id: string;
  name: string;
  report_type: 'daily' | 'monthly' | 'inspection';
  file_format: 'pdf' | 'csv';
  file_url: string;
  created_by_id: string;
  created_at: string;
}

export interface DashboardAnalytics {
  kpis: {
    total_inspections: number;
    pass_rate: number;
    fail_rate: number;
    rework_rate: number;
    reject_rate: number;
    avg_confidence: number;
  };
  defect_distribution: { type: string; count: number }[];
  production_trends: {
    date: string;
    total: number;
    passed: number;
    rework: number;
    rejected: number;
    pass_rate: number;
  }[];
  line_performance: {
    line_name: string;
    total: number;
    pass_rate: number;
    fail_rate: number;
  }[];
  shift_performance: {
    [key: string]: { total: number; defects: number };
  };
}

export interface HeatmapData {
  defect_types: string[];
  matrix: {
    line_name: string;
    [key: string]: string | number;
  }[];
}

class ApiClient {
  private getHeaders(isMultipart = false): HeadersInit {
    const token = localStorage.getItem('fv_token');
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('fv_token');
        localStorage.removeItem('fv_role');
        localStorage.removeItem('fv_username');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      const errData = await response.json().catch(() => ({ detail: 'An unknown server error occurred' }));
      throw new Error(errData.detail || 'Request failed');
    }
    return response.json() as Promise<T>;
  }

  // --- Auth Api ---
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login-json`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username, password }),
    });
    return this.handleResponse<AuthResponse>(res);
  }

  async register(data: any): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<UserProfile>(res);
  }

  async getMe(): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<UserProfile>(res);
  }

  // --- Products & Lines ---
  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Product[]>(res);
  }

  async createProduct(sku: string, name: string, description?: string): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ sku, name, description }),
    });
    return this.handleResponse<Product>(res);
  }

  async getProductionLines(): Promise<ProductionLine[]> {
    const res = await fetch(`${API_BASE_URL}/api/production-lines`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<ProductionLine[]>(res);
  }

  async createProductionLine(name: string, location?: string, status = 'active'): Promise<ProductionLine> {
    const res = await fetch(`${API_BASE_URL}/api/production-lines`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, location, status }),
    });
    return this.handleResponse<ProductionLine>(res);
  }

  // --- Inspections ---
  async inspectImage(formData: FormData): Promise<InspectionDetail> {
    const res = await fetch(`${API_BASE_URL}/api/inspections/inspect`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    });
    return this.handleResponse<InspectionDetail>(res);
  }

  async getInspections(filters: Record<string, string | undefined>): Promise<Inspection[]> {
    const cleanFilters: Record<string, string> = {};
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        cleanFilters[key] = filters[key]!;
      }
    });
    const query = new URLSearchParams(cleanFilters).toString();
    const res = await fetch(`${API_BASE_URL}/api/inspections?${query}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Inspection[]>(res);
  }

  async getInspectionDetail(id: string): Promise<InspectionDetail> {
    const res = await fetch(`${API_BASE_URL}/api/inspections/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<InspectionDetail>(res);
  }

  // --- Analytics ---
  async getDashboardAnalytics(days = 30): Promise<DashboardAnalytics> {
    const res = await fetch(`${API_BASE_URL}/api/analytics/dashboard?days=${days}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<DashboardAnalytics>(res);
  }

  async getHeatmapData(): Promise<HeatmapData> {
    const res = await fetch(`${API_BASE_URL}/api/analytics/heatmap`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<HeatmapData>(res);
  }

  // --- Reports ---
  async getReports(): Promise<Report[]> {
    const res = await fetch(`${API_BASE_URL}/api/reports`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<Report[]>(res);
  }

  async generateReport(name: string, report_type: string, file_format: string, start_date: string, end_date: string): Promise<Report> {
    const res = await fetch(`${API_BASE_URL}/api/reports/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, report_type, file_format, start_date, end_date }),
    });
    return this.handleResponse<Report>(res);
  }

  // Utility url resolver for local static files served from backend
  resolveImageUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${API_BASE_URL}${url}`;
  }
}

export const api = new ApiClient();
export default api;
